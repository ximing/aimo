/**
 * Attachment DTO definitions
 */

/**
 * Attachment information DTO
 */
export interface AttachmentDto {
  id: string; // attachmentId
  filename: string;
  url: string;
  type: string; // MIME type
  size: number; // file size in bytes
  createdAt: string; // ISO 8601 date string
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
