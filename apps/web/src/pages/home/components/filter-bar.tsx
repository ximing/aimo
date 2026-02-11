import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';

export const FilterBar = view(() => {
  const memoService = useService(MemoService);

  return (
    <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-4 transition-colors duration-200">
      {/* Sort By */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-300">排序方式:</label>
        <select
          value={memoService.sortBy}
          onChange={(e) => memoService.setSortBy(e.target.value as 'createdAt' | 'updatedAt')}
          className="px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-colors"
        >
          <option value="createdAt">创建时间</option>
          <option value="updatedAt">修改时间</option>
        </select>
      </div>

      {/* Sort Order */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-300">顺序:</label>
        <select
          value={memoService.sortOrder}
          onChange={(e) => memoService.setSortOrder(e.target.value as 'asc' | 'desc')}
          className="px-3 py-2 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-colors"
        >
          <option value="desc">最新优先</option>
          <option value="asc">最旧优先</option>
        </select>
      </div>

      {/* Stats */}
      <div className="ml-auto text-sm text-gray-600 dark:text-dark-400 flex items-center gap-2">
        {memoService.loading ? (
          <>
            <div className="inline-block h-3 w-3 rounded-full bg-gray-400 dark:bg-dark-500 animate-pulse"></div>
            <span>加载中...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>
              {memoService.memos.length} / {memoService.total} 条备忘录
            </span>
          </>
        )}
      </div>
    </div>
  );
});
