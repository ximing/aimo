import { useCallback, useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import {
  X,
  ArrowLeft,
  Tags,
  Loader2,
  Check,
  Plus,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { AIToolsService } from '../../services/ai-tools.service';

interface TagGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm?: (tags: string[]) => void; // Callback for create mode - passes selected tags to parent
}

export const TagGeneratorModal = view(
  ({ isOpen, onClose, onBack, onConfirm }: TagGeneratorModalProps) => {
    const aiToolsService = useService(AIToolsService);
    const [customTagInput, setCustomTagInput] = useState('');
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [hasTriggeredGeneration, setHasTriggeredGeneration] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Handle escape key to close modal
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      },
      [onClose]
    );

    // Handle click on backdrop to close
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    // Handle generate tags
    const handleGenerateTags = async () => {
      if (!aiToolsService.modal.memoContent) return;
      await aiToolsService.generateTags(aiToolsService.modal.memoContent);
    };

    // Handle toggle tag selection
    const handleToggleTag = (tag: string) => {
      // Don't toggle if in edit mode
      if (editingTag) return;
      aiToolsService.toggleTagSelection(tag);
    };

    // Handle start editing a tag
    const handleStartEdit = (tag: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTag(tag);
      setEditValue(tag);
    };

    // Handle save edited tag
    const handleSaveEdit = () => {
      if (editingTag && editValue.trim()) {
        const success = aiToolsService.updateTag(editingTag, editValue.trim());
        if (success) {
          setEditingTag(null);
          setEditValue('');
        }
      }
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
      setEditingTag(null);
      setEditValue('');
    };

    // Handle edit input keydown
    const handleEditKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    };

    // Handle delete tag
    const handleDeleteTag = (tag: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // If deleting the tag currently being edited, cancel edit mode first
      if (editingTag === tag) {
        setEditingTag(null);
        setEditValue('');
      }
      aiToolsService.deleteTag(tag);
    };

    // Handle add custom tag
    const handleAddCustomTag = () => {
      if (customTagInput.trim()) {
        const added = aiToolsService.addCustomTag(customTagInput.trim());
        if (added) {
          setCustomTagInput('');
        }
      }
    };

    // Handle input keydown - add on Enter
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomTag();
      }
    };

    // Handle confirm - save tags
    const handleConfirm = async () => {
      const selectedTags = aiToolsService.tagGeneration.selectedTags;

      // If onConfirm callback is provided (create mode), use it instead of API call
      if (onConfirm) {
        onConfirm(selectedTags);
        onClose();
        return;
      }

      // Edit mode: save via API
      if (!aiToolsService.modal.memoId) return;

      const result = await aiToolsService.saveTags(aiToolsService.modal.memoId);

      if (result.success) {
        onClose();
      }
    };

    // Auto-focus input when tags are loaded
    useEffect(() => {
      if (
        aiToolsService.tagGeneration.suggestedTags.length > 0 &&
        !aiToolsService.tagGeneration.isLoading
      ) {
        // Focus input after a short delay to allow UI to settle
        const timeout = setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timeout);
      }
    }, [
      aiToolsService.tagGeneration.suggestedTags.length,
      aiToolsService.tagGeneration.isLoading,
    ]);

    // Auto-focus edit input when entering edit mode
    useEffect(() => {
      if (editingTag) {
        const timeout = setTimeout(() => {
          editInputRef.current?.focus();
          editInputRef.current?.select();
        }, 50);
        return () => clearTimeout(timeout);
      }
    }, [editingTag]);

    // Auto-generate tags when modal opens
    useEffect(() => {
      if (isOpen && !hasTriggeredGeneration) {
        const shouldGenerate =
          aiToolsService.modal.memoContent &&
          aiToolsService.tagGeneration.suggestedTags.length === 0 &&
          !aiToolsService.tagGeneration.isLoading;

        if (shouldGenerate) {
          setHasTriggeredGeneration(true);
          aiToolsService.generateTags(aiToolsService.modal.memoContent!);
        }
      }

      // Reset flag when modal closes
      if (!isOpen) {
        setHasTriggeredGeneration(false);
      }
    }, [
      isOpen,
      hasTriggeredGeneration,
      aiToolsService.modal.memoContent,
      aiToolsService.tagGeneration.suggestedTags.length,
      aiToolsService.tagGeneration.isLoading,
      aiToolsService,
    ]);

    // Check if any tags are selected
    const hasSelectedTags = aiToolsService.tagGeneration.selectedTags.length > 0;

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/40"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-generator-modal-title"
      >
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-dark-700">
            <button
              onClick={onBack}
              className="p-1.5 -ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              aria-label="Back to AI Tools"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <Tags className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3
                id="tag-generator-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                智能添加标签
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Loading State */}
            {aiToolsService.tagGeneration.isLoading && (
              <div className="text-center py-12">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-purple-100 dark:bg-purple-950/50 animate-pulse" />
                  <div className="relative w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
                  </div>
                </div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                  AI 正在分析内容...
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  请稍候，AI 正在根据笔记内容生成相关标签建议
                </p>
              </div>
            )}

            {/* Empty State - No tags generated yet or failed */}
            {!aiToolsService.tagGeneration.isLoading &&
              aiToolsService.tagGeneration.suggestedTags.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                    暂无标签建议
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                    {aiToolsService.tagGeneration.error
                      ? aiToolsService.tagGeneration.error
                      : '无法从当前内容生成标签建议，请尝试添加更多内容'}
                  </p>
                  <button
                    onClick={handleGenerateTags}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    重新生成
                  </button>
                </div>
              )}

            {/* Tags Display State */}
            {!aiToolsService.tagGeneration.isLoading &&
              aiToolsService.tagGeneration.suggestedTags.length > 0 && (
                <div className="space-y-6">
                  {/* Tags List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        标签建议
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          已选择 {aiToolsService.tagGeneration.selectedTags.length} 个
                        </span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => aiToolsService.selectAllTags()}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                          全选
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button
                          onClick={() => aiToolsService.deselectAllTags()}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                          取消全选
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {aiToolsService.tagGeneration.suggestedTags.map((tag) => {
                        const isSelected = aiToolsService.tagGeneration.selectedTags.includes(tag);
                        const isEditing = editingTag === tag;

                        if (isEditing) {
                          return (
                            <div
                              key={`edit-${tag}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm
                                bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-700"
                            >
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                className="w-20 px-1 py-0.5 text-sm bg-white dark:bg-dark-700
                                  text-gray-900 dark:text-white rounded border-0
                                  focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={tag}
                            className={`
                              group inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
                              transition-all duration-200 border
                              ${
                                isSelected
                                  ? 'bg-purple-100 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }
                            `}
                          >
                            {/* Checkbox to toggle selection */}
                            <button
                              onClick={() => handleToggleTag(tag)}
                              className="flex items-center gap-1.5"
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>{tag}</span>
                            </button>
                            {/* Edit button - appears on hover when selected */}
                            {isSelected && (
                              <button
                                onClick={(e) => handleStartEdit(tag, e)}
                                className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100
                                  hover:bg-purple-200 dark:hover:bg-purple-800 transition-all"
                                aria-label={`Edit ${tag}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {/* Delete button - appears on hover when selected */}
                            {isSelected && (
                              <button
                                onClick={(e) => handleDeleteTag(tag, e)}
                                className="p-0.5 rounded-full opacity-0 group-hover:opacity-100
                                  hover:bg-purple-200 dark:hover:bg-purple-800 transition-all"
                                aria-label={`Delete ${tag}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Custom Tag */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      添加自定义标签
                    </h4>
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="输入标签名称，按 Enter 添加"
                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg
                          text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                      <button
                        onClick={handleAddCustomTag}
                        disabled={!customTagInput.trim()}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                          disabled:opacity-50 disabled:cursor-not-allowed
                          text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        aria-label="Add custom tag"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Selected Tags Summary */}
                  {hasSelectedTags && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/50">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2">
                        将添加的标签：
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiToolsService.tagGeneration.selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-dark-700
                              text-purple-700 dark:text-purple-300 text-xs rounded-full border border-purple-200 dark:border-purple-800"
                          >
                            {tag}
                            <button
                              onClick={() => aiToolsService.removeTag(tag)}
                              className="hover:text-purple-900 dark:hover:text-purple-200"
                              aria-label={`Remove ${tag}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {aiToolsService.tagGeneration.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/50">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {aiToolsService.tagGeneration.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Footer */}
          {aiToolsService.tagGeneration.suggestedTags.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800/50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={aiToolsService.isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hasSelectedTags || aiToolsService.isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {aiToolsService.isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    确认添加 ({aiToolsService.tagGeneration.selectedTags.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
