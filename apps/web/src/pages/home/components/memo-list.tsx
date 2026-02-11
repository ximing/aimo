import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';
import type { MemoDto } from '@aimo/dto';
import { MemoCard } from './memo-card';

/**
 * Group memos by date
 */
const groupMemosByDate = (memos: MemoDto[]): Map<string, MemoDto[]> => {
  const grouped = new Map<string, MemoDto[]>();

  memos.forEach((memo) => {
    const date = new Date(memo.createdAt);
    const dateStr = date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, []);
    }
    grouped.get(dateStr)!.push(memo);
  });

  return grouped;
};

export const MemoList = view(() => {
  const memoService = useService(MemoService);

  if (memoService.loading && memoService.memos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
        <p className="mt-4 text-gray-600 dark:text-dark-400">Loading memos...</p>
      </div>
    );
  }

  if (memoService.memos.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-24 w-24 text-gray-300 dark:text-dark-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No memos yet</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-dark-400">
          Get started by creating your first memo above.
        </p>
      </div>
    );
  }

  const groupedMemos = groupMemosByDate(memoService.memos);
  const sortedDates = Array.from(groupedMemos.keys()).sort((a, b) => {
    const dateA = new Date(a.split('-').reverse().join('-'));
    const dateB = new Date(b.split('-').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="space-y-8">
      {/* Grouped Memos by Date */}
      {sortedDates.map((dateStr) => {
        const memos = groupedMemos.get(dateStr) || [];

        return (
          <div key={dateStr}>
            {/* Date Header */}
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{dateStr}</h3>
              <div className="flex-1 h-px bg-gray-200 dark:bg-dark-700"></div>
              <span className="text-xs text-gray-500 dark:text-dark-400">
                {memos.length} memo{memos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Memos for this date */}
            <div className="grid grid-cols-1 gap-4">
              {memos.map((memo) => (
                <MemoCard key={memo.memoId} memo={memo} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {memoService.totalPages > 1 && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-dark-700 flex items-center justify-center gap-2">
          <button
            onClick={() => memoService.prevPage()}
            disabled={memoService.page === 1 || memoService.loading}
            className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, memoService.totalPages) }, (_, i) => {
              let pageNum: number;

              if (memoService.totalPages <= 5) {
                pageNum = i + 1;
              } else if (memoService.page <= 3) {
                pageNum = i + 1;
              } else if (memoService.page >= memoService.totalPages - 2) {
                pageNum = memoService.totalPages - 4 + i;
              } else {
                pageNum = memoService.page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => memoService.goToPage(pageNum)}
                  disabled={memoService.loading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    memoService.page === pageNum
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => memoService.nextPage()}
            disabled={memoService.page === memoService.totalPages || memoService.loading}
            className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});
