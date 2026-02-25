import { Service } from '@rabjs/react';
import type {
  MemoWithAttachmentsDto,
  MemoListItemDto,
  CreateMemoDto,
  UpdateMemoDto,
  MemoSearchOptionsDto,
  MemoListItemWithScoreDto,
} from '@aimo/dto';
import * as memoApi from '../api/memo';

// LocalStorage key for category filter persistence
const CATEGORY_FILTER_STORAGE_KEY = 'aimo_memo_category_filter';

// Special filter value for memos without a category
export const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__';

/**
 * Load category filter from localStorage
 */
function loadCategoryFilterFromStorage(): string | null {
  try {
    const saved = localStorage.getItem(CATEGORY_FILTER_STORAGE_KEY);
    // 'null' string represents "all categories" (no filter)
    if (saved === 'null' || saved === null) {
      return null;
    }
    return saved;
  } catch {
    // localStorage might not be available (e.g., SSR or private mode)
    return null;
  }
}

/**
 * Save category filter to localStorage
 */
function saveCategoryFilterToStorage(categoryId: string | null): void {
  try {
    localStorage.setItem(CATEGORY_FILTER_STORAGE_KEY, String(categoryId));
  } catch {
    // localStorage might not be available
  }
}

/**
 * Memo Service
 * Manages memo data and operations
 * Note: memos can include relevanceScore when from vector search results
 */
export class MemoService extends Service {
  // State (items may include relevanceScore from vector search)
  memos: (MemoListItemDto | MemoListItemWithScoreDto)[] = [];
  currentMemo: MemoWithAttachmentsDto | null = null;
  loading = false;

  // Track last created memo for heatmap refresh
  lastCreatedMemoId: string | null = null;

  // Activity data for heatmap
  activityData: Array<{ date: string; count: number }> = [];
  activityLoading = false;

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
  categoryFilter: string | null = loadCategoryFilterFromStorage();
  selectedDate: string | null = null; // YYYY-MM-DD format for date filter
  tagFilter: string[] = []; // Tag filter (multiple tags)

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

      if (this.categoryFilter) {
        params.categoryId = this.categoryFilter;
      }

      // Use tags filter
      if (this.tagFilter.length > 0) {
        params.tags = this.tagFilter;
      }

      const response = await memoApi.getMemos(params);

