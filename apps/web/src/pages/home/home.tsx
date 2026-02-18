import { useEffect, useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { ArrowUp, ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { MemoService } from '../../services/memo.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchSortBar } from './components/search-sort-bar';
import { CategoryFilter } from './components/category-filter';
import { Layout } from '../../components/layout';
import { CalendarHeatmap } from '../../components/calendar-heatmap';
import * as memoApi from '../../api/memo';

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
  const [activityData, setActivityData] = useState<Array<{ date: string; count: number }>>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

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

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      memoService.setSelectedDate(dateParam);
    } else {
      memoService.setSelectedDate(null);
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

  // Fetch memos on mount (only once)
  useEffect(() => {
    memoService.fetchMemos();
  }, []);

  // Fetch activity stats for heatmap
  useEffect(() => {
    const fetchActivityStats = async () => {
      setIsLoadingActivity(true);
      try {
        const response = await memoApi.getActivityStats(90);
        if (response.code === 0 && response.data) {
          setActivityData(response.data.items);
        }
      } catch (error) {
        console.error('Failed to fetch activity stats:', error);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    fetchActivityStats();
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
            } bg-white dark:bg-dark-900 transition-all duration-300 ease-in-out overflow-hidden ${
              isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[300px] opacity-100'
            }`}
          >
            <div className="w-[300px] h-full flex flex-col p-4">
              {/* Heatmap Section */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-end mb-0">
                  {toggleButton}
                </div>
                {isLoadingActivity ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <CalendarHeatmap
                    data={activityData}
                    selectedDate={memoService.selectedDate}
                    onDateSelect={(date, count) => {
                      // Toggle date filter: if clicking the same date, clear the filter
                      if (memoService.selectedDate === date) {
                        memoService.setSelectedDate(null);
                      } else {
                        memoService.setSelectedDate(date);
                      }
                    }}
                  />
                )}
              </div>

              {/* Reserved space for future features */}
              <div className="flex-1 mt-6">
                {/* Future features will be added here */}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`overflow-hidden flex justify-center ${isCollapsed && !isCompact ? '' : 'flex-1'} w-full max-w-[640px]`}>
            <div className="w-full h-full flex flex-col">
            {/* Top Search Bar - Fixed, part of the content area */}
            <header className="flex-shrink-0 sticky top-0 z-40 px-4 pt-4 pb-2">
              <div className="flex items-center gap-3">
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
                <CategoryFilter />
                {/* Search + Sort Bar */}
                <div className="ml-auto">
                  <SearchSortBar />
                </div>
              </div>
            </header>

          {/* Memo Editor - Fixed */}
          <div className="px-4 pb-0 flex-shrink-0">
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
