import type {
  CreateMemoDto,
  UpdateMemoDto,
  MemoWithAttachmentsDto,
  MemoSearchOptionsDto,
  MemoVectorSearchDto,
  MemoListItemDto,
  PaginatedMemoListDto,
} from '@aimo/dto';
import request from '../utils/request';

/**
 * Get memos list with pagination and filters (excludes embedding)
 */
export const getMemos = (params: Partial<MemoSearchOptionsDto>) => {
  return request.get<unknown, { code: number; data: PaginatedMemoListDto }>(
    '/api/v1/memos',
    {
      params,
    }
  );
};

/**
 * Get a single memo by ID
 */
export const getMemo = (memoId: string) => {
  return request.get<unknown, { code: number; data: MemoWithAttachmentsDto }>(
    `/api/v1/memos/${memoId}`
  );
};

/**
 * Create a new memo
 */
export const createMemo = (data: CreateMemoDto) => {
  return request.post<unknown, { code: number; data: { message: string; memo: MemoWithAttachmentsDto } }>(
    '/api/v1/memos',
    data
  );
};

/**
 * Update a memo
 */
export const updateMemo = (memoId: string, data: UpdateMemoDto) => {
  return request.put<
    unknown,
    { code: number; data: { message: string; memo: MemoWithAttachmentsDto } }
  >(`/api/v1/memos/${memoId}`, data);
};

/**
 * Delete a memo
 */
export const deleteMemo = (memoId: string) => {
  return request.delete<unknown, { code: number; data: { message: string } }>(
    `/api/v1/memos/${memoId}`
  );
};

/**
 * Vector search for memos (excludes embedding)
 */
export const vectorSearch = (params: MemoVectorSearchDto) => {
  return request.post<
    unknown,
    { code: number; data: { items: MemoListItemDto[]; count: number } }
  >('/api/v1/memos/search/vector', params);
};

/**
 * Find related memos based on vector similarity
 */
export const findRelatedMemos = (memoId: string, limit: number = 10) => {
  return request.get<
    unknown,
    { code: number; data: { items: MemoListItemDto[]; count: number } }
  >(`/api/v1/memos/${memoId}/related`, {
    params: { limit },
  });
};
