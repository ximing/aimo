/**
 * Attachment Service
 * Business logic for attachment management
 */

import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService } from '../sources/lancedb.js';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';

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
}

export interface GetAttachmentsOptions {
  uid: string;
  page?: number;
  limit?: number;
}

@Service()
export class AttachmentService {
  private storageAdapter: UnifiedStorageAdapter;

  constructor(
    private lanceDbService: LanceDbService,
    private multimodalEmbeddingService: MultimodalEmbeddingService
  ) {
    // Create storage adapter for attachments
    this.storageAdapter = UnifiedStorageAdapterFactory.createAttachmentAdapter(
      config.attachment
    );
  }

  /**
   * Create a new attachment
   * For images and videos, generate multimodal embedding asynchronously if enabled
   * @param options - Options for creating the attachment, including optional createdAt for imports
   */
  async createAttachment(options: CreateAttachmentOptions): Promise<AttachmentDto> {
    const { uid, buffer, filename, mimeType, size, createdAt } = options;

    // Generate storage path: {uid}/{YYYY-MM-DD}/{nanoid24}.{ext}
    // Note: prefix (e.g., 'attachments') is added by the storage adapter
    const fileId = nanoid(24);
    const ext = filename.split('.').pop() || '';
    const dateStr = dayjs().format('YYYY-MM-DD');
    const path = `${uid}/${dateStr}/${fileId}.${ext}`;

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
      createdAt: attachmentCreatedAt,
    };

    // Save to database
    const table = await this.lanceDbService.openTable('attachments');
    await table.add([record as unknown as Record<string, unknown>]);

    // Generate multimodal embedding asynchronously for images and videos if enabled
    // This is non-blocking and happens in the background
    if (config.multimodal.enabled) {
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (isImage || isVideo) {
        // Fire and forget - do not await
        this.generateAndUpdateMultimodalEmbedding(
          record.attachmentId,
          path,
          isImage ? 'image' : 'video',
          filename
        ).catch((error) => {
          console.error(
            `Background multimodal embedding generation failed for ${filename}:`,
            error
          );
        });
      }
    }

    // Generate access URL for immediate return
    const accessUrl = await this.generateAccessUrl(record);

    return {
      attachmentId: record.attachmentId,
      filename,
      url: accessUrl,
      type: mimeType,
      size,
      createdAt: attachmentCreatedAt,
    };
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
      console.log(
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
      const table = await this.lanceDbService.openTable('attachments');

      // Get the existing record
      const results = await table
        .query()
        .where(`attachmentId = '${attachmentId}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        console.warn(`Attachment record not found: ${attachmentId}`);
        return;
      }

      const existingRecord = results[0] as AttachmentRecord;

      // Create updated record with multimodal embedding
      const updatedRecord: AttachmentRecord = {
        ...existingRecord,
        multimodalEmbedding: embedding,
        multimodalModelHash: modelHash,
      };

      // Delete the old record and add the updated one
      await table.delete(`attachmentId = '${attachmentId}'`);
      await table.add([updatedRecord as unknown as Record<string, unknown>]);

      console.log(
        `Successfully generated and stored multimodal embedding for ${modalityType}: ${filename}`
      );
    } catch (error) {
      console.warn(
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
    const table = await this.lanceDbService.openTable('attachments');

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

    return {
      attachmentId: record.attachmentId,
      filename: record.filename,
      url: accessUrl,
      type: record.type,
      size: record.size,
      createdAt: record.createdAt,
    };
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
    const { uid, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const table = await this.lanceDbService.openTable('attachments');

    // Get total count
    const allResults = await table.query().where(`uid = '${uid}'`).toArray();
    const total = allResults.length;

    // Get paginated results
    const results = await table.query().where(`uid = '${uid}'`).limit(limit).toArray();

    // Skip manually (LanceDB doesn't have native offset)
    const paginatedResults = results.slice(offset, offset + limit);

    const items = await Promise.all(
      paginatedResults.map(async (record) => {
        const r = record as unknown as AttachmentRecord;
        const accessUrl = await this.generateAccessUrl(r);
        return {
          attachmentId: r.attachmentId,
          filename: r.filename,
          url: accessUrl,
          type: r.type,
          size: r.size,
          createdAt: r.createdAt,
        };
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
    const table = await this.lanceDbService.openTable('attachments');

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
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await table.delete(`attachmentId = '${attachmentId}'`);

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

    const table = await this.lanceDbService.openTable('attachments');

    // Fetch all attachments in a single query
    const whereConditions = attachmentIds.map((id) => `attachmentId = '${id}'`).join(' OR ');
    const query = `(${whereConditions}) AND uid = '${uid}'`;

    const results = await table.query().where(query).toArray();

    // Convert records to DTOs with generated URLs, preserving order
    const attachmentMap = new Map<string, AttachmentDto>();
    for (const record of results) {
      const r = record as unknown as AttachmentRecord;
      const accessUrl = await this.generateAccessUrl(r);
      attachmentMap.set(r.attachmentId, {
        attachmentId: r.attachmentId,
        filename: r.filename,
        url: accessUrl,
        type: r.type,
        size: r.size,
        createdAt: r.createdAt,
      });
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
    const table = await this.lanceDbService.openTable('attachments');
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