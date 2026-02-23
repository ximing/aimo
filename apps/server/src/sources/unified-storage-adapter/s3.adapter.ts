import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { BaseUnifiedStorageAdapter, type StorageMetadata } from './base.adapter.js';

export interface S3UnifiedStorageAdapterConfig {
  bucket: string;
  prefix?: string;
  region?: string;
  endpoint?: string; // For S3-compatible services like MinIO
  accessKeyId?: string;
  secretAccessKey?: string;
  isPublic?: boolean; // Whether bucket is public
}

/**
 * S3 (and S3-compatible) unified storage adapter for attachments
 *
 * Supports all S3-compatible services:
 * - AWS S3
 * - MinIO
 * - DigitalOcean Spaces
 * - And more...
 *
 * For Aliyun OSS compatibility via S3 API, use this adapter.
 * For native Aliyun OSS functionality, use OSSUnifiedStorageAdapter.
 */
export class S3UnifiedStorageAdapter extends BaseUnifiedStorageAdapter {
  private s3Client: S3Client;
  private bucket: string;
  private prefix: string;
  private endpoint?: string;
  private region: string;
  private isPublic: boolean;

  constructor(config: S3UnifiedStorageAdapterConfig) {
    super();
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'uploads';
    this.endpoint = config.endpoint;
    this.region = config.region || 'us-east-1';
    this.isPublic = config.isPublic || false;

    // Validate bucket configuration
    if (!this.bucket) {
      throw new Error('S3 bucket name is required');
    }

    // Configure S3 client
    // Determine if we should use path-style or virtual-hosted-style
    // Aliyun OSS requires virtual-hosted-style (don't use forcePathStyle)
    // MinIO and others typically use path-style
    const isAliyunOSS = this.endpoint?.includes(this.region || 'aliyuncs');
    const forcePathStyle = this.endpoint && !isAliyunOSS ? true : undefined;

    const clientConfig: any = {
      region: this.region,
    };

    // Add custom endpoint if provided (for S3-compatible services)
    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
      if (forcePathStyle !== undefined) {
        clientConfig.forcePathStyle = forcePathStyle;
      }
    }

    // Add credentials if provided
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.s3Client = new S3Client(clientConfig);
    console.log(
      `S3 adapter initialized with bucket: ${this.bucket}, prefix: ${this.prefix}, ` +
        `endpoint: ${this.endpoint || 'AWS S3'}, region: ${this.region}, isPublic: ${this.isPublic}`
    );
  }

  private getFullKey(key: string): string {
    return `${this.prefix}/${key}`.replaceAll(/\/+/g, '/');
  }

  async uploadFile(key: string, buffer: Buffer): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: buffer,
      });

      await this.s3Client.send(command);
      console.log(`File uploaded to S3: s3://${this.bucket}/${fullKey}`);
    } catch (error) {
      console.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const fullKey = this.getFullKey(key);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      // Convert readable stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      console.log(`File downloaded from S3: s3://${this.bucket}/${fullKey}`);
      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`Failed to download file from S3: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      await this.s3Client.send(command);
      console.log(`File deleted from S3: s3://${this.bucket}/${fullKey}`);
    } catch (error) {
      console.error(`Failed to delete file from S3: ${key}`, error);
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const searchPrefix = prefix ? `${this.prefix}/${prefix}` : this.prefix;
      const files: string[] = [];
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: searchPrefix,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const item of response.Contents) {
            if (item.Key) {
              // Remove prefix from key
              const key = item.Key.replace(`${this.prefix}/`, '');
              if (key) {
                files.push(key);
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return files;
    } catch (error) {
      console.error(`Failed to list files from S3 with prefix ${prefix}:`, error);
      return [];
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      console.error(`Failed to check file existence in S3: ${key}`, error);
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<{ size: number; lastModified: Date } | null> {
    try {
      const fullKey = this.getFullKey(key);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      console.error(`Failed to get file metadata from S3: ${key}`, error);
      return null;
    }
  }

  /**
   * Generate S3-compatible URL for file access using attachment metadata
   * For public buckets: returns direct URL
   * For private buckets: generates presigned URL with expiry
   *
   * @param key - The storage key/path
   * @param metadata - Storage metadata from attachment record
   * @param expiresIn - Expiry time in seconds for presigned URLs (default: 3600)
   */
  async generateAccessUrl(
    key: string,
    metadata?: StorageMetadata,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const fullKey = this.getFullKey(key);

      // Determine if bucket is public based on metadata, fallback to adapter config
      const isPublic = metadata?.isPublicBucket === 'true' ? true : (metadata?.isPublicBucket === 'false' ? false : this.isPublic);

      // If bucket is public, return direct URL
      if (isPublic) {
        return this.generateDirectUrl(fullKey, metadata);
      }

      // For private buckets, generate presigned URL
      // Use metadata bucket if provided, otherwise use adapter's bucket
      const bucket = metadata?.bucket || this.bucket;

      // Determine content type from file extension
      const contentType = this.getContentType(fullKey);

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        ResponseContentType: contentType,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      // console.log(`Generated presigned URL for key: ${fullKey} (expires in ${expiresIn}s)`);
      return presignedUrl;
    } catch (error) {
      console.error(`Failed to generate access URL for S3 key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Generate direct URL for public S3 buckets using metadata
   */
  private generateDirectUrl(key: string, metadata?: StorageMetadata): string {
    // Use metadata if provided, otherwise use adapter's configuration
    const endpoint = metadata?.endpoint || this.endpoint;
    const region = metadata?.region || this.region;
    const bucket = metadata?.bucket || this.bucket;

    if (endpoint) {
      // For S3-compatible services with custom endpoint
      // Determine URL format based on endpoint type
      const isAliyunOSS = endpoint.includes(region || 'aliyuncs');

      if (isAliyunOSS) {
        // Aliyun OSS: use virtual-hosted-style
        // https://bucket.oss-cn-beijing.aliyuncs.com/key
        const domain = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `https://${bucket}.${domain}/${key}`;
      } else {
        // For other S3-compatible services (MinIO, etc.)
        // Use path-style: https://endpoint/bucket/key
        const baseUrl = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
        return `${baseUrl.replace(/\/$/, '')}/${bucket}/${key}`;
      }
    } else {
      // AWS S3 standard URL
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
  }
}
