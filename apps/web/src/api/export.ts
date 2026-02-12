import axios from 'axios';

/**
 * Download attachment as Blob through secure proxy
 * This ensures proper authentication and permission checking
 */
export const downloadAttachment = async (attachmentId: string): Promise<Blob> => {
  const response = await axios.get(`/api/v1/attachments/${attachmentId}/download`, {
    responseType: 'blob',
    timeout: 60000, // 60 second timeout for large files
  });

  return response.data;
};
