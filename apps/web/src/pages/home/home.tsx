import { useEffect, useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { ArrowUp, ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { MemoService } from '../../services/memo.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchSortBar } from './components/search-sort-bar';
import { Layout } from '../../components/layout';
import { CalendarHeatmap } from '../../components/calendar-heatmap';
import * as memoApi from '../../api/memo';

// LocalStorage key for heatmap collapsed state
const HEATMAP_COLLAPSED_KEY = 'aimo:heatmap:collapsed';

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
  const [isCollapsed, setIsCollapsed] = useState(loadCollapsedState);
  const [activityData, setActivityData] = useState<Array<{ date: string; count: number }>>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

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
      {/* Heatmap Sidebar - Collapsible */}
      <div
        className={`flex-shrink-0 border-r border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900 transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'w-0 opacity-0' : 'w-[220px] opacity-100'
        }`}
      >
        <div className="w-[220px] h-full flex flex-col p-4">
          {/* Heatmap Section */}
          <div className="flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              活跃度
            </h3>
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

      {/* Collapse/Expand Button - Fixed position when collapsed, inline when expanded */}
      <button
        onClick={toggleCollapsed}
        className={`flex-shrink-0 z-10 flex items-center justify-center bg-white dark:bg-dark-900 border-gray-200 dark:border-dark-700 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-dark-800 transition-all duration-300 ${
          isCollapsed
            ? 'fixed left-[70px] top-1/2 -translate-y-1/2 w-6 h-12 rounded-r-lg border-y border-r shadow-sm'
            : 'w-6 h-12 -ml-3 self-center rounded-full border shadow-sm'
        }`}
        title={isCollapsed ? '展开热力图' : '收起热力图'}
        aria-label={isCollapsed ? '展开热力图' : '收起热力图'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Main Content Area - Right aligned container */}
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-[640px] h-full flex flex-col">
          {/* Top Search Bar - Fixed, part of the content area */}
          <header className="flex-shrink-0 sticky top-0 z-40 px-8 pt-4 pb-2">
            <div className="flex items-center justify-between">
              {/* Date Filter Status */}
              {memoService.selectedDate ? (
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
              ) : (
                <div /> /* Spacer */
              )}
              {/* Search + Sort Bar */}
              <SearchSortBar />
            </div>
          </header>

          {/* Memo Editor - Fixed */}
          <div className="px-8 pb-0 flex-shrink-0">
            <section aria-label="Create new memo">
              <MemoEditor />
            </section>
          </div>

          {/* Memos List - Scrollable */}
          <div
            id="memo-list-container"
            className="flex-1 overflow-y-auto mt-6 pb-8 min-h-0 px-8 relative"
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
    </Layout>
  );
});
