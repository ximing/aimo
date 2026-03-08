import { useState, useEffect } from 'react';
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import * as reviewApi from '../../api/review';
import * as srApi from '../../api/spaced-repetition';
import * as categoryApi from '../../api/category';
import * as tagApi from '../../api/tag';
import type { ReviewSessionDto, SubmitAnswerResponseDto, CompleteSessionResponseDto, ReviewHistoryItemDto, ReviewItemDto, ReviewProfileDto, CreateReviewProfileDto } from '@aimo/dto';
import type { SRCard } from '../../api/spaced-repetition';
import { Clock, Loader2, ChevronLeft, ChevronRight, CheckCircle, Circle, XCircle, Plus, BrainCircuit, Trash2, Play, Save } from 'lucide-react';

type Step = 'setup' | 'quiz' | 'summary';
type Scope = 'all' | 'category' | 'tag' | 'recent';
type ReviewType = 'ai' | 'sr';

/**
 * Format relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const date = new Date(timestamp);
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

/**
 * Scope labels
 */
const scopeLabels: Record<Scope, string> = {
  all: '全部笔记',
  category: '按分类',
  tag: '按标签',
  recent: '最近 N 天',
};

/**
 * Get item status icon
 */
const getItemStatus = (item: ReviewItemDto): 'remembered' | 'fuzzy' | 'forgot' | 'pending' => {
  if (item.mastery === 'remembered') return 'remembered';
  if (item.mastery === 'fuzzy') return 'fuzzy';
  if (item.mastery === 'forgot') return 'forgot';
  return 'pending';
};

