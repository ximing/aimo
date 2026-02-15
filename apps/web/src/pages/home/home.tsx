import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { ArrowUp } from 'lucide-react';
import { MemoService } from '../../services/memo.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchSortBar } from './components/search-sort-bar';
import { Layout } from '../../components/layout';

export const HomePage = view(() => {
  const memoService = useService(MemoService);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Fetch memos on mount (only once)
  useEffect(() => {
    memoService.fetchMemos();
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
      {/* Main Content Area - Right aligned container */}
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-[640px] h-full flex flex-col">
          {/* Top Search Bar - Fixed, part of the content area */}
          <header className="flex-shrink-0 sticky top-0 z-40 px-8 pt-4 pb-2">
            <div className="flex items-center justify-end">
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
