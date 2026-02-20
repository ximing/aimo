/**
 * Avatar Service
 * 头像上传和管理服务
 */

import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { UnifiedStorageAdapterFactory } from '../sources/unified-storage-adapter/index.js';

import type { UnifiedStorageAdapter } from '../sources/unified-storage-adapter/index.js';

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
   * 返回存储路径（path），而不是访问URL
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

    // 返回存储路径，而不是访问URL
    return path;
  }

  /**
   * 生成头像访问URL
   * @param avatarPath - 头像存储路径
   * @param expiresIn - 过期时间（秒），默认7天
   * @returns 带过期时间的访问URL
   */
  async generateAvatarAccessUrl(avatarPath: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<string> {
    if (!avatarPath) return '';

    // 如果已经是完整URL，直接返回
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }

    const attachmentConfig = config.attachment;
    const metadata = {
      bucket: this.getStorageMetadata('bucket', attachmentConfig),
      prefix: this.getStorageMetadata('prefix', attachmentConfig),
      endpoint: this.getStorageMetadata('endpoint', attachmentConfig),
      region: this.getStorageMetadata('region', attachmentConfig),
      isPublicBucket: this.getStorageMetadata('isPublicBucket', attachmentConfig),
    };

    return await this.storageAdapter.generateAccessUrl(avatarPath, metadata, expiresIn);
  }

  /**
   * 下载头像文件
   * @param avatarPath - 头像存储路径
   * @returns 包含 buffer、etag、contentType 的对象
   */
  async downloadAvatar(avatarPath: string): Promise<{ buffer: Buffer; etag: string; contentType: string }> {
    if (!avatarPath) {
      throw new Error('Avatar path is empty');
    }

    // Extract key from URL if it's a full URL
    let key = avatarPath;
    if (avatarPath.startsWith('http')) {
      try {
        const url = new URL(avatarPath);
        key = url.pathname;
        const prefix = config.attachment.s3?.prefix || config.attachment.oss?.prefix || 'attachments';
        if (key.startsWith(`/${prefix}/`)) {
          key = key.slice(prefix.length + 2);
        }
      } catch {
        // If parsing fails, use the path as-is
      }
    }
    key = key.replace(/^\/+/, '');

    // Download file from storage
    const buffer = await this.storageAdapter.downloadFile(key);

    // Get file metadata for ETag and content type
    const fileMetadata = await this.storageAdapter.getFileMetadata(key);

    // Determine content type from file extension
    const contentType = this.getContentType(key);

    // Generate ETag from file metadata or content
    const etag = fileMetadata
      ? `"${fileMetadata.lastModified.getTime().toString(16)}"`
      : `"${Buffer.isBuffer(buffer) ? buffer.length : 0}"`;

    return { buffer, etag, contentType };
  }

  /**
   * Get content type from file extension
   */
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    return mimeTypes[ext] || 'application/octet-stream';
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
