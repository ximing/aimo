import { useEffect } from 'react';
import { useService, bindServices } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { ReviewService } from './review.service';
import { Clock, BrainCircuit, Loader2 } from 'lucide-react';
import {
  ProfileDetailPanel,
  ReviewSidebar,
  AIQuiz,
  SRQuiz,
  AISummary,
  SREmptySummary,
  SRCompletedSummary,
} from './components';

// ─── ReviewPage ────────────────────────────────────────────────────────────────

export const ReviewPage = bindServices(() => {
  const service = useService(ReviewService);

  // Initialize service on mount
  useEffect(() => {
    service.initialize();
  }, []);

  return (
    <Layout>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Tab Bar */}
        <div className="flex-shrink-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="flex justify-center gap-2 px-6 pt-3">
            <button
              onClick={() => service.changeReviewType('ai')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-t-lg border-b-2 transition-all ${
                service.reviewType === 'ai'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <BrainCircuit
                className={`w-5 h-5 ${service.reviewType === 'ai' ? 'text-primary-600 dark:text-primary-400' : ''}`}
              />
              <span className="font-medium">AI 回顾</span>
            </button>
            <button
              onClick={() => service.changeReviewType('sr')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-t-lg border-b-2 transition-all ${
                service.reviewType === 'sr'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <Clock
                className={`w-5 h-5 ${service.reviewType === 'sr' ? 'text-primary-600 dark:text-primary-400' : ''}`}
              />
              <span className="font-medium">间隔重复</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - only shown in AI review mode */}
          {service.reviewType === 'ai' && <ReviewSidebar />}

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-dark-800 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-8 py-6">
                {/* Setup - AI Review */}
                {service.step === 'setup' && service.reviewType === 'ai' && (
                  <ProfileDetailPanel />
                )}

                {/* Setup - Spaced Repetition */}
                {service.step === 'setup' && service.reviewType === 'sr' && (
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
                      间隔重复复习
                    </h1>
                    <button
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={() => service.startSR()}
                      disabled={service.srLoading}
                    >
                      {service.srLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {service.srLoading ? '加载中...' : '开始复习'}
                    </button>
                  </div>
                )}

                {/* Quiz - AI Review */}
                {service.step === 'quiz' && service.reviewType === 'ai' && service.session && (
                  <AIQuiz />
                )}

                {/* Quiz - Spaced Repetition */}
                {service.step === 'quiz' && service.reviewType === 'sr' && service.srCards.length > 0 && (
                  <SRQuiz />
                )}

                {/* Summary - AI Review */}
                {service.step === 'summary' && service.reviewType === 'ai' && service.finalSession && (
                  <AISummary
                    session={service.finalSession}
                    score={service.finalScore ?? 0}
                    onReset={() => service.resetToSetup()}
                  />
                )}

                {/* Summary - SR Empty */}
                {service.step === 'summary' && service.reviewType === 'sr' && service.srCards.length === 0 && (
                  <SREmptySummary
                    totalCards={service.srTotalCards}
                    importing={service.srImporting}
                    onImport={() => service.importExistingMemos()}
                    onBack={() => service.resetSR()}
                  />
                )}

                {/* Summary - SR Completed */}
                {service.step === 'summary' && service.reviewType === 'sr' && service.srCards.length > 0 && (
                  <SRCompletedSummary
                    cardsCount={service.srCards.length}
                    stats={service.srStats}
                    onBack={() => service.resetSR()}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}, [ReviewService]);

export default ReviewPage;
