import axios from 'axios';
import type { AttachmentDto, UploadAttachmentResponseDto } from '@aimo/dto';

const API_BASE = '/api/v1/attachments';

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

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

    const response = await axios.post<ApiResponse<UploadAttachmentResponseDto>>(
      `${API_BASE}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data.code === 0) {
      return response.data.data.attachment;
    }

    throw new Error(response.data.message || 'Upload failed');
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
  async getAttachments(params?: GetAttachmentsParams): Promise<GetAttachmentsResponse> {
    const response = await axios.get<ApiResponse<GetAttachmentsResponse>>(API_BASE, { params });

    if (response.data.code === 0) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Get attachments failed');
  },

  /**
   * 删除附件
   */
  async delete(attachmentId: string): Promise<void> {
    const response = await axios.delete<ApiResponse<{ message: string }>>(
      `${API_BASE}/${attachmentId}`
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Delete failed');
    }
  },
};
