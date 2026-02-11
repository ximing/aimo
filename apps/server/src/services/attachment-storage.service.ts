/**
 * Attachment Storage Service
 * Handles file storage operations for local and S3-compatible storage
 * 
 * Supports all S3-compatible services:
 * - AWS S3
 * - MinIO
 * - Aliyun OSS (with S3-compatible endpoint)
 * - DigitalOcean Spaces
 * - Backblaze B2
 * - And more...
 */

import { Service } from 'typedi';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createWriteStream, createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
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
    // Initialize S3 client for all S3-compatible storage services
    // This works with: AWS S3, MinIO, Aliyun OSS, DigitalOcean Spaces, etc.
    if (config.attachment.storageType === 's3' && config.attachment.s3) {
      const s3Config = config.attachment.s3;
      
      // Determine if we should use path-style or virtual-hosted-style
      // Aliyun OSS requires virtual-hosted-style (don't use forcePathStyle)
      // MinIO and others typically use path-style
      const isAliyunOSS = s3Config.endpoint?.includes(s3Config.region || 'aliyuncs');
      const forcePathStyle = s3Config.endpoint && !isAliyunOSS ? true : undefined;
      
      this.s3Client = new S3Client({
        region: s3Config.region || 'us-east-1',
        credentials: s3Config.awsAccessKeyId && s3Config.awsSecretAccessKey
          ? {
              accessKeyId: s3Config.awsAccessKeyId,
              secretAccessKey: s3Config.awsSecretAccessKey,
            }
          : undefined,
        endpoint: s3Config.endpoint,
        forcePathStyle, // true for MinIO, false for Aliyun OSS
      });
    }
  }

  /**
   * Save file to storage (local or S3-compatible)
   */
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const { buffer, filename, mimeType } = options;
    const fileId = nanoid();
    const attachmentId = fileId; // Just the ID, no prefix

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
   * Save file to S3-compatible storage
   * Works with: AWS S3, MinIO, Aliyun OSS, DigitalOcean Spaces, etc.
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

    // Generate URL based on endpoint type
    const url = this.generateS3Url(key);

    return {
      attachmentId,
      url,
      storageType: 's3',
    };
  }

  /**
   * Generate S3-compatible URL
   * Handles different URL formats for various S3 providers
   */
  private generateS3Url(key: string): string {
    if (!config.attachment.s3) {
      throw new Error('S3 configuration is missing');
    }

    const s3Config = config.attachment.s3;
    const bucket = s3Config.bucket;

    if (s3Config.endpoint) {
      // For S3-compatible services with custom endpoint
      // e.g., MinIO: minio:9000 or http://minio:9000
      // e.g., Aliyun OSS: oss-cn-beijing.aliyuncs.com or https://delu-cdn.oss-cn-beijing.aliyuncs.com
      // Format: https://bucket.endpoint/key or https://endpoint/bucket/key
      
      // For virtual-hosted-style endpoints (like Aliyun OSS)
      if (s3Config.endpoint.includes(s3Config.region || 'aliyuncs')) {
        // Aliyun OSS: use virtual-hosted-style
        // https://bucket.oss-cn-beijing.aliyuncs.com/prefix/filename
        // or https://delu-cdn.oss-cn-beijing.aliyuncs.com/prefix/filename
        
        // Check if endpoint already has protocol prefix
        if (s3Config.endpoint.startsWith('http://') || s3Config.endpoint.startsWith('https://')) {
          // Endpoint already has protocol, extract domain part
          const domain = s3Config.endpoint.split('://')[1];
          return `https://${bucket}.${domain}/${key}`;
        } else {
          // Endpoint is just domain, add protocol
          return `https://${bucket}.${s3Config.endpoint}/${key}`;
        }
      } else {
        // For other S3-compatible services (MinIO, etc.)
        // Use path-style: https://endpoint/bucket/key
        const baseUrl = s3Config.endpoint.startsWith('http') 
          ? s3Config.endpoint 
          : `https://${s3Config.endpoint}`;
        return `${baseUrl}/${bucket}/${key}`;
      }
    } else {
      // AWS S3 standard URL
      return `https://${bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
    }
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
   * Generate presigned URL for S3-compatible file access
   * For public buckets, returns the direct URL without signing
   * For private buckets, generates a presigned URL with expiration
   */
  async generatePresignedUrl(url: string): Promise<string> {
    if (!config.attachment.s3) {
      throw new Error('S3 configuration is missing');
    }

    const s3Config = config.attachment.s3;
    
    // If bucket is public, return the URL as-is without signing
    if (s3Config.isPublic) {
      return url;
    }

    // For private buckets, generate presigned URL
    if (!this.s3Client) {
      throw new Error('S3 client is not initialized');
    }
    
    // Extract key from URL - handle different URL formats
    let key: string;
    
    if (url.includes(s3Config.bucket)) {
      // Parse key from URL
      // Format 1: https://bucket.endpoint/prefix/filename (virtual-hosted)
      // Format 2: https://endpoint/bucket/prefix/filename (path-style)
      const bucketIndex = url.indexOf(s3Config.bucket);
      const afterBucket = url.substring(bucketIndex + s3Config.bucket.length);
      
      // Remove leading '/' and extract the rest as key
      key = afterBucket.replace(/^\/+/, '').split('?')[0];
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
   * Delete file from S3-compatible storage
   */
  private async deleteFromS3(url: string): Promise<void> {
    if (!this.s3Client || !config.attachment.s3) {
      throw new Error('S3 client is not initialized');
    }

    const s3Config = config.attachment.s3;
    
    // Extract key from URL - handle different URL formats
    let key: string;
    
    if (url.includes(s3Config.bucket)) {
      const bucketIndex = url.indexOf(s3Config.bucket);
      const afterBucket = url.substring(bucketIndex + s3Config.bucket.length);
      key = afterBucket.replace(/^\/+/, '').split('?')[0];
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
