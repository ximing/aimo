import { useState } from 'react';
import * as reviewApi from '../../api/review';
import type { ReviewSessionDto, SubmitAnswerResponseDto, CompleteSessionResponseDto } from '@aimo/dto';

type Step = 'setup' | 'quiz' | 'summary';
type Scope = 'all' | 'category' | 'tag' | 'recent';

export function ReviewPage() {
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

  const masteryLabel = (m?: string) => ({ remembered: '记得 ✓', fuzzy: '模糊 ~', forgot: '忘了 ✗' }[m ?? ''] ?? '未回答');
  const masteryColor = (m?: string) => ({ remembered: 'text-green-600', fuzzy: 'text-yellow-600', forgot: 'text-red-600' }[m ?? ''] ?? 'text-gray-400');

  if (step === 'setup') {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">AI 回顾模式</h1>
        <div className="space-y-3 mb-6">
          {(['all', 'category', 'tag', 'recent'] as Scope[]).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={s} checked={scope === s} onChange={() => setScope(s)} />
              <span>{ { all: '全部笔记', category: '按分类', tag: '按标签', recent: '最近 N 天' }[s] }</span>
            </label>
          ))}
        </div>
        {scope !== 'all' && (
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            placeholder={scope === 'recent' ? '输入天数，如 7' : '输入分类ID或标签名'}
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
          />
        )}
        <button
          className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
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
      <div className="max-w-lg mx-auto p-6">
        <div className="flex justify-between text-sm text-gray-500 mb-4">
          <span>第 {currentIndex + 1} / {session.items.length} 题</span>
          <div className="w-40 bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((currentIndex + 1) / session.items.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-lg font-medium mb-4">{item.question}</p>
        {!feedback ? (
          <>
            <textarea
              className="w-full border rounded px-3 py-2 h-32 mb-4"
              placeholder="输入你的回答..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
              onClick={handleSubmitAnswer}
              disabled={loading || !answer.trim()}
            >
              {loading ? '评估中...' : '提交回答'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className={`font-semibold ${masteryColor(feedback.mastery)}`}>{masteryLabel(feedback.mastery)}</div>
            <p className="text-sm bg-gray-50 rounded p-3">{feedback.aiFeedback}</p>
            <button className="w-full bg-blue-600 text-white rounded px-4 py-2" onClick={handleNext}>
              {currentIndex + 1 >= session.items.length ? '完成回顾' : '下一题'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'summary' && finalSession) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">回顾完成</h2>
        <p className="text-4xl font-bold text-blue-600 mb-6">{finalScore} 分</p>
        <div className="space-y-2 mb-6">
          {finalSession.items.map((item, i) => (
            <div key={item.itemId} className="flex justify-between text-sm border-b py-1">
              <span className="text-gray-600">第 {i + 1} 题</span>
              <span className={masteryColor(item.mastery)}>{masteryLabel(item.mastery)}</span>
            </div>
          ))}
        </div>
        <button className="w-full bg-blue-600 text-white rounded px-4 py-2" onClick={() => { setStep('setup'); setSession(null); setFinalScore(null); setFinalSession(null); }}>
          再来一次
        </button>
      </div>
    );
  }

  return null;
}

export default ReviewPage;
