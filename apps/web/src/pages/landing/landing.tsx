import { useNavigate } from 'react-router';
import { useService } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { getAppVersions } from '../../api/system';
import {
  Sun, Moon, Menu, X, Github, Sparkles, Search, Link2, Brain, Network, Shield,
  Monitor, Smartphone, Download, Apple, ChevronLeft, ChevronRight, X as XIcon, Images
} from 'lucide-react';
import screenshot00 from '../../assets/landing/00.png';
import screenshot01 from '../../assets/landing/01.png';
import screenshot02 from '../../assets/landing/02.png';
import screenshot03 from '../../assets/landing/03.png';
import screenshot04 from '../../assets/landing/04.png';
import screenshot05 from '../../assets/landing/05.png';
import type { AllVersionsResponseDto } from '@aimo/dto';

const navItems = [
  { id: 'features', label: '功能' },
  { id: 'screenshots', label: '截图' },
  { id: 'usecases', label: '场景' },
  { id: 'download', label: '下载' },
];

// Use Cases data
const useCases = [
  {
    id: 1,
    title: '个人知识库',
    description: '将碎片化的信息整理成结构化的知识体系。无论是技术文档、读书笔记还是生活感悟，AIMO 都能帮你建立属于自己的知识网络，让知识触手可及。',
    tags: ['知识管理', '信息整理', '长期积累'],
    gradient: 'from-blue-500 to-indigo-600',
    icon: Brain,
  },
  {
    id: 2,
    title: '学习笔记',
    description: '在学习过程中快速记录要点，AI 自动生成摘要和关键词。通过语义关联发现知识点之间的联系，形成完整的学习地图，提升学习效率。',
    tags: ['AI 摘要', '知识关联', '复习回顾'],
    gradient: 'from-emerald-500 to-teal-600',
    icon: Sparkles,
  },
  {
    id: 3,
    title: '灵感收集',
    description: '随时捕捉脑海中闪过的灵感，支持文字、图片多种格式。智能标签和全文搜索让你在任何时刻都能快速找到当初的创意火花。',
    tags: ['快速记录', '多媒体支持', '智能搜索'],
    gradient: 'from-orange-500 to-red-600',
    icon: Network,
  },
];

// Screenshot data with mock UI representations
const screenshots = [
  {
    id: 1,
    title: '智能笔记编辑',
    description: 'AI 辅助写作，实时生成摘要和关键词',
    gradient: 'from-blue-500 to-purple-600',
    image: screenshot00,
  },
  {
    id: 2,
    title: '语义搜索',
    description: '基于向量相似度的智能搜索，快速找到相关内容',
    gradient: 'from-emerald-500 to-teal-600',
    image: screenshot01,
  },
  {
    id: 3,
    title: '知识图谱',
    description: '可视化展示笔记间的关联关系',
    gradient: 'from-orange-500 to-red-600',
    image: screenshot02,
  },
  {
    id: 4,
    title: '多媒体支持',
    description: '支持图片、音频等多种附件类型',
    gradient: 'from-pink-500 to-rose-600',
    image: screenshot03,
  },
  {
    id: 5,
    title: 'AI探索',
    description: '智能推荐历史上的今天记录的笔记',
    gradient: 'from-indigo-500 to-blue-600',
    image: screenshot04,
  },
  {
    id: 6,
    title: '主题切换',
    description: '支持亮色和暗色两种主题，灵活满足不同场景需求',
    gradient: 'from-violet-500 to-purple-600',
    image: screenshot05,
  },
];

/**
 * Landing Page - Public homepage for AIMO
 * Shows product intro and login/download CTAs
 */
