import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

import dayjs from 'dayjs';


import type { UnifiedStorageAdapter } from '../sources/unified-storage-adapter/index.js';

export interface BackupExecutorConfig {
  storageAdapter: UnifiedStorageAdapter;
  tempDir?: string;
  lancedbPath: string;
}

/**
 * Executes backup operations in an isolated manner
 * Handles compression of local LanceDB files, upload, and cleanup
 * Only works with local storage - S3-based databases do not require backups
 */
export class BackupExecutor {
  private tempDir: string;
  private lancedbPath: string;
  private storageAdapter: UnifiedStorageAdapter;
  private workerPool: Worker[] = [];
  private activeWorker: Worker | null = null;

  constructor(config: BackupExecutorConfig) {
    this.storageAdapter = config.storageAdapter;
    this.tempDir = config.tempDir || './tmp/backup';
    this.lancedbPath = config.lancedbPath;
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create temp directory: ${this.tempDir}`, error);
    }
  }

  /**
   * Execute a full backup of LanceDB (local files only)
   * Returns the backup filename
   */
  async executeBackup(): Promise<string> {
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
    const backupId = `${timestamp}_${Date.now()}`;

    console.log(`Starting backup execution: ${backupId}`);

    try {
      // Step 1: Compress the local database files directly
      const compressedFilename = `backup_${backupId}.tar.gz`;
      const compressedPath = path.join(this.tempDir, compressedFilename);
      await this.compressDatabase(compressedPath);

      // Step 2: Upload to storage
      const buffer = await fs.readFile(compressedPath);
      const uploadKey = this.buildUploadKey(compressedFilename);
      await this.storageAdapter.uploadFile(uploadKey, buffer);

      // Step 3: Cleanup temporary files
      await this.cleanupTempFiles(compressedPath);

      console.log(`Backup execution completed: ${backupId}`);
      return compressedFilename;
    } catch (error) {
      console.error(`Backup execution failed for ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Compress local LanceDB database files using tar.gz in a worker thread
   * This prevents blocking the main event loop
   */
  private async compressDatabase(destPath: string): Promise<void> {
    console.log(`Compressing LanceDB files: ${this.lancedbPath} -> ${destPath}`);

    return new Promise((resolve, reject) => {
      try {
        // Create worker thread for compression
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const workerPath = path.join(__dirname, 'backup-worker.js');
        const worker = new Worker(workerPath);

        this.activeWorker = worker;

        const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timeout = setTimeout(
          () => {
            worker.terminate();
            reject(new Error(`Compression task ${taskId} timed out after 5 minutes`));
          },
          5 * 60 * 1000
        );

        // Handle worker messages
        worker.on('message', (result) => {
          clearTimeout(timeout);
          this.activeWorker = null;

          if (result.success) {
            console.log(`Database compressed successfully: ${destPath}`);
            worker.terminate();
            resolve();
          } else {
            worker.terminate();
            reject(new Error(`Compression failed: ${result.error}`));
          }
        });

        // Handle worker errors
        worker.on('error', (error) => {
          clearTimeout(timeout);
          this.activeWorker = null;
          console.error('Worker error:', error);
          worker.terminate();
          reject(error);
        });

        // Handle worker exit
        worker.on('exit', (code) => {
          clearTimeout(timeout);
          if (code !== 0 && this.activeWorker === worker) {
            this.activeWorker = null;
            reject(new Error(`Worker exited with code ${code}`));
          }
        });

        // Send compression task to worker
        worker.postMessage({
          lancedbPath: this.lancedbPath,
          destPath,
          taskId,
        });
      } catch (error) {
        console.error('Failed to start compression worker:', error);
        reject(error);
      }
    });
  }

  /**
   * Build the upload key (path in storage) for backup file
   */
  private buildUploadKey(filename: string): string {
    const date = dayjs().format('YYYY-MM-DD');
    return `${date}/${filename}`;
  }

  /**
   * Clean up temporary files after successful backup
   */
  private async cleanupTempFiles(...filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          await fs.unlink(filePath);
        }

        console.log(`Cleaned up temporary file: ${filePath}`);
      } catch (error) {
        console.warn(`Failed to clean up temporary file: ${filePath}`, error);
        // Continue cleaning other files even if one fails
      }
    }
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.removeDirectory(fullPath);
        } else {
          await fs.unlink(fullPath);
        }
      }

      await fs.rmdir(dirPath);
    } catch (error) {
      console.error(`Failed to remove directory: ${dirPath}`, error);
      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(maxCount?: number, maxDays?: number): Promise<void> {
    try {
      console.log(`Starting backup cleanup: maxCount=${maxCount}, maxDays=${maxDays}`);

      // List all backup files
      const allFiles = await this.storageAdapter.listFiles();

      if (allFiles.length === 0) {
        console.log('No backup files found to clean up');
        return;
      }

      // Parse backup filenames to get dates
      const backups = allFiles
        .filter((file) => file.endsWith('.tar.gz'))
        .map((file) => ({
          filename: file,
          date: this.parseBackupDate(file),
          path: file,
        }))
        .filter((b) => b.date !== null)
        .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

      // Apply retention policies
      const filesToDelete: string[] = [];

      // Policy 1: Keep only the most recent N backups
      if (maxCount && backups.length > maxCount) {
        const toDelete = backups.slice(maxCount);
        filesToDelete.push(...toDelete.map((b) => b.filename));
      }

      // Policy 2: Delete backups older than N days
      if (maxDays) {
        const cutoffDate = dayjs().subtract(maxDays, 'days').toDate();
        for (const backup of backups) {
          if (backup.date && backup.date < cutoffDate) {
            if (!filesToDelete.includes(backup.filename)) {
              filesToDelete.push(backup.filename);
            }
          }
        }
      }

      // Delete the old backups
      for (const filename of filesToDelete) {
        try {
          await this.storageAdapter.deleteFile(filename);
          console.log(`Deleted old backup: ${filename}`);
        } catch (error) {
          console.error(`Failed to delete backup: ${filename}`, error);
        }
      }

      console.log(`Backup cleanup completed. Deleted ${filesToDelete.length} old backups.`);
    } catch (error) {
      console.error('Failed to clean up old backups:', error);
      throw error;
    }
  }

  /**
   * Parse backup date from filename
   * Format: YYYY-MM-DD/backup_YYYY-MM-DD_HH-mm-ss_timestamp.tar.gz
   */
  private parseBackupDate(filename: string): Date | null {
    try {
      // Extract date from format: YYYY-MM-DD/backup_YYYY-MM-DD_...
      const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const dateStr = match[1];
        const date = dayjs(dateStr, 'YYYY-MM-DD').toDate();
        return date;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to parse backup date from: ${filename}`, error);
      return null;
    }
  }

  /**
   * Cleanup worker resources
   * Call this before destroying the BackupExecutor instance
   */
  async destroy(): Promise<void> {
    if (this.activeWorker) {
      console.log('Terminating active backup worker...');
      this.activeWorker.terminate();
      this.activeWorker = null;
    }

    for (const worker of this.workerPool) {
      try {
        await worker.terminate();
      } catch (error) {
        console.warn('Failed to terminate worker:', error);
      }
    }

    this.workerPool = [];
  }
}
