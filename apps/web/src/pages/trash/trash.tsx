import { useEffect, useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Search, X, SortAsc, SortDesc } from 'lucide-react';
import { Layout } from '../../components/layout';
import { TrashService } from '../../services/trash.service';

export const TrashPage = view(() => {
  const trashService = useService(TrashService);
  const [searchInput, setSearchInput] = useState('');

  // Initialize: fetch trash memos on mount
  useEffect(() => {
    trashService.fetchTrashMemos().catch((err) => {
      console.error('Failed to fetch trash memos:', err);
    });

    return () => {
      trashService.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      // Debounce search
      const timer = setTimeout(() => {
        trashService.search(value);
      }, 300);
      return () => clearTimeout(timer);
    },
    [trashService]
  );

  const handleClearSearch = () => {
    setSearchInput('');
    trashService.search('');
  };

  const handleSortChange = (sortBy: 'deletedAt_desc' | 'deletedAt_asc') => {
    trashService.setSortBy(sortBy);
  };

  const handlePageChange = (page: number) => {
    trashService.goToPage(page);
  };

  // Format deleted date
  const formatDeletedAt = (deletedAt: number) => {
    const date = new Date(deletedAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // Handle restore memo
  const handleRestore = async (memoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await trashService.restoreMemo(memoId);
    if (result.success) {
      console.log('Memo restored successfully');
    } else {
      console.error('Failed to restore memo:', result.message);
    }
  };

  // Handle permanently delete memo
  const handlePermanentDelete = async (memoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要永久删除这条备忘录吗？此操作不可恢复。')) {
      const result = await trashService.permanentlyDeleteMemo(memoId);
      if (result.success) {
        console.log('Memo permanently deleted');
      } else {
        console.error('Failed to permanently delete memo:', result.message);
      }
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-4xl h-full flex flex-col">
          {/* Header - Fixed */}
          <header className="flex-shrink-0 sticky top-0 z-30 px-8 pt-6 pb-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">回收站</h1>
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSortChange('deletedAt_desc')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    trashService.sortBy === 'deletedAt_desc'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                  title="最新删除"
                >
                  <SortDesc className="w-4 h-4" />
                  <span>最新删除</span>
                </button>
                <button
                  onClick={() => handleSortChange('deletedAt_asc')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    trashService.sortBy === 'deletedAt_asc'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                  title="最早删除"
                >
                  <SortAsc className="w-4 h-4" />
                  <span>最早删除</span>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              已删除的备忘录将保留 30 天，之后自动清除
            </p>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索已删除的备忘录..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-4 min-h-0">
            {trashService.loading && trashService.trashMemos.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
              </div>
            ) : trashService.trashMemos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-800 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-1">回收站是空的</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  删除的备忘录将在这里显示
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {trashService.trashMemos.map((memo) => (
                    <div
                      key={memo.memoId}
                      className="p-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg hover:border-gray-300 dark:hover:border-dark-600 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-gray-100 line-clamp-2 whitespace-pre-wrap">
                            {memo.content}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                            <span>删除于 {formatDeletedAt(memo.deletedAt || 0)}</span>
                            {memo.tags && memo.tags.length > 0 && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M5.5 3A2.5 2.5 0 003 5.5v5.379a2.5 2.5 0 00.732 1.767l9.72 9.719a2.5 2.5 0 003.536 0l5.378-5.378a2.5 2.5 0 000-3.536l-9.72-9.72A2.5 2.5 0 008.879 3H5.5z" />
                                </svg>
                                {memo.tags.length}
                              </span>
                            )}
                            {memo.attachments && memo.attachments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                  />
                                </svg>
                                {memo.attachments.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleRestore(memo.memoId, e)}
                            className="px-3 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                          >
                            恢复
                          </button>
                          <button
                            onClick={(e) => handlePermanentDelete(memo.memoId, e)}
                            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            永久删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {trashService.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      共 {trashService.total} 条
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(trashService.page - 1)}
                        disabled={trashService.page <= 1}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {trashService.page} / {trashService.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(trashService.page + 1)}
                        disabled={trashService.page >= trashService.totalPages}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
});
