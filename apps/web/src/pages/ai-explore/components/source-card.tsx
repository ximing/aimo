import type { ExploreSourceDto } from '@aimo/dto';

interface SourceCardProps {
  source: ExploreSourceDto;
  index: number;
  onClick: (memoId: string) => void;
}

/**
 * SourceCard component - Displays a source citation card with content preview, date, and relevance score
 * Used below AI responses to show which notes were referenced
 */
export const SourceCard = ({ source, index, onClick }: SourceCardProps) => {
  // Get relevance color based on score
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Convert relevance score (0-1) to 5 blocks (1-5)
  const getRelevanceBlocks = (score: number) => {
    const blocks = Math.max(1, Math.min(5, Math.ceil(score * 5)));
    return Array.from({ length: 5 }, (_, i) => i < blocks);
  };

  const relevanceBlocks = getRelevanceBlocks(source.relevanceScore);

  return (
    <button
      onClick={() => onClick(source.memoId)}
      className="group flex flex-col w-64 flex-shrink-0 text-left bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all p-3"
    >
      {/* Content preview with inline index */}
      <div className="flex-1 pb-2">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded bg-primary-100 dark:bg-primary-900/40 text-xs font-medium text-primary-700 dark:text-primary-400">
            {index + 1}
          </span>
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{source.content}</p>
        </div>
      </div>

      {/* Footer with date and relevance score */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-700">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">{formatDate(source.createdAt)}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {relevanceBlocks.map((filled, i) => (
            <div
              key={i}
              className={`w-1.5 h-3 rounded-sm ${
                filled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
};
