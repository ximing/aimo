import { CheckCircle } from 'lucide-react';
import { masteryLabel, masteryColor } from './utils';

interface SessionItem {
  itemId: string;
  mastery?: string;
}

interface Session {
  items: SessionItem[];
}

interface SRStats {
  mastered: number;
  remembered: number;
  fuzzy: number;
  forgot: number;
}

// AI Review Summary
interface AISummaryProps {
  session: Session;
  score: number;
  onReset: () => void;
}

export const AISummary = ({ session, score, onReset }: AISummaryProps) => {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">回顾完成</h2>
      <p className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-6">{score} 分</p>
      <div className="space-y-2 mb-6">
        {session.items.map((item, i) => (
          <div
            key={item.itemId}
            className="flex justify-between text-sm border-b border-gray-200 dark:border-dark-700 py-2"
          >
            <span className="text-gray-600 dark:text-gray-400">第 {i + 1} 题</span>
            <span className={masteryColor(item.mastery)}>{masteryLabel(item.mastery)}</span>
          </div>
        ))}
      </div>
      <button
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
        onClick={onReset}
      >
        再来一次
      </button>
    </div>
  );
};

// SR Empty Summary (no cards to review)
interface SREmptySummaryProps {
  totalCards: number;
  importing: boolean;
  onImport: () => void;
  onBack: () => void;
}

export const SREmptySummary = ({
  totalCards,
  importing,
  onImport,
  onBack,
}: SREmptySummaryProps) => {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
        今日无需复习，继续保持！
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">全部笔记都已复习完毕，记得明天再来！</p>

      {totalCards === 0 && (
        <button
          onClick={onImport}
          disabled={importing}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50"
        >
          {importing ? '导入中...' : '导入现有笔记'}
        </button>
      )}

      <button
        className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
        onClick={onBack}
      >
        返回
      </button>
    </div>
  );
};

// SR Completed Summary
interface SRCompletedSummaryProps {
  cardsCount: number;
  stats: SRStats;
  onBack: () => void;
}

export const SRCompletedSummary = ({ cardsCount, stats, onBack }: SRCompletedSummaryProps) => {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">今日复习完成</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">已复习 {cardsCount} 张卡片</p>
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.mastered}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">完全记住</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.remembered}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">记住了</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.fuzzy}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">模糊</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.forgot}</div>
          <div className="text-sm text-red-600 dark:text-red-400">忘记了</div>
        </div>
      </div>
      <button
        className="bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
        onClick={onBack}
      >
        返回
      </button>
    </div>
  );
};
