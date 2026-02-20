import { EventEmitter } from 'events';

import { Service } from 'typedi';

import { config } from '../config/config.js';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';

import { BackupExecutor } from './backup-executor.js';

import type { UnifiedStorageAdapter } from '../sources/unified-storage-adapter/index.js';

/**
 * Backup service for managing database backups
 * Implements event-driven backup with throttling to prevent excessive backups
 */
@Service()
export class BackupService extends EventEmitter {
  private lastBackupTime = 0;
  private backupInProgress = false;
  private storageAdapter: UnifiedStorageAdapter | null = null;
  private backupExecutor: BackupExecutor | null = null;

  async initialize(): Promise<void> {
    if (!config.backup.enabled) {
      console.log('Backup service is disabled');
      return;
    }

    // Check if LanceDB is using S3 storage
    // If so, backup is not needed as S3 is already a managed storage solution
    if (config.lancedb.storageType === 's3') {
      console.log(
        'LanceDB is configured to use S3 storage. Backup service is disabled (S3 provides built-in redundancy)'
      );
      return;
    }

    try {
      console.log('Initializing backup service...');

      // Create storage adapter using unified factory
      this.storageAdapter = UnifiedStorageAdapterFactory.createBackupAdapter(config.backup);

      // Create backup executor
      this.backupExecutor = new BackupExecutor({
        storageAdapter: this.storageAdapter,
        tempDir: './tmp/backup',
        lancedbPath: config.lancedb.path,
      });

      console.log('Backup service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      throw error;
    }
  }

  /**
   * Trigger a backup event
   * Will be throttled based on configuration
   * Only works if LanceDB uses local storage
   */
  async triggerBackup(reason: string = 'manual'): Promise<void> {
    if (!config.backup.enabled) {
      console.log('Backup is disabled, skipping backup trigger');
      return;
    }

    // Double-check that LanceDB is not using S3
    if (config.lancedb.storageType === 's3') {
      console.log('Cannot backup S3-based database. LanceDB is configured to use S3 storage.');
      return;
    }

    if (!this.storageAdapter || !this.backupExecutor) {
      console.warn('Backup service not initialized, skipping backup');
      return;
    }

    // Check throttle: ensure minimum interval between backups
    const now = Date.now();
    const timeSinceLastBackup = now - this.lastBackupTime;

    if (timeSinceLastBackup < config.backup.throttleIntervalMs) {
      const remainingTime = config.backup.throttleIntervalMs - timeSinceLastBackup;
      console.log(
        `Backup throttled. Next backup available in ${Math.ceil(remainingTime / 1000)}s (reason: ${reason})`
      );
      return;
    }

    // Prevent concurrent backups
    if (this.backupInProgress) {
      console.log('Backup already in progress, skipping new backup request');
      return;
    }

    // Execute backup asynchronously without waiting
    this.executeBackupAsync(reason).catch((error) => {
      console.error('Asynchronous backup execution failed:', error);
    });
  }

  /**
   * Execute backup asynchronously
   */
  private async executeBackupAsync(reason: string): Promise<void> {
    this.backupInProgress = true;
    this.lastBackupTime = Date.now();

    try {
      console.log(`Starting backup execution (reason: ${reason})`);

      if (!this.backupExecutor) {
        throw new Error('Backup executor not initialized');
      }

      // Execute backup
      const filename = await this.backupExecutor.executeBackup();
      console.log(`Backup completed successfully: ${filename}`);

      // Clean up old backups
      await this.backupExecutor.cleanupOldBackups(
        config.backup.retentionPolicy.maxCount,
        config.backup.retentionPolicy.maxDays
      );

      // Emit success event
      this.emit('backup:success', {
        filename,
        reason,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Backup execution failed:', error);

      // Emit error event
      this.emit('backup:error', {
        error,
        reason,
        timestamp: Date.now(),
      });
    } finally {
      this.backupInProgress = false;
    }
  }

  /**
   * Get backup status
   */
  getStatus(): {
    enabled: boolean;
    inProgress: boolean;
    lastBackupTime: number;
    throttleInterval: number;
  } {
    return {
      enabled: config.backup.enabled,
      inProgress: this.backupInProgress,
      lastBackupTime: this.lastBackupTime,
      throttleInterval: config.backup.throttleIntervalMs,
    };
  }

  /**
   * Manually trigger a full backup (bypasses throttle)
   * Used for administrative operations
   */
  async forceBackup(): Promise<void> {
    if (!config.backup.enabled) {
      throw new Error('Backup is disabled');
    }

    if (!this.backupExecutor) {
      throw new Error('Backup executor not initialized');
    }

    if (this.backupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.backupInProgress = true;

    try {
      console.log('Force backup started');
      const filename = await this.backupExecutor.executeBackup();
      console.log(`Force backup completed: ${filename}`);

      // Clean up old backups
      await this.backupExecutor.cleanupOldBackups(
        config.backup.retentionPolicy.maxCount,
        config.backup.retentionPolicy.maxDays
      );
    } finally {
      this.backupInProgress = false;
    }
  }

  /**
   * Cleanup old backups manually
   */
  async cleanupOldBackups(): Promise<void> {
    if (!this.backupExecutor) {
      throw new Error('Backup executor not initialized');
    }

    await this.backupExecutor.cleanupOldBackups(
      config.backup.retentionPolicy.maxCount,
      config.backup.retentionPolicy.maxDays
    );
  }
}
