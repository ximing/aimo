/**
 * Attachment Service
 * Business logic for attachment management
 */

import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { Service } from 'typedi';
import { eq, and, desc, sql } from 'drizzle-orm';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { attachments } from '../db/schema/attachments.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';
import { logger } from '../utils/logger.js';

import { MultimodalEmbeddingService } from './multimodal-embedding.service.js';

import type { AttachmentVectorRecord } from '../models/db/schema.js';
import type { UnifiedStorageAdapter } from '../sources/unified-storage-adapter/index.js';
import type { AttachmentDto } from '@aimo/dto';
import type { Attachment } from '../db/schema/attachments.js';

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
  private lanceDatabaseService: LanceDatabaseService;

  constructor(private multimodalEmbeddingService: MultimodalEmbeddingService) {
    // Create storage adapter for attachments
    this.storageAdapter = UnifiedStorageAdapterFactory.createAttachmentAdapter(config.attachment);
    // Keep LanceDB service for vector operations only
    this.lanceDatabaseService = new LanceDatabaseService();
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
    const attachmentCreatedAt = createdAt ? new Date(createdAt) : new Date();
    const attachmentConfig = config.attachment;

    const db = getDatabase();

    // Insert scalar fields into MySQL
    await db.insert(attachments).values({
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
    });

    // Fetch the created record to get auto-generated timestamps
    const results = await db
      .select()
      .from(attachments)
      .where(eq(attachments.attachmentId, fileId))
      .limit(1);

    const record = results[0]!;

    logger.info('Attachment created:', { attachmentId: fileId, uid, filename });

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
      createdAt: record.createdAt.getTime(),
      properties: returnProperties,
    };
  }

  /**
   * Convert attachment record to DTO with generated access URL
   * Handles both regular and Arrow-based property data
   */
  private convertToAttachmentDto(record: Attachment, accessUrl: string): AttachmentDto {
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
      createdAt: record.createdAt.getTime(),
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
    const db = getDatabase();

    // Find attachment
    const results = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)))
      .limit(1);

    if (!results || results.length === 0) {
      return null;
    }

    const existingRecord = results[0];

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

    // Update in MySQL
    await db
      .update(attachments)
      .set({ properties: propertiesJson })
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)));

    // Fetch updated record
    const updatedResults = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)))
      .limit(1);

    const updatedRecord = updatedResults[0]!;

    // Generate access URL and return DTO
    const accessUrl = await this.generateAccessUrl(updatedRecord);
    return this.convertToAttachmentDto(updatedRecord, accessUrl);
  }

  /**
   * Generate multimodal embedding asynchronously and update attachment record
   * This method is called in the background without blocking
   * Stores embedding in LanceDB attachment_vectors table
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

      // Validate embedding dimensions (should be 1024 for multimodal)
      if (embedding.length !== 1024) {
        logger.warn(
          `Skip multimodal embedding update for ${attachmentId}: got ${embedding.length} dims, expected 1024`
        );
        return;
      }

      // Store embedding in LanceDB attachment_vectors table
      const vectorTable = await this.lanceDatabaseService.openTable('attachment_vectors');

      const vectorRecord: AttachmentVectorRecord = {
        attachmentId,
        multimodalEmbedding: embedding,
      };

      await vectorTable.add([vectorRecord as unknown as Record<string, unknown>]);

      // Update multimodalModelHash in MySQL
      const db = getDatabase();
      await db
        .update(attachments)
        .set({ multimodalModelHash: modelHash })
        .where(eq(attachments.attachmentId, attachmentId));

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
    const db = getDatabase();

    const results = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)))
      .limit(1);

    if (!results || results.length === 0) {
      return null;
    }

    const record = results[0];
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

    const db = getDatabase();

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(attachments)
      .where(eq(attachments.uid, uid));

    const total = countResult[0]?.count ?? 0;

    // Get paginated results with sorting
    const orderByClause =
      sortOrder === 'desc' ? desc(attachments.createdAt) : attachments.createdAt;

    const results = await db
      .select()
      .from(attachments)
      .where(eq(attachments.uid, uid))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const items = await Promise.all(
      results.map(async (record) => {
        const accessUrl = await this.generateAccessUrl(record);
        return this.convertToAttachmentDto(record, accessUrl);
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
    const db = getDatabase();

    // Find attachment
    const results = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)))
      .limit(1);

    if (!results || results.length === 0) {
      return false;
    }

    const record = results[0];

    // Delete from storage
    try {
      await this.storageAdapter.deleteFile(record.path);
    } catch (error) {
      logger.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from MySQL
    await db
      .delete(attachments)
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)));

    // Delete from LanceDB attachment_vectors table if exists
    try {
      const vectorTable = await this.lanceDatabaseService.openTable('attachment_vectors');
      await vectorTable.delete(`attachmentId = '${attachmentId}'`);
    } catch (error) {
      logger.warn('Failed to delete attachment vector (may not exist):', error);
      // Non-critical - vector may not exist if embedding was never generated
    }

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

    const db = getDatabase();

    // Fetch all attachments in a single query using IN clause
    const results = await db
      .select()
      .from(attachments)
      .where(
        and(
          sql`${attachments.attachmentId} IN ${sql.raw(`(${attachmentIds.map((id) => `'${id}'`).join(',')})`)}`,
          eq(attachments.uid, uid)
        )
      );

    // Convert records to DTOs with generated URLs, preserving order
    const attachmentMap = new Map<string, AttachmentDto>();
    for (const record of results) {
      const accessUrl = await this.generateAccessUrl(record);
      attachmentMap.set(record.attachmentId, this.convertToAttachmentDto(record, accessUrl));
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

    const db = getDatabase();

    // Get the record to access storage info
    const results = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.attachmentId, attachmentId), eq(attachments.uid, uid)))
      .limit(1);

    if (!results || results.length === 0) {
      return null;
    }

    const record = results[0];

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
  private async generateAccessUrl(record: Attachment): Promise<string> {
    const storageType = record.storageType;

    // Build metadata from attachment record
    const metadata = {
      bucket: record.bucket ?? undefined,
      prefix: record.prefix ?? undefined,
      endpoint: record.endpoint ?? undefined,
      region: record.region ?? undefined,
      isPublicBucket: record.isPublicBucket ?? undefined,
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
