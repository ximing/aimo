import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { Tag } from 'lucide-react';
import { TagService } from '../../../services/tag.service';
import { MemoService } from '../../../services/memo.service';

export const TagList = view(() => {
  const tagService = useService(TagService);
  const memoService = useService(MemoService);

  // Fetch tags on mount
  useEffect(() => {
    tagService.fetchTags();
  }, []);

  const handleTagClick = (tagName: string) => {
    // Toggle filter: if clicking the same tag, clear the filter
    if (memoService.tagFilter === tagName) {
      memoService.setTagFilter(null);
    } else {
      memoService.setTagFilter(tagName);
    }
  };

  // Loading state
  if (tagService.loading) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">标签</h3>
        </div>
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Empty state
  if (tagService.tags.length === 0) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">标签</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 italic">暂无标签</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">标签</h3>
      </div>

      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
        {tagService.tags.map((tag) => {
          const isSelected = memoService.tagFilter === tag.name;
          const usageCount = tag.usageCount || 0;

          return (
            <button
              key={tag.tagId}
              onClick={() => handleTagClick(tag.name)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-800 border border-transparent'
              }`}
              title={isSelected ? '点击取消筛选' : `点击筛选 "${tag.name}"`}
            >
              <span
                className={`text-sm truncate ${
                  isSelected
                    ? 'text-primary-700 dark:text-primary-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                #{tag.name}
              </span>
              <span
                className={`text-xs ${
                  isSelected
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                ({usageCount})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
