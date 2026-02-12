/**
 * Memo DTOs
 */

import type { AttachmentDto } from './attachment.js';

export interface CreateMemoDto {
  content: string;
  categoryId?: string; // Optional category ID (undefined = uncategorized)
  attachments?: string[]; // Array of attachment IDs (max 9)
  relationIds?: string[]; // Array of target memo IDs to relate to
}

export interface UpdateMemoDto {
  content: string;
  categoryId?: string | null; // Optional category ID (undefined/null = uncategorized)
  attachments?: string[]; // Array of attachment IDs (max 9)
  relationIds?: string[]; // Array of target memo IDs to relate to (replaces all existing relations)
}

export interface MemoDto {
  memoId: string;
  uid: string;
  content: string;
  categoryId?: string; // Optional category ID
  attachments?: string[]; // Array of attachment IDs
  embedding: number[];
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
  categoryId?: string; // Optional category ID
  attachments?: AttachmentDto[]; // Array of full attachment objects
  embedding: number[];
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
  limit?: number;
  threshold?: number;
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