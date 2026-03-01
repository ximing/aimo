/**
 * Insights DTOs
 * Contains DTOs for insights-related APIs (activity stats, on this day, daily recommendations)
 */

export interface MemoActivityStatsItemDto {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Number of memos created on this date */
  count: number;
}

/**
 * Memo activity stats response for heatmap
 */
export interface MemoActivityStatsDto {
  /** Array of activity stats items */
  items: MemoActivityStatsItemDto[];
  /** Start date of the stats range (ISO date string) */
  startDate: string;
  /** End date of the stats range (ISO date string) */
  endDate: string;
}

/**
 * Memo item for "on this day" feature
 * Shows memos from previous years on the same month/day
 */
export interface OnThisDayMemoDto {
  /** Unique memo identifier */
  memoId: string;
  /** Memo content text */
  content: string;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** The year this memo was created */
  year: number;
}

/**
 * Response for "on this day" API
 */
export interface OnThisDayResponseDto {
  /** Array of memos from this day in previous years */
  items: OnThisDayMemoDto[];
  /** Total number of memos */
  total: number;
  /** Today's month and day (MM-DD format) */
  todayMonthDay: string;
}

/**
 * Response for daily recommendations API
 * Returns AI-curated memos for daily review
 */
export interface DailyRecommendationsResponseDto {
  /** Array of recommended memo items */
  items: import('./memo.js').MemoListItemDto[];
  /** Total number of recommendations */
  total: number;
}
