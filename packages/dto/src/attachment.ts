/**
 * Attachment DTO definitions
 */

/**
 * Attachment information DTO
 */
export interface AttachmentDto {
  attachmentId: string; // unique attachment identifier
  filename: string;
  url: string;
  type: string; // MIME type
  size: number; // file size in bytes
  createdAt: number; // timestamp in milliseconds
}

/**
 * Upload attachment response DTO
 */
export interface UploadAttachmentResponseDto {
  message: string;
  attachment: AttachmentDto;
}

/**
 * Attachment list response DTO
 */
export interface AttachmentListResponseDto {
  items: AttachmentDto[];
  total: number;
  page: number;
  limit: number;
}
