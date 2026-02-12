import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../services/memo.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchSortBar } from './components/search-sort-bar';
import { Layout } from '../../components/layout';

export const HomePage = view(() => {
  const memoService = useService(MemoService);

  // Fetch memos on mount
  useEffect(() => {
    memoService.fetchMemos();
  }, [memoService]);

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
          <div className="flex-1 overflow-y-auto mt-6 pb-8 min-h-0 px-8">
            <section aria-label="Your memos">
              <MemoList />
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
});
