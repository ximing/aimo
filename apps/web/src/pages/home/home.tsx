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
    <div className="min-h-screen bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 transition-colors">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-dark-800">
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

      {/* Main Content */}
      <main className="max-w-[600px] mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* Memo Editor */}
          <section aria-label="Create new memo">
            <MemoEditor />
          </section>

          {/* Memos List */}
          <section aria-label="Your memos">
            <MemoList />
          </section>
        </div>
      </main>

    </div>
  );
});
