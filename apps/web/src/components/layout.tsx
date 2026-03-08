import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { NotificationService } from '../services/notification.service';
import { Zap, Sun, Moon, LogOut, Settings, Sparkles, Images, Brain, Bell } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import logoDarkUrl from '../assets/logo-dark.png';
import { isElectron, isMacOS } from '../electron/isElectron';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = view(({ children }: LayoutProps) => {
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const notificationService = useService(NotificationService);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Check active routes
  const isHomePage = location.pathname === '/home';
  const isAIExplorePage = location.pathname === '/ai-explore';
  const isGalleryPage = location.pathname === '/gallery';
  const isReviewPage = location.pathname === '/review';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    if (isMenuOpen || isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, isNotificationOpen]);

  // Start polling for notifications on mount
  useEffect(() => {
    notificationService.fetchUnreadCount();
    notificationService.fetchNotifications();
    notificationService.startPolling(60000);

    return () => {
      notificationService.stopPolling();
    };
  }, [notificationService]);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    authService.logout();
    navigate('/auth', { replace: true });
  };

  const handleMemoClick = () => {
    // Preserve query parameters when navigating
    const search = location.search;
    navigate(`/home${search}`, { replace: true });
  };

  const userName = authService.user?.nickname || authService.user?.email?.split('@')[0] || 'User';
  const userEmail = authService.user?.email || '';
  const userAvatar = authService.user?.avatar;

  const isElectronApp = isElectron();
  const isMac = isMacOS();
  // macOS Electron has traffic light buttons (~78px from left)
  const needsTopPadding = isElectronApp && isMac;

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 transition-colors">
      {/* Electron macOS Drag Area - For traffic light buttons */}
      {needsTopPadding && (
        <div
          className="fixed top-0 left-0 right-0 h-[30px] z-40 pointer-events-none"
          // @ts-expect-error - WebkitAppRegion is a non-standard CSS property for Electron
          style={{ WebkitAppRegion: 'drag' }}
        />
      )}

      {/* Left Sidebar - Fixed 70px */}
      <aside className="w-[70px] flex-shrink-0 border-r border-gray-100 dark:border-dark-800 flex flex-col items-center py-4 gap-4">
        {/* Logo Area - Top with padding for macOS Electron */}
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${needsTopPadding ? 'mt-4' : ''}`}
        >
          <img
            src={logoUrl}
            alt="Aimo Logo"
            className="w-full h-full object-cover block dark:hidden"
          />
          <img
            src={logoDarkUrl}
            alt="Aimo Logo"
            className="w-full h-full object-cover hidden dark:block"
          />
        </div>

        {/* Navigation Section - Middle */}
        <nav className="flex flex-col items-center gap-2 flex-shrink-0">
          {/* Memo Navigation */}
          <button
            onClick={handleMemoClick}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isHomePage
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
            title="备忘录"
            aria-label="备忘录"
          >
            <Zap className="w-6 h-6" />
          </button>

          {/* AI Explore Navigation */}
          <button
            onClick={() => {
              const search = location.search;
              navigate(`/ai-explore${search}`);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isAIExplorePage
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
            title="AI探索"
            aria-label="AI探索"
          >
            <Sparkles className="w-6 h-6" />
          </button>

          {/* Review Navigation */}
          <button
            onClick={() => {
              const search = location.search;
              navigate(`/review${search}`);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isReviewPage
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
            title="知识回顾"
            aria-label="知识回顾"
          >
            <Brain className="w-6 h-6" />
          </button>

          {/* Gallery Navigation */}
          <button
            onClick={() => {
              const search = location.search;
              navigate(`/gallery${search}`);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isGalleryPage
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
            title="图廊"
            aria-label="图廊"
          >
            <Images className="w-6 h-6" />
          </button>
        </nav>

        {/* Spacer to push bottom section down */}
        <div className="flex-1" />

        {/* Bottom Section - Settings, Theme, User */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          {/* Settings Button */}
          <button
            onClick={() => {
              const search = location.search;
              navigate(`/settings${search}`);
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isSettingsPage
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
            title="设置"
            aria-label="设置"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={handleThemeToggle}
            className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
            title={themeService.isDark() ? '切换到亮色模式' : '切换到暗色模式'}
            aria-label="切换主题"
          >
            {themeService.isDark() ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notification Bell Button */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
              title="通知"
              aria-label="通知"
              aria-expanded={isNotificationOpen}
            >
              <Bell className="w-5 h-5" />
              {notificationService.unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-dark-800" />
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute left-full ml-2 bottom-0 w-80 max-h-96 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">通知</p>
                  {notificationService.unreadCount > 0 && (
                    <span className="text-xs text-red-500">
                      {notificationService.unreadCount} 未读
                    </span>
                  )}
                </div>
                <div className="overflow-y-auto max-h-80">
                  {notificationService.notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                      暂无通知
                    </p>
                  ) : (
                    notificationService.notifications.slice(0, 50).map((notification) => (
                      <button
                        key={notification.notificationId}
                        onClick={async () => {
                          if (!notification.isRead) {
                            await notificationService.markAsRead(notification.notificationId);
                          }
                          if (notification.memoId) {
                            navigate(`/home?memo=${notification.memoId}`);
                          } else {
                            navigate('/review');
                          }
                          setIsNotificationOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex flex-col gap-1 ${
                          !notification.isRead ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(notification.createdAt).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative w-full" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-12 h-12 mx-auto flex items-center justify-center bg-gray-100 dark:bg-dark-800 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors"
              title={userName}
              aria-label="用户菜单"
              aria-expanded={isMenuOpen}
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={`${userName} avatar`}
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center text-white text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Dropdown Menu - Positioned to the right of sidebar */}
            {isMenuOpen && (
              <div className="absolute left-full ml-2 bottom-0 w-56 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
                    {userEmail}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>登出</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
});
