/**
 * Memo DTOs
 */

import type { AttachmentDto } from './attachment.js';

export interface CreateMemoDto {
  content: string;
  attachments?: string[]; // Array of attachment IDs (max 9)
}

export interface UpdateMemoDto {
  content: string;
  attachments?: string[]; // Array of attachment IDs (max 9)
}

export interface MemoDto {
  memoId: string;
  uid: string;
  content: string;
  attachments?: string[]; // Array of attachment IDs
  embedding: number[];
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
  attachments?: AttachmentDto[]; // Array of full attachment objects
  embedding: number[];
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
  attachments?: AttachmentDto[]; // Array of full attachment objects
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