import type { BackupConfig } from '../../config/config.js';
import type { StorageAdapter } from './base.adapter.js';
import { LocalStorageAdapter } from './local.adapter.js';
import { S3StorageAdapter } from './s3.adapter.js';

/**
 * Factory for creating storage adapters based on configuration
 * 
 * Supports:
 * - Local storage
 * - S3-compatible services (AWS S3, MinIO, Aliyun OSS, etc.)
 */
export class StorageAdapterFactory {
  static createAdapter(backupConfig: BackupConfig): StorageAdapter {
    const storageType = backupConfig.storageType;

    console.log(`Creating storage adapter for type: ${storageType}`);

    switch (storageType) {
      case 'local': {
        if (!backupConfig.local) {
          throw new Error('Local storage configuration is missing');
        }
        return new LocalStorageAdapter(backupConfig.local.path);
      }

      case 's3': {
        if (!backupConfig.s3) {
          throw new Error('S3 configuration is missing');
        }
        return new S3StorageAdapter({
          bucket: backupConfig.s3.bucket,
          prefix: backupConfig.s3.prefix,
          region: backupConfig.s3.region,
          endpoint: backupConfig.s3.endpoint,
          accessKeyId: backupConfig.s3.awsAccessKeyId,
          secretAccessKey: backupConfig.s3.awsSecretAccessKey,
        });
      }

      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }
}
