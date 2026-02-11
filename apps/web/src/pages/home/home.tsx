import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { MemoService } from '../../services/memo.service';
import { ThemeService } from '../../services/theme.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchBar } from './components/search-bar';
import { FilterBar } from './components/filter-bar';

export const HomePage = view(() => {
  const authService = useService(AuthService);
  const memoService = useService(MemoService);
  const themeService = useService(ThemeService);
  const navigate = useNavigate();

  // Fetch memos on mount
  useEffect(() => {
    memoService.fetchMemos();
  }, [memoService]);

  const handleLogout = () => {
    authService.logout();
    navigate('/auth', { replace: true });
  };

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-dark-900 shadow-sm border-b border-gray-200 dark:border-dark-800 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & App Name */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aimo</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Memo Assistant</p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {authService.user?.nickname || authService.user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {authService.user?.email}
                </p>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className="p-2 text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
                title={themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeService.isDark() ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar />
        </div>

        {/* Memo Editor */}
        <div className="mb-8">
          <MemoEditor />
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <FilterBar />
        </div>

        {/* Memos List */}
        <MemoList />
      </main>
    </div>
  );
});
