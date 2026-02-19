import type { ExploreSourceDto } from '@aimo/dto';
import { FileText, ExternalLink } from 'lucide-react';

interface SourceCardProps {
  source: ExploreSourceDto;
  index: number;
  onClick: (memoId: string) => void;
}

/**
 * SourceCard component - Displays a source citation card with title, summary, and relevance score
 * Used below AI responses to show which notes were referenced
 */
export const SourceCard = ({ source, index, onClick }: SourceCardProps) => {
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
      className="group flex flex-col w-full text-left bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
    >
      {/* Header with index and title */}
      <div className="flex items-start gap-3 p-3 pb-2">
        <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-md flex items-center justify-center">
          <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
            {index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {source.title}
          </h4>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Content preview */}
      <div className="px-3 pb-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {source.content}
        </p>
      </div>

      {/* Footer with relevance score and date */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-900/30 rounded-b-xl">
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
