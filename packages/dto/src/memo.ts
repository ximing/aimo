/**
 * Memo DTOs
 */

import type { AttachmentDto } from './attachment.js';
import type { TagDto } from './tag.js';
import type { UserInfoDto } from './user.js';

export interface CreateMemoDto {
  /** Memo content text */
  content: string;
  /** Optional memo type, defaults to 'text' */
  type?: 'text' | 'audio' | 'video';
  /** Optional category ID (undefined = uncategorized) */
  categoryId?: string;
  /** Array of attachment IDs (max 9) */
  attachments?: string[];
  /** Array of tag names (strings) - used for input */
  tags?: string[];
  /** Array of tag IDs - alternative to tags */
  tagIds?: string[];
  /** Array of target memo IDs to relate to */
  relationIds?: string[];
  /** Whether this memo is public (visible to others without auth) */
  isPublic?: boolean;
  /** Optional timestamp in milliseconds (for imports) */
  createdAt?: number;
  /** Optional timestamp in milliseconds (for imports) */
  updatedAt?: number;
  /** Source URL (e.g., from Chrome extension) */
  source?: string;
}

export interface UpdateMemoDto {
  /** Memo content text */
  content: string;
  /** Optional memo type (null = no change) */
  type?: 'text' | 'audio' | 'video' | null;
  /** Optional category ID (undefined/null = uncategorized) */
  categoryId?: string | null;
  /** Array of attachment IDs (max 9) */
  attachments?: string[];
  /** Array of tag names (strings) - used for input */
  tags?: string[];
  /** Array of tag IDs - alternative to tags */
  tagIds?: string[];
  /** Array of target memo IDs to relate to (replaces all existing relations) */
  relationIds?: string[];
  /** Whether this memo is public (visible to others without auth) */
  isPublic?: boolean;
  /** Source URL (e.g., from Chrome extension) */
  source?: string;
}

export interface MemoDto {
  /** Unique memo identifier */
  memoId: string;
  /** User ID who owns this memo */
  uid: string;
  /** Memo content text */
  content: string;
  /** Memo type (text, audio, or video) */
  type: 'text' | 'audio' | 'video';
  /** Optional category ID */
  categoryId?: string;
  /** Array of attachment IDs */
  attachments?: string[];
  /** Array of tag objects (enriched from tagIds) */
  tags?: TagDto[];
  /** Array of tag IDs (internal use) */
  tagIds?: string[];
  /** Array of related memos (populated when fetching lists) */
  relations?: MemoDto[];
  /** Whether this memo is public (visible to others without auth) */
  isPublic?: boolean;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** Updated timestamp in milliseconds */
  updatedAt: number;
  /** Source URL (e.g., from Chrome extension) */
  source?: string;
}

/**
 * Memo DTO with enriched attachment details (includes full attachment objects with URLs)
 */
export interface MemoWithAttachmentsDto {
  /** Unique memo identifier */
  memoId: string;
  /** User ID who owns this memo */
  uid: string;
  /** Memo content text */
  content: string;
  /** Memo type (text, audio, or video) */
  type: 'text' | 'audio' | 'video';
  /** Optional category ID */
  categoryId?: string;
  /** Array of full attachment objects */
  attachments?: AttachmentDto[];
  /** Array of tag objects (enriched from tagIds) */
  tags?: TagDto[];
  /** Array of tag IDs (internal use) */
  tagIds?: string[];
  /** Array of related memos with attachment details */
  relations?: MemoWithAttachmentsDto[];
  /** Whether this memo is public (visible to others without auth) */
  isPublic?: boolean;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** Updated timestamp in milliseconds */
  updatedAt: number;
  /** Source URL (e.g., from Chrome extension) */
  source?: string;
}

/**
 * Memo DTO for list responses (without embedding to reduce payload size)
 */
export interface MemoListItemDto {
  /** Unique memo identifier */
  memoId: string;
  /** User ID who owns this memo */
  uid: string;
  /** Memo content text */
  content: string;
  /** Memo type (text, audio, or video) */
  type: 'text' | 'audio' | 'video';
  /** Optional category ID */
  categoryId?: string;
  /** Array of full attachment objects */
  attachments?: AttachmentDto[];
  /** Array of tag objects (enriched from tagIds) */
  tags?: TagDto[];
  /** Array of tag IDs (internal use) */
  tagIds?: string[];
  /** Array of related memos */
  relations?: MemoListItemDto[];
  /** Whether this memo is public (visible to others without auth) */
  isPublic?: boolean;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** Updated timestamp in milliseconds */
  updatedAt: number;
  /** Source URL (e.g., from Chrome extension) */
  source?: string;
}

export interface MemoSearchOptionsDto {
  /** User ID to filter memos */
  uid: string;
  /** Page number for pagination (default: 1) */
  page?: number;
  /** Number of items per page (default: 10) */
  limit?: number;
  /** Field to sort by (default: 'createdAt') */
  sortBy?: 'createdAt' | 'updatedAt';
  /** Sort order (default: 'desc') */
  sortOrder?: 'asc' | 'desc';
  /** Search text to filter memo content */
  search?: string;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by tag name (single tag) */
  tag?: string;
  /** Filter by multiple tag names (AND logic) */
  tags?: string[];
  /** Start date for date range filter */
  startDate?: Date;
  /** End date for date range filter */
  endDate?: Date;
}

export interface MemoVectorSearchDto {
  /** Search query text for vector similarity search */
  query: string;
  /** Page number for pagination (default: 1) */
  page?: number;
  /** Number of items per page (default: 10) */
  limit?: number;
}

export interface PaginatedMemoDto {
  /** Array of memo items */
  items: MemoDto[];
  /** Pagination metadata */
  pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
}

/**
 * Paginated memo list with enriched attachment details
 */
export interface PaginatedMemoWithAttachmentsDto {
  /** Array of memo items with attachment details */
  items: MemoWithAttachmentsDto[];
  /** Pagination metadata */
  pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
}

/**
 * Paginated memo list for API responses (without embedding to reduce payload size)
 */
export interface PaginatedMemoListDto {
  /** Array of memo list items */
  items: MemoListItemDto[];
  /** Pagination metadata */
  pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
}

/**
 * Memo list item with relevance score (for vector search results)
 * Includes similarity score for frontend to handle relevance filtering
 */
export interface MemoListItemWithScoreDto extends MemoListItemDto {
  /** Similarity score (0-1), higher is more relevant */
  relevanceScore?: number;
}

/**
 * Paginated memo list with relevance scores (for vector search results)
 */
export interface PaginatedMemoListWithScoreDto {
  /** Array of memo items with relevance scores */
  items: MemoListItemWithScoreDto[];
  /** Pagination metadata */
  pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
}

/**
 * Public memo DTO for share page (includes user info)
 */
export interface PublicMemoDto {
  /** Memo data with attachments */
  memo: MemoWithAttachmentsDto;
  /** User information for the memo author */
  user: UserInfoDto;
}
