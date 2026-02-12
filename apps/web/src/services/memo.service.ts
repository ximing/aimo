import { Service } from '@rabjs/react';
import type {
  MemoWithAttachmentsDto,
  MemoListItemDto,
  CreateMemoDto,
  UpdateMemoDto,
  MemoSearchOptionsDto,
} from '@aimo/dto';
import * as memoApi from '../api/memo';

/**
 * Memo Service
 * Manages memo data and operations
 */
export class MemoService extends Service {
  // State
  memos: MemoListItemDto[] = [];
  currentMemo: MemoWithAttachmentsDto | null = null;
  loading = false;

  // Pagination (for infinite scroll)
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;
  hasMore = true;

  // Filters
  searchQuery = '';
  sortBy: 'createdAt' | 'updatedAt' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  startDate: Date | null = null;
  endDate: Date | null = null;

  /**
   * Computed: Get filtered memos (for client-side filtering if needed)
   */
  get filteredMemos() {
    return this.memos;
  }

  /**
   * Fetch memos with current filters
   * @param resetPage If true, reset to page 1 and replace memos. Otherwise append to existing memos (for infinite scroll)
   */
  async fetchMemos(resetPage = false) {
    if (resetPage) {
      this.page = 1;
      this.memos = [];
      this.hasMore = true;
    }

    this.loading = true;

    try {
      const params: Partial<MemoSearchOptionsDto> = {
        page: this.page,
        limit: this.limit,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      };

      if (this.searchQuery) {
        params.search = this.searchQuery;
      }

      if (this.startDate) {
        params.startDate = this.startDate;
      }

      if (this.endDate) {
        params.endDate = this.endDate;
      }

      const response = await memoApi.getMemos(params);

      if (response.code === 0 && response.data) {
        // Append new memos instead of replacing (for infinite scroll)
        this.memos = [...this.memos, ...response.data.items];
        this.total = response.data.pagination.total;
        this.totalPages = response.data.pagination.totalPages;
        this.page = response.data.pagination.page;
        this.limit = response.data.pagination.limit;
        this.hasMore = this.page < this.totalPages;

        return { success: true };
      } else {
        return { success: false, message: 'Failed to fetch memos' };
      }
    } catch (error: unknown) {
      console.error('Fetch memos error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch memos',
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a new memo
   */
  async createMemo(content: string, attachments?: string[]) {
    try {
      const data: CreateMemoDto = { content, attachments };
      const response = await memoApi.createMemo(data);

      if (response.code === 0 && response.data) {
        // Refresh the list after creating
        await this.fetchMemos(true);
        return { success: true, memo: response.data.memo };
      } else {
        return { success: false, message: 'Failed to create memo' };
      }
    } catch (error: unknown) {
      console.error('Create memo error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create memo',
      };
    }
  }

  /**
   * Update a memo
   */
  async updateMemo(memoId: string, content: string, attachments?: string[]) {
    try {
      const data: UpdateMemoDto = { content, attachments };
      const response = await memoApi.updateMemo(memoId, data);

      if (response.code === 0 && response.data) {
        // Update local state
        const index = this.memos.findIndex((m) => m.memoId === memoId);
        if (index !== -1) {
          this.memos[index] = response.data.memo;
        }

        return { success: true, memo: response.data.memo };
      } else {
        return { success: false, message: 'Failed to update memo' };
      }
    } catch (error: unknown) {
      console.error('Update memo error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update memo',
      };
    }
  }

  /**
   * Delete a memo
   */
  async deleteMemo(memoId: string) {
    try {
      const response = await memoApi.deleteMemo(memoId);

      if (response.code === 0) {
        // Remove from local state
        this.memos = this.memos.filter((m) => m.memoId !== memoId);
        this.total = Math.max(0, this.total - 1);

        return { success: true };
      } else {
        return { success: false, message: 'Failed to delete memo' };
      }
    } catch (error: unknown) {
      console.error('Delete memo error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete memo',
      };
    }
  }

  /**
   * Set search query and trigger search
   * Uses vector search (semantic similarity) if query is provided
   * Falls back to regular fetch if query is empty
   */
  async setSearchQuery(query: string) {
    this.searchQuery = query;

    if (query && query.trim().length > 0) {
      // Use vector search for non-empty queries (semantic similarity)
      await this.vectorSearch(query, this.limit);
    } else {
      // Use regular fetch for empty queries
      await this.fetchMemos(true);
    }
  }

  /**
   * Set sort options
   */
  setSortBy(sortBy: 'createdAt' | 'updatedAt') {
    this.sortBy = sortBy;
    this.fetchMemos(true);
  }

  setSortOrder(sortOrder: 'asc' | 'desc') {
    this.sortOrder = sortOrder;
    this.fetchMemos(true);
  }

  /**
   * Set date range filter
   */
  setDateRange(startDate: Date | null, endDate: Date | null) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.fetchMemos(true);
  }

  /**
   * Load more memos for infinite scroll
   */
  async loadMore() {
    if (this.hasMore && !this.loading) {
      this.page++;
      await this.fetchMemos(false);
    }
  }

  /**
   * Vector search for memos
   */
  async vectorSearch(query: string, limit = 10) {
    this.loading = true;

    try {
      const response = await memoApi.vectorSearch({ query, limit });

      if (response.code === 0 && response.data) {
        this.memos = response.data.items;
        this.total = response.data.count;

        return { success: true, items: response.data.items };
      } else {
        return { success: false, message: 'Vector search failed' };
      }
    } catch (error: unknown) {
      console.error('Vector search error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Vector search failed',
      };
    } finally {
      this.loading = false;
    }
  }
}