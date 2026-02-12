import { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import type { MemoListItemDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';

interface RelatedMemosModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: MemoListItemDto | null;
}

// Extract plain text without markdown syntax
const extractPlainText = (content: string, maxLength = 80): string => {
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
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-700 px-6 py-4">
                  <div className="flex-1">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      相关笔记
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      基于当前笔记内容的10条相关笔记
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">加载相关笔记中...</p>
                    </div>
                  ) : relatedMemos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">未找到相关笔记</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {relatedMemos.map((relatedMemo) => (
                        <button
                          key={relatedMemo.memoId}
                          onClick={() => handleMemoClick(relatedMemo)}
                          className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors duration-200 cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {extractPlainText(relatedMemo.content, 100)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                {formatDate(relatedMemo.createdAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-dark-700 px-6 py-4 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors duration-200 cursor-pointer"
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
