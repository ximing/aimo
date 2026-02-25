import fs from 'node:fs/promises';
import path from 'node:path';

import { BaseUnifiedStorageAdapter, type StorageMetadata } from './base.adapter.js';

/**
 * Local file system storage adapter for attachments
 */
export class LocalUnifiedStorageAdapter extends BaseUnifiedStorageAdapter {
  constructor(private basePath: string) {
    super();
    this.ensureBasePath();
  }

  private async ensureBasePath(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create base path: ${this.basePath}`, error);
    }
  }

  async uploadFile(key: string, buffer: Buffer): Promise<void> {
    try {
      const filePath = path.join(this.basePath, key);
      const dir = path.dirname(filePath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);
      console.log(`File uploaded to local storage: ${filePath}`);
    } catch (error) {
      console.error(`Failed to upload file to local storage: ${key}`, error);
      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.basePath, key);
      const buffer = await fs.readFile(filePath);
      console.log(`File downloaded from local storage: ${filePath}`);
      return buffer;
    } catch (error) {
      console.error(`Failed to download file from local storage: ${key}`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.unlink(filePath);
      console.log(`File deleted from local storage: ${filePath}`);
    } catch (error) {
      console.error(`Failed to delete file from local storage: ${key}`, error);
      // Don't throw if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const searchPath = prefix ? path.join(this.basePath, prefix) : this.basePath;

      const stat = await fs.stat(searchPath).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        return [];
      }

      const files: string[] = [];
      const entries = await fs.readdir(searchPath, { recursive: true });

      for (const entry of entries) {
        const fullPath = path.join(searchPath, entry as string);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          const relativePath = path.relative(this.basePath, fullPath);
          files.push(relativePath);
        }
      }

      return files;
    } catch (error) {
      console.error(`Failed to list files from local storage with prefix ${prefix}:`, error);
      return [];
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
  } | null> {
    try {
      const filePath = path.join(this.basePath, key);
      const stat = await fs.stat(filePath);
      return {
        size: stat.size,
        lastModified: stat.mtime,
      };
    } catch (error) {
      console.error(`Failed to get file metadata from local storage: ${key}`, error);
      return null;
    }
  }

  /**
   * For local storage, generate access URL as relative path
   * The application's HTTP endpoint will handle serving these files
   * @param key - Storage path/key
   * @param metadata - Storage metadata (ignored for local storage)
   * @param _expiresIn - Expiry time in seconds (ignored for local storage)
   */
  async generateAccessUrl(
    key: string,
    _metadata?: StorageMetadata,
    _expiresIn?: number
  ): Promise<string> {
    // For local storage, return the key as-is (relative path)
    // The caller will use this with an HTTP endpoint
    return key;
  }
}
