import { LocalUnifiedStorageAdapter } from './local.adapter.js';
import { OSSUnifiedStorageAdapter } from './oss.adapter.js';
import { S3UnifiedStorageAdapter } from './s3.adapter.js';

import type { UnifiedStorageAdapter } from './base.adapter.js';
import type {
  AttachmentConfig,
  BackupConfig,
  LocalStorageConfig,
  S3StorageConfig,
  OSSStorageConfig,
  AttachmentStorageType,
  BackupStorageType,
} from '../../config/config.js';

/**
 * Factory for creating unified storage adapters based on configuration
 *
 * Supports:
 * - Local storage
 * - S3-compatible services (AWS S3, MinIO, etc.)
 * - Aliyun OSS (using ali-oss official library)
 */
export const UnifiedStorageAdapterFactory = {
  /**
   * Create storage adapter for attachment storage
   */
  createAttachmentAdapter(attachmentConfig: AttachmentConfig): UnifiedStorageAdapter {
    const storageType = attachmentConfig.storageType;

    console.log(`Creating attachment storage adapter for type: ${storageType}`);

    switch (storageType) {
      case 'local': {
        if (!attachmentConfig.local) {
          throw new Error('Local storage configuration is missing for attachments');
        }
        return new LocalUnifiedStorageAdapter(attachmentConfig.local.path);
      }

      case 's3': {
        if (!attachmentConfig.s3) {
          throw new Error('S3 storage configuration is missing for attachments');
        }
        return new S3UnifiedStorageAdapter({
          bucket: attachmentConfig.s3.bucket,
          prefix: attachmentConfig.s3.prefix,
          region: attachmentConfig.s3.region,
          endpoint: attachmentConfig.s3.endpoint,
          accessKeyId: attachmentConfig.s3.awsAccessKeyId,
          secretAccessKey: attachmentConfig.s3.awsSecretAccessKey,
          isPublic: attachmentConfig.s3.isPublic,
        });
      }

      case 'oss': {
        if (!attachmentConfig.oss) {
          throw new Error('OSS storage configuration is missing for attachments');
        }
        return new OSSUnifiedStorageAdapter({
          bucket: attachmentConfig.oss.bucket,
          prefix: attachmentConfig.oss.prefix,
          region: attachmentConfig.oss.region,
          accessKeyId: attachmentConfig.oss.accessKeyId,
          accessKeySecret: attachmentConfig.oss.accessKeySecret,
          endpoint: attachmentConfig.oss.endpoint,
          isPublic: attachmentConfig.oss.isPublic,
        });
      }

      default: {
        throw new Error(`Unsupported attachment storage type: ${storageType}`);
      }
    }
  },

  /**
   * Create storage adapter for backup storage
   */
  createBackupAdapter(backupConfig: BackupConfig): UnifiedStorageAdapter {
    const storageType = backupConfig.storageType;

    console.log(`Creating backup storage adapter for type: ${storageType}`);

    switch (storageType) {
      case 'local': {
        if (!backupConfig.local) {
          throw new Error('Local storage configuration is missing for backups');
        }
        return new LocalUnifiedStorageAdapter(backupConfig.local.path);
      }

      case 's3': {
        if (!backupConfig.s3) {
          throw new Error('S3 storage configuration is missing for backups');
        }
        return new S3UnifiedStorageAdapter({
          bucket: backupConfig.s3.bucket,
          prefix: backupConfig.s3.prefix,
          region: backupConfig.s3.region,
          endpoint: backupConfig.s3.endpoint,
          accessKeyId: backupConfig.s3.awsAccessKeyId,
          secretAccessKey: backupConfig.s3.awsSecretAccessKey,
          isPublic: backupConfig.s3.isPublic,
        });
      }

      case 'oss': {
        if (!backupConfig.oss) {
          throw new Error('OSS storage configuration is missing for backups');
        }
        return new OSSUnifiedStorageAdapter({
          bucket: backupConfig.oss.bucket,
          prefix: backupConfig.oss.prefix,
          region: backupConfig.oss.region,
          accessKeyId: backupConfig.oss.accessKeyId,
          accessKeySecret: backupConfig.oss.accessKeySecret,
          endpoint: backupConfig.oss.endpoint,
          isPublic: backupConfig.oss.isPublic,
        });
      }

      default: {
        throw new Error(`Unsupported backup storage type: ${storageType}`);
      }
    }
  },
};
