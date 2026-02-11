/**
 * Attachment Storage Service
 * Handles file storage operations for both local and S3 storage
 */

import { Service } from 'typedi';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createWriteStream, createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { config } from '../config/config.js';
import { nanoid } from 'nanoid';

export interface SaveFileOptions {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface SaveFileResult {
  attachmentId: string;
  url: string;
  storageType: 'local' | 's3';
}

@Service()
export class AttachmentStorageService {
  private s3Client?: S3Client;

  constructor() {
    // Initialize S3 client if using S3 storage
    if (config.attachment.storageType === 's3' && config.attachment.s3) {
      const s3Config = config.attachment.s3;
      this.s3Client = new S3Client({
        region: s3Config.region || 'us-east-1',
        credentials: s3Config.awsAccessKeyId && s3Config.awsSecretAccessKey
          ? {
              accessKeyId: s3Config.awsAccessKeyId,
              secretAccessKey: s3Config.awsSecretAccessKey,
            }
          : undefined,
        endpoint: s3Config.endpoint,
        forcePathStyle: !!s3Config.endpoint, // Required for MinIO and other S3-compatible services
      });
    }
  }

  /**
   * Save file to storage (local or S3)
   */
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const { buffer, filename, mimeType } = options;
    const fileId = nanoid();
    const attachmentId = `attachments/${fileId}`;

    // Get file extension from original filename
    const ext = filename.split('.').pop() || '';
    const storedFilename = ext ? `${fileId}.${ext}` : fileId;

    if (config.attachment.storageType === 's3') {
      return await this.saveToS3(buffer, storedFilename, mimeType, attachmentId);
    } else {
      return await this.saveToLocal(buffer, storedFilename, attachmentId);
    }
  }

  /**
   * Save file to local storage
   */
  private async saveToLocal(
    buffer: Buffer,
    filename: string,
    attachmentId: string
  ): Promise<SaveFileResult> {
    if (!config.attachment.local) {
      throw new Error('Local storage configuration is missing');
    }

    const storagePath = config.attachment.local.path;
    
    // Ensure storage directory exists
    if (!existsSync(storagePath)) {
      mkdirSync(storagePath, { recursive: true });
    }

    const filePath = join(storagePath, filename);
    
    // Write file to disk
    await pipeline(
      (async function* () {
        yield buffer;
      })(),
      createWriteStream(filePath)
    );

    return {
      attachmentId,
      url: `attachments/${filename}`, // Relative path for local storage
      storageType: 'local',
    };
  }

  /**
   * Save file to S3 storage
   */
  private async saveToS3(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    attachmentId: string
  ): Promise<SaveFileResult> {
    if (!this.s3Client || !config.attachment.s3) {
      throw new Error('S3 client is not initialized');
    }

    const s3Config = config.attachment.s3;
    const key = `${s3Config.prefix}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);

    // Return S3 URL
    const s3Url = s3Config.endpoint
      ? `${s3Config.endpoint}/${s3Config.bucket}/${key}`
      : `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;

    return {
      attachmentId,
      url: s3Url,
      storageType: 's3',
    };
  }

  /**
   * Get file from local storage
   */
  async getLocalFile(filename: string): Promise<Buffer> {
    if (!config.attachment.local) {
      throw new Error('Local storage configuration is missing');
    }

    const filePath = join(config.attachment.local.path, filename);
    
    if (!existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Read file as buffer
    const chunks: Buffer[] = [];
    const stream = createReadStream(filePath);
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  /**
   * Generate presigned URL for S3 file access
   */
  async generatePresignedUrl(url: string): Promise<string> {
    if (!this.s3Client || !config.attachment.s3) {
      throw new Error('S3 client is not initialized');
    }

    const s3Config = config.attachment.s3;
    
    // Extract key from URL
    let key: string;
    if (url.includes(s3Config.bucket)) {
      // Parse key from full S3 URL
      const urlParts = url.split(`${s3Config.bucket}/`);
      key = urlParts[1];
    } else {
      // Assume it's already a key
      key = url;
    }

    const command = new GetObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: config.attachment.presignedUrlExpiry,
    });

    return presignedUrl;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(url: string, storageType: 'local' | 's3'): Promise<void> {
    if (storageType === 's3') {
      await this.deleteFromS3(url);
    } else {
      await this.deleteFromLocal(url);
    }
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(url: string): Promise<void> {
    if (!config.attachment.local) {
      throw new Error('Local storage configuration is missing');
    }

    // Extract filename from URL (format: attachments/filename)
    const filename = url.split('/').pop();
    if (!filename) {
      throw new Error('Invalid file URL');
    }

    const filePath = join(config.attachment.local.path, filename);
    
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  /**
   * Delete file from S3 storage
   */
  private async deleteFromS3(url: string): Promise<void> {
    if (!this.s3Client || !config.attachment.s3) {
      throw new Error('S3 client is not initialized');
    }

    const s3Config = config.attachment.s3;
    
    // Extract key from URL
    let key: string;
    if (url.includes(s3Config.bucket)) {
      const urlParts = url.split(`${s3Config.bucket}/`);
      key = urlParts[1];
    } else {
      key = url;
    }

    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
