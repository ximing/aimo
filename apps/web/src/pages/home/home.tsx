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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors duration-200 flex flex-col">
      {/* Header - Floating Card Style */}
      <header className="sticky top-4 z-50 mx-4 mb-4 bg-white dark:bg-dark-900 shadow-md dark:shadow-lg border border-gray-200 dark:border-dark-800 rounded-xl transition-all duration-300 hover:shadow-lg dark:hover:shadow-xl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & App Name */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md transform transition-transform hover:scale-105">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Aimo</h1>
                <p className="text-xs text-gray-500 dark:text-dark-400">Memo Assistant</p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* User Info */}
              <div className="text-right hidden sm:block pr-4 border-r border-gray-200 dark:border-dark-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {authService.user?.nickname || authService.user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-400 truncate">
                  {authService.user?.email}
                </p>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className="p-2.5 text-gray-600 dark:text-dark-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeService.isDark() ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-dark-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] whitespace-nowrap"
                aria-label="Sign out of your account"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        {/* Search Bar */}
        <section aria-label="Search memos">
          <SearchBar />
        </section>

        {/* Memo Editor */}
        <section aria-label="Create new memo">
          <MemoEditor />
        </section>

        {/* Filter Bar */}
        <section aria-label="Filter and sort memos">
          <FilterBar />
        </section>

        {/* Memos List */}
        <section aria-label="Your memos">
          <MemoList />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500 dark:text-dark-400">
        <p>&copy; 2026 Aimo. Built with React & Tailwind CSS.</p>
      </footer>
    </div>
  );
});
