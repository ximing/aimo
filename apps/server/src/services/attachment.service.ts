/**
 * Attachment Service
 * Business logic for attachment management
 */

import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';
import { logger } from '../utils/logger.js';

import { MultimodalEmbeddingService } from './multimodal-embedding.service.js';

import type { AttachmentRecord } from '../models/db/schema.js';
import type { UnifiedStorageAdapter } from '../sources/unified-storage-adapter/index.js';
import type { AttachmentDto } from '@aimo/dto';

export interface CreateAttachmentOptions {
  uid: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
  createdAt?: number; // Optional timestamp in milliseconds (for imports)
  properties?: string; // Optional JSON string for properties (audio duration, image dimensions, etc.)
}

export interface GetAttachmentsOptions {
  uid: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt'; // Sort field
  sortOrder?: 'asc' | 'desc'; // Sort direction, defaults to 'desc' (newest first)
}

@Service()
export class AttachmentService {
  private storageAdapter: UnifiedStorageAdapter;

  constructor(
    private lanceDatabaseService: LanceDatabaseService,
    private multimodalEmbeddingService: MultimodalEmbeddingService
  ) {
    // Create storage adapter for attachments
    this.storageAdapter = UnifiedStorageAdapterFactory.createAttachmentAdapter(config.attachment);
  }

  /**
   * Create a new attachment
   * For images and videos, generate multimodal embedding asynchronously if enabled
   * @param options - Options for creating the attachment, including optional createdAt for imports
   */
  async createAttachment(options: CreateAttachmentOptions): Promise<AttachmentDto> {
    const { uid, buffer, filename, mimeType, size, createdAt, properties } = options;

    // Generate storage path: {uid}/{YYYY-MM-DD}/{nanoid24}.{ext}
    // Note: prefix (e.g., 'attachments') is added by the storage adapter
    const fileId = nanoid(24);
    const extension = filename.split('.').pop() || '';
    const dateString = dayjs().format('YYYY-MM-DD');
    const path = `${uid}/${dateString}/${fileId}.${extension}`;

    // Upload file to storage
    await this.storageAdapter.uploadFile(path, buffer);

    // Prepare attachment record with storage metadata
    const attachmentCreatedAt = createdAt || Date.now();
    const attachmentConfig = config.attachment;

    const record: AttachmentRecord = {
      attachmentId: fileId,
      uid,
      filename,
      type: mimeType,
      size,
      storageType: attachmentConfig.storageType,
      path, // Store full storage path for URL reconstruction
      bucket: this.getStorageMetadata('bucket', attachmentConfig),
      prefix: this.getStorageMetadata('prefix', attachmentConfig),
      endpoint: this.getStorageMetadata('endpoint', attachmentConfig),
      region: this.getStorageMetadata('region', attachmentConfig),
      isPublicBucket: this.getStorageMetadata('isPublicBucket', attachmentConfig),
      properties: properties || '{}', // Use provided properties or default to empty object
      createdAt: attachmentCreatedAt,
    };

    // Save to database
    const table = await this.lanceDatabaseService.openTable('attachments');
    const result = await table.add([record as unknown as Record<string, unknown>]);
    logger.info('Attachment created:', result);

    // Generate multimodal embedding asynchronously for images and videos if enabled
    // This is non-blocking and happens in the background
    // if (config.multimodal.enabled) {
    //   const isImage = mimeType.startsWith('image/');
    //   const isVideo = mimeType.startsWith('video/');

    //   if (isImage || isVideo) {
    //     // Fire and forget - do not await
    //     this.generateAndUpdateMultimodalEmbedding(
    //       record.attachmentId,
    //       path,
    //       isImage ? 'image' : 'video',
    //       filename
    //     ).catch((error) => {
    //       logger.error(
    //         `Background multimodal embedding generation failed for ${filename}:`,
    //         error
    //       );
    //     });
    //   }
    // }

    // Generate access URL for immediate return
    const accessUrl = await this.generateAccessUrl(record);

    // Parse properties for return
    let returnProperties: Record<string, unknown> | undefined;
    if (properties) {
      try {
        returnProperties = JSON.parse(properties);
      } catch {
        returnProperties = undefined;
      }
    }

    return {
      attachmentId: record.attachmentId,
      filename,
      url: accessUrl,
      type: mimeType,
      size,
      createdAt: attachmentCreatedAt,
      properties: returnProperties,
    };
  }

  /**
   * Convert attachment record to DTO with generated access URL
   * Handles both regular and Arrow-based property data
   */
  private convertToAttachmentDto(record: AttachmentRecord, accessUrl: string): AttachmentDto {
    let properties: Record<string, unknown> = {};

    // Handle properties field - could be string (JSON) or already parsed object
    if (record.properties) {
      if (typeof record.properties === 'string') {
        try {
          properties = JSON.parse(record.properties);
        } catch {
          properties = {};
        }
      } else if (typeof record.properties === 'object') {
        properties = record.properties as Record<string, unknown>;
      }
    }

    // Extract coverUrl from properties for videos
    const coverUrl = properties.coverUrl as string | undefined;

    return {
      attachmentId: record.attachmentId,
      filename: record.filename,
      url: accessUrl,
      type: record.type,
      size: record.size,
      createdAt: record.createdAt,
      coverUrl,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    };
  }

