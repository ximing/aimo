import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { BaseStorageAdapter } from './base.adapter.js';

export interface S3AdapterConfig {
  bucket: string;
  prefix?: string;
  region?: string;
  endpoint?: string; // For S3-compatible services like OSS or MinIO
  accessKeyId?: string;
  secretAccessKey?: string;
}

/**
 * S3 (and S3-compatible) storage adapter for backups
 * 
 * Supports all S3-compatible services:
 * - AWS S3
 * - MinIO
 * - Aliyun OSS (with S3-compatible endpoint)
 * - DigitalOcean Spaces
 * - Backblaze B2
 * - And more...
 * 
 * Key differences from attachment storage:
 * - Handles path-style vs virtual-hosted-style endpoints automatically
 * - Auto-detects Aliyun OSS and adjusts configuration accordingly
 * - Better error handling for S3 operations
 */
export class S3StorageAdapter extends BaseStorageAdapter {
  private s3Client: S3Client;
  private bucket: string;
  private prefix: string;
  private endpoint?: string;
  private region: string;

  constructor(config: S3AdapterConfig) {
    super();
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'backups';
    this.endpoint = config.endpoint;
    this.region = config.region || 'us-east-1';

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
      `endpoint: ${this.endpoint || 'AWS S3'}, region: ${this.region}`
    );
  }

  private getFullKey(key: string): string {
    return `${this.prefix}/${key}`.replace(/\/+/g, '/');
  }

  /**
   * Generate S3-compatible URL based on endpoint type
   * Handles different URL formats for various S3 providers
   */
  private generateS3Url(key: string): string {
    if (!this.endpoint) {
      // AWS S3 standard URL
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    // For S3-compatible services with custom endpoint
    // e.g., MinIO: minio:9000 or http://minio:9000
    // e.g., Aliyun OSS: oss-cn-beijing.aliyuncs.com or https://delu-cdn.oss-cn-beijing.aliyuncs.com
    // Format: https://bucket.endpoint/key or https://endpoint/bucket/key

    // For virtual-hosted-style endpoints (like Aliyun OSS)
    const isAliyunOSS = this.endpoint.includes(this.region || 'aliyuncs');
    if (isAliyunOSS) {
      // Aliyun OSS: use virtual-hosted-style
      // https://bucket.oss-cn-beijing.aliyuncs.com/prefix/filename
      // or https://delu-cdn.oss-cn-beijing.aliyuncs.com/prefix/filename
      
      // Check if endpoint already has protocol prefix
      if (this.endpoint.startsWith('http://') || this.endpoint.startsWith('https://')) {
        // Endpoint already has protocol, extract domain part
        const domain = this.endpoint.split('://')[1];
        return `https://${this.bucket}.${domain}/${key}`;
      } else {
        // Endpoint is just domain, add protocol
        return `https://${this.bucket}.${this.endpoint}/${key}`;
      }
    } else {
      // For other S3-compatible services (MinIO, etc.)
      // Use path-style: https://endpoint/bucket/key
      const baseUrl = this.endpoint.startsWith('http')
        ? this.endpoint
        : `https://${this.endpoint}`;
      return `${baseUrl}/${this.bucket}/${key}`;
    }
  }

  async uploadFile(key: string, buffer: Buffer): Promise<void> {
    if (!key) {
      throw new Error('Storage key is required');
    }

    try {
      const fullKey = this.getFullKey(key);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: buffer,
        ContentType: 'application/gzip',
      });

      await this.s3Client.send(command);
      console.log(
        `File uploaded to S3: s3://${this.bucket}/${fullKey} ` +
        `(size: ${buffer.length} bytes)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to upload file to S3: ${key}`, errorMessage);
      throw new Error(`S3 upload failed for key ${key}: ${errorMessage}`);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    if (!key) {
      throw new Error('Storage key is required');
    }

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

      const buffer = Buffer.concat(chunks);
      console.log(
        `File downloaded from S3: s3://${this.bucket}/${fullKey} ` +
        `(size: ${buffer.length} bytes)`
      );
      return buffer;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a 404 error
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found in S3: ${key}`);
      }
      
      console.error(`Failed to download file from S3: ${key}`, errorMessage);
      throw new Error(`S3 download failed for key ${key}: ${errorMessage}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      throw new Error('Storage key is required');
    }

    try {
      const fullKey = this.getFullKey(key);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      await this.s3Client.send(command);
      console.log(`File deleted from S3: s3://${this.bucket}/${fullKey}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete file from S3: ${key}`, errorMessage);
      throw new Error(`S3 delete failed for key ${key}: ${errorMessage}`);
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const searchPrefix = prefix ? `${this.prefix}/${prefix}`.replace(/\/+/g, '/') : this.prefix;

      const files: string[] = [];
      let continuationToken: string | undefined;

      // Handle pagination
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: searchPrefix,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key) {
              // Remove prefix from key
              const relativeKey = obj.Key.substring(this.prefix.length + 1);
              if (relativeKey) {
                files.push(relativeKey);
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      console.log(
        `Listed ${files.length} files from S3 with prefix: ${searchPrefix}`
      );
      return files;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to list files from S3 with prefix: ${prefix}`, errorMessage);
      throw new Error(`S3 list failed for prefix ${prefix}: ${errorMessage}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    if (!key) {
      throw new Error('Storage key is required');
    }

    try {
      const fullKey = this.getFullKey(key);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to check if file exists in S3: ${key}`, errorMessage);
      throw new Error(`S3 fileExists check failed for key ${key}: ${errorMessage}`);
    }
  }

  async getFileMetadata(key: string): Promise<{ size: number; lastModified: Date } | null> {
    if (!key) {
      throw new Error('Storage key is required');
    }

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
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to get file metadata from S3: ${key}`, errorMessage);
      return null;
    }
  }

  /**
   * Close S3 client connection
   */
  async close(): Promise<void> {
    try {
      this.s3Client.destroy();
      console.log('S3 adapter connection closed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to close S3 adapter connection', errorMessage);
    }
  }
}
