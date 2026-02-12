import { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import type { MemoListItemDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';

interface RelatedMemosModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: MemoListItemDto | null;
}

// Extract plain text without markdown syntax
const extractPlainText = (content: string, maxLength = 100): string => {
  const withoutImages = content.replace(/!\[.*?\]\((.*?)\)/g, '');
  const withoutLinks = withoutImages.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  const plainText = withoutLinks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1');

  return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
};

const formatDate = (timestamp: number) => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  const d = new Date(timestamp);
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RelatedMemosModal = view(({ isOpen, onClose, memo }: RelatedMemosModalProps) => {
  const memoService = useService(MemoService);
  const [relatedMemos, setRelatedMemos] = useState<MemoListItemDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && memo) {
      loadRelatedMemos();
    }
  }, [isOpen, memo]);

  const loadRelatedMemos = async () => {
    if (!memo) return;

    setLoading(true);
    try {
      const result = await memoService.findRelatedMemos(memo.memoId, 10);
      if (result.success) {
        setRelatedMemos(result.items || []);
      }
    } catch (error) {
      console.error('Failed to load related memos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemoClick = (relatedMemo: MemoListItemDto) => {
    // Trigger scroll to this memo if it's in the list
    // or could open another modal for this memo
    console.log('Selected related memo:', relatedMemo.memoId);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-40" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-dark-800 shadow-lg transition-all">
                {/* Compact Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-dark-700">
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-sm font-semibold text-gray-900 dark:text-white">
                      相关笔记
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content with Sticky Header */}
                <div className="max-h-[65vh] overflow-y-auto">
                  {/* Sticky Original Memo Reference */}
                  {memo && (
                    <div className="sticky top-0 z-20 bg-white dark:bg-dark-800 px-6 py-4 border-b border-gray-100 dark:border-dark-700/50 shadow-sm">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        原始笔记
                      </div>
                      <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-950/40 dark:to-primary-900/20 px-3 py-2.5 rounded border border-primary-200/50 dark:border-primary-900/40">
                        <p className="text-sm text-primary-900 dark:text-primary-100 leading-relaxed">
                          {extractPlainText(memo.content, 500)}
                        </p>
                        <p className="text-xs text-primary-700 dark:text-primary-300 mt-2 opacity-75">
                          {formatDate(memo.createdAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Relationship Indicator */}
                  <div className="flex justify-center py-3 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                    </div>
                  </div>

                  {/* Related Memos List */}
                  <div className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                      相关内容 ({relatedMemos.length})
                    </div>

                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mb-3"></div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">加载中...</p>
                      </div>
                    ) : relatedMemos.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">未找到相关笔记</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {relatedMemos.map((relatedMemo, index) => (
                          <button
                            key={relatedMemo.memoId}
                            onClick={() => handleMemoClick(relatedMemo)}
                            className="w-full text-left px-3 py-2.5 rounded border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-700/50 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5 w-5">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-relaxed">
                                  {extractPlainText(relatedMemo.content, 500)}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                  {formatDate(relatedMemo.createdAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Minimal Footer */}
                <div className="border-t border-gray-200 dark:border-dark-700 px-6 py-2.5 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    关闭
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});
