/**
 * Avatar Service
 * 头像上传和管理服务
 */

import { Service } from 'typedi';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';
import type { UnifiedStorageAdapter } from '../sources/unified-storage-adapter/index.js';
import { config } from '../config/config.js';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid';

export interface UploadAvatarOptions {
  uid: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface DeleteAvatarOptions {
  uid: string;
  avatarPath: string;
}

@Service()
export class AvatarService {
  private storageAdapter: UnifiedStorageAdapter;

  constructor() {
    // 使用 ATTACHMENT_ 配置创建存储适配器
    this.storageAdapter = UnifiedStorageAdapterFactory.createAttachmentAdapter(
      config.attachment
    );
  }

  /**
   * 上传头像
   * 路径格式: avatar/{uid}/{YYYY-MM-DD}/{nanoid}.{ext}
   */
  async uploadAvatar(options: UploadAvatarOptions): Promise<string> {
    const { uid, buffer, filename, mimeType } = options;

    // 生成唯一文件名
    const fileId = nanoid(24);
    const ext = filename.split('.').pop() || 'png';
    const dateStr = dayjs().format('YYYY-MM-DD');

    // 构建存储路径: avatar/{uid}/{YYYY-MM-DD}/{nanoid}.{ext}
    const path = `avatar/${uid}/${dateStr}/${fileId}.${ext}`;

    // 上传到存储
    await this.storageAdapter.uploadFile(path, buffer);

    // 生成访问 URL
    const attachmentConfig = config.attachment;
    const metadata = {
      bucket: this.getStorageMetadata('bucket', attachmentConfig),
      prefix: this.getStorageMetadata('prefix', attachmentConfig),
      endpoint: this.getStorageMetadata('endpoint', attachmentConfig),
      region: this.getStorageMetadata('region', attachmentConfig),
      isPublicBucket: this.getStorageMetadata('isPublicBucket', attachmentConfig),
    };

    const accessUrl = await this.storageAdapter.generateAccessUrl(path, metadata);

    return accessUrl;
  }

  /**
   * 删除旧头像
   */
  async deleteAvatar(avatarPath: string): Promise<void> {
    if (!avatarPath) return;

    try {
      // 从完整 URL 中提取路径（如果是完整 URL）
      let key = avatarPath;

      // 如果是完整 URL，尝试提取路径部分
      if (avatarPath.startsWith('http')) {
        try {
          const url = new URL(avatarPath);
          key = url.pathname;
          // 去除前缀（如 /attachments/ 或配置的 prefix）
          const prefix = config.attachment.s3?.prefix || config.attachment.oss?.prefix || 'attachments';
          if (key.startsWith(`/${prefix}/`)) {
            key = key.slice(prefix.length + 2);
          }
        } catch {
          // 如果解析失败，尝试直接使用
        }
      }

      // 去除可能存在的 leading slash
      key = key.replace(/^\/+/, '');

      // 检查文件是否存在后再删除
      const exists = await this.storageAdapter.fileExists(key);
      if (exists) {
        await this.storageAdapter.deleteFile(key);
      }
    } catch (error) {
      // 删除失败不应阻止头像更新
      console.warn('Failed to delete old avatar:', error);
    }
  }

  /**
   * 获取存储元数据
   */
  private getStorageMetadata(
    key: 'bucket' | 'prefix' | 'endpoint' | 'region' | 'isPublicBucket',
    attachmentConfig: typeof config.attachment
  ): string | undefined {
    const storageType = attachmentConfig.storageType;

    switch (storageType) {
      case 'local':
        return undefined;
      case 's3':
        return attachmentConfig.s3?.[
          key === 'bucket'
            ? 'bucket'
            : key === 'prefix'
            ? 'prefix'
            : key === 'region'
            ? 'region'
            : key === 'endpoint'
            ? 'endpoint'
            : key === 'isPublicBucket'
            ? 'isPublic'
            : 'prefix'
        ] as string | undefined;
      case 'oss':
        return attachmentConfig.oss?.[
          key === 'bucket'
            ? 'bucket'
            : key === 'prefix'
            ? 'prefix'
            : key === 'region'
            ? 'region'
            : key === 'endpoint'
            ? 'endpoint'
            : key === 'isPublicBucket'
            ? 'isPublic'
            : 'prefix'
        ] as string | undefined;
      default:
        return undefined;
    }
  }
}
