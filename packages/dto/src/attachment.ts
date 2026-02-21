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
  properties?: Record<string, unknown>; // optional properties: audio(duration), image(width,height), video(duration)
}

/**
 * Update attachment properties request DTO
 */
export interface UpdateAttachmentPropertiesDto {
  properties: Record<string, unknown>; // properties to update: audio(duration), image(width,height), video(duration)
}

/**
 * Update attachment properties response DTO
 */
export interface UpdateAttachmentPropertiesResponseDto {
  message: string;
  attachment: AttachmentDto;
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
