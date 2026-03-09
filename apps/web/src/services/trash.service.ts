import { Service } from '@rabjs/react';
import type { MemoListItemDto } from '@aimo/dto';
import * as trashApi from '../api/trash';

/**
 * Trash Service
 * Manages trash/recycle bin operations for memos
 */
export class TrashService extends Service {
  // State
  memos: MemoListItemDto[] = [];
  total = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  loading = false;

  // Search and filter state
  keyword = '';
  sortBy: 'deletedAt_desc' | 'deletedAt_asc' = 'deletedAt_desc';
  startDate?: number;
  endDate?: number;

  /**
   * Fetch trash memos with optional filters
   */
  async fetchMemos() {
    this.loading = true;

    try {
      const response = await trashApi.getTrashMemos({
        keyword: this.keyword || undefined,
        sortBy: this.sortBy,
        startDate: this.startDate,
        endDate: this.endDate,
        page: this.currentPage,
        pageSize: this.pageSize,
      });

      if (response.code === 0 && response.data) {
        this.memos = response.data.list;
        this.total = response.data.total;
        this.currentPage = response.data.page;
        this.pageSize = response.data.pageSize;
        this.totalPages = response.data.totalPages;
        return { success: true, memos: this.memos };
      } else {
        return { success: false, message: 'Failed to fetch trash memos' };
      }
    } catch (error: unknown) {
      console.error('Fetch trash memos error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch trash memos',
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Set keyword and refetch
   */
  setKeyword(keyword: string) {
    this.keyword = keyword;
    this.currentPage = 1;
    return this.fetchMemos();
  }

  /**
   * Set sort order and refetch
   */
  setSortBy(sortBy: 'deletedAt_desc' | 'deletedAt_asc') {
    this.sortBy = sortBy;
    this.currentPage = 1;
    return this.fetchMemos();
  }

  /**
   * Set date range and refetch
   */
  setDateRange(startDate?: number, endDate?: number) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.currentPage = 1;
    return this.fetchMemos();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.keyword = '';
    this.sortBy = 'deletedAt_desc';
    this.startDate = undefined;
    this.endDate = undefined;
    this.currentPage = 1;
    return this.fetchMemos();
  }

  /**
   * Go to specific page
   */
  goToPage(page: number) {
    this.currentPage = page;
    return this.fetchMemos();
  }

  /**
   * Restore a memo from trash
   */
  async restore(memoId: string) {
    try {
      const response = await trashApi.restoreMemo(memoId);

      if (response.code === 0) {
        // Remove from local list
        this.memos = this.memos.filter((m) => m.memoId !== memoId);
        this.total = Math.max(0, this.total - 1);
        return { success: true };
      } else {
        return { success: false, message: 'Failed to restore memo' };
      }
    } catch (error: unknown) {
      console.error('Restore memo error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore memo',
      };
    }
  }

  /**
   * Permanently delete a memo from trash
   */
  async permanentlyDelete(memoId: string) {
    try {
      const response = await trashApi.permanentlyDeleteMemo(memoId);

      if (response.code === 0) {
        // Remove from local list
        this.memos = this.memos.filter((m) => m.memoId !== memoId);
        this.total = Math.max(0, this.total - 1);
        return { success: true };
      } else {
        return { success: false, message: 'Failed to permanently delete memo' };
      }
    } catch (error: unknown) {
      console.error('Permanently delete memo error:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to permanently delete memo',
      };
    }
  }

  /**
   * Clear all state
   */
  clear() {
    this.memos = [];
    this.total = 0;
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalPages = 0;
    this.keyword = '';
    this.sortBy = 'deletedAt_desc';
    this.startDate = undefined;
    this.endDate = undefined;
  }
}
