import axios from 'axios';
import type { AttachmentDto, UploadAttachmentResponseDto } from '@aimo/dto';

const API_BASE = '/api/v1/attachments';

export const attachmentApi = {
  /**
   * 上传附件
   */
  async upload(file: File): Promise<AttachmentDto> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post<UploadAttachmentResponseDto>(`${API_BASE}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

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
   * 删除附件
   */
  async delete(attachmentId: string): Promise<void> {
    const response = await axios.delete(`${API_BASE}/${attachmentId}`);
    
    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Delete failed');
    }
  },
};