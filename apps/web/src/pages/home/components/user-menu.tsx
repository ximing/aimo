import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { isElectron } from '../../../electron/isElectron';

interface UserMenuProps {
  onLogout: () => void;
}

export const UserMenu = view(({ onLogout }: UserMenuProps) => {
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
    setIsOpen(false);
  };

  const handleCheckForUpdates = async () => {
    setIsOpen(false);
    if (!isElectron() || !window.electronAPI?.checkForUpdates) {
      // 在非 Electron 环境下显示提示
      alert('检查更新功能仅在桌面应用中可用');
      return;
    }

    try {
      const updateInfo = await window.electronAPI.checkForUpdates();
      if (updateInfo) {
        alert(`发现新版本: ${updateInfo.version}\n\n点击确定下载更新`);
        await window.electronAPI.downloadUpdate();
      } else {
        alert('当前已是最新版本');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      alert('检查更新失败，请稍后重试');
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const userName = authService.user?.nickname || authService.user?.email?.split('@')[0] || 'User';
  const userEmail = authService.user?.email || '';

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer border border-gray-200 dark:border-dark-700 rounded-lg"
        title={userName}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 bg-primary-600 rounded flex items-center justify-center text-white text-xs font-semibold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <span>{userName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50">
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
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>亮色模式</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>暗色模式</span>
                </>
              )}
            </button>

            {/* Check for Updates (only in Electron) */}
            {isElectron() && (
              <button
                onClick={handleCheckForUpdates}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>检查更新</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors cursor-pointer border-t border-gray-200 dark:border-dark-700 mt-2 pt-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>登出</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