      if (response.code === 0 && response.data) {
        // On first page, replace memos; on subsequent pages, append (for infinite scroll)
        if (this.page === 1) {
          this.memos = response.data.items;
        } else {
          this.memos = [...this.memos, ...response.data.items];
        }

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
   * Create a new memo with optional category, attachments, relations, and tags
   */
  async createMemo(
    content: string,
    type: 'text' | 'audio' | 'video' = 'text',
    categoryId?: string,
    attachments?: string[],
    relationIds?: string[],
    isPublic?: boolean,
    tags?: string[]
  ) {
    try {
      const data: CreateMemoDto = {
        content,
        type,
        categoryId,
        attachments,
        relationIds,
        isPublic,
        tags,
      };
      const response = await memoApi.createMemo(data);

      if (response.code === 0 && response.data) {
        // Refresh the list after creating
        await this.fetchMemos(true);
        // Refresh heatmap after creating
        await this.fetchActivityStats();
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
   * Fetch activity stats for heatmap
   */
  async fetchActivityStats() {
    this.activityLoading = true;
    try {
      const response = await memoApi.getActivityStats(90);
      if (response.code === 0 && response.data) {
        this.activityData = response.data.items;
      }
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
    } finally {
      this.activityLoading = false;
    }
  }

  /**
   * Update a memo
   */
  async updateMemo(
    memoId: string,
    content: string,
    type?: 'text' | 'audio' | 'video' | null,
    categoryId?: string | null,
    attachments?: string[],
    relationIds?: string[],
    isPublic?: boolean,
    tags?: string[]
  ) {
    try {
      const data: UpdateMemoDto = {
        content,
        type,
        categoryId,
        attachments,
        relationIds,
        isPublic,
        tags,
      };
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
      await this.vectorSearch(query, this.limit, true);
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
   * Set category filter
   */
  setCategoryFilter(categoryId: string | null) {
    this.categoryFilter = categoryId;
    saveCategoryFilterToStorage(categoryId);
    this.fetchMemos(true);
  }

  /**
   * Set tag filter
   */
  setTagFilter(tagName: string | null) {
    if (tagName) {
      this.tagFilter = [tagName];
    } else {
      this.tagFilter = [];
    }
    this.fetchMemos(true);
  }

  /**
   * Toggle a tag in filter
   */
  toggleTagInFilter(tagName: string) {
    const index = this.tagFilter.indexOf(tagName);
    if (index > -1) {
      // Remove tag if already selected
      this.tagFilter = this.tagFilter.filter((t) => t !== tagName);
    } else {
      // Add tag if not selected
      this.tagFilter = [...this.tagFilter, tagName];
    }
    this.fetchMemos(true);
  }

  /**
   * Clear all tag filters
   */
  clearAllTagFilters() {
    this.tagFilter = [];
    this.fetchMemos(true);
  }

  /**
   * Check if a tag is selected
   */
  isTagSelected(tagName: string): boolean {
    return this.tagFilter.includes(tagName);
  }

  /**
   * Set selected date filter (for heatmap date selection)
   * @param date - Date string in YYYY-MM-DD format, or null to clear filter
   */
  setSelectedDate(date: string | null) {
    this.selectedDate = date;

    if (date) {
      // Parse YYYY-MM-DD format
      // Important: Parse as UTC to match the date exactly, not affected by local timezone
      const [year, month, day] = date.split('-').map(Number);

      // Create dates in UTC: start of day 00:00:00 UTC and end of day 23:59:59.999 UTC
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      this.startDate = startOfDay;
      this.endDate = endOfDay;
    } else {
      this.startDate = null;
      this.endDate = null;
    }

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
   * Vector search for memos with pagination support
   */
  async vectorSearch(query: string, limit = 20, resetPage = true) {
    if (resetPage) {
      this.page = 1;
      this.memos = [];
    }

    this.loading = true;

    try {
      const response = await memoApi.vectorSearch({
        query,
        page: this.page,
        limit,
      });

      if (response.code === 0 && response.data) {
        const { items, pagination } = response.data;

        // On first page, replace memos; on subsequent pages, append (for infinite scroll)
        if (this.page === 1) {
          this.memos = items;
        } else {
          this.memos = [...this.memos, ...items];
        }

        this.total = pagination.total;
        this.totalPages = pagination.totalPages;
        this.page = pagination.page;
        this.limit = pagination.limit;
        this.hasMore = this.page < this.totalPages;

        return { success: true, items };
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

  /**
   * Find related memos based on vector similarity
   */
  async findRelatedMemos(memoId: string, page: number = 1, limit: number = 10) {
    try {
      const response = await memoApi.findRelatedMemos(memoId, page, limit);

      if (response.code === 0 && response.data) {
        return {
          success: true,
          items: response.data.items,
          pagination: response.data.pagination,
        };
      } else {
        return { success: false, message: 'Failed to find related memos' };
      }
    } catch (error: unknown) {
      console.error('Find related memos error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to find related memos',
      };
    }
  }

  /**
   * Get backlinks - memos that reference the current memo
   */
  async getBacklinks(memoId: string, page: number = 1, limit: number = 20) {
    try {
      const response = await memoApi.getBacklinks(memoId, page, limit);

      if (response.code === 0 && response.data) {
        return {
          success: true,
          items: response.data.items,
          pagination: response.data.pagination,
        };
      } else {
        return { success: false, message: 'Failed to fetch backlinks' };
      }
    } catch (error: unknown) {
      console.error('Get backlinks error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch backlinks',
      };
    }
  }
}
