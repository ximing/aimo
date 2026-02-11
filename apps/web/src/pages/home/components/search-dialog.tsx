import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SearchDialog = view(({ open, onOpenChange }: SearchDialogProps) => {
  const [query, setQuery] = useState('');
  const memoService = useService(MemoService);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      memoService.setSearchQuery(query);
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    memoService.setSearchQuery('');
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
        <div
          className="w-full max-w-[600px] bg-white dark:bg-dark-800 rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSearch} className="space-y-4 p-6">
            {/* Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入关键词搜索备忘录..."
                autoFocus
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-400 dark:placeholder-gray-600"
              />

              {/* Clear Button */}
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!query.trim()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                搜索
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
});
