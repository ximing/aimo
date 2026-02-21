import { useNavigate } from 'react-router';
import { useService } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { Sun, Moon } from 'lucide-react';

/**
 * Landing Page - Public homepage for AIMO
 * Shows product intro and login/download CTAs
 */
export function LandingPage() {
  const navigate = useNavigate();
  const themeService = useService(ThemeService);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Header with Theme Toggle */}
      <header className="w-full px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-slate-900 dark:text-white">AIMO</span>
        </div>
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
          title={themeService.isDark() ? '切换到亮色模式' : '切换到暗色模式'}
          aria-label="切换主题"
        >
          {themeService.isDark() ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">
            AIMO
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 transition-colors duration-300">
            AI 驱动的知识管理工具
          </p>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto transition-colors duration-300">
            智能笔记、语义搜索、知识关联，让信息管理更高效
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105"
            >
              开始使用
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200"
            >
              登录
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-500 transition-colors duration-300">
        <p> 2025 AIMO. All rights reserved.</p>
      </footer>
    </div>
  );
}
