import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';
export const SearchSortBar = view(() => {
  const memoService = useService(MemoService);
  const [isFocused, setIsFocused] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [localSearch, setLocalSearch] = useState(memoService.searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Handle Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortMenu]);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (localSearch !== memoService.searchQuery) {
        await memoService.setSearchQuery(localSearch);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [localSearch, memoService]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
  };

  const handleClear = async () => {
    setLocalSearch('');
    await memoService.setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleSortByChange = (value: 'createdAt' | 'updatedAt') => {
    memoService.setSortBy(value);
    setShowSortMenu(false);
  };

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    memoService.setSortOrder(value);
    setShowSortMenu(false);
  };

  const sortByLabel = memoService.sortBy === 'createdAt' ? '创建时间' : '修改时间';
  const sortOrderLabel = memoService.sortOrder === 'desc' ? '最新优先' : '最旧优先';

  return (
    <div className="relative flex-shrink-0 flex items-center gap-2">
      {/* Search Input Container */}
      <div
        className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg transition-all duration-200 ${
          isFocused
            ? 'w-64 border-primary-500 bg-white dark:bg-dark-800 shadow-lg gap-2 px-4 py-2'
            : 'w-52 border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800'
        } text-gray-900 dark:text-gray-50`}
      >
        {/* Search Icon */}
        <svg
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0"
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

        {/* Input - Flex grow but reserve space for suffix buttons */}
        <input
          ref={inputRef}
          type="text"
          value={localSearch}
          onChange={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="搜索备忘录... (Ctrl+K)"
          className="flex-1 min-w-0 bg-transparent outline-none text-xs placeholder-gray-400 dark:placeholder-gray-600"
        />

        {/* Clear Button */}
        {localSearch && (
          <button
            onClick={handleClear}
            className="flex-shrink-0 p-0.5 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Sort Button (Suffix Icon) */}
        <div className="relative flex-shrink-0" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="p-0.5 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            title="Sort options"
            aria-label="Sort options"
            aria-expanded={showSortMenu}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>

          {/* Sort Dropdown Menu */}
          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50">
              {/* Sort By Section */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">
                  排序方式
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSortByChange('createdAt')}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      memoService.sortBy === 'createdAt'
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    创建时间
                  </button>
                  <button
                    onClick={() => handleSortByChange('updatedAt')}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      memoService.sortBy === 'updatedAt'
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    修改时间
                  </button>
                </div>
              </div>

              {/* Sort Order Section */}
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">
                  排序顺序
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSortOrderChange('desc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      memoService.sortOrder === 'desc'
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    最新优先
                  </button>
                  <button
                    onClick={() => handleSortOrderChange('asc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      memoService.sortOrder === 'asc'
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    最旧优先
                  </button>
                </div>
              </div>

              {/* Current Selection Info */}
              <div className="px-4 py-2 bg-gray-100 dark:bg-dark-700 border-t border-gray-200 dark:border-dark-700 rounded-b-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {sortByLabel} · {sortOrderLabel}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
