import { useNavigate } from 'react-router';

/**
 * Landing Page - Public homepage for AIMO
 * Shows product intro and login/download CTAs
 */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6 max-w-2xl mx-auto px-6">
        <h1 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
          AIMO
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300">
          AI 驱动的知识管理工具
        </p>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          智能笔记、语义搜索、知识关联，让信息管理更高效
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            开始使用
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
          >
            登录
          </button>
        </div>
      </div>
    </div>
  );
}
