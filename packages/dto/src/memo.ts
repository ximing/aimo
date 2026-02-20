/**
 * Memo DTOs
 */

import type { AttachmentDto } from './attachment.js';

export interface CreateMemoDto {
  content: string;
  type?: 'text' | 'audio' | 'video'; // Optional memo type, defaults to 'text'
  categoryId?: string; // Optional category ID (undefined = uncategorized)
  attachments?: string[]; // Array of attachment IDs (max 9)
  relationIds?: string[]; // Array of target memo IDs to relate to
  createdAt?: number; // Optional timestamp in milliseconds (for imports)
  updatedAt?: number; // Optional timestamp in milliseconds (for imports)
}

export interface UpdateMemoDto {
  content: string;
  type?: 'text' | 'audio' | 'video' | null; // Optional memo type (null = no change)
  categoryId?: string | null; // Optional category ID (undefined/null = uncategorized)
  attachments?: string[]; // Array of attachment IDs (max 9)
  relationIds?: string[]; // Array of target memo IDs to relate to (replaces all existing relations)
}

export interface MemoDto {
  memoId: string;
  uid: string;
  content: string;
  type: 'text' | 'audio' | 'video'; // Memo type
  categoryId?: string; // Optional category ID
  attachments?: string[]; // Array of attachment IDs
  relations?: MemoDto[]; // Array of related memos (populated when fetching lists)
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

/**
 * Memo DTO with enriched attachment details (includes full attachment objects with URLs)
 */
export interface MemoWithAttachmentsDto {
  memoId: string;
  uid: string;
  content: string;
  type: 'text' | 'audio' | 'video'; // Memo type
  categoryId?: string; // Optional category ID
  attachments?: AttachmentDto[]; // Array of full attachment objects
  relations?: MemoWithAttachmentsDto[]; // Array of related memos with attachment details
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

/**
 * Memo DTO for list responses (without embedding to reduce payload size)
 */
export interface MemoListItemDto {
  memoId: string;
  uid: string;
  content: string;
  type: 'text' | 'audio' | 'video'; // Memo type
  categoryId?: string; // Optional category ID
  attachments?: AttachmentDto[]; // Array of full attachment objects
  relations?: MemoListItemDto[]; // Array of related memos
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

export interface MemoSearchOptionsDto {
  uid: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  categoryId?: string; // Filter by category ID
  startDate?: Date;
  endDate?: Date;
}

export interface MemoVectorSearchDto {
  query: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMemoDto {
  items: MemoDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Paginated memo list with enriched attachment details
 */
export interface PaginatedMemoWithAttachmentsDto {
  items: MemoWithAttachmentsDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Paginated memo list for API responses (without embedding to reduce payload size)
 */
export interface PaginatedMemoListDto {
  items: MemoListItemDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Memo list item with relevance score (for vector search results)
 * Includes similarity score for frontend to handle relevance filtering
 */
export interface MemoListItemWithScoreDto extends MemoListItemDto {
  relevanceScore?: number; // Similarity score (0-1), higher is more relevant
}

/**
 * Paginated memo list with relevance scores (for vector search results)
 */
export interface PaginatedMemoListWithScoreDto {
  items: MemoListItemWithScoreDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Activity stats item for calendar heatmap
 */
export interface MemoActivityStatsItemDto {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number; // Number of memos created on this date
}

/**
 * Memo activity stats response for heatmap
 */
export interface MemoActivityStatsDto {
  items: MemoActivityStatsItemDto[];
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

/**
 * Memo item for "on this day" feature
 * Shows memos from previous years on the same month/day
 */
export interface OnThisDayMemoDto {
  memoId: string;
  content: string;
  createdAt: number; // timestamp in milliseconds
  year: number; // The year this memo was created
}

/**
 * Response for "on this day" API
 */
export interface OnThisDayResponseDto {
  items: OnThisDayMemoDto[];
  total: number;
  todayMonthDay: string; // MM-DD format
}
