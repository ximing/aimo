import type { ExploreSourceDto } from '@aimo/dto';
import { FileText } from 'lucide-react';

interface SourceCardProps {
  source: ExploreSourceDto;
  index: number;
  onClick: (memoId: string) => void;
}

/**
 * SourceCard component - Displays a source citation card with content preview, date, and relevance score
 * Used below AI responses to show which notes were referenced
 */
export const SourceCard = ({ source, onClick }: Omit<SourceCardProps, 'index'>) => {
  const relevancePercent = Math.round(source.relevanceScore * 100);

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get relevance color based on score
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-primary-500';
    if (score >= 0.5) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  return (
    <button
      onClick={() => onClick(source.memoId)}
      className="group flex flex-col w-full text-left bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all p-3"
    >
      {/* Content preview */}
      <div className="flex-1 pb-4">
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
          {source.content}
        </p>
      </div>

      {/* Footer with date and relevance score */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-700">
        <div className="flex items-center gap-2">
          <FileText className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">{formatDate(source.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">相关度</span>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${getRelevanceColor(source.relevanceScore)}`} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {relevancePercent}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
