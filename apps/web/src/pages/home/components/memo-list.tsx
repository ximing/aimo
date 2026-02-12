import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';
import type { MemoListItemDto } from '@aimo/dto';
import { MemoCard } from './memo-card';

/**
 * Group memos by date
 */
const groupMemosByDate = (
  memos: MemoListItemDto[]
): Map<string, MemoListItemDto[]> => {
  const grouped = new Map<string, MemoListItemDto[]>();

  memos.forEach((memo) => {
    // createdAt is now a timestamp in milliseconds
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  if (memoService.memos.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-700"
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
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">暂无备忘录</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">开始记录你的想法吧</p>
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
    <div className="space-y-6">
      {/* Grouped Memos by Date */}
      <div className="space-y-6">
        {sortedDates.map((dateStr) => {
          const memos = groupedMemos.get(dateStr) || [];

          return (
            <div key={dateStr}>
              {/* Date Header */}
              <div className="mb-4 px-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{dateStr}</h3>
              </div>

              {/* Memos for this date */}
              <div className="space-y-3">
                {memos.map((memo) => (
                  <MemoCard key={memo.memoId} memo={memo} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {memoService.totalPages > 1 && (
        <div className="pt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => memoService.prevPage()}
            disabled={memoService.page === 1 || memoService.loading}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            上一页
          </button>

          <div className="flex items-center gap-1">
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
                  className={`px-3 py-2 text-sm rounded transition-colors ${
                    memoService.page === pageNum
                      ? 'bg-primary-600 text-white font-medium'
                      : 'border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
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
            className="px-4 py-2 text-sm border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
});
