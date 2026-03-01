/**
 * Attachment DTO definitions
 */

/**
 * Attachment information DTO
 */
export interface AttachmentDto {
  /** Unique attachment identifier */
  attachmentId: string;
  /** Original filename */
  filename: string;
  /** Public URL to access the attachment */
  url: string;
  /** MIME type of the attachment */
  type: string;
  /** File size in bytes */
  size: number;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** Optional cover image URL for videos */
  coverUrl?: string;
  /** Optional properties: audio(duration), image(width,height), video(duration) */
  properties?: Record<string, unknown>;
}

/**
 * Update attachment properties request DTO
 */
export interface UpdateAttachmentPropertiesDto {
  /** Properties to update: audio(duration), image(width,height), video(duration) */
  properties: Record<string, unknown>;
}

/**
 * Update attachment properties response DTO
 */
export interface UpdateAttachmentPropertiesResponseDto {
  /** Success message */
  message: string;
  /** Updated attachment data */
  attachment: AttachmentDto;
}

/**
 * Upload attachment response DTO
 */
export interface UploadAttachmentResponseDto {
  /** Success message */
  message: string;
  /** Uploaded attachment data */
  attachment: AttachmentDto;
}

/**
 * Attachment list response DTO
 */
export interface AttachmentListResponseDto {
  /** Array of attachment items */
  items: AttachmentDto[];
  /** Total number of attachments */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
}
