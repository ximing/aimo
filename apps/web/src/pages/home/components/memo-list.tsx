import { view, useService } from '@rabjs/react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { MemoService } from '../../../services/memo.service';
import type { MemoListItemDto, MemoListItemWithScoreDto } from '@aimo/dto';
import { MemoCard } from './memo-card';

/**
 * Group memos by date
 */
const groupMemosByDate = (
  memos: (MemoListItemDto | MemoListItemWithScoreDto)[]
): Map<string, (MemoListItemDto | MemoListItemWithScoreDto)[]> => {
  const grouped = new Map<string, (MemoListItemDto | MemoListItemWithScoreDto)[]>();

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
    // Check if filters are active
    const hasActiveFilters = memoService.tagFilter.length > 0;

    if (hasActiveFilters) {
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            未找到匹配的备忘录
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">没有符合所选标签的备忘录</p>
        </div>
      );
    }

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

  // Check if results are from vector search (have relevanceScore field)
  // Vector search results should preserve relevance ordering, not group by date
  const isVectorSearch =
    memoService.memos.length > 0 &&
    'relevanceScore' in (memoService.memos[0] as MemoListItemWithScoreDto);

  return (
    <InfiniteScroll
      dataLength={memoService.memos.length}
      next={memoService.loadMore.bind(memoService)}
      hasMore={memoService.hasMore}
      loader={
        <div className="pt-6 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            已加载 {memoService.memos.length}/{memoService.total}
          </p>
        </div>
      }
      endMessage={
        memoService.total > 0 && (
          <div className="pt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              已全部加载 ({memoService.total} 条)
            </p>
          </div>
        )
      }
      scrollableTarget="memo-list-container"
    >
      <div className="space-y-6">
        {isVectorSearch ? (
          // For vector search: preserve relevance ordering, no date grouping
          <div>
            <div className="space-y-3">
              {memoService.memos.map((memo) => (
                <MemoCard key={memo.memoId} memo={memo} />
              ))}
            </div>
          </div>
        ) : (
          // For regular list: group by date
          <>
            {(() => {
              const groupedMemos = groupMemosByDate(memoService.memos);
              const sortedDates = Array.from(groupedMemos.keys()).sort((a, b) => {
                const dateA = new Date(a.split('-').reverse().join('-'));
                const dateB = new Date(b.split('-').reverse().join('-'));
                return dateB.getTime() - dateA.getTime();
              });

              return sortedDates.map((dateStr) => {
                const memos = groupedMemos.get(dateStr) || [];

                return (
                  <div key={dateStr}>
                    {/* Date Header */}
                    <div className="mb-4 px-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dateStr}
                      </h3>
                    </div>

                    {/* Memos for this date */}
                    <div className="space-y-3">
                      {memos.map((memo) => (
                        <MemoCard key={memo.memoId} memo={memo} />
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </>
        )}
      </div>
    </InfiniteScroll>
  );
});
