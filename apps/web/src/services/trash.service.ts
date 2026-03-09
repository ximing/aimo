import { Service } from '@rabjs/react';
import type { MemoListItemDto } from '@aimo/dto';
import * as trashApi from '../api/trash';

import type { GetTrashMemosParams } from '../api/trash';

/**
 * Trash Service
 * Manages trash/recycle bin operations for memos
 */
export class TrashService extends Service {
  // State
  trashMemos: MemoListItemDto[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  totalPages = 0;
  loading = false;

  // Search and filter state
  keyword = '';
  sortBy: 'deletedAt_desc' | 'deletedAt_asc' = 'deletedAt_desc';

  /**
   * Fetch trash memos with optional filters
   */
  async fetchTrashMemos(params?: GetTrashMemosParams) {
    this.loading = true;

    try {
      const response = await trashApi.getTrashMemos(params);

      if (response.code === 0 && response.data) {
        this.trashMemos = response.data.list;
        this.total = response.data.total;
        this.page = response.data.page;
        this.pageSize = response.data.pageSize;
        this.totalPages = response.data.totalPages;
        return { success: true, memos: this.trashMemos };
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
   * Search memos by keyword
   */
  async search(keyword: string) {
    this.keyword = keyword;
    return this.fetchTrashMemos({
      keyword: keyword || undefined,
      sortBy: this.sortBy,
      page: 1,
    });
  }

  /**
   * Set sort order
   */
  async setSortBy(sortBy: 'deletedAt_desc' | 'deletedAt_asc') {
    this.sortBy = sortBy;
    return this.fetchTrashMemos({
      keyword: this.keyword || undefined,
      sortBy,
      page: 1,
    });
  }

  /**
   * Go to specific page
   */
  async goToPage(page: number) {
    return this.fetchTrashMemos({
      keyword: this.keyword || undefined,
      sortBy: this.sortBy,
      page,
    });
  }

  /**
   * Restore a memo from trash
   */
  async restoreMemo(memoId: string) {
    try {
      const response = await trashApi.restoreMemo(memoId);

      if (response.code === 0) {
        // Remove from local list
        this.trashMemos = this.trashMemos.filter((m) => m.memoId !== memoId);
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
  async permanentlyDeleteMemo(memoId: string) {
    try {
      const response = await trashApi.permanentlyDeleteMemo(memoId);

      if (response.code === 0) {
        // Remove from local list
        this.trashMemos = this.trashMemos.filter((m) => m.memoId !== memoId);
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
    this.trashMemos = [];
    this.total = 0;
    this.page = 1;
    this.pageSize = 20;
    this.totalPages = 0;
    this.keyword = '';
    this.sortBy = 'deletedAt_desc';
  }
}
