import { useNavigate } from 'react-router';
import { useService } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { ThemeService } from '../../services/theme.service';
import { Sun, Moon, Menu, X, Github, Sparkles, Search, Link2, Smartphone } from 'lucide-react';

const navItems = [
  { id: 'features', label: '功能' },
  { id: 'download', label: '下载' },
];

/**
 * Landing Page - Public homepage for AIMO
 * Shows product intro and login/download CTAs
 */
export function LandingPage() {
  const navigate = useNavigate();
  const themeService = useService(ThemeService);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Fixed Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="w-full px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 dark:text-white">AIMO</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <a
                href="https://github.com/ximing/aimo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
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

              {/* Login Button - Desktop */}
              <button
                onClick={() => navigate('/auth')}
                className="hidden md:flex px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                登录
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
                aria-label="切换菜单"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 overflow-hidden ${
            isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700">
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <a
                href="https://github.com/ximing/aimo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <button
                onClick={() => {
                  navigate('/auth');
                  setIsMobileMenuOpen(false);
                }}
                className="text-left text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                登录
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
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
              onClick={() => scrollToSection('download')}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105"
            >
              免费下载
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="px-8 py-3 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200"
            >
              查看功能
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              核心功能
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              强大的 AI 功能，助你高效管理知识
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI 笔记"
              description="智能生成笔记摘要，自动提取关键信息"
            />
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="语义搜索"
              description="基于向量相似度的智能搜索，找到相关内容"
            />
            <FeatureCard
              icon={<Link2 className="w-6 h-6" />}
              title="知识关联"
              description="自动发现笔记间的关联，构建知识图谱"
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="多平台同步"
              description="支持桌面端和移动端，随时随地访问"
            />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-24 px-6 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            下载 AIMO
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-12">
            选择适合你的平台，开始高效的知识管理之旅
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DownloadCard platform="macOS" icon="🍎" />
            <DownloadCard platform="Windows" icon="🪟" />
            <DownloadCard platform="Linux" icon="🐧" />
            <DownloadCard platform="Android" icon="🤖" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 py-8 text-center border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              © 2025 AIMO. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/ximing/aimo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                GitHub
              </a>
              <button
                onClick={() => navigate('/auth')}
                className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                登录
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function DownloadCard({ platform, icon }: { platform: string; icon: string }) {
  return (
    <button className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        {platform}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-500">即将推出</p>
    </button>
  );
}
