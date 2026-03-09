import type { MemoListItemDto } from '@aimo/dto';
import request from '../utils/request';

export interface GetTrashMemosParams {
  keyword?: string;
  sortBy?: 'deletedAt_desc' | 'deletedAt_asc';
  startDate?: number;
  endDate?: number;
  page?: number;
  pageSize?: number;
}

interface GetTrashMemosResponse {
  list: MemoListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get trash memos (deleted memos) for the current user
 */
export const getTrashMemos = (params?: GetTrashMemosParams) => {
  return request.get<unknown, { code: number; data: GetTrashMemosResponse }>('/api/v1/trash', {
    params,
  });
};

/**
 * Restore a memo from trash
 */
export const restoreMemo = (memoId: string) => {
  return request.post<unknown, { code: number; data: { message: string } }>(
    `/api/v1/trash/${memoId}/restore`
  );
};

/**
 * Permanently delete a memo from trash
 */
export const permanentlyDeleteMemo = (memoId: string) => {
  return request.delete<unknown, { code: number; data: { message: string } }>(
    `/api/v1/trash/${memoId}`
  );
};
