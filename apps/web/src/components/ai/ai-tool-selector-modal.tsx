import { useEffect, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Tags, X } from 'lucide-react';
import { AIToolsService } from '../../services/ai-tools.service';
import type { AIToolDefinition } from '../../services/ai-tools.service';

// Icon mapping for tool icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Tags,
};

interface AIToolSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
}

export const AIToolSelectorModal = view(
  ({ isOpen, onClose, onSelectTool }: AIToolSelectorModalProps) => {
    const aiToolsService = useService(AIToolsService);

    // Handle escape key to close modal
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      },
      [onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [isOpen, handleKeyDown]);

    // Handle click on backdrop to close
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    // Handle tool selection
    const handleToolClick = (tool: AIToolDefinition) => {
      onSelectTool(tool.id);
    };

    // Get icon component for tool
    const getToolIcon = (iconName: string) => {
      const IconComponent = iconMap[iconName];
      if (IconComponent) {
        return <IconComponent className="w-6 h-6" />;
      }
      return <Tags className="w-6 h-6" />;
    };

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/40"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-tools-modal-title"
      >
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
            <h3
              id="ai-tools-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              AI Tools
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tools List */}
          <div className="p-4">
            <div className="space-y-2">
              {aiToolsService.tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className="w-full flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all duration-200 text-left group"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                    {getToolIcon(tool.icon)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      {tool.name}
                    </h4>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {tool.description}
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 self-center text-gray-300 dark:text-gray-600 group-hover:text-purple-400 dark:group-hover:text-purple-500 transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Empty state (if no tools available) */}
            {aiToolsService.tools.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-3">
                  <Tags className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  暂无可用的 AI 工具
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800/50 rounded-b-lg">
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              选择工具以开始使用 AI 功能
            </p>
          </div>
        </div>
      </div>
    );
  }
);