export const ReviewPage = view(() => {
  const [step, setStep] = useState<Step>('setup');
  const [reviewType, setReviewType] = useState<ReviewType>('ai');
  const [session, setSession] = useState<ReviewSessionDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<SubmitAnswerResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<CompleteSessionResponseDto | null>(null);

  // Spaced Repetition state
  const [srCards, setSrCards] = useState<SRCard[]>([]);
  const [srCurrentIndex, setSrCurrentIndex] = useState(0);
  const [skippedCards, setSkippedCards] = useState<SRCard[]>([]);
  const [srLoading, setSrLoading] = useState(false);

  // History sidebar state
  const [history, setHistory] = useState<ReviewHistoryItemDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null);

  // Review Profile state
  const [profiles, setProfiles] = useState<ReviewProfileDto[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showCustomSetup, setShowCustomSetup] = useState(false);
  const [customScope, setCustomScope] = useState<Scope>('all');
  const [customFilterValues, setCustomFilterValues] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(7);

  // Handle tab switch - reset states to prevent pollution
  const handleReviewTypeChange = (type: ReviewType) => {
    if (type === reviewType) return;
    // Reset AI Review states
    setStep('setup');
    setSession(null);
    setCurrentIndex(0);
    setAnswer('');
    setFeedback(null);
    setFinalScore(null);
    setFinalSession(null);
    setSelectedHistorySession(null);
    // Reset SR states
    setSrCards([]);
    setSrCurrentIndex(0);
    setSkippedCards([]);
    // Set new type
    setReviewType(type);
  };

  const STORAGE_KEY = 'aimo-review-session';

  // Load history, profiles, categories, tags and restore selected session on mount
  useEffect(() => {
    loadHistory();
    loadProfiles();
    loadCategoriesAndTags();
    // Restore last selected session from localStorage
    const savedSessionId = localStorage.getItem(STORAGE_KEY);
    if (savedSessionId) {
      // Restore session directly without triggering localStorage save again
      const restoreSession = async () => {
        setLoading(true);
        setSelectedHistorySession(savedSessionId);
        try {
          const res = await reviewApi.getReviewSession(savedSessionId);
          if (res.code === 0 && res.data) {
            const firstUnanswered = res.data.items.findIndex(item => item.mastery === undefined);
            if (res.data.status === 'completed') {
              setSession(res.data);
              setStep('summary');
              setFinalScore(res.data.score ?? 0);
              setFinalSession({
                sessionId: res.data.sessionId,
                score: res.data.score ?? 0,
                items: res.data.items,
              });
            } else if (firstUnanswered !== -1) {
              setSession(res.data);
              setStep('quiz');
              setCurrentIndex(firstUnanswered);
              setAnswer('');
              setFeedback(null);
            } else {
              setSession(res.data);
              setStep('quiz');
              setCurrentIndex(0);
              setAnswer('');
              setFeedback(null);
            }
          }
        } finally {
          setLoading(false);
        }
      };
      restoreSession();
    }
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await reviewApi.getReviewHistory();
      if (res.code === 0) {
        setHistory(res.data.items);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const res = await reviewApi.getReviewProfiles();
      if (res.code === 0) {
        setProfiles(res.data.profiles);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadCategoriesAndTags = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        categoryApi.getCategories(),
        tagApi.getTags(),
      ]);
      if (catRes.code === 0) {
        setCategories(catRes.data?.items || []);
      }
      if (tagRes.code === 0) {
        setTags(tagRes.data?.tags || []);
      }
    } catch (error) {
      console.error('Failed to load categories/tags:', error);
    }
  };

  const handleStartWithProfile = async (profileId: string) => {
    setLoading(true);
    try {
      const res = await reviewApi.createReviewSession({ profileId });
      if (res.code === 0) {
        setSession(res.data);
        setStep('quiz');
        setCurrentIndex(0);
        setAnswer('');
        setFeedback(null);
        const newSessionId = res.data.sessionId;
        setSelectedHistorySession(newSessionId);
        localStorage.setItem(STORAGE_KEY, newSessionId);
        loadHistory();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      const dto: CreateReviewProfileDto = {
        name: newProfileName.trim(),
        scope: customScope,
        filterValues: customScope !== 'all' && customScope !== 'recent' ? customFilterValues : undefined,
        recentDays: customScope === 'recent' ? parseInt(customFilterValues[0] || '7', 10) : undefined,
        questionCount,
      };
      const res = await reviewApi.createReviewProfile(dto);
      if (res.code === 0) {
        setProfiles([res.data, ...profiles]);
        setShowSaveProfileDialog(false);
        setNewProfileName('');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      const res = await reviewApi.deleteReviewProfile(profileId);
      if (res.code === 0) {
        setProfiles(profiles.filter(p => p.profileId !== profileId));
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  // Calculate progress - count items that have been answered
  const answeredCount = session?.items.filter(item => item.mastery !== undefined).length || 0;
  const totalCount = session?.items.length || 0;

  // SR progress

  const handleStart = async () => {
    setLoading(true);
    try {
      // Use profile if selected, otherwise use custom settings
      const dto = selectedProfileId
        ? { profileId: selectedProfileId }
        : {
            scope: customScope,
            scopeValue: customScope === 'recent' ? customFilterValues[0] || '7' : customFilterValues[0],
            questionCount,
          };
      const res = await reviewApi.createReviewSession(dto);
      if (res.code === 0) {
        setSession(res.data);
        setStep('quiz');
        setCurrentIndex(0);
        setAnswer('');
        setFeedback(null);
        const newSessionId = res.data.sessionId;
        setSelectedHistorySession(newSessionId);
        localStorage.setItem(STORAGE_KEY, newSessionId);
        loadHistory();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistorySession = async (sessionId: string) => {
    setLoading(true);
    setSelectedHistorySession(sessionId);
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, sessionId);
    try {
      const res = await reviewApi.getReviewSession(sessionId);
      if (res.code === 0 && res.data) {
        // Find first unanswered item
        const firstUnanswered = res.data.items.findIndex(item => item.mastery === undefined);
        if (res.data.status === 'completed') {
          setSession(res.data);
          setStep('summary');
          setFinalScore(res.data.score ?? 0);
          setFinalSession({
            sessionId: res.data.sessionId,
            score: res.data.score ?? 0,
            items: res.data.items,
          });
        } else if (firstUnanswered !== -1) {
          // Active session - continue from first unanswered
          setSession(res.data);
          setStep('quiz');
          setCurrentIndex(firstUnanswered);
          setAnswer('');
          setFeedback(null);
        } else {
          // All answered, go to summary
          setSession(res.data);
          setStep('quiz');
          setCurrentIndex(0);
          setAnswer('');
          setFeedback(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (skipAnswer = false) => {
    if (!session) return;
    setLoading(true);
    try {
      const item = session.items[currentIndex];
      const answerText = skipAnswer ? '我忘记了' : answer;
      const res = await reviewApi.submitAnswer(session.sessionId, { itemId: item.itemId, answer: answerText });
      if (res.code === 0) {
        setFeedback(res.data);
        // Update session with the new answer/mastery
        const updatedItems = [...session.items];
        updatedItems[currentIndex] = {
          ...updatedItems[currentIndex],
          userAnswer: answerText,
          aiFeedback: res.data.aiFeedback,
          mastery: res.data.mastery,
        };
        setSession({ ...session, items: updatedItems });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    handleSubmitAnswer(true);
  };

  const handleNext = () => {
    if (!session) return;
    if (currentIndex + 1 >= session.items.length) {
      handleComplete();
    } else {
      setCurrentIndex(currentIndex + 1);
      // Check if next item already has an answer
      const nextItem = session.items[currentIndex + 1];
      if (nextItem.mastery !== undefined) {
        setFeedback({ itemId: nextItem.itemId, aiFeedback: nextItem.aiFeedback || '', mastery: nextItem.mastery });
        setAnswer(nextItem.userAnswer || '');
      } else {
        setAnswer('');
        setFeedback(null);
      }
    }
  };

  const handlePrev = () => {
    if (!session || currentIndex === 0) return;
    setCurrentIndex(currentIndex - 1);
    // Check if previous item has an answer
    const prevItem = session.items[currentIndex - 1];
    if (prevItem.mastery !== undefined) {
      setFeedback({ itemId: prevItem.itemId, aiFeedback: prevItem.aiFeedback || '', mastery: prevItem.mastery });
      setAnswer(prevItem.userAnswer || '');
    } else {
      setAnswer('');
      setFeedback(null);
    }
  };

  const handleJumpToItem = (index: number) => {
    if (!session) return;
    setCurrentIndex(index);
    const item = session.items[index];
    if (item.mastery !== undefined) {
      setFeedback({ itemId: item.itemId, aiFeedback: item.aiFeedback || '', mastery: item.mastery });
      setAnswer(item.userAnswer || '');
    } else {
      setAnswer('');
      setFeedback(null);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    const res = await reviewApi.completeSession(session.sessionId);
    if (res.code === 0) {
      setFinalScore(res.data.score);
      setFinalSession(res.data);
      setStep('summary');
      loadHistory();
    }
  };

  // ========== Spaced Repetition Handlers ==========
  const handleStartSR = async () => {
    setSrLoading(true);
    setSkippedCards([]);
    try {
      const res = await srApi.getDueCards();
      if (res.code === 0 && res.data?.cards) {
        if (res.data.cards.length === 0) {
          // No cards due - show summary directly
          setSrCards([]);
          setSrCurrentIndex(0);
          setFinalScore(null);
          setFinalSession(null);
          setStep('summary');
        } else {
          setSrCards(res.data.cards);
          setSrCurrentIndex(0);
          setStep('quiz');
        }
      }
    } finally {
      setSrLoading(false);
    }
  };

  const handleSRReview = async (quality: 'mastered' | 'remembered' | 'fuzzy' | 'forgot' | 'skip') => {
    if (srCurrentIndex >= srCards.length) return;

    const card = srCards[srCurrentIndex];

    if (quality === 'skip') {
      // Move skipped card to end of queue
      setSkippedCards([...skippedCards, card]);
      moveToNextSR();
      return;
    }

    setSrLoading(true);
    try {
      const res = await srApi.reviewCard(card.cardId, quality);
      if (res.code === 0) {
        // Update the card in place
        const updatedCards = [...srCards];
        updatedCards[srCurrentIndex] = res.data.card;
        setSrCards(updatedCards);
        moveToNextSR();
      }
    } finally {
      setSrLoading(false);
    }
  };

  const moveToNextSR = () => {
    const remainingCards = srCards.length - srCurrentIndex - 1;
    const totalSkipped = skippedCards.length;

    if (remainingCards <= 0 && totalSkipped <= 0) {
      // All cards done
      setStep('summary');
      setFinalScore(null);
      setFinalSession(null);
    } else if (remainingCards <= 0 && totalSkipped > 0) {
      // Move skipped cards back to continue
      setSrCards([...skippedCards]);
      setSkippedCards([]);
      setSrCurrentIndex(0);
    } else {
      setSrCurrentIndex(srCurrentIndex + 1);
    }
  };

  const currentSRCard = srCards[srCurrentIndex];

  const masteryLabel = (m?: string) => ({ remembered: '记得', fuzzy: '模糊', forgot: '忘了' }[m ?? ''] ?? '未回答');
  const masteryColor = (m?: string) => ({
    remembered: 'text-green-600 dark:text-green-400',
    fuzzy: 'text-yellow-600 dark:text-yellow-400',
    forgot: 'text-red-600 dark:text-red-400',
  }[m ?? ''] ?? 'text-gray-400');

  const currentItem = session?.items[currentIndex];

  return (
    <Layout>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Sidebar - 280px fixed width */}
        <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 flex flex-col">
          {/* Sidebar Header - 回顾模式 */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50">回顾模式</h1>
              </div>
              <button
                onClick={handleStart}
                disabled={loading}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="新建回顾"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Profile List in Left Sidebar */}
          <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-dark-700">
            {profiles.length === 0 ? (
              <div className="p-8 text-center">
                <BrainCircuit className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无保存的模式</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  点击上方 + 创建回顾模式
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {profiles.map((profile) => (
                  <div
                    key={profile.profileId}
                    className={`relative group rounded-lg transition-colors cursor-pointer ${
                      selectedProfileId === profile.profileId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedProfileId(profile.profileId);
                      setShowCustomSetup(false);
                    }}
                  >
                    <div className="p-3">
                      <p
                        className={`text-sm font-medium truncate ${
                          selectedProfileId === profile.profileId
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {profile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {scopeLabels[profile.scope]}{profile.scopeValue ? ` - ${profile.scopeValue}` : ''} · {profile.questionCount}题
                      </p>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartWithProfile(profile.profileId);
                        }}
                        className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded"
                        title="开始"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.profileId);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History Section Header */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h2>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto">
            {historyLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-dark-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无回顾记录</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  开始一次回顾来创建记录
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {history.map((item) => (
                  <div
                    key={item.sessionId}
                    className={`relative group rounded-lg transition-colors cursor-pointer ${
                      selectedHistorySession === item.sessionId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                    }`}
                    onClick={() => handleSelectHistorySession(item.sessionId)}
                  >
                    <div className="p-3">
                      <p
                        className={`text-sm font-medium truncate ${
                          selectedHistorySession === item.sessionId
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {scopeLabels[item.scope]}{item.scopeValue ? ` - ${item.scopeValue}` : ''}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        {item.score !== undefined && (
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {item.score}分
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-dark-800 overflow-hidden">
          {/* Review Type Tab Bar - Always visible at top */}
          <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 pt-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleReviewTypeChange('ai')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 transition-all ${
                  reviewType === 'ai'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <BrainCircuit className={`w-5 h-5 ${reviewType === 'ai' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className="font-medium">AI 回顾</span>
              </button>
              <button
                onClick={() => handleReviewTypeChange('sr')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 transition-all ${
                  reviewType === 'sr'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <Clock className={`w-5 h-5 ${reviewType === 'sr' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className="font-medium">间隔重复</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-6">
              {step === 'setup' && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
                    {reviewType === 'ai' ? '选择回顾模式' : '间隔重复复习'}
                  </h1>

                  {reviewType === 'ai' ? (
                    <>
                      {/* Saved Profiles Section */}
                      {profiles.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">已保存的回顾模式</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {profiles.map((profile) => (
                              <div
                                key={profile.profileId}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                  selectedProfileId === profile.profileId
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
                                }`}
                              >
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                                  setSelectedProfileId(profile.profileId);
                                  setShowCustomSetup(false);
                                }}>
                                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{profile.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {scopeLabels[profile.scope]}
                                    {profile.filterValues && profile.filterValues.length > 0 && ` · ${profile.filterValues.join(', ')}`}
                                    {profile.recentDays && ` · ${profile.recentDays}天`}
                                    {` · ${profile.questionCount}题`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProfile(profile.profileId);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStartWithProfile(profile.profileId)}
                                    disabled={loading}
                                    className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                                    title="开始"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-dark-700" />
                        <span className="text-xs text-gray-400">或自定义设置</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-dark-700" />
                      </div>

                      {/* Custom Setup Section */}
                      <div className="space-y-4 mb-6">
                        {/* Scope Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择范围</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(['all', 'category', 'tag', 'recent'] as Scope[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  setCustomScope(s);
                                  setSelectedProfileId(null);
                                  setShowCustomSetup(true);
                                }}
                                className={`p-2 rounded-lg border text-sm transition-all ${
                                  customScope === s && showCustomSetup
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                    : 'border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-600'
                                }`}
                              >
                                {scopeLabels[s]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Multi-select for Category/Tag */}
                        {customScope === 'category' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择分类（可多选）</label>
                            <div className="flex flex-wrap gap-2">
                              {categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    setCustomFilterValues(prev =>
                                      prev.includes(cat.id)
                                        ? prev.filter(v => v !== cat.id)
                                        : [...prev, cat.id]
                                    );
                                    setShowCustomSetup(true);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                                    customFilterValues.includes(cat.id)
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              ))}
                              {categories.length === 0 && <span className="text-sm text-gray-400">暂无分类</span>}
                            </div>
                          </div>
                        )}

                        {customScope === 'tag' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择标签（可多选）</label>
                            <div className="flex flex-wrap gap-2">
                              {tags.map((tag) => (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    setCustomFilterValues(prev =>
                                      prev.includes(tag.id)
                                        ? prev.filter(v => v !== tag.id)
                                        : [...prev, tag.id]
                                    );
                                    setShowCustomSetup(true);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                                    customFilterValues.includes(tag.id)
                                      ? 'bg-primary-500 text-white'
                                      : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              ))}
                              {tags.length === 0 && <span className="text-sm text-gray-400">暂无标签</span>}
                            </div>
                          </div>
                        )}

                        {customScope === 'recent' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">最近天数</label>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={customFilterValues[0] || '7'}
                              onChange={(e) => {
                                setCustomFilterValues([e.target.value]);
                                setShowCustomSetup(true);
                              }}
                              className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100"
                              placeholder="输入天数"
                            />
                          </div>
                        )}

                        {/* Question Count */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">题目数量: {questionCount}</label>
                          <input
                            type="range"
                            min={5}
                            max={10}
                            value={questionCount}
                            onChange={(e) => {
                              setQuestionCount(parseInt(e.target.value, 10));
                              setShowCustomSetup(true);
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          onClick={handleStart}
                          disabled={loading || (!showCustomSetup && profiles.length === 0)}
                        >
                          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                          {loading ? '准备中...' : '开始回顾'}
                        </button>
                        {showCustomSetup && (
                          <button
                            onClick={() => setShowSaveProfileDialog(true)}
                            className="px-4 py-2.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                            title="保存为回顾模式"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <button
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={handleStartSR}
                      disabled={srLoading}
                    >
                      {srLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {srLoading ? '加载中...' : '开始复习'}
                    </button>
                  )}
                </div>
              )}

              {step === 'quiz' && reviewType === 'ai' && session && currentItem && (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>进度: {answeredCount} / {totalCount}</span>
                      <span>{Math.round((answeredCount / totalCount) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${(answeredCount / totalCount) * 100}%` }}
                      />
                    </div>
                    {/* Question dots */}
                    <div className="flex justify-center gap-1 mt-3 flex-wrap">
                      {session.items.map((item, idx) => {
                        const status = getItemStatus(item);
                        return (
                          <button
                            key={item.itemId}
                            onClick={() => handleJumpToItem(idx)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              idx === currentIndex
                                ? 'ring-2 ring-primary-500 ring-offset-1'
                                : ''
                            } ${
                              status === 'remembered' ? 'bg-green-100 dark:bg-green-900/30' :
                              status === 'fuzzy' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              status === 'forgot' ? 'bg-red-100 dark:bg-red-900/30' :
                              'bg-gray-100 dark:bg-dark-700'
                            }`}
                            title={`第${idx + 1}题`}
                          >
                            {status === 'remembered' ? (
                              <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                            ) : status === 'fuzzy' ? (
                              <Circle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                            ) : status === 'forgot' ? (
                              <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一题
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      第 {currentIndex + 1} / {session.items.length} 题
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={currentIndex + 1 >= session.items.length && !session.items[currentIndex]?.mastery}
                      className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {currentIndex + 1 >= session.items.length ? '完成' : '下一题'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {currentItem.question}
                    </p>

                    {/* Original Memo Content - only show after answering */}
                    {feedback && (
                      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                          原始笔记
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
                          {currentItem.memoContent || '暂无内容'}
                        </p>
                      </div>
                    )}

                    {!feedback ? (
                      <>
                        <textarea
                          className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 h-32 mb-4 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                          placeholder="输入你的回答..."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                        />
                        <div className="flex gap-3">
                          <button
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            onClick={() => handleSubmitAnswer(false)}
                            disabled={loading || !answer.trim()}
                          >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            提交回答
                          </button>
                          <button
                            className="px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            onClick={handleForgot}
                            disabled={loading}
                          >
                            忘记了
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className={`font-semibold text-lg ${masteryColor(feedback.mastery)}`}>
                          {masteryLabel(feedback.mastery)}
                        </div>
                        <div className="text-sm bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-gray-700 dark:text-gray-300">
                          {feedback.aiFeedback}
                        </div>
                        {currentItem.userAnswer && currentItem.userAnswer !== '' && (
                          <div className="text-sm border-t border-gray-200 dark:border-dark-700 pt-3 mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">你的回答:</p>
                            <p className="text-gray-700 dark:text-gray-300">{currentItem.userAnswer}</p>
                          </div>
                        )}
                        <button
                          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                          onClick={handleNext}
                        >
                          {currentIndex + 1 >= session.items.length ? '完成回顾' : '下一题'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Spaced Repetition Quiz */}
              {step === 'quiz' && reviewType === 'sr' && currentSRCard && (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>进度: {srCurrentIndex + 1} / {srCards.length}</span>
                      <span>{Math.round(((srCurrentIndex + 1) / srCards.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${((srCurrentIndex + 1) / srCards.length) * 100}%` }}
                      />
                    </div>
                    {/* Card dots */}
                    <div className="flex justify-center gap-1 mt-3 flex-wrap">
                      {srCards.map((card, idx) => (
                        <button
                          key={card.cardId}
                          onClick={() => setSrCurrentIndex(idx)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            idx === srCurrentIndex
                              ? 'ring-2 ring-primary-500 ring-offset-1'
                              : idx < srCurrentIndex
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-gray-100 dark:bg-dark-700'
                          }`}
                          title={`第${idx + 1}张`}
                        >
                          {idx < srCurrentIndex ? (
                            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Memo Content */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
                      {currentSRCard.memo.title}
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {currentSRCard.memo.content.slice(0, 200)}
                        {currentSRCard.memo.content.length > 200 ? '...' : ''}
                      </p>
                    </div>

                    {/* 5 Action Buttons */}
                    <div className="mt-6 grid grid-cols-5 gap-2">
                      <button
                        onClick={() => handleSRReview('skip')}
                        disabled={srLoading}
                        className="px-3 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors text-sm disabled:opacity-50"
                      >
                        跳过
                      </button>
                      <button
                        onClick={() => handleSRReview('forgot')}
                        disabled={srLoading}
                        className="px-3 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm disabled:opacity-50"
                      >
                        忘记了
                      </button>
                      <button
                        onClick={() => handleSRReview('fuzzy')}
                        disabled={srLoading}
                        className="px-3 py-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm disabled:opacity-50"
                      >
                        模糊
                      </button>
                      <button
                        onClick={() => handleSRReview('remembered')}
                        disabled={srLoading}
                        className="px-3 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm disabled:opacity-50"
                      >
                        记住了
                      </button>
                      <button
                        onClick={() => handleSRReview('mastered')}
                        disabled={srLoading}
                        className="px-3 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                      >
                        熟练掌握
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Review Summary */}
              {step === 'summary' && reviewType === 'ai' && finalSession && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">回顾完成</h2>
                  <p className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-6">
                    {finalScore} 分
                  </p>
                  <div className="space-y-2 mb-6">
                    {finalSession.items.map((item, i) => (
                      <div key={item.itemId} className="flex justify-between text-sm border-b border-gray-200 dark:border-dark-700 py-2">
                        <span className="text-gray-600 dark:text-gray-400">第 {i + 1} 题</span>
                        <span className={masteryColor(item.mastery)}>{masteryLabel(item.mastery)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                    onClick={() => {
                      setStep('setup');
                      setSession(null);
                      setFinalScore(null);
                      setFinalSession(null);
                      setSelectedHistorySession(null);
                      setReviewType('ai');
                    }}
                  >
                    再来一次
                  </button>
                </div>
              )}

              {/* Spaced Repetition Summary - Empty State */}
              {step === 'summary' && reviewType === 'sr' && srCards.length === 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">今天没有需要复习的笔记</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    全部笔记都已复习完毕，记得明天再来！
                  </p>
                  <button
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                    onClick={() => {
                      setStep('setup');
                      setSrCards([]);
                      setSkippedCards([]);
                      setSrCurrentIndex(0);
                    }}
                  >
                    返回
                  </button>
                </div>
              )}

              {/* Spaced Repetition Summary - Completed */}
              {step === 'summary' && reviewType === 'sr' && srCards.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">今日复习完成</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    已复习 {srCards.length} 张卡片
                  </p>
                  <button
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                    onClick={() => {
                      setStep('setup');
                      setSrCards([]);
                      setSkippedCards([]);
                      setSrCurrentIndex(0);
                    }}
                  >
                    返回
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Save Profile Dialog */}
          {showSaveProfileDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveProfileDialog(false)} />
              <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">保存回顾模式</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模式名称</label>
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="例如：我的每日复习"
                      className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      autoFocus
                    />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>将保存以下设置：</p>
                    <ul className="mt-2 space-y-1">
                      <li>范围：{scopeLabels[customScope]}</li>
                      {customScope !== 'all' && customScope !== 'recent' && customFilterValues.length > 0 && (
                        <li>筛选：{customFilterValues.join(', ')}</li>
                      )}
                      {customScope === 'recent' && customFilterValues[0] && (
                        <li>天数：{customFilterValues[0]}天</li>
                      )}
                      <li>题目数量：{questionCount}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowSaveProfileDialog(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={!newProfileName.trim()}
                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
});

export default ReviewPage;
