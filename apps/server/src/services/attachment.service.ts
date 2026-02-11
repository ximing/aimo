/**
 * Attachment Service
 * Business logic for attachment management
 */

import { Service } from 'typedi';
import { LanceDbService, type AttachmentRecord } from '../sources/lancedb.js';
import { AttachmentStorageService } from './attachment-storage.service.js';
import type { AttachmentDto } from '@aimo/dto';

export interface CreateAttachmentOptions {
  uid: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface GetAttachmentsOptions {
  uid: string;
  page?: number;
  limit?: number;
}

@Service()
export class AttachmentService {
  constructor(
    private lanceDbService: LanceDbService,
    private storageService: AttachmentStorageService
  ) {}

  /**
   * Create a new attachment
   */
  async createAttachment(options: CreateAttachmentOptions): Promise<AttachmentDto> {
    const { uid, buffer, filename, mimeType, size } = options;

    // Save file to storage
    const { attachmentId, url, storageType } = await this.storageService.saveFile({
      buffer,
      filename,
      mimeType,
    });

    // Prepare record - use timestamp in milliseconds
    const now = Date.now();
    const record: AttachmentRecord = {
      attachmentId,
      uid,
      filename,
      url,
      type: mimeType,
      size,
      storageType,
      createdAt: now,
    };

    // Save to database
    const table = await this.lanceDbService.openTable('attachments');
    await table.add([record as unknown as Record<string, unknown>]);

    // Generate access URL
    const accessUrl = await this.generateAccessUrl(url, storageType);

    return {
      attachmentId,
      filename,
      url: accessUrl,
      type: mimeType,
      size,
      createdAt: now,
    };
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
    const accessUrl = await this.generateAccessUrl(record.url, record.storageType);

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
    const allResults = await table
      .query()
      .where(`uid = '${uid}'`)
      .toArray();
    const total = allResults.length;

    // Get paginated results
    const results = await table
      .query()
      .where(`uid = '${uid}'`)
      .limit(limit)
      .toArray();

    // Skip manually (LanceDB doesn't have native offset)
    const paginatedResults = results.slice(offset, offset + limit);

    const items = await Promise.all(
      paginatedResults.map(async (record) => {
        const r = record as unknown as AttachmentRecord;
        const accessUrl = await this.generateAccessUrl(r.url, r.storageType);
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
      await this.storageService.deleteFile(record.url, record.storageType);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await table.delete(`attachmentId = '${attachmentId}'`);

    return true;
  }

  /**
   * Get file buffer from local storage
   */
  async getLocalFileBuffer(filename: string): Promise<Buffer> {
    return await this.storageService.getLocalFile(filename);
  }

  /**
   * Get attachment record by filename (for access control)
   */
  async getAttachmentByFilename(filename: string): Promise<AttachmentRecord | null> {
    const table = await this.lanceDbService.openTable('attachments');
    
    // Extract filename from path if needed
    const cleanFilename = filename.includes('/') ? filename.split('/').pop()! : filename;
    
    const results = await table
      .query()
      .where(`url LIKE '%${cleanFilename}%'`)
      .limit(1)
      .toArray();

    if (!results || results.length === 0) {
      return null;
    }

    return results[0] as unknown as AttachmentRecord;
  }

  /**
   * Generate access URL based on storage type
   * 
   * For S3:
   * - Public buckets: Returns direct URL without signing
   * - Private buckets: Returns presigned URL with expiration
   */
  private async generateAccessUrl(url: string, storageType: 'local' | 's3'): Promise<string> {
    if (storageType === 's3') {
      // For public S3 buckets: returns direct URL
      // For private S3 buckets: generates and returns presigned URL
      return await this.storageService.generatePresignedUrl(url);
    } else {
      // For local storage, return API endpoint path
      const filename = url.split('/').pop();
      return `/api/v1/attachments/file/${filename}`;
    }
  }
}
