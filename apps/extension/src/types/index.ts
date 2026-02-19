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

/** API Response wrapper */
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
  username: string;
  password: string;
}

/** Login response */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

/** Create memo request */
export interface CreateMemoRequest {
  content: string;
  sourceUrl: string;
  attachmentIds?: string[];
}

/** Memo response from API */
export interface MemoResponse {
  id: string;
  content: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Attachment upload response */
export interface AttachmentResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}
