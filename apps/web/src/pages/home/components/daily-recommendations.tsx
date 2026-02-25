import { useEffect, useState, useCallback } from 'react';
import { Sparkles, FileText, AlertCircle } from 'lucide-react';
import { getDailyRecommendations } from '../../../api/memo';
import { MemoDetailModal } from './memo-detail-modal';

import type { MemoListItemDto } from '@aimo/dto';

/**
 * DailyRecommendations Component
 * Displays AI-curated daily memo recommendations in the sidebar
 */
export function DailyRecommendations() {
  const [recommendations, setRecommendations] = useState<MemoListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Get today's date formatted
  const getTodayDate = useCallback(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[now.getDay()];
    return `${month}月${day}日 ${weekday}`;
  }, []);

  // Fetch recommendations on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchRecommendations() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getDailyRecommendations();

        if (!isMounted) return;

        if (response.code === 0) {
          setRecommendations(response.data.items);
          setMemoCount(response.data.total);
        } else {
          setError('获取推荐失败');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch daily recommendations:', err);
        setError('获取推荐失败');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Truncate content to 80 characters
  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle memo click - open detail modal
  const handleMemoClick = (memoId: string) => {
    setSelectedMemoId(memoId);
    setIsDetailModalOpen(true);
  };

  // Handle close detail modal
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMemoId(null);
  };

  // Handle create memo click
  const handleCreateMemo = () => {
    // Scroll to editor and focus it
    const editor = document.querySelector('[data-memo-editor]') as HTMLElement;
    if (editor) {
      editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const textarea = editor.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">今日推荐</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{getTodayDate()}</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-dark-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 dark:bg-dark-700 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-100 dark:bg-dark-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">今日推荐</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{getTodayDate()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-4">
          <AlertCircle size={16} className="text-amber-500" />
          <span>今日推荐暂时不可用</span>
        </div>
      </div>
    );
  }

  // Empty state - less than 3 memos
  if (memoCount < 3) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">今日推荐</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{getTodayDate()}</span>
        </div>
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gray-50 dark:bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText size={20} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">创建更多 memo 来获取推荐</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            至少 3 条 memo 即可开启智能推荐
          </p>
          <button
            onClick={handleCreateMemo}
            className="text-xs px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            创建新 memo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-amber-500" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">今日推荐</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{getTodayDate()}</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((memo, index) => (
          <div
            key={memo.memoId}
            onClick={() => handleMemoClick(memo.memoId)}
            className="group cursor-pointer p-3 rounded-lg bg-gray-50 dark:bg-dark-700/50 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                  {truncateContent(memo.content)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  {formatDate(memo.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Memo Detail Modal */}
      <MemoDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        memoId={selectedMemoId}
      />
    </div>
  );
}
