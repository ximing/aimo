# React Native - 附件上传下载示例

基于 `/apps/server/src/controllers/v1/attachment.controller.ts` 的 RN 集成示例

## API 端点概览

| 方法 | 端点 | 功能 | 认证 |
|------|------|------|------|
| POST | `/api/v1/attachments/upload` | 上传文件 | ✅ 必需 |
| GET | `/api/v1/attachments` | 获取附件列表 | ✅ 必需 |
| GET | `/api/v1/attachments/:attachmentId` | 获取单个附件信息 | ✅ 必需 |
| GET | `/api/v1/attachments/:attachmentId/download` | 下载文件 | ✅ 必需 |
| DELETE | `/api/v1/attachments/:attachmentId` | 删除附件 | ✅ 必需 |

## 1. RN 附件服务实现

```typescript
// services/attachment.service.ts
import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as DocumentPicker from 'react-native-document-picker';
import * as ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import type { AttachmentDto, UploadAttachmentResponseDto } from '@aimo/dto';

const API_BASE = '/api/v1/attachments';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface AttachmentServiceConfig {
  baseURL: string;
  timeout?: number;
  getToken?: () => string;
}

export class RNAttachmentService {
  private client: AxiosInstance;
  private config: AttachmentServiceConfig;

  constructor(config: AttachmentServiceConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
    });

    // 添加认证拦截器
    this.client.interceptors.request.use((config) => {
      const token = this.config.getToken?.();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * 上传文件 - 通用方法
   * @param file 文件对象 { uri, name, type }
   * @param onProgress 进度回调
   * @param createdAt 可选的创建时间戳 (毫秒)，用于导入时保持原始时间
   */
  async uploadFile(
    file: {
      uri: string;
      name: string;
      type: string;
      size?: number;
    },
    onProgress?: (progress: UploadProgress) => void,
    createdAt?: number
  ): Promise<AttachmentDto> {
    try {
      // 读取文件为 base64 或 binary
      const fileData = await RNFS.readFile(file.uri, 'base64');

      // 构建 FormData
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as any);

      if (createdAt) {
        formData.append('createdAt', createdAt.toString());
      }

      // 上传文件，带进度回调
      const response = await this.client.post<{
        code: number;
        data: UploadAttachmentResponseDto;
        message?: string;
      }>(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percent,
            });
          }
        },
      });

      if (response.data.code === 0) {
        return response.data.data.attachment;
      }

      throw new Error(response.data.message || 'Upload failed');
    } catch (error) {
      console.error('Upload file error:', error);
      throw error;
    }
  }

  /**
   * 从相机选择图片上传
   */
  async uploadFromCamera(onProgress?: (progress: UploadProgress) => void): Promise<AttachmentDto> {
    return new Promise((resolve, reject) => {
      ImagePicker.launchCamera(
        {
          mediaType: 'photo',
          cameraType: 'back',
        },
        async (response) => {
          if (response.didCancel) {
            reject(new Error('Camera cancelled'));
          } else if (response.errorCode) {
            reject(new Error(`Camera error: ${response.errorMessage}`));
          } else if (response.assets?.[0]) {
            const asset = response.assets[0];
            try {
              const attachment = await this.uploadFile(
                {
                  uri: asset.uri || '',
                  name: asset.fileName || `photo_${Date.now()}.jpg`,
                  type: asset.type || 'image/jpeg',
                  size: asset.fileSize,
                },
                onProgress
              );
              resolve(attachment);
            } catch (error) {
              reject(error);
            }
          }
        }
      );
    });
  }

  /**
   * 从相册选择图片上传
   */
  async uploadFromPhotoLibrary(
    onProgress?: (progress: UploadProgress) => void
  ): Promise<AttachmentDto> {
    return new Promise((resolve, reject) => {
      ImagePicker.launchImageLibrary(
        {
          mediaType: 'photo',
          selectionLimit: 1,
        },
        async (response) => {
          if (response.didCancel) {
            reject(new Error('Photo library cancelled'));
          } else if (response.errorCode) {
            reject(new Error(`Photo error: ${response.errorMessage}`));
          } else if (response.assets?.[0]) {
            const asset = response.assets[0];
            try {
              const attachment = await this.uploadFile(
                {
                  uri: asset.uri || '',
                  name: asset.fileName || `photo_${Date.now()}.jpg`,
                  type: asset.type || 'image/jpeg',
                  size: asset.fileSize,
                },
                onProgress
              );
              resolve(attachment);
            } catch (error) {
              reject(error);
            }
          }
        }
      );
    });
  }

  /**
   * 从文件选择器上传
   */
  async uploadFromDocumentPicker(
    onProgress?: (progress: UploadProgress) => void
  ): Promise<AttachmentDto> {
    try {
      const results = await DocumentPicker.pick({
        presentationStyle: 'fullScreen',
        copyTo: 'cachesDirectory',
      });

      if (results && results.length > 0) {
        const doc = results[0];
        const attachment = await this.uploadFile(
          {
            uri: doc.fileCopyUri || doc.uri || '',
            name: doc.name || `file_${Date.now()}`,
            type: doc.type || 'application/octet-stream',
            size: doc.size,
          },
          onProgress
        );
        return attachment;
      }

      throw new Error('No file selected');
    } catch (error) {
      console.error('Document picker error:', error);
      throw error;
    }
  }

  /**
   * 批量上传文件
   */
  async uploadBatch(
    files: Array<{
      uri: string;
      name: string;
      type: string;
    }>,
    onBatchProgress?: (current: number, total: number) => void
  ): Promise<AttachmentDto[]> {
    const results: AttachmentDto[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      try {
        const attachment = await this.uploadFile(files[i]);
        results.push(attachment);
        onBatchProgress?.(i + 1, total);
      } catch (error) {
        console.error(`Failed to upload file ${i + 1}:`, error);
      }
    }

    return results;
  }

  /**
   * 获取附件列表
   */
  async getAttachments(params?: { page?: number; limit?: number }): Promise<{
    items: AttachmentDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await this.client.get<{
        code: number;
        data: {
          items: AttachmentDto[];
          total: number;
          page: number;
          limit: number;
        };
      }>(API_BASE, { params });

      if (response.data.code === 0) {
        return response.data.data;
      }

      throw new Error('Get attachments failed');
    } catch (error) {
      console.error('Get attachments error:', error);
      throw error;
    }
  }

  /**
   * 获取单个附件信息
   */
  async getAttachment(attachmentId: string): Promise<AttachmentDto> {
    try {
      const response = await this.client.get<{
        code: number;
        data: AttachmentDto;
      }>(`${API_BASE}/${attachmentId}`);

      if (response.data.code === 0) {
        return response.data.data;
      }

      throw new Error('Get attachment failed');
    } catch (error) {
      console.error('Get attachment error:', error);
      throw error;
    }
  }

  /**
   * 下载附件到本地
   * @param attachmentId 附件 ID
   * @param filename 保存的文件名（可选，默认使用远程文件名）
   * @param onProgress 进度回调
   */
  async downloadAttachment(
    attachmentId: string,
    filename?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      const response = await this.client.get<any>(`${API_BASE}/${attachmentId}/download`, {
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percent,
            });
          }
        },
      });

      // 获取文件名
      const disposition = response.headers['content-disposition'];
      let saveName = filename;
      if (!saveName && disposition) {
        const match = disposition.match(/filename="(.+?)"/);
        if (match) {
          saveName = decodeURIComponent(match[1]);
        }
      }
      saveName = saveName || `attachment_${attachmentId}`;

      // 根据平台选择保存路径
      const downloadDir =
        Platform.OS === 'ios'
          ? `${RNFS.DocumentDirectoryPath}/Downloads`
          : `${RNFS.DownloadDirectoryPath}`;

      // 确保目录存在
      const dirExists = await RNFS.exists(downloadDir);
      if (!dirExists) {
        await RNFS.mkdir(downloadDir);
      }

      const filePath = `${downloadDir}/${saveName}`;

      // 保存文件
      await RNFS.writeFile(filePath, response.data, 'utf8');

      return filePath;
    } catch (error) {
      console.error('Download attachment error:', error);
      throw error;
    }
  }

  /**
   * 删除附件
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      const response = await this.client.delete<{
        code: number;
        message?: string;
      }>(`${API_BASE}/${attachmentId}`);

      if (response.data.code !== 0) {
        throw new Error(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete attachment error:', error);
      throw error;
    }
  }

  /**
   * 获取本地下载文件路径
   * (用于已下载的附件)
   */
  async getLocalDownloadPath(filename: string): Promise<string | null> {
    const downloadDir =
      Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/Downloads`
        : `${RNFS.DownloadDirectoryPath}`;

    const filePath = `${downloadDir}/${filename}`;
    const exists = await RNFS.exists(filePath);

    return exists ? filePath : null;
  }

  /**
   * 删除本地下载文件
   */
  async deleteLocalFile(filePath: string): Promise<void> {
    try {
      await RNFS.unlink(filePath);
    } catch (error) {
      console.error('Delete local file error:', error);
      throw error;
    }
  }
}
```
