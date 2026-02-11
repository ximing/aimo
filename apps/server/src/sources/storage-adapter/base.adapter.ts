/**
 * Base storage adapter interface for backup operations
 */
export interface StorageAdapter {
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
}

/**
 * Abstract base class for storage adapters
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  abstract uploadFile(key: string, buffer: Buffer): Promise<void>;
  abstract downloadFile(key: string): Promise<Buffer>;
  abstract deleteFile(key: string): Promise<void>;
  abstract listFiles(prefix?: string): Promise<string[]>;
  abstract fileExists(key: string): Promise<boolean>;
  abstract getFileMetadata(key: string): Promise<{ size: number; lastModified: Date } | null>;

  /**
   * Build a full storage path from bucket/prefix and key
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
}