export function LandingPage() {
  const navigate = useNavigate();
  const themeService = useService(ThemeService);
  const authService = useService(AuthService);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [versions, setVersions] = useState<AllVersionsResponseDto | undefined>(undefined);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Check if user is logged in
  const isLoggedIn = authService.isAuthenticated;
  const currentUser = authService.user;

  useEffect(() => {
    // Check auth status on mount
    authService.checkAuth();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch app versions from GitHub releases
    const fetchVersions = async () => {
      try {
        const response = await getAppVersions();
        if (response.code === 200 && response.data) {
          setVersions(response.data);
        }
      } catch {
        // Silently fail - UI will handle undefined versions
      }
    };
    fetchVersions();
  }, []);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  const nextScreenshot = () => {
    setCurrentScreenshot((prev) => (prev + 1) % screenshots.length);
  };

  const prevScreenshot = () => {
    setCurrentScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const openLightbox = (index: number) => {
    setCurrentScreenshot(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  // Handle body scroll when lightbox opens/closes
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

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

              {/* User Info - Logged in */}
              {isLoggedIn && currentUser ? (
                <button
                  onClick={() => navigate('/home')}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-semibold">
                    {currentUser.nickname?.[0] || currentUser.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  {currentUser.nickname || currentUser.email?.split('@')[0]}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="hidden md:flex px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  登录
                </button>
              )}

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
                if (isLoggedIn) {
                  navigate('/home');
                } else {
                  navigate('/auth');
                  setIsMobileMenuOpen(false);
                }
              }}
              className="text-left text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isLoggedIn ? '去使用' : '登录'}
            </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient Orb 1 - Top Left */}
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary-400/20 to-purple-400/20 blur-3xl dark:from-primary-500/10 dark:to-purple-500/10 animate-pulse" />
          {/* Gradient Orb 2 - Bottom Right */}
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-blue-400/20 to-cyan-400/20 blur-3xl dark:from-blue-500/10 dark:to-cyan-500/10 animate-pulse" style={{ animationDelay: '1s' }} />
          {/* Gradient Orb 3 - Center (subtle) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-r from-primary-300/10 via-purple-300/10 to-blue-300/10 blur-3xl dark:from-primary-400/5 dark:via-purple-400/5 dark:to-blue-400/5" />
          {/* Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center space-y-8 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              AI 驱动的知识管理
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl sm:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors duration-300">
            <span className="bg-gradient-to-r from-slate-900 via-primary-600 to-slate-900 dark:from-white dark:via-primary-400 dark:to-white bg-clip-text text-transparent">
              AIMO
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100 transition-colors duration-300">
            让知识管理更智能
          </p>

          {/* Subtitle */}
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed transition-colors duration-300">
            融合 AI 技术的现代化笔记工具。智能摘要、语义搜索、自动关联，
            帮你构建属于自己的知识图谱。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <button
              onClick={() => scrollToSection('download')}
              className="group px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary-500/25 flex items-center justify-center gap-2"
            >
              <span>免费下载</span>
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <button
              onClick={() => isLoggedIn ? navigate('/home') : scrollToSection('features')}
              className="group px-8 py-4 border-2 border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-700 dark:text-slate-300 hover:text-primary-700 dark:hover:text-primary-300 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>{isLoggedIn ? '去使用' : '查看功能'}</span>
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>开源免费</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>隐私优先</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>多平台支持</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <button
            onClick={() => scrollToSection('features')}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="向下滚动"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI 笔记"
              description="智能生成笔记摘要，自动提取关键信息，让记录更高效"
            />
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="语义搜索"
              description="基于向量相似度的智能搜索，快速找到相关内容"
            />
            <FeatureCard
              icon={<Link2 className="w-6 h-6" />}
              title="知识关联"
              description="自动发现笔记间的关联，构建可视化知识图谱"
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="智能补全"
              description="AI 辅助写作，智能补全内容，激发创作灵感"
            />
            <FeatureCard
              icon={<Network className="w-6 h-6" />}
              title="多端同步"
              description="支持桌面端和移动端，随时随地访问你的知识库"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="隐私安全"
              description="本地优先存储，端到端加密，你的数据只属于你"
            />
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="screenshots" className="py-24 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 mb-4">
              <Images className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                界面预览
              </span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              应用截图
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              探索 AIMO 的优雅界面，体验流畅的知识管理之旅
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative">
            {/* Main Carousel */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 aspect-[16/10] max-w-4xl mx-auto shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/30">
              {screenshots.map((screenshot, index) => (
                <div
                  key={screenshot.id}
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    index === currentScreenshot
                      ? 'opacity-100 translate-x-0'
                      : index < currentScreenshot
                        ? 'opacity-0 -translate-x-full'
                        : 'opacity-0 translate-x-full'
                  }`}
                >
                  {/* Screenshot Image */}
                  <div
                    className={`w-full h-full bg-gradient-to-br ${screenshot.gradient} p-8 flex items-center justify-center cursor-pointer group`}
                    onClick={() => openLightbox(index)}
                  >
                    {/* Mock App Window */}
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden transform transition-transform duration-300 group-hover:scale-[1.02]">
                      {/* Screenshot Image */}
                      <div className="relative">
                        <img
                          src={screenshot.image}
                          alt={screenshot.title}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                    {/* Zoom Hint */}
                    <div className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      点击查看大图
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevScreenshot}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:scale-110 transition-all duration-200 z-10"
              aria-label="上一张"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextScreenshot}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:scale-110 transition-all duration-200 z-10"
              aria-label="下一张"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Thumbnail Navigation */}
          <div className="flex justify-center gap-3 mt-8">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id}
                onClick={() => setCurrentScreenshot(index)}
                className={`relative w-20 h-14 rounded-lg overflow-hidden transition-all duration-200 ${
                  index === currentScreenshot
                    ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900 scale-110'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                <div className={`w-full h-full bg-gradient-to-br ${screenshot.gradient}`} />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-1 bg-white dark:bg-slate-800 rounded opacity-90">
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 m-1 rounded" />
                  <div className="h-1 bg-slate-100 dark:bg-slate-700 m-1 rounded w-2/3" />
                </div>
              </button>
            ))}
          </div>

          {/* Screenshot Info */}
          <div className="text-center mt-8">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {screenshots[currentScreenshot].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {screenshots[currentScreenshot].description}
            </p>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            aria-label="关闭"
          >
            <XIcon className="w-6 h-6" />
          </button>

          {/* Lightbox Navigation */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevScreenshot();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="上一张"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextScreenshot();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="下一张"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Enlarged Screenshot */}
          <div
            className="max-w-5xl w-full mx-8 aspect-[16/10] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-full h-full bg-gradient-to-br ${screenshots[currentScreenshot].gradient} p-12 flex items-center justify-center`}
            >
              <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                <img
                  src={screenshots[currentScreenshot].image}
                  alt={screenshots[currentScreenshot].title}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          {/* Lightbox Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentScreenshot(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentScreenshot
                    ? 'bg-white w-8'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`跳转到第 ${index + 1} 张`}
              />
            ))}
          </div>

          {/* Screenshot Counter */}
          <div className="absolute bottom-8 right-8 text-white/60 text-sm">
            {currentScreenshot + 1} / {screenshots.length}
          </div>
        </div>
      )}

      {/* Use Cases Section */}
      <section id="usecases" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              使用场景
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              探索 AIMO 在实际生活和工作中的应用场景
            </p>
          </div>

          {/* Use Cases */}
          <div className="space-y-24">
            {useCases.map((useCase, index) => {
              const IconComponent = useCase.icon;
              const isEven = index % 2 === 0;
              return (
                <div
                  key={useCase.id}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-16`}
                >
                  {/* Text Content */}
                  <div className="flex-1 space-y-6">
                    <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                      {useCase.title}
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                      {useCase.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {useCase.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Visual Representation */}
                  <div className="flex-1 w-full max-w-md lg:max-w-none">
                    <div
                      className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${useCase.gradient} p-1 shadow-xl shadow-slate-900/10 dark:shadow-slate-900/30`}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                      <div className="relative h-full rounded-xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                        {/* Mock Window Header */}
                        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                          </div>
                          <div className="flex-1 text-center text-xs text-slate-500 dark:text-slate-400">
                            AIMO - {useCase.title}
                          </div>
                        </div>
                        {/* Mock Content */}
                        <div className="flex-1 p-6 flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center text-white shadow-lg`}>
                              <IconComponent className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 mx-auto" />
                              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-24 mx-auto" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-24 px-6 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              下载 AIMO
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              选择适合你的平台，开始高效的知识管理之旅
            </p>
          </div>

          {/* Desktop Downloads */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                桌面端
              </h3>
              {versions?.desktop.version && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                  v{versions.desktop.version}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DownloadCard
                platform="macOS"
                icon={<Apple className="w-8 h-8" />}
                downloadUrl="https://github.com/ximing/aimo/releases/latest"
                requirements="macOS 12+"
              />
              <DownloadCard
                platform="Windows"
                icon={
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                  </svg>
                }
                downloadUrl="https://github.com/ximing/aimo/releases/latest"
                requirements="Windows 10+"
              />
              <DownloadCard
                platform="Linux"
                icon={
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.41c.007.133.034.266.09.394.024.059.081.126.128.188a1.617 1.617 0 00-.336.123c-.08.034-.15.072-.206.108a.968.968 0 01-.217-.329 1.52 1.52 0 01-.15-.703v-.133c.01-.135.057-.264.137-.376.108-.169.266-.305.467-.37a1.08 1.08 0 01.357-.062zm3.067 3.075c.175.145.35.283.525.415a3.24 3.24 0 01-.264 1.123c-.138.343-.324.638-.537.87a1.48 1.48 0 00-.093-.134c-.114-.15-.205-.3-.29-.47a2.133 2.133 0 01-.083-.2c.132-.197.247-.42.35-.673.102-.255.185-.52.252-.8h.14zm-2.578.028c.062.28.14.544.243.792.1.245.216.467.349.66a3.08 3.08 0 01-.369.876c-.083.156-.174.303-.27.432-.101-.215-.227-.408-.37-.579a2.881 2.881 0 00-.472-.467c.123-.14.237-.295.338-.466.102-.169.192-.35.273-.543.08-.192.147-.396.2-.606l.078.001zm1.576.604c.07.197.15.39.243.579a4.02 4.02 0 00-.562-.003 4.18 4.18 0 00-.24-.576c.185.011.371.011.559 0zm-.697 1.534c.163.056.325.124.487.201.16.077.32.164.475.263-.146.119-.3.227-.464.32a2.552 2.552 0 01-.516.234c-.052-.158-.111-.313-.176-.464a3.723 3.723 0 00-.206-.454c.13-.034.267-.066.4-.1zm1.346 0c.133.034.27.066.4.1-.068.148-.13.3-.182.457-.063.149-.12.303-.175.46a2.555 2.555 0 01-.48-.23 2.52 2.52 0 01-.5-.318c.155-.102.313-.19.476-.27.163-.079.325-.147.46-.199z" />
                  </svg>
                }
                downloadUrl="https://github.com/ximing/aimo/releases/latest"
                requirements="Ubuntu 20.04+"
              />
            </div>
          </div>

          {/* Mobile Downloads */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                移动端
              </h3>
              {versions?.apk.version && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                  v{versions.apk.version}
                </span>
              )}
            </div>
            <div className="max-w-xs">
              <DownloadCard
                platform="Android APK"
                icon={
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0225 3.503c-1.4655-.6712-3.1128-1.0456-4.8573-1.0456-1.7456 0-3.3945.3744-4.8621 1.0472L4.7932 5.4465a.4161.4161 0 00-.5677-.1521.4156.4156 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589.3432 18.6617h23.3136c0-4.0028-2.3457-7.475-5.7748-9.3403" />
                  </svg>
                }
                downloadUrl="https://github.com/ximing/aimo-app/releases/latest"
                requirements="Android 8.0+"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 py-12 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-bold text-slate-900 dark:text-white">AIMO</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                AI 驱动的知识管理工具，让知识管理更智能。
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/ximing/aimo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/ximing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                  aria-label="Twitter/X"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">产品</h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    功能特性
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('download')}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    下载应用
                  </button>
                </li>
                <li>
                  <a
                    href="https://github.com/ximing/aimo/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    更新日志
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">资源</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com/ximing/aimo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    GitHub 仓库
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ximing/aimo/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    问题反馈
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ximing/aimo/blob/main/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    使用文档
                  </a>
                </li>
              </ul>
            </div>

            {/* Auth Column */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">账户</h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => navigate('/auth')}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    登录
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/auth')}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    注册账户
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-500 dark:text-slate-500">
                © 2025 AIMO. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://github.com/ximing/aimo/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Business Source License 1.1
                </a>
              </div>
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
    <div className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-2 hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 cursor-default">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function DownloadCard({
  platform,
  icon,
  downloadUrl,
  requirements,
}: {
  platform: string;
  icon: React.ReactNode;
  downloadUrl: string;
  requirements: string;
}) {
  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
          {icon}
        </div>
        <Download className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors duration-300" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
        {platform}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
        {requirements}
      </p>
    </a>
  );
}
