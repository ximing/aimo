import { LocalUnifiedStorageAdapter } from './local.adapter.js';
import { OSSUnifiedStorageAdapter } from './oss.adapter.js';
import { S3UnifiedStorageAdapter } from './s3.adapter.js';

import type { UnifiedStorageAdapter } from './base.adapter.js';
import type {
  AttachmentConfig,
  LocalStorageConfig,
  S3StorageConfig,
  OSSStorageConfig,
  AttachmentStorageType,
} from '../../config/config.js';
import { logger } from '../../utils/logger.js';

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

    logger.info(`Creating attachment storage adapter for type: ${storageType}`);

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
};
