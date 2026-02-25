import OSS from 'ali-oss';

import { BaseUnifiedStorageAdapter, type StorageMetadata } from './base.adapter.js';

export interface OSSUnifiedStorageAdapterConfig {
  bucket: string;
  prefix?: string;
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
  isPublic?: boolean; // Whether bucket is public
}

/**
 * Aliyun OSS unified storage adapter for attachments
 * Uses ali-oss official library for complete feature support
 */
export class OSSUnifiedStorageAdapter extends BaseUnifiedStorageAdapter {
  private client: OSS;
  private bucket: string;
  private prefix: string;
  private region: string;
  private isPublic: boolean;
  private endpoint?: string;

  constructor(config: OSSUnifiedStorageAdapterConfig) {
    super();
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'uploads';
    this.region = config.region;
    this.isPublic = config.isPublic || false;
    this.endpoint = config.endpoint;

    // Validate required configuration
    if (!this.bucket || !this.region || !config.accessKeyId || !config.accessKeySecret) {
      throw new Error('OSS bucket, region, accessKeyId, and accessKeySecret are required');
    }

    // Build OSS endpoint if not provided
    let ossEndpoint = this.endpoint;
    if (!ossEndpoint) {
      // Default: https://oss-{region}.aliyuncs.com
      ossEndpoint = `https://oss-${this.region}.aliyuncs.com`;
    }

    // Initialize OSS client
    this.client = new OSS({
      region: this.region,
      bucket: this.bucket,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: ossEndpoint,
      secure: true, // Use HTTPS
    });

    console.log(
      `OSS adapter initialized with bucket: ${this.bucket}, region: ${this.region}, ` +
        `endpoint: ${ossEndpoint}, isPublic: ${this.isPublic}`
    );
  }

  private getFullKey(key: string): string {
    return `${this.prefix}/${key}`.replaceAll(/\/+/g, '/');
  }

  async uploadFile(key: string, buffer: Buffer): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);

      await this.client.put(fullKey, buffer);
      console.log(`File uploaded to OSS: oss://${this.bucket}/${fullKey}`);
    } catch (error) {
      console.error(`Failed to upload file to OSS: ${key}`, error);
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const fullKey = this.getFullKey(key);

      const result = await this.client.get(fullKey);

      if (!result.content) {
        throw new Error('Empty response body from OSS');
      }

      // Convert to Buffer if needed
      const buffer = Buffer.isBuffer(result.content)
        ? result.content
        : Buffer.from(result.content as any);

      console.log(`File downloaded from OSS: oss://${this.bucket}/${fullKey}`);
      return buffer;
    } catch (error) {
      console.error(`Failed to download file from OSS: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);

      await this.client.delete(fullKey);
      console.log(`File deleted from OSS: oss://${this.bucket}/${fullKey}`);
    } catch (error) {
      console.error(`Failed to delete file from OSS: ${key}`, error);
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const searchPrefix = prefix ? `${this.prefix}/${prefix}` : this.prefix;
      const files: string[] = [];
      let marker: string | undefined;

      // Use list() method with pagination
      do {
        const result = await this.client.list({
          prefix: searchPrefix,
          marker,
        });

        if (result.objects) {
          for (const item of result.objects) {
            if (item.name) {
              // Remove prefix from key
              const key = item.name.replace(`${this.prefix}/`, '');
              if (key && key !== this.prefix + '/') {
                files.push(key);
              }
            }
          }
        }

        // Check if there are more results
        if (result.isTruncated) {
          marker = result.nextMarker;
        } else {
          break;
        }
      } while (marker);

      return files;
    } catch (error) {
      console.error(`Failed to list files from OSS with prefix ${prefix}:`, error);
      return [];
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);

      const result = await this.client.head(fullKey);
      return !!result;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      console.error(`Failed to check file existence in OSS: ${key}`, error);
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<{ size: number; lastModified: Date } | null> {
    try {
      const fullKey = this.getFullKey(key);

      const result = await this.client.head(fullKey);

      if (!result.meta) {
        return null;
      }

      return {
        size: result.meta['content-length'] || 0,
        lastModified: new Date(result.meta['last-modified'] || Date.now()),
      };
    } catch (error) {
      console.error(`Failed to get file metadata from OSS: ${key}`, error);
      return null;
    }
  }

  /**
   * Generate Aliyun OSS URL for file access using attachment metadata
   * For public buckets: returns direct URL
   * For private buckets: generates signed URL with expiry
   *
   * @param key - The storage key/path
   * @param metadata - Storage metadata from attachment record
   * @param expiresIn - Expiry time in seconds for signed URLs (default: 3600)
   */
  async generateAccessUrl(
    key: string,
    metadata?: StorageMetadata,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const fullKey = this.getFullKey(key);

      // Determine if bucket is public based on metadata, fallback to adapter config
      const isPublic =
        metadata?.isPublicBucket === 'true'
          ? true
          : metadata?.isPublicBucket === 'false'
            ? false
            : this.isPublic;

      // If bucket is public, return direct URL
      if (isPublic) {
        return this.generateDirectUrl(fullKey, metadata);
      }

      // Determine content type from file extension
      const contentType = this.getContentType(fullKey);

      // For private buckets, generate signed URL
      const url = await this.client.signatureUrl(fullKey, {
        expires: expiresIn,
        ContentType: contentType,
      });

      console.log(`Generated signed URL for key: ${fullKey} (expires in ${expiresIn}s)`);
      return url;
    } catch (error) {
      console.error(`Failed to generate access URL for OSS key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Generate direct URL for public OSS buckets using metadata
   */
  private generateDirectUrl(key: string, metadata?: StorageMetadata): string {
    // Use metadata if provided, otherwise use adapter's configuration
    const endpoint = metadata?.endpoint || this.endpoint;
    const region = metadata?.region || this.region;
    const bucket = metadata?.bucket || this.bucket;

    // For Aliyun OSS, use virtual-hosted-style URL
    // https://bucket.oss-region.aliyuncs.com/key
    // or https://bucket.custom-domain.com/key if custom domain is configured

    if (endpoint) {
      // Use custom endpoint if provided
      const domain = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
      // If domain already has bucket name, use as-is; otherwise prepend bucket
      return domain.startsWith(bucket + '.')
        ? `https://${domain}/${key}`
        : `https://${bucket}.${domain}/${key}`;
    } else {
      // Use default Aliyun OSS URL format
      // https://bucket.oss-region.aliyuncs.com/key
      return `https://${bucket}.oss-${region}.aliyuncs.com/${key}`;
    }
  }
}