  /**
   * Update attachment properties
   * @param attachmentId - The attachment ID to update
   * @param uid - User ID for permission check
   * @param properties - The properties to set (will be merged with existing)
   * @returns Updated AttachmentDto or null if not found
   */
  async updateAttachmentProperties(
    attachmentId: string,
    uid: string,
    properties: Record<string, unknown>
  ): Promise<AttachmentDto | null> {
    const table = await this.lanceDatabaseService.openTable('attachments');

    // Find attachment
    const results = await table
      .query()
      .where(`attachmentId = '${attachmentId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (!results || results.length === 0) {
      return null;
    }

    const existingRecord = results[0] as unknown as AttachmentRecord;

    // Merge existing properties with new ones
    let existingProperties: Record<string, unknown> = {};
    if (existingRecord.properties) {
      try {
        existingProperties =
          typeof existingRecord.properties === 'string'
            ? JSON.parse(existingRecord.properties)
            : existingRecord.properties;
      } catch {
        existingProperties = {};
      }
    }

    const mergedProperties = { ...existingProperties, ...properties };
    const propertiesJson = JSON.stringify(mergedProperties);

    // Update in place to avoid losing records when a rewrite fails.
    await table.update({
      where: `attachmentId = '${attachmentId}' AND uid = '${uid}'`,
      values: { properties: propertiesJson },
    });

    const updatedRecord: AttachmentRecord = {
      ...existingRecord,
      properties: propertiesJson,
    };

    // Generate access URL and return DTO
    const accessUrl = await this.generateAccessUrl(updatedRecord);
    return this.convertToAttachmentDto(updatedRecord, accessUrl);
  }

  /**
   * Generate multimodal embedding asynchronously and update attachment record
   * This method is called in the background without blocking
   */
  private async generateAndUpdateMultimodalEmbedding(
    attachmentId: string,
    url: string,
    modalityType: 'image' | 'video',
    filename: string
  ): Promise<void> {
    try {
      logger.info(
        `Starting background multimodal embedding generation for ${modalityType}: ${filename}`
      );

      // Generate embedding
      const embedding = await this.multimodalEmbeddingService.generateMultimodalEmbedding(
        { [modalityType]: url },
        modalityType
      );

      // Get model hash from service
      const modelHash = (this.multimodalEmbeddingService as any).modelHash;

      // Update the attachment record with the embedding
      const table = await this.lanceDatabaseService.openTable('attachments');

      // Get the existing record
      const results = await table
        .query()
        .where(`attachmentId = '${attachmentId}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        logger.warn(`Attachment record not found: ${attachmentId}`);
        return;
      }

      const existingRecord = results[0] as AttachmentRecord;
      const schema = await table.schema();
      const embeddingField = schema.fields.find((field) => field.name === 'multimodalEmbedding');
      const expectedDimension = (
        embeddingField?.type as { listSize?: number } | undefined
      )?.listSize;

      if (typeof expectedDimension === 'number' && embedding.length !== expectedDimension) {
        logger.warn(
          `Skip multimodal embedding update for ${attachmentId}: got ${embedding.length} dims, expected ${expectedDimension}`
        );
        return;
      }

      await table.update({
        where: `attachmentId = '${attachmentId}' AND uid = '${existingRecord.uid}'`,
        values: {
          multimodalEmbedding: embedding,
          multimodalModelHash: modelHash,
        },
      });

      logger.info(
        `Successfully generated and stored multimodal embedding for ${modalityType}: ${filename}`
      );
    } catch (error) {
      logger.warn(
        `Failed to generate multimodal embedding for ${filename}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      // Silently fail - this is background work that shouldn't affect user experience
    }
  }

  /**
   * Get attachment by ID
   */
  async getAttachment(attachmentId: string, uid: string): Promise<AttachmentDto | null> {
    const table = await this.lanceDatabaseService.openTable('attachments');

    const results = await table
      .query()
      .where(`attachmentId = '${attachmentId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (!results || results.length === 0) {
      return null;
    }

    const record = results[0] as unknown as AttachmentRecord;
    const accessUrl = await this.generateAccessUrl(record);

    return this.convertToAttachmentDto(record, accessUrl);
  }

