import request from '../utils/request';
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * Download attachment as Blob through secure proxy
 * This ensures proper authentication and permission checking
 */
export const downloadAttachment = async (
  attachmentId: string
): Promise<Blob> => {
  const response = await request.get<unknown, Blob>(
    `/api/v1/attachments/${attachmentId}/download`,
    {
      responseType: 'blob',
      timeout: 60000, // 60 second timeout for large files
    } as InternalAxiosRequestConfig
  );

  return response;
};
