import { useEffect, useState, useRef } from 'react';
import { view } from '@rabjs/react';
import { Clock, ChevronRight } from 'lucide-react';
import type { OnThisDayMemoDto } from '@aimo/dto';
import * as memoApi from '../../../api/memo';
import { MemoDetailModal } from './memo-detail-modal';

// Extract plain text without markdown syntax
const extractPlainText = (content: string): string => {
  // Remove markdown image syntax
  const withoutImages = content.replace(/!\[.*?\]\((.*?)\)/g, '');
  // Remove markdown link syntax but keep the text
  const withoutLinks = withoutImages.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  // Remove markdown bold/italic
  const plainText = withoutLinks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1');

  return plainText;
};

export const OnThisDayBanner = view(() => {
  const [memos, setMemos] = useState<OnThisDayMemoDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOnThisDayMemos = async () => {
      setIsLoading(true);
      try {
        const response = await memoApi.getOnThisDayMemos();
        if (response.code === 0 && response.data) {
          // Take at most 5 memos for the banner
          setMemos(response.data.items.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch on this day memos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnThisDayMemos();
  }, []);

  // Handle horizontal scroll with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Handle memo card click - open detail modal
  const handleMemoCardClick = (memoId: string) => {
    setSelectedMemoId(memoId);
    setIsDetailModalOpen(true);
  };

  // Handle close detail modal
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMemoId(null);
  };

  // If no memos and not loading, hide the banner
  if (!isLoading && memos.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-3 border-b border-gray-100 dark:border-dark-800">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 mb-2">
        <Clock className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          历史的今天
        </span>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center h-16">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {memos.map((memo) => (
            <button
              key={memo.memoId}
              onClick={() => handleMemoCardClick(memo.memoId)}
              className="flex-shrink-0 w-[200px] p-3 bg-gray-50 dark:bg-dark-800/50 hover:bg-primary-50 dark:hover:bg-primary-950/20 border border-gray-100 dark:border-dark-700 hover:border-primary-200 dark:hover:border-primary-900/50 rounded-lg text-left transition-all duration-200 group"
            >
              {/* Year badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full">
                  {memo.year}年
                </span>
              </div>

              {/* Content preview - max 2 lines */}
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {extractPlainText(memo.content)}
              </p>
            </button>
          ))}

          {/* View more button (if there are memos) */}
          {memos.length >= 5 && (
            <button
              className="flex-shrink-0 w-[100px] flex flex-col items-center justify-center gap-1 p-3 bg-gray-50 dark:bg-dark-800/30 hover:bg-gray-100 dark:hover:bg-dark-800/50 border border-dashed border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600 rounded-lg text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-xs">查看更多</span>
            </button>
          )}
        </div>
      )}

      {/* Hide scrollbar CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Memo Detail Modal */}
      <MemoDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        memoId={selectedMemoId}
      />
    </div>
  );
});
