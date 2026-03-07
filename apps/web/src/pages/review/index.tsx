import { useState, useEffect } from 'react';
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import * as reviewApi from '../../api/review';
import type { ReviewSessionDto, SubmitAnswerResponseDto, CompleteSessionResponseDto, ReviewHistoryItemDto } from '@aimo/dto';
import { Brain, Clock, Loader2 } from 'lucide-react';

type Step = 'setup' | 'quiz' | 'summary';
type Scope = 'all' | 'category' | 'tag' | 'recent';

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

export const ReviewPage = view(() => {
  const [step, setStep] = useState<Step>('setup');
  const [scope, setScope] = useState<Scope>('all');
  const [scopeValue, setScopeValue] = useState('');
  const [session, setSession] = useState<ReviewSessionDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<SubmitAnswerResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalSession, setFinalSession] = useState<CompleteSessionResponseDto | null>(null);

  // History sidebar state
  const [history, setHistory] = useState<ReviewHistoryItemDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
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

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.createReviewSession({ scope, scopeValue: scopeValue || undefined });
      if (res.code === 0) {
        setSession(res.data);
        setStep('quiz');
        setCurrentIndex(0);
        setSelectedHistorySession(null);
        // Refresh history after creating new session
        loadHistory();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistorySession = async (sessionId: string) => {
    setLoading(true);
    setSelectedHistorySession(sessionId);
    try {
      const res = await reviewApi.getReviewSession(sessionId);
      if (res.code === 0 && res.data) {
        // Only allow reviewing completed sessions
        if (res.data.status === 'completed') {
          setSession(res.data);
          setStep('summary');
          setFinalScore(res.data.score ?? 0);
          // Convert to CompleteSessionResponseDto format
          setFinalSession({
            sessionId: res.data.sessionId,
            score: res.data.score ?? 0,
            items: res.data.items,
          });
        } else {
          // Active session - continue from where left off
          setSession(res.data);
          setStep('quiz');
          setCurrentIndex(0);
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
      // If skipping (forgot button), submit empty answer
      const answerText = skipAnswer ? '' : answer;
      const res = await reviewApi.submitAnswer(session.sessionId, { itemId: item.itemId, answer: answerText });
      if (res.code === 0) setFeedback(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    handleSubmitAnswer(true);
  };

  const handleNext = () => {
    if (!session) return;
    setAnswer('');
    setFeedback(null);
    if (currentIndex + 1 >= session.items.length) {
      handleComplete();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    const res = await reviewApi.completeSession(session.sessionId);
    if (res.code === 0) {
      setFinalScore(res.data.score);
      setFinalSession(res.data);
      setStep('summary');
      // Refresh history
      loadHistory();
    }
  };

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
        <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50">知识回顾</h1>
              </div>
            </div>
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
        <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-dark-900 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-6">
              {step === 'setup' && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">AI 回顾模式</h1>
                  <div className="space-y-3 mb-6">
                    {(['all', 'category', 'tag', 'recent'] as Scope[]).map((s) => (
                      <label key={s} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          value={s}
                          checked={scope === s}
                          onChange={() => setScope(s)}
                          className="w-4 h-4 text-primary-600 dark:text-primary-400"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{scopeLabels[s]}</span>
                      </label>
                    ))}
                  </div>
                  {scope !== 'all' && (
                    <input
                      className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 mb-4 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      placeholder={scope === 'recent' ? '输入天数，如 7' : '输入分类ID或标签名'}
                      value={scopeValue}
                      onChange={(e) => setScopeValue(e.target.value)}
                    />
                  )}
                  <button
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    onClick={handleStart}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? '准备中...' : '开始回顾'}
                  </button>
                </div>
              )}

              {step === 'quiz' && session && currentItem && (
                <div className="space-y-4">
                  {/* Progress */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>第 {currentIndex + 1} / {session.items.length} 题</span>
                      <span>{Math.round(((currentIndex + 1) / session.items.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${((currentIndex + 1) / session.items.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Original Memo Content */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      原始笔记
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap line-clamp-6">
                      {currentItem.memoContent || '暂无内容'}
                    </p>
                  </div>

                  {/* Question */}
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {currentItem.question}
                    </p>

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
                        {currentItem.userAnswer && (
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

              {step === 'summary' && finalSession && (
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
                    }}
                  >
                    再来一次
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
});

export default ReviewPage;
