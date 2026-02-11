import { useState, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';

export const SearchBar = view(() => {
  const [query, setQuery] = useState('');
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
      memoService.setSearchQuery(query);
    }
  };

  return (
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
        onKeyDown={handleKeyDown}
        placeholder="搜索备忘录..."
        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-400 dark:placeholder-gray-600"
      />

      {/* Clear Button */}
      {query && (
        <button
          onClick={() => {
            setQuery('');
            memoService.setSearchQuery('');
          }}
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
  );
});
