import { Service, resolve } from '@rabjs/react';
import { MemoService } from './memo.service';
import * as memoApi from '../api/memo';

/**
 * Memo Polling Service
 * Automatically polls for new memos every 60 seconds
 * Only polls when viewing default sort (newest first) with no filters
 */
export class MemoPollingService extends Service {
  isPolling = false;
  pollInterval = 60000; // 1 minute
  private timerId: number | null = null;

  private get memoService(): MemoService {
    return resolve(MemoService);
  }

  /**
   * Start polling for new memos
   */
  startPolling(): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.timerId = window.setInterval(() => {
      this.poll();
    }, this.pollInterval);

    console.log('[MemoPolling] Polling started');
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    console.log('[MemoPolling] Polling stopped');
  }

  /**
   * Check if polling should be active based on current filters
   */
  private shouldPoll(): boolean {
    const ms = this.memoService;

    // Don't poll if no memos (no reference point)
    if (ms.memos.length === 0) {
      return false;
    }

    // Don't poll if not viewing newest first
    if (ms.sortOrder !== 'desc') {
      return false;
    }

    // Don't poll if search query is active
    if (ms.searchQuery && ms.searchQuery.trim().length > 0) {
      return false;
    }

    // Don't poll if category filter is active
    if (ms.categoryFilter !== null) {
      return false;
    }

    // Don't poll if tag filter is active
    if (ms.tagFilter.length > 0) {
      return false;
    }

    // Don't poll if date range filter is active
    if (ms.startDate !== null || ms.endDate !== null) {
      return false;
    }

    // Don't poll if in vector search mode (memos have relevanceScore)
    const firstMemo = ms.memos[0];
    if (firstMemo && 'relevanceScore' in firstMemo) {
      return false;
    }

    return true;
  }

  /**
   * Poll for new memos
   */
  private async poll(): Promise<void> {
    // Check if we should poll
    if (!this.shouldPoll()) {
      return;
    }

    const ms = this.memoService;
    const latestMemo = ms.memos[0];

    if (!latestMemo) {
      return;
    }

    try {
      const response = await memoApi.pollNewMemos({
        latestMemoId: latestMemo.memoId,
        sortBy: ms.sortBy,
      });

      if (response.code === 0 && response.data.hasNew) {
        const { items } = response.data;

        // Deduplicate: filter out memos already in the list
        const existingIds = new Set(ms.memos.map((m) => m.memoId));
        const newMemos = items.filter((m) => !existingIds.has(m.memoId));

        if (newMemos.length > 0) {
          console.log(`[MemoPolling] Found ${newMemos.length} new memo(s)`);

          // Prepend new memos to the list
          ms.memos = [...newMemos, ...ms.memos];
          ms.total += newMemos.length;
        }
      }
    } catch (error) {
      // Silent failure - log but don't interrupt user experience
      console.error('[MemoPolling] Poll failed:', error);
    }
  }
}
