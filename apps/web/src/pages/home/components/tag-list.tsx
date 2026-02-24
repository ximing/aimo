import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { Tag, ListChecks, List, X } from 'lucide-react';
import type { TagDto } from '@aimo/dto';
import { TagService } from '../../../services/tag.service';
import { MemoService } from '../../../services/memo.service';
import { TagContextMenu } from '../../../components/tag-context-menu';
import { ConfirmDeleteModal } from './confirm-delete-modal';

export const TagList = view(() => {
  const tagService = useService(TagService);
  const memoService = useService(MemoService);

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTag, setSelectedTag] = useState<TagDto | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch tags on mount
  useEffect(() => {
    tagService.fetchTags();
  }, []);

  const handleTagClick = (tagName: string) => {
    if (memoService.multiSelectMode) {
      // Multi-select mode: toggle tag in filter
      memoService.toggleTagInFilter(tagName);
    } else {
      // Single-select mode: toggle filter
      if (memoService.tagFilter === tagName) {
        memoService.setTagFilter(null);
      } else {
        memoService.setTagFilter(tagName);
      }
    }
  };

  const handleToggleMode = () => {
    memoService.toggleMultiSelectMode(!memoService.multiSelectMode);
  };

  const handleClearAll = () => {
    memoService.clearAllTagFilters();
  };

  // Handle right-click on a tag
  const handleContextMenu = (e: React.MouseEvent, tag: TagDto) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedTag(tag);
    setContextMenuOpen(true);
  };

  // Handle delete click from context menu
  const handleDeleteClick = () => {
    if (selectedTag) {
      setDeleteModalOpen(true);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedTag) return;

    setDeleting(true);
    const result = await tagService.deleteTag(selectedTag.tagId);
    setDeleting(false);

    if (result.success) {
      // If the deleted tag was being used as a filter, clear it
      if (memoService.tagFilter === selectedTag.name) {
        memoService.setTagFilter(null);
      }
      // If in multi-select mode and the tag was in the filter, remove it
      if (memoService.multiSelectMode && memoService.tagsFilter.includes(selectedTag.name)) {
        memoService.toggleTagInFilter(selectedTag.name);
      }
      setDeleteModalOpen(false);
      setSelectedTag(null);
    } else {
      // Show error (could be improved with a toast notification)
      alert(result.message || '删除标签失败');
    }
  };

  const selectedCount = memoService.multiSelectMode
    ? memoService.tagsFilter.length
    : memoService.tagFilter ? 1 : 0;

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
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">标签</h3>
          {selectedCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Mode toggle button */}
          <button
            onClick={handleToggleMode}
            className={`p-1.5 rounded transition-colors ${
              memoService.multiSelectMode
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
            }`}
            title={memoService.multiSelectMode ? '切换到单选模式' : '切换到多选模式'}
          >
            {memoService.multiSelectMode ? (
              <ListChecks className="w-4 h-4" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </button>
          {/* Clear all button (only show when filters active) */}
          {selectedCount > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="清除所有标签筛选"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode indicator */}
      {memoService.multiSelectMode && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
          多选模式：点击标签添加/移除
        </p>
      )}

      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
        {tagService.tags.map((tag) => {
          const isSelected = memoService.isTagSelected(tag.name);
          const usageCount = tag.usageCount || 0;

          return (
            <button
              key={tag.tagId}
              onClick={() => handleTagClick(tag.name)}
              onContextMenu={(e) => handleContextMenu(e, tag)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                  : 'hover:bg-gray-100 dark:hover:bg-dark-800 border border-transparent'
              }`}
              title={
                memoService.multiSelectMode
                  ? isSelected
                    ? '点击移除'
                    : '点击添加'
                  : isSelected
                    ? '点击取消筛选'
                    : `点击筛选 "${tag.name}"`
              }
            >
              <div className="flex items-center gap-2">
                {/* Checkbox in multi-select mode */}
                {memoService.multiSelectMode && (
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                )}
                <span
                  className={`text-sm truncate ${
                    isSelected
                      ? 'text-primary-700 dark:text-primary-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  #{tag.name}
                </span>
              </div>
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

      {/* Context Menu */}
      <TagContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        onClose={() => setContextMenuOpen(false)}
        onDelete={handleDeleteClick}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTag(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="删除标签"
        message={
          selectedTag
            ? `确定要删除标签 "#${selectedTag.name}" 吗？此操作会从所有备忘录中移除该标签，但不会删除备忘录本身。`
            : '确定要删除此标签吗？此操作会从所有备忘录中移除该标签，但不会删除备忘录本身。'
        }
      />
    </div>
  );
});
