/**
 * Insights DTOs
 * Contains DTOs for insights-related APIs (activity stats, on this day, daily recommendations)
 */

export interface MemoActivityStatsItemDto {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number; // Number of memos created on this date
}

/**
 * Memo activity stats response for heatmap
 */
export interface MemoActivityStatsDto {
  items: MemoActivityStatsItemDto[];
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

/**
 * Memo item for "on this day" feature
 * Shows memos from previous years on the same month/day
 */
export interface OnThisDayMemoDto {
  memoId: string;
  content: string;
  createdAt: number; // timestamp in milliseconds
  year: number; // The year this memo was created
}

/**
 * Response for "on this day" API
 */
export interface OnThisDayResponseDto {
  items: OnThisDayMemoDto[];
  total: number;
  todayMonthDay: string; // MM-DD format
}

/**
 * Response for daily recommendations API
 * Returns AI-curated memos for daily review
 */
export interface DailyRecommendationsResponseDto {
  items: import('./memo.js').MemoListItemDto[];
  total: number;
}
