/**
 * Attachment Service
 * Business logic for attachment management
 * Uses Drizzle for metadata storage, storage adapter for file operations
 */

import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';
import { logger } from '../utils/logger.js';

import { AttachmentRepository, CreateAttachmentData, AttachmentFullRecord } from '../repositories/attachment.repository.js';
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
  private storageAdapter: ReturnType<typeof UnifiedStorageAdapterFactory.createAttachmentAdapter>;

  constructor(private attachmentRepository: AttachmentRepository) {
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

    const createData: CreateAttachmentData = {
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
      properties: properties || undefined,
      createdAt: attachmentCreatedAt,
    };

    // Save to database via repository
    const attachment = await this.attachmentRepository.create(createData);

    // Generate access URL for immediate return
    const accessUrl = await this.generateAccessUrlFromPath(path, attachmentConfig.storageType);

    return {
      ...attachment,
      url: accessUrl,
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
    // Update via repository (handles property merging internally)
    const attachment = await this.attachmentRepository.updateProperties(attachmentId, uid, properties);

    if (!attachment) {
      return null;
    }

    // Generate access URL
    const accessUrl = await this.generateAccessUrlById(attachmentId, uid);

    return {
      ...attachment,
      url: accessUrl,
    };
  }

  /**
   * Get attachment by ID
   */
  async getAttachment(attachmentId: string, uid: string): Promise<AttachmentDto | null> {
    const attachment = await this.attachmentRepository.findByIdAndUid(attachmentId, uid);

    if (!attachment) {
      return null;
    }

    const accessUrl = await this.generateAccessUrlById(attachmentId, uid);

    return {
      ...attachment,
      url: accessUrl,
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
    const result = await this.attachmentRepository.findByUserId(options);

    // Generate access URLs for each attachment
    const items = await Promise.all(
      result.items.map(async (attachment) => {
        const accessUrl = await this.generateAccessUrlById(attachment.attachmentId, options.uid);
        return {
          ...attachment,
          url: accessUrl,
        };
      })
    );

    return {
      ...result,
      items,
    };
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, uid: string): Promise<boolean> {
    // First get the full attachment to know the storage path
    const fullAttachment = await this.attachmentRepository.findByIdFull(attachmentId);

    if (!fullAttachment || fullAttachment.uid !== uid) {
      return false;
    }

    // Delete from storage
    try {
      await this.storageAdapter.deleteFile(fullAttachment.path);
    } catch (error) {
      logger.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    return await this.attachmentRepository.delete(attachmentId, uid);
  }

  /**
   * Get multiple attachments by IDs with access URLs generated
   * @param attachmentIds - Array of attachment IDs to fetch
   * @param uid - User ID for permission check
   * @returns Array of AttachmentDto with generated access URLs
   */
  async getAttachmentsByIds(attachmentIds: string[], uid: string): Promise<AttachmentDto[]> {
    const attachments = await this.attachmentRepository.findByIds(attachmentIds, uid);

    // Generate access URLs for each attachment
    const items = await Promise.all(
      attachments.map(async (attachment) => {
        const accessUrl = await this.generateAccessUrlById(attachment.attachmentId, uid);
        return {
          ...attachment,
          url: accessUrl,
        };
      })
    );

    return items;
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
    // Verify attachment ownership and get full record
    const fullAttachment = await this.attachmentRepository.findByIdFull(attachmentId);
    if (!fullAttachment || fullAttachment.uid !== uid) {
      return null;
    }

    // Get file buffer from storage using the path
    const buffer = await this.storageAdapter.downloadFile(fullAttachment.path);

    return {
      buffer,
      filename: fullAttachment.filename,
      mimeType: fullAttachment.type,
    };
  }

  /**
   * Generate access URL by attachment ID and UID
   * Queries the database to get storage metadata
   */
  private async generateAccessUrlById(attachmentId: string, uid: string): Promise<string> {
    const fullAttachment = await this.attachmentRepository.findByIdFull(attachmentId);
    if (!fullAttachment) {
      return '';
    }

    return this.generateAccessUrlFromFullRecord(fullAttachment);
  }

  /**
   * Generate access URL from full attachment record
   * Uses attachment metadata to ensure URLs are generated based on the attachment's
   * original storage configuration, not the current global configuration.
   * This allows old attachments to remain accessible even if storage backend is changed.
   *
   * Dynamically generates presigned URLs for S3/OSS private buckets
   * Returns direct URLs for public buckets or local paths
   */
  private async generateAccessUrlFromFullRecord(record: AttachmentFullRecord): Promise<string> {
    const storageType = record.storageType;

    if (storageType === 'local') {
      // For local storage, return the path as-is
      return record.path;
    } else if (storageType === 's3' || storageType === 'oss') {
      // For S3/OSS, generate access URL (presigned/signed if private, direct if public)
      const metadata = {
        bucket: record.bucket,
        prefix: record.prefix,
        endpoint: record.endpoint,
        region: record.region,
        isPublicBucket: record.isPublicBucket,
      };
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
   * Generate access URL from storage path (for new attachments)
   * Uses current configuration
   */
  private async generateAccessUrlFromPath(
    path: string,
    storageType: string
  ): Promise<string> {
    if (storageType === 'local') {
      // For local storage, return the path as-is
      return path;
    } else if (storageType === 's3' || storageType === 'oss') {
      // For S3/OSS, generate access URL (presigned/signed if private, direct if public)
      return await this.storageAdapter.generateAccessUrl(
        path,
        {},
        config.attachment.presignedUrlExpiry
      );
    } else {
      // Fallback
      return path;
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
