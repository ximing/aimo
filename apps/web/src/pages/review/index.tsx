import { useState } from 'react';
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import * as reviewApi from '../../api/review';
import type { ReviewSessionDto, SubmitAnswerResponseDto, CompleteSessionResponseDto } from '@aimo/dto';

type Step = 'setup' | 'quiz' | 'summary';
type Scope = 'all' | 'category' | 'tag' | 'recent';

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

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.createReviewSession({ scope, scopeValue: scopeValue || undefined });
      if (res.code === 0) {
        setSession(res.data);
        setStep('quiz');
        setCurrentIndex(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const item = session.items[currentIndex];
      const res = await reviewApi.submitAnswer(session.sessionId, { itemId: item.itemId, answer });
      if (res.code === 0) setFeedback(res.data);
    } finally {
      setLoading(false);
    }
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
    }
  };

  const masteryLabel = (m?: string) => ({ remembered: '记得', fuzzy: '模糊', forgot: '忘了' }[m ?? ''] ?? '未回答');
  const masteryColor = (m?: string) => ({
    remembered: 'text-green-600 dark:text-green-400',
    fuzzy: 'text-yellow-600 dark:text-yellow-400',
    forgot: 'text-red-600 dark:text-red-400',
  }[m ?? ''] ?? 'text-gray-400');

  const renderContent = () => {
    if (step === 'setup') {
      return (
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
                <span className="text-gray-700 dark:text-gray-300">{ { all: '全部笔记', category: '按分类', tag: '按标签', recent: '最近 N 天' }[s] }</span>
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
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? '准备中...' : '开始回顾'}
          </button>
        </div>
      );
    }

    if (step === 'quiz' && session) {
      const item = session.items[currentIndex];
      return (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span>第 {currentIndex + 1} / {session.items.length} 题</span>
            <div className="w-40 bg-gray-200 dark:bg-dark-700 rounded-full h-2 mt-1">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / session.items.length) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{item.question}</p>
          {!feedback ? (
            <>
              <textarea
                className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 h-32 mb-4 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                placeholder="输入你的回答..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <button
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitAnswer}
                disabled={loading || !answer.trim()}
              >
                {loading ? '评估中...' : '提交回答'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className={`font-semibold ${masteryColor(feedback.mastery)}`}>{masteryLabel(feedback.mastery)}</div>
              <div className="text-sm bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-gray-700 dark:text-gray-300">{feedback.aiFeedback}</div>
              <button
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
                onClick={handleNext}
              >
                {currentIndex + 1 >= session.items.length ? '完成回顾' : '下一题'}
              </button>
            </div>
          )}
        </div>
      );
    }

    if (step === 'summary' && finalSession) {
      return (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">回顾完成</h2>
          <p className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-6">{finalScore} 分</p>
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
            onClick={() => { setStep('setup'); setSession(null); setFinalScore(null); setFinalSession(null); }}
          >
            再来一次
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-2xl h-full flex flex-col">
          <header className="flex-shrink-0 sticky top-0 z-30 px-8 pt-4 pb-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">知识回顾</h1>
          </header>
          <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
});

export default ReviewPage;