  /**
   * Get attachments by user
   */
  async getAttachmentsByUser(options: GetAttachmentsOptions): Promise<{
    items: AttachmentDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { uid, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const table = await this.lanceDatabaseService.openTable('attachments');

    // Get all matching records (LanceDB doesn't support orderBy, sorting done in JavaScript)
    let results = await table.query().where(`uid = '${uid}'`).toArray();
    const total = results.length;

    // Sort by createdAt in JavaScript (LanceDB doesn't support orderBy directly)
    results = results.sort((a: any, b: any) => {
      const aValue = a.createdAt;
      const bValue = b.createdAt;
      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Get paginated results
    const paginatedResults = results.slice(offset, offset + limit);

    const items = await Promise.all(
      paginatedResults.map(async (record) => {
        const r = record as unknown as AttachmentRecord;
        const accessUrl = await this.generateAccessUrl(r);
        return this.convertToAttachmentDto(r, accessUrl);
      })
    );

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, uid: string): Promise<boolean> {
    const table = await this.lanceDatabaseService.openTable('attachments');

    // Find attachment
    const results = await table
      .query()
      .where(`attachmentId = '${attachmentId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (!results || results.length === 0) {
      return false;
    }

    const record = results[0] as unknown as AttachmentRecord;

    // Delete from storage
    try {
      await this.storageAdapter.deleteFile(record.path);
    } catch (error) {
      logger.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await table.delete(`attachmentId = '${attachmentId}' AND uid = '${uid}'`);

    return true;
  }

  /**
   * Get multiple attachments by IDs with access URLs generated
   * @param attachmentIds - Array of attachment IDs to fetch
   * @param uid - User ID for permission check
   * @returns Array of AttachmentDto with generated access URLs
   */
  async getAttachmentsByIds(attachmentIds: string[], uid: string): Promise<AttachmentDto[]> {
    if (!attachmentIds || attachmentIds.length === 0) {
      return [];
    }

    const table = await this.lanceDatabaseService.openTable('attachments');

    // Fetch all attachments in a single query
    const whereConditions = attachmentIds.map((id) => `attachmentId = '${id}'`).join(' OR ');
    const query = `(${whereConditions}) AND uid = '${uid}'`;

    const results = await table.query().where(query).toArray();

    // Convert records to DTOs with generated URLs, preserving order
    const attachmentMap = new Map<string, AttachmentDto>();
    for (const record of results) {
      const r = record as unknown as AttachmentRecord;
      const accessUrl = await this.generateAccessUrl(r);
      attachmentMap.set(r.attachmentId, this.convertToAttachmentDto(r, accessUrl));
    }

    // Return in the original order of attachmentIds
    return attachmentIds
      .map((id) => attachmentMap.get(id))
      .filter((att): att is AttachmentDto => att !== undefined);
  }

  /**
   * Get attachment file buffer for download (with permission check)
   */
  async getAttachmentBuffer(
    attachmentId: string,
    uid: string
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  } | null> {
    // Verify attachment ownership
    const attachment = await this.getAttachment(attachmentId, uid);
    if (!attachment) {
      return null;
    }

    // Get the record to access storage info
    const table = await this.lanceDatabaseService.openTable('attachments');
    const results = await table
      .query()
      .where(`attachmentId = '${attachmentId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (!results || results.length === 0) {
      return null;
    }

    const record = results[0] as unknown as AttachmentRecord;

    // Get file buffer from storage
    const buffer = await this.storageAdapter.downloadFile(record.path);

    return {
      buffer,
      filename: record.filename,
      mimeType: record.type,
    };
  }

  /**
   * Generate access URL for an attachment record
   * Uses attachment metadata to ensure URLs are generated based on the attachment's
   * original storage configuration, not the current global configuration.
   * This allows old attachments to remain accessible even if storage backend is changed.
   *
   * Dynamically generates presigned URLs for S3/OSS private buckets
   * Returns direct URLs for public buckets or local paths
   */
  private async generateAccessUrl(record: AttachmentRecord): Promise<string> {
    const storageType = record.storageType;

    // Build metadata from attachment record
    const metadata = {
      bucket: record.bucket,
      prefix: record.prefix,
      endpoint: record.endpoint,
      region: record.region,
      isPublicBucket: record.isPublicBucket,
    };

    if (storageType === 'local') {
      // For local storage, return the path as-is
      return record.path;
    } else if (storageType === 's3' || storageType === 'oss') {
      // For S3/OSS, generate access URL (presigned/signed if private, direct if public)
      // Pass attachment metadata to ensure consistent URL generation
      return await this.storageAdapter.generateAccessUrl(
        record.path,
        metadata,
        config.attachment.presignedUrlExpiry
      );
    } else {
      // Fallback
      return record.path;
    }
  }

  /**
   * Extract storage metadata from configuration
   */
  private getStorageMetadata(
    key: 'bucket' | 'prefix' | 'endpoint' | 'region' | 'isPublicBucket',
    attachmentConfig: typeof import('../config/config.js').config.attachment
  ): string | undefined {
    const storageConfig =
      attachmentConfig.storageType === 's3' ? attachmentConfig.s3 : attachmentConfig.oss;

    if (!storageConfig) return undefined;

    if (key === 'isPublicBucket') {
      return storageConfig.isPublic ? 'true' : 'false';
    }

    return storageConfig[key as 'bucket' | 'prefix' | 'endpoint' | 'region'];
  }
}
