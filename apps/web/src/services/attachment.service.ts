/**
 * Attachment Service
 * Manages attachment gallery state and logic with reactive updates
 */

import { Service } from '@rabjs/react';
import { attachmentApi } from '../api/attachment';
import type { AttachmentDto } from '@aimo/dto';

export type AttachmentFilter = 'all' | 'images' | 'videos';

export interface AttachmentState {
  items: AttachmentDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  filter: AttachmentFilter;
  searchQuery: string;
  selectedAttachment: AttachmentDto | null;
}

export class AttachmentService extends Service {
  // State
  items: AttachmentDto[] = [];
  total: number = 0;
  page: number = 1;
  limit: number = 20;
  hasMore: boolean = true;
  loading: boolean = false;
  error: string | null = null;
  filter: AttachmentFilter = 'all';
  searchQuery: string = '';
  selectedAttachment: AttachmentDto | null = null;

  /**
   * Filter attachments based on current filter setting
   */
  get filteredItems(): AttachmentDto[] {
    let filtered = this.items;

    // Apply type filter
    if (this.filter === 'images') {
      filtered = filtered.filter((item) => item.type.startsWith('image/'));
    } else if (this.filter === 'videos') {
      filtered = filtered.filter((item) => item.type.startsWith('video/'));
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.filename.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Get filtered count
   */
  get filteredCount(): number {
    return this.filteredItems.length;
  }

  /**
   * Fetch attachments from API
   */
  async fetchAttachments(reset: boolean = false): Promise<void> {
    try {
      if (reset) {
        this.page = 1;
        this.items = [];
      }

      this.loading = true;
      this.error = null;

      const response = await attachmentApi.getAttachments({
        page: this.page,
        limit: this.limit,
      });

      if (this.page === 1) {
        this.items = response.items;
      } else {
        this.items = [...this.items, ...response.items];
      }

      this.total = response.total;
      this.hasMore = this.items.length < this.total;
      this.loading = false;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to fetch attachments';
      this.loading = false;
      throw err;
    }
  }

  /**
   * Load more attachments (infinite scroll)
   */
  async loadMore(): Promise<void> {
    if (!this.hasMore || this.loading) {
      return;
    }

    try {
      this.page += 1;
      await this.fetchAttachments(false);
    } catch (err) {
      this.page -= 1; // Rollback page number on error
      throw err;
    }
  }

  /**
   * Set filter type
   */
  setFilter(filter: AttachmentFilter): void {
    this.filter = filter;
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery = '';
  }

  /**
   * Set selected attachment for preview
   */
  setSelectedAttachment(attachment: AttachmentDto | null): void {
    this.selectedAttachment = attachment;
  }

  /**
   * Get next attachment in filtered list
   */
  getNextAttachment(): AttachmentDto | null {
    if (!this.selectedAttachment) {
      return null;
    }

    const index = this.filteredItems.findIndex(
      (item) => item.attachmentId === this.selectedAttachment?.attachmentId
    );

    if (index === -1 || index === this.filteredItems.length - 1) {
      return null;
    }

    return this.filteredItems[index + 1] || null;
  }

  /**
   * Get previous attachment in filtered list
   */
  getPrevAttachment(): AttachmentDto | null {
    if (!this.selectedAttachment) {
      return null;
    }

    const index = this.filteredItems.findIndex(
      (item) => item.attachmentId === this.selectedAttachment?.attachmentId
    );

    if (index === -1 || index === 0) {
      return null;
    }

    return this.filteredItems[index - 1] || null;
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      await attachmentApi.delete(attachmentId);
      // Remove from items
      this.items = this.items.filter((item) => item.attachmentId !== attachmentId);
      this.total -= 1;
      // Clear selection if deleted
      if (this.selectedAttachment?.attachmentId === attachmentId) {
        this.selectedAttachment = null;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete attachment';
      throw err;
    }
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.items = [];
    this.total = 0;
    this.page = 1;
    this.hasMore = true;
    this.loading = false;
    this.error = null;
    this.filter = 'all';
    this.searchQuery = '';
    this.selectedAttachment = null;
  }
}
