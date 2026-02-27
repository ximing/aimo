// Type definitions for AIMO Extension

/** Extension configuration */
export interface Config {
  /** AIMO server URL */
  url: string;
  /** JWT authentication token */
  token: string;
  /** Username for display */
  username?: string;
}

/** Upload status for image items */
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

/** Pending item waiting to be saved */
export interface PendingItem {
  /** Unique identifier */
  id: string;
  /** Type of content */
  type: 'text' | 'image';
  /** Content data (text or image URL) */
  content: string;
  /** Source page URL */
  sourceUrl: string;
  /** Source page title */
  sourceTitle: string;
  /** Optional attachment ID if already uploaded */
  attachmentId?: string;
  /** Upload status for image items */
  uploadStatus?: UploadStatus;
  /** Upload progress percentage (0-100) */
  uploadProgress?: number;
  /** Upload error message */
  uploadError?: string;
  /** Timestamp when item was added */
  createdAt: number;
}

/** Extracted content from webpage */
export interface ExtractedContent {
  /** Type of content */
  type: 'text' | 'image';
  /** The actual content */
  content: string;
  /** URL of the source page */
  sourceUrl: string;
  /** Title of the source page */
  sourceTitle: string;
}

/** API Response wrapper from AIMO server */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if not successful */
  message?: string;
}

/** Login request payload */
export interface LoginRequest {
  email: string;
  password: string;
}

/** User info from API */
export interface UserInfo {
  uid: string;
  email: string;
  nickname?: string;
}

/** Login response */
export interface LoginResponse {
  token: string;
  user: UserInfo;
}

/** Attachment DTO */
export interface Attachment {
  attachmentId: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  createdAt: number;
}

/** Upload attachment response */
export interface UploadAttachmentResponse {
  message: string;
  attachment: Attachment;
}

/** Create memo request */
export interface CreateMemoRequest {
  content: string;
  type?: 'text' | 'audio' | 'video';
  categoryId?: string;
  attachments?: string[];
  relationIds?: string[];
  source?: string;
}

/** Memo DTO */
export interface Memo {
  memoId: string;
  uid: string;
  content: string;
  type: 'text' | 'audio' | 'video';
  categoryId?: string;
  attachments?: string[];
  createdAt: number;
  updatedAt: number;
}

/** Create memo response */
export interface CreateMemoResponse {
  message: string;
  memo: Memo;
}

/** API Error class for consistent error handling */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Extension settings */
export interface Settings {
  /** Default category ID for saving memos */
  defaultCategoryId?: string;
  /** Whether to save source URL with memos */
  saveSourceUrl?: boolean;
}
