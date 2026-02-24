import { useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { X, ArrowLeft, Tags } from 'lucide-react';
import { AIToolsService } from '../../services/ai-tools.service';

interface TagGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

export const TagGeneratorModal = view(
  ({ isOpen, onClose, onBack }: TagGeneratorModalProps) => {
    const aiToolsService = useService(AIToolsService);

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

    // Handle generate tags - placeholder for US-006
    const handleGenerateTags = async () => {
      if (!aiToolsService.modal.memoContent) return;
      await aiToolsService.generateTags(aiToolsService.modal.memoContent);
    };

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
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
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

          {/* Content - Placeholder for US-006 */}
          <div className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center mb-4">
                <Tags className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                AI 标签生成器
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                AI 将分析笔记内容并生成相关标签建议。此功能将在 US-006 中实现。
              </p>

              {/* Placeholder action button */}
              <button
                onClick={handleGenerateTags}
                disabled={aiToolsService.tagGeneration.isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {aiToolsService.tagGeneration.isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Tags className="w-4 h-4" />
                    生成标签
                  </>
                )}
              </button>

              {/* Show generated tags if any */}
              {aiToolsService.tagGeneration.suggestedTags.length > 0 && (
                <div className="mt-6 text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    生成的标签：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiToolsService.tagGeneration.suggestedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Show error if any */}
              {aiToolsService.tagGeneration.error && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                  {aiToolsService.tagGeneration.error}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800/50 rounded-b-lg flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              确认添加
            </button>
          </div>
        </div>
      </div>
    );
  }
);
