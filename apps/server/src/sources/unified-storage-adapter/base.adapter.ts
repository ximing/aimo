import mime from 'mime-types';

/**
 * Storage metadata for URL generation
 * Uses attachment record metadata to ensure URLs are generated based on the attachment's
 * original storage configuration, not the current global configuration.
 * This allows old attachments to remain accessible even if storage backend is changed.
 */
export interface StorageMetadata {
  bucket?: string; // Bucket name (for S3/OSS)
  prefix?: string; // Prefix/folder name (for S3/OSS)
  endpoint?: string; // Endpoint URL (for S3/OSS custom endpoints)
  region?: string; // Region (for S3/OSS)
  isPublicBucket?: string; // 'true' | 'false' - whether bucket is public
}

/**
 * Unified storage adapter interface for attachment operations
 * Abstracts different storage backends (local, s3, oss)
 */
export interface UnifiedStorageAdapter {
  /**
   * Upload a file to storage
   * @param key - The storage key/path
   * @param buffer - File content as buffer
   */
  uploadFile(key: string, buffer: Buffer): Promise<void>;

  /**
   * Download a file from storage
   * @param key - The storage key/path
   */
  downloadFile(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * @param key - The storage key/path
   */
  deleteFile(key: string): Promise<void>;

  /**
   * List files in storage with optional prefix
   * @param prefix - Optional prefix to filter files
   */
  listFiles(prefix?: string): Promise<string[]>;

  /**
   * Check if a file exists in storage
   * @param key - The storage key/path
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata (size, last modified, etc.)
   * @param key - The storage key/path
   */
  getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
  } | null>;

  /**
   * Generate access URL for a stored file using attachment metadata
   * Supports both public (direct URL) and private (presigned/signed URL) buckets
   * @param key - The storage key/path
   * @param metadata - Storage metadata from attachment record (bucket, endpoint, region, isPublicBucket, etc.)
   * @param expiresIn - Expiry time in seconds (only used for private buckets in S3/OSS)
   */
  generateAccessUrl(key: string, metadata: StorageMetadata, expiresIn?: number): Promise<string>;
}

/**
 * Abstract base class for unified storage adapters
 */
export abstract class BaseUnifiedStorageAdapter implements UnifiedStorageAdapter {
  abstract uploadFile(key: string, buffer: Buffer): Promise<void>;
  abstract downloadFile(key: string): Promise<Buffer>;
  abstract deleteFile(key: string): Promise<void>;
  abstract listFiles(prefix?: string): Promise<string[]>;
  abstract fileExists(key: string): Promise<boolean>;
  abstract getFileMetadata(key: string): Promise<{ size: number; lastModified: Date } | null>;
  abstract generateAccessUrl(
    key: string,
    metadata: StorageMetadata,
    expiresIn?: number
  ): Promise<string>;

  /**
   * Build a full storage path from base path and key
   */
  protected buildPath(basePath: string, key: string): string {
    const normalized = basePath.endsWith('/') ? basePath : `${basePath}/`;
    return `${normalized}${key}`;
  }

  /**
   * Extract filename from a full path
   */
  protected extractFilename(path: string): string {
    return path.split('/').pop() || path;
  }

  /**
   * Get content type from file extension using mime-types library
   * For security reasons, returns application/octet-stream for HTML and similar content types
   * @param key - The file key/path
   */
  protected getContentType(key: string): string {
    const filename = this.extractFilename(key);
    const mimeType = mime.lookup(filename) as string;

    // Security: return octet-stream for potentially dangerous content types
    if (
      !mimeType ||
      mimeType === 'text/html' ||
      mimeType === 'text/plain' ||
      mimeType === 'application/javascript' ||
      mimeType === 'text/javascript'
    ) {
      return 'application/octet-stream';
    }

    return mimeType || 'application/octet-stream';
  }
}
