import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';

export const SearchBar = view(() => {
  const [query, setQuery] = useState('');
  const [showSearchHint, setShowSearchHint] = useState(false);
  const memoService = useService(MemoService);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== memoService.searchQuery) {
        memoService.setSearchQuery(query);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, memoService]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Trigger search immediately
      memoService.setSearchQuery(query);
    }
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400 dark:text-dark-500"
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
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSearchHint(true)}
          onBlur={() => setTimeout(() => setShowSearchHint(false), 200)}
          placeholder="⌘K 搜索备忘录..."
          className="w-full pl-12 pr-12 py-3 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-500 dark:placeholder-dark-400"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              memoService.setSearchQuery('');
            }}
            className="absolute inset-y-0 right-4 flex items-center text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-400 transition-colors"
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

      {/* Search Hint */}
      {showSearchHint && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg p-3 text-xs text-gray-600 dark:text-dark-400 z-10 max-w-xs">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">搜索提示</p>
          <ul className="space-y-1">
            <li>• 输入关键词查找备忘录</li>
            <li>• 支持标题、内容和标签搜索</li>
            <li>• 按 Enter 立即搜索</li>
          </ul>
        </div>
      )}
    </div>
  );
});
