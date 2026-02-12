import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { Zap, Sun, Moon, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = view(({ children }: LayoutProps) => {
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    authService.logout();
    navigate('/auth', { replace: true });
  };

  const handleMemoClick = () => {
    navigate('/', { replace: true });
  };

  const userName = authService.user?.nickname || authService.user?.email?.split('@')[0] || 'User';
  const userEmail = authService.user?.email || '';

  return (
    <div className="h-screen flex bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 transition-colors">
      {/* Left Sidebar - Fixed 70px */}
      <aside className="w-[70px] flex-shrink-0 border-r border-gray-100 dark:border-dark-800 flex flex-col items-center py-4 gap-8">
        {/* Logo Area - Top */}
        <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white font-bold text-lg">A</span>
        </div>

        {/* Memo Navigation - Middle */}
        <button
          onClick={handleMemoClick}
          className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors flex-shrink-0"
          title="返回首页"
          aria-label="返回首页"
        >
          <Zap className="w-6 h-6" />
        </button>

        {/* Spacer to push user menu to bottom */}
        <div className="flex-1" />

        {/* User Menu - Bottom */}
        <div className="relative w-full" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-12 h-12 mx-auto flex items-center justify-center bg-gray-100 dark:bg-dark-800 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors flex-shrink-0"
            title={userName}
            aria-label="User menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center text-white text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </button>

          {/* Dropdown Menu - Positioned to the right of sidebar */}
          {isMenuOpen && (
            <div className="absolute left-full ml-2 bottom-0 w-56 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50">
              {/* User Info Section */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">{userEmail}</p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {/* Theme Toggle */}
                <button
                  onClick={handleThemeToggle}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {themeService.isDark() ? (
                    <>
                      <Sun className="w-4 h-4" />
                      <span>亮色模式</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      <span>暗色模式</span>
                    </>
                  )}
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors cursor-pointer border-t border-gray-200 dark:border-dark-700 mt-2 pt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>登出</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
});
