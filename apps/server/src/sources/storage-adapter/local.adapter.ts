import fs from 'fs/promises';
import path from 'path';
import { BaseStorageAdapter } from './base.adapter.js';

/**
 * Local file system storage adapter for backups
 */
export class LocalStorageAdapter extends BaseStorageAdapter {
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

      // Check if directory exists
      try {
        await fs.access(searchPath);
      } catch {
        return [];
      }

      const files: string[] = [];

      const walk = async (dir: string, relative: string = ''): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = relative ? `${relative}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            await walk(fullPath, relativePath);
          } else {
            files.push(relativePath);
          }
        }
      };

      await walk(searchPath);
      return files;
    } catch (error) {
      console.error(`Failed to list files from local storage with prefix: ${prefix}`, error);
      throw error;
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

  async getFileMetadata(key: string): Promise<{ size: number; lastModified: Date } | null> {
    try {
      const filePath = path.join(this.basePath, key);
      const stats = await fs.stat(filePath);

      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      console.error(`Failed to get file metadata from local storage: ${key}`, error);
      return null;
    }
  }
}
