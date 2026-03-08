import { observer, useService } from '@rabjs/react';
import { CheckCircle } from 'lucide-react';
import { ReviewService, type SRQuality } from '../review.service';

const SRQuizContent = () => {
  const service = useService(ReviewService);

  const currentCard = service.srCards[service.srCurrentIndex];

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-4">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>
            进度: {service.srCurrentIndex + 1} / {service.srCards.length}
          </span>
          <span>{Math.round(((service.srCurrentIndex + 1) / service.srCards.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${((service.srCurrentIndex + 1) / service.srCards.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-center gap-1 mt-3 flex-wrap">
          {service.srCards.map((card, idx) => (
            <button
              key={card.cardId}
              onClick={() => {
                service.srCurrentIndex = idx;
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                idx === service.srCurrentIndex
                  ? 'ring-2 ring-primary-500 ring-offset-1'
                  : idx < service.srCurrentIndex
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-dark-700'
              }`}
              title={`第${idx + 1}张`}
            >
              {idx < service.srCurrentIndex ? (
                <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Limit Info */}
      {service.srTotalDue > service.srDailyLimit && service.srDailyLimit > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            今日已加载 <span className="font-medium">{service.srDailyLimit}</span> 张，还有{' '}
            <span className="font-medium">{service.srTotalDue - service.srDailyLimit}</span>{' '}
            张待复习
          </p>
        </div>
      )}

      {/* Flip Card */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
        <div className="perspective-1000">
          <div
            className={`transition-transform duration-400 ease-in-out transform-style-3d ${
              service.srCardFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: service.srCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Card Front */}
            <div className="backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3">
                {currentCard?.memo.title}
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {currentCard?.memo.content.slice(0, 200)}
                  {currentCard && currentCard.memo.content.length > 200 ? '...' : ''}
                </p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => service.flipSRCard()}
                  className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  显示答案
                </button>
              </div>
            </div>

            {/* Card Back */}
            <div
              className="backface-hidden absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3">
                {currentCard?.memo.title}
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {currentCard?.memo.content}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  onClick={() => service.reviewSRCard('mastered' as SRQuality)}
                  disabled={service.srLoading}
                  className="px-3 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                >
                  完全记住
                </button>
                <button
                  onClick={() => service.reviewSRCard('remembered' as SRQuality)}
                  disabled={service.srLoading}
                  className="px-3 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm disabled:opacity-50"
                >
                  记住了
                </button>
                <button
                  onClick={() => service.reviewSRCard('fuzzy' as SRQuality)}
                  disabled={service.srLoading}
                  className="px-3 py-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm disabled:opacity-50"
                >
                  模糊
                </button>
                <button
                  onClick={() => service.reviewSRCard('forgot' as SRQuality)}
                  disabled={service.srLoading}
                  className="px-3 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm disabled:opacity-50"
                >
                  忘记了
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SRQuiz = observer(SRQuizContent);
