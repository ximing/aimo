import type {
  CreateMemoDto,
  UpdateMemoDto,
  MemoDto,
  PaginatedMemoDto,
  MemoSearchOptionsDto,
  MemoVectorSearchDto,
} from '@aimo/dto';
import request from '../utils/request';

/**
 * Get memos list with pagination and filters
 */
export const getMemos = (params: Partial<MemoSearchOptionsDto>) => {
  return request.get<unknown, { code: number; data: PaginatedMemoDto }>('/api/v1/memos', {
    params,
  });
};

/**
 * Get a single memo by ID
 */
export const getMemo = (memoId: string) => {
  return request.get<unknown, { code: number; data: MemoDto }>(`/api/v1/memos/${memoId}`);
};

/**
 * Create a new memo
 */
export const createMemo = (data: CreateMemoDto) => {
  return request.post<unknown, { code: number; data: { message: string; memo: MemoDto } }>(
    '/api/v1/memos',
    data
  );
};

/**
 * Update a memo
 */
export const updateMemo = (memoId: string, data: UpdateMemoDto) => {
  return request.put<unknown, { code: number; data: { message: string; memo: MemoDto } }>(
    `/api/v1/memos/${memoId}`,
    data
  );
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
 * Vector search for memos
 */
export const vectorSearch = (params: MemoVectorSearchDto) => {
  return request.post<unknown, { code: number; data: { items: MemoDto[]; count: number } }>(
    '/api/v1/memos/search/vector',
    params
  );
};
