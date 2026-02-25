import type { AttachmentDto } from '@aimo/dto';
import request from '../utils/request';

export interface GetAttachmentsParams {
  page?: number;
  limit?: number;
}

export interface GetAttachmentsResponse {
  items: AttachmentDto[];
  total: number;
  page: number;
  limit: number;
}

export const attachmentApi = {
  /**
   * 上传附件
   * @param file - 文件对象
   * @param createdAt - 可选的创建时间戳 (毫秒)，用于导入时保持原始时间
   */
  async upload(file: File, createdAt?: number): Promise<AttachmentDto> {
    const formData = new FormData();
    formData.append('file', file);
    if (createdAt) {
      formData.append('createdAt', createdAt.toString());
    }

    const response = await request.post<
      FormData,
      { code: number; data: { attachment: AttachmentDto }; message?: string }
    >('/api/v1/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.code === 0) {
      return response.data.attachment;
    }

    throw new Error(response.message || 'Upload failed');
  },

  /**
   * 批量上传附件
   */
  async uploadBatch(files: File[]): Promise<AttachmentDto[]> {
    const uploads = files.map((file) => this.upload(file));
    return await Promise.all(uploads);
  },

  /**
   * 获取附件列表
   */
  async getAttachments(
    params?: GetAttachmentsParams
  ): Promise<GetAttachmentsResponse> {
    const response = await request.get<
      unknown,
      { code: number; data: GetAttachmentsResponse; message?: string }
    >('/api/v1/attachments', { params });

    if (response.code === 0) {
      return response.data;
    }

    throw new Error(response.message || 'Get attachments failed');
  },

  /**
   * 删除附件
   */
  async delete(attachmentId: string): Promise<void> {
    const response = await request.delete<
      unknown,
      { code: number; data: { message: string }; message?: string }
    >(`/api/v1/attachments/${attachmentId}`);

    if (response.code !== 0) {
      throw new Error(response.message || 'Delete failed');
    }
  },

  /**
   * 更新附件属性
   * @param attachmentId - 附件 ID
   * @param properties - 要更新的属性 (audio: duration, image: width/height, video: duration)
   */
  async updateProperties(
    attachmentId: string,
    properties: Record<string, unknown>
  ): Promise<AttachmentDto> {
    const response = await request.patch<
      { properties: Record<string, unknown> },
      {
        code: number;
        data: { attachment: AttachmentDto };
        message?: string;
      }
    >(`/api/v1/attachments/${attachmentId}/properties`, { properties });

    if (response.code === 0) {
      return response.data.attachment;
    }

    throw new Error(response.message || 'Update properties failed');
  },
};
