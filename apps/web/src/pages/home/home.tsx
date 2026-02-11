import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { MemoService } from '../../services/memo.service';
import { MemoEditor } from './components/memo-editor';
import { MemoList } from './components/memo-list';
import { SearchSortBar } from './components/search-sort-bar';
import { UserMenu } from './components/user-menu';

export const HomePage = view(() => {
  const authService = useService(AuthService);
  const memoService = useService(MemoService);
  const navigate = useNavigate();

  // Fetch memos on mount
  useEffect(() => {
    memoService.fetchMemos();
  }, [memoService]);

  const handleLogout = () => {
    authService.logout();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 transition-colors">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 border-b border-gray-100 dark:border-dark-800 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Aimo</h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search + Sort Bar */}
            <SearchSortBar />

            {/* User Menu */}
            <UserMenu onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-[600px] h-full flex flex-col px-8">
          {/* Memo Editor - Fixed */}
          <div className="pt-4 pb-0 flex-shrink-0">
            <section aria-label="Create new memo">
              <MemoEditor />
            </section>
          </div>

          {/* Memos List - Scrollable */}
          <div className="flex-1 overflow-y-auto mt-6 pb-8 min-h-0">
            <section aria-label="Your memos">
              <MemoList />
            </section>
          </div>
        </div>
      </main>

    </div>
  );
});
