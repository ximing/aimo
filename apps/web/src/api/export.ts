import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Download attachment as Blob through secure proxy
 * This ensures proper authentication and permission checking
 */
export const downloadAttachment = async (attachmentId: string): Promise<Blob> => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/attachments/${attachmentId}/download`, {
    responseType: 'blob',
    timeout: 60000, // 60 second timeout for large files
  });

  return response.data;
};
