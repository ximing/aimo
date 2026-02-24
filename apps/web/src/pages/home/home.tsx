import { useEffect, useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { ArrowUp, ChevronLeft, ChevronRight, X, Calendar, Filter } from 'lucide-react';
import { MemoService } from '../../services/memo.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchSortBar } from './components/search-sort-bar';
import { CategoryFilter } from './components/category-filter';
import { Layout } from '../../components/layout';
import { CalendarHeatmap } from '../../components/calendar-heatmap';
import { OnThisDayBanner } from './components/on-this-day-banner';
import { DailyRecommendations } from './components/daily-recommendations';
import { TagList } from './components/tag-list';

// LocalStorage key for heatmap collapsed state
const HEATMAP_COLLAPSED_KEY = 'aimo:heatmap:collapsed';
const HEATMAP_COMPACT_QUERY = '(max-width: 1100px)';

function getIsCompactLayout(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia(HEATMAP_COMPACT_QUERY).matches;
}

/**
 * Load collapsed state from localStorage
 */
function loadCollapsedState(): boolean {
  try {
    const saved = localStorage.getItem(HEATMAP_COLLAPSED_KEY);
    return saved === 'true';
  } catch {
    return false;
  }
}

/**
 * Save collapsed state to localStorage
 */
function saveCollapsedState(collapsed: boolean): void {
  try {
    localStorage.setItem(HEATMAP_COLLAPSED_KEY, String(collapsed));
  } catch {
    // localStorage might not be available
  }
}

export const HomePage = view(() => {
  const memoService = useService(MemoService);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isCompact, setIsCompact] = useState(getIsCompactLayout);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    getIsCompactLayout() ? true : loadCollapsedState()
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(HEATMAP_COMPACT_QUERY);
    const handleChange = () => {
      setIsCompact(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isCompact) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(loadCollapsedState());
    }
  }, [isCompact]);

  // Parse URL params on mount and when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const tagParam = urlParams.get('tag');
    const tagsParams = urlParams.getAll('tags');

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      memoService.setSelectedDate(dateParam);
    } else {
      memoService.setSelectedDate(null);
    }

    // Handle multi-select tags first (if present)
    if (tagsParams.length > 0) {
      memoService.multiSelectMode = true;
      memoService.tagsFilter = tagsParams;
      memoService.tagFilter = null;
    } else if (tagParam) {
      // Single tag mode
      memoService.multiSelectMode = false;
      memoService.tagsFilter = [];
      memoService.setTagFilter(tagParam);
    } else {
      memoService.setTagFilter(null);
    }
  }, []);

  // Update URL when selected date changes
  useEffect(() => {
    const url = new URL(window.location.href);

    if (memoService.selectedDate) {
      url.searchParams.set('date', memoService.selectedDate);
    } else {
      url.searchParams.delete('date');
    }

    window.history.replaceState({}, '', url.toString());
  }, [memoService.selectedDate]);

  // Update URL when tag filter changes (single-select)
  useEffect(() => {
    const url = new URL(window.location.href);

    if (memoService.tagFilter) {
      url.searchParams.set('tag', memoService.tagFilter);
      // Remove multi-select params if switching to single
      url.searchParams.delete('tags');
    } else if (!memoService.multiSelectMode) {
      url.searchParams.delete('tag');
    }

    window.history.replaceState({}, '', url.toString());
  }, [memoService.tagFilter]);

  // Update URL when multi-select tags change
  useEffect(() => {
    const url = new URL(window.location.href);

    if (memoService.multiSelectMode && memoService.tagsFilter.length > 0) {
      url.searchParams.delete('tag');
      url.searchParams.delete('tags');
      memoService.tagsFilter.forEach((tag) => {
        url.searchParams.append('tags', tag);
      });
    } else if (memoService.multiSelectMode && memoService.tagsFilter.length === 0) {
      url.searchParams.delete('tags');
    }

    window.history.replaceState({}, '', url.toString());
  }, [memoService.tagsFilter, memoService.multiSelectMode]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tagParam = urlParams.get('tag');
      const tagsParams = urlParams.getAll('tags');

      if (tagsParams.length > 0) {
        // Multi-select mode from URL
        memoService.multiSelectMode = true;
        memoService.tagsFilter = tagsParams;
        memoService.tagFilter = null;
      } else if (tagParam && tagParam !== memoService.tagFilter) {
        memoService.multiSelectMode = false;
        memoService.tagsFilter = [];
        memoService.setTagFilter(tagParam);
      } else if (!tagParam && !tagsParams.length && (memoService.tagFilter || memoService.tagsFilter.length > 0)) {
        memoService.clearAllTagFilters();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [memoService.tagFilter, memoService.tagsFilter.length]);

  // Fetch memos on mount (only once)
  useEffect(() => {
    memoService.fetchMemos();
    memoService.fetchActivityStats();
  }, []);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      saveCollapsedState(newValue);
      return newValue;
    });
  }, []);

  const toggleButton = (
    <button
      onClick={toggleCollapsed}
      className={`flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors ${
        isCollapsed ? 'shadow-sm' : ''
      }`}
      title={isCollapsed ? '展开活跃度' : '收起活跃度'}
      aria-label={isCollapsed ? '展开活跃度' : '收起活跃度'}
    >
      {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
    </button>
  );

  // Handle scroll event to show/hide the scroll-to-top button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollDistance = e.currentTarget.scrollTop;
    setShowScrollTop(scrollDistance > 200);
  };

  // Scroll to top smoothly
  const scrollToTop = () => {
    const container = document.getElementById('memo-list-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex w-full overflow-hidden relative justify-center">
        {/* Centered Container - Sidebar + Memo as a whole */}
        <div
          className={`flex h-full ${
            isCompact || isCollapsed ? 'justify-center' : 'gap-0'
          }`}
          style={{
            minWidth: isCompact ? '100%' : undefined,
          }}
        >
          {isCollapsed && (
            <div className="absolute left-4 top-4 z-20 flex items-center">
              {toggleButton}
            </div>
          )}
          {/* Heatmap Sidebar - Collapsible */}
          <div
            className={`${
              isCompact
                ? 'absolute left-0 top-0 h-full z-30 shadow-lg'
                : 'flex-shrink-0'
            } dark:bg-dark-900 transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[300px] opacity-100'
            }`}
          >
            <div className="w-[300px] h-full flex flex-col p-4 pt-5 overflow-y-auto">
              {/* Heatmap Section */}
              <div className="flex-shrink-0">
<div className="flex items-center justify-end mb-0">
{toggleButton}
</div>
<CalendarHeatmap
  data={memoService.activityData}
  selectedDate={memoService.selectedDate}
  onDateSelect={(date) => {
                      // Toggle date filter: if clicking the same date, clear the filter
                      if (memoService.selectedDate === date) {
                        memoService.setSelectedDate(null);
                      } else {
                        memoService.setSelectedDate(date);
                      }
                  }}
                />
              </div>

              {/* On This Day Banner - Below heatmap */}
              <div className="flex-shrink-0">
                <OnThisDayBanner />
              </div>

              {/* Daily Recommendations - AI curated memos */}
              <div className="flex-shrink-0">
                <DailyRecommendations />
              </div>

              {/* Tag List - Shows all tags with usage counts */}
              <div className="flex-shrink-0">
                <TagList />
              </div>

              {/* Reserved space for future features */}
              <div className="flex-1 mt-6">
                {/* Future features will be added here */}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`overflow-hidden flex justify-center ${isCollapsed && !isCompact ? '' : 'flex-1'} w-[640px]`}>
            <div className="w-full h-full flex flex-col">
            {/* Top Search Bar - Fixed, part of the content area */}
            <header className="flex-shrink-0 sticky top-0 z-40 px-4 pt-4 pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Date Filter Status */}
                {memoService.selectedDate && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                      <Calendar size={14} className="text-primary-600 dark:text-primary-400" />
                      <span className="text-sm text-primary-700 dark:text-primary-300">
                        {memoService.selectedDate}
                      </span>
                      <button
                        onClick={() => memoService.setSelectedDate(null)}
                        className="ml-1 p-0.5 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-800 rounded transition-colors"
                        aria-label="清除日期筛选"
                        title="清除日期筛选"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Tag Filter Status */}
                {(memoService.tagFilter || memoService.tagsFilter.length > 0) && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Filter size={14} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        筛选:
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Single tag filter */}
                        {memoService.tagFilter && (
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            #{memoService.tagFilter}
                          </span>
                        )}
                        {/* Multi-select tags */}
                        {memoService.tagsFilter.map((tag, index) => (
                          <div key={tag} className="flex items-center">
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                              #{tag}
                            </span>
                            <button
                              onClick={() => memoService.toggleTagInFilter(tag)}
                              className="ml-0.5 p-0.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                              aria-label={`移除标签 ${tag}`}
                              title={`移除标签 ${tag}`}
                            >
                              <X size={12} />
                            </button>
                            {index < memoService.tagsFilter.length - 1 && (
                              <span className="text-blue-400 mx-1">+</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Clear all button for multi-select */}
                      {memoService.tagsFilter.length > 0 && (
                        <button
                          onClick={() => memoService.clearAllTagFilters()}
                          className="ml-1 p-0.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                          aria-label="清除所有标签筛选"
                          title="清除所有标签筛选"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <CategoryFilter />
                {/* Search + Sort Bar */}
                <div className="ml-auto">
                  <SearchSortBar />
                </div>
              </div>
            </header>

          {/* Memo Editor - Fixed */}
          <div className="px-4 pb-0 flex-shrink-0 mt-0.5">
            <section aria-label="Create new memo">
              <MemoEditor />
            </section>
          </div>

          {/* Memos List - Scrollable */}
          <div
            id="memo-list-container"
            className="flex-1 overflow-y-auto mt-6 pb-8 min-h-0 px-4 relative"
            onScroll={handleScroll}
          >
            <section aria-label="Your memos">
              <MemoList />
            </section>

            {/* Scroll to Top Button */}
            {showScrollTop && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 p-3 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 animate-fade-in"
                aria-label="Scroll to top"
              >
                <ArrowUp size={20} />
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
});
