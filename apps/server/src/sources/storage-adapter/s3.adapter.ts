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
 * Works with AWS S3, Alibaba OSS, MinIO, and other S3-compatible services
 */
export class S3StorageAdapter extends BaseStorageAdapter {
  private s3Client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: S3AdapterConfig) {
    super();
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'backups';

    // Configure S3 client
    const clientConfig: any = {
      region: config.region || 'us-east-1',
    };

    // Add custom endpoint if provided (for S3-compatible services)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO and some OSS configurations
    }

    // Add credentials if provided
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.s3Client = new S3Client(clientConfig);
    console.log(`S3 adapter initialized with bucket: ${this.bucket}, prefix: ${this.prefix}`);
  }

  private getFullKey(key: string): string {
    return `${this.prefix}/${key}`.replace(/\/+/g, '/');
  }

  async uploadFile(key: string, buffer: Buffer): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: buffer,
        ContentType: 'application/gzip',
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
        throw new Error('Empty response body');
      }

      // Convert readable stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      console.log(`File downloaded from S3: s3://${this.bucket}/${fullKey}`);
      return buffer;
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

      return files;
    } catch (error) {
      console.error(`Failed to list files from S3 with prefix: ${prefix}`, error);
      throw error;
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
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error(`Failed to check if file exists in S3: ${key}`, error);
      throw error;
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
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error(`Failed to get file metadata from S3: ${key}`, error);
      return null;
    }
  }

  async close(): Promise<void> {
    this.s3Client.destroy();
  }
}
