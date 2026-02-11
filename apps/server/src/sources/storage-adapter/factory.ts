import type { BackupConfig } from '../../config/config.js';
import type { StorageAdapter } from './base.adapter.js';
import { LocalStorageAdapter } from './local.adapter.js';
import { S3StorageAdapter } from './s3.adapter.js';
import { OSSStorageAdapter } from './oss.adapter.js';

/**
 * Factory for creating storage adapters based on configuration
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

      case 'oss': {
        if (!backupConfig.oss) {
          throw new Error('OSS configuration is missing');
        }
        return new OSSStorageAdapter({
          bucket: backupConfig.oss.bucket,
          prefix: backupConfig.oss.prefix,
          region: backupConfig.oss.region,
          endpoint: backupConfig.oss.endpoint,
          accessKeyId: backupConfig.oss.accessKeyId,
          accessKeySecret: backupConfig.oss.accessKeySecret,
        });
      }

      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }
}
