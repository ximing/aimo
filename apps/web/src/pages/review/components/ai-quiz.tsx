import { observer, useService } from '@rabjs/react';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, XCircle, Loader2 } from 'lucide-react';
import { ReviewService } from '../review.service';
import { getItemStatus, masteryLabel, masteryColor } from './utils';

const AIQuizContent = () => {
  const service = useService(ReviewService);

  const currentItem = service.session?.items[service.currentIndex];
  const answeredCount = service.session?.items.filter((item) => item.mastery).length ?? 0;
  const totalCount = service.session?.items.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>
            进度: {answeredCount} / {totalCount}
          </span>
          <span>{Math.round((answeredCount / totalCount) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${(answeredCount / totalCount) * 100}%` }}
          />
        </div>
        <div className="flex justify-center gap-1 mt-3 flex-wrap">
          {service.session?.items.map((item, idx) => {
            const status = getItemStatus(item);
            return (
              <button
                key={item.itemId}
                onClick={() => service.jumpToItem(idx)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  idx === service.currentIndex ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                } ${
                  status === 'remembered'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : status === 'fuzzy'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : status === 'forgot'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-gray-100 dark:bg-dark-700'
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
          onClick={() => service.goToPrev()}
          disabled={service.currentIndex === 0}
          className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          上一题
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          第 {service.currentIndex + 1} / {service.session?.items.length ?? 0}
        </span>
        题
        <button
          onClick={() => service.goToNext()}
          disabled={
            service.currentIndex + 1 >= (service.session?.items.length ?? 0) &&
            !service.session?.items[service.currentIndex]?.mastery
          }
          className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {service.currentIndex + 1 >= (service.session?.items.length ?? 0) ? '完成' : '下一题'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {currentItem?.question}
        </p>

        {service.feedback && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">原始笔记</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
              {currentItem?.memoContent || '暂无内容'}
            </p>
          </div>
        )}

        {!service.feedback ? (
          <>
            <textarea
              className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-4 py-2 h-32 mb-4 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
              placeholder="输入你的回答..."
              value={service.answer}
              onChange={(e) => {
                service.setAnswer(e.target.value);
              }}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={() => service.submitAnswer(false)}
                disabled={service.loading || !service.answer.trim()}
              >
                {service.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                提交回答
              </button>
              <button
                className="px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                onClick={() => service.submitAnswer(true)}
                disabled={service.loading}
              >
                忘记了
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className={`font-semibold text-lg ${masteryColor(service.feedback.mastery)}`}>
              {masteryLabel(service.feedback.mastery)}
            </div>
            <div className="text-sm bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-gray-700 dark:text-gray-300">
              {service.feedback.aiFeedback}
            </div>
            {currentItem?.userAnswer && currentItem.userAnswer !== '' && (
              <div className="text-sm border-t border-gray-200 dark:border-dark-700 pt-3 mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">你的回答:</p>
                <p className="text-gray-700 dark:text-gray-300">{currentItem.userAnswer}</p>
              </div>
            )}
            <button
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
              onClick={() => service.goToNext()}
            >
              {service.currentIndex + 1 >= (service.session?.items.length ?? 0)
                ? '完成回顾'
                : '下一题'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AIQuiz = observer(AIQuizContent);
