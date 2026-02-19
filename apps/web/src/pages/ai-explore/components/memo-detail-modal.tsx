import { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import type { MemoWithAttachmentsDto, AttachmentDto } from '@aimo/dto';
import { X, Calendar, Paperclip, ZoomIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getMemo } from '../../../api/memo';

interface MemoDetailModalProps {
  memoId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MemoDetailModal component
 * Displays full memo details including content, attachments, and metadata
 * Used when clicking on a source citation in AI responses
 */
export const MemoDetailModal = ({ memoId, isOpen, onClose }: MemoDetailModalProps) => {
  const [memo, setMemo] = useState<MemoWithAttachmentsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentDto | null>(null);

  // Fetch memo details when opened
  useEffect(() => {
    if (isOpen && memoId) {
      fetchMemoDetails(memoId);
    }
  }, [isOpen, memoId]);

  const fetchMemoDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMemo(id);
      if (response.code === 0 && response.data) {
        setMemo(response.data);
      } else {
        setError('获取笔记详情失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取笔记详情失败');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle attachment click
  const handleAttachmentClick = useCallback((attachment: AttachmentDto) => {
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');

    if (isImage || isVideo) {
      setPreviewAttachment(attachment);
    } else {
      // Download other file types
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.filename;
      link.click();
    }
  }, []);

  // Check if file is previewable
  const isPreviewable = (type: string) => {
    return type.startsWith('image/') || type.startsWith('video/');
  };

  return (
    <>
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
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          {/* Modal */}
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-dark-800 text-left align-middle shadow-xl transition-all mx-4 sm:mx-6">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                      笔记详情
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : error ? (
                      <div className="text-center py-8 text-red-500">{error}</div>
                    ) : memo ? (
                      <div className="space-y-4">
                        {/* Content */}
                        <div className="prose dark:prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{memo.content}</ReactMarkdown>
                        </div>

                        {/* Attachments */}
                        {memo.attachments && memo.attachments.length > 0 && (
                          <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              附件 ({memo.attachments.length})
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {memo.attachments.map((attachment) => (
                                <button
                                  key={attachment.attachmentId}
                                  onClick={() => handleAttachmentClick(attachment)}
                                  className={`group relative aspect-square rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 transition-colors ${
                                    isPreviewable(attachment.type)
                                      ? 'cursor-pointer'
                                      : 'cursor-pointer bg-gray-50 dark:bg-dark-900'
                                  }`}
                                >
                                  {attachment.type.startsWith('image/') ? (
                                    <img
                                      src={attachment.url}
                                      alt={attachment.filename}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : attachment.type.startsWith('video/') ? (
                                    <video
                                      src={attachment.url}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                      <Paperclip className="w-8 h-8 text-gray-400 mb-2" />
                                      <span className="text-xs text-gray-500 text-center line-clamp-2">
                                        {attachment.filename}
                                      </span>
                                    </div>
                                  )}
                                  {/* Hover overlay for previewable items */}
                                  {isPreviewable(attachment.type) && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="pt-4 border-t border-gray-200 dark:border-dark-700 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>创建于 {formatDate(memo.createdAt)}</span>
                          {memo.updatedAt !== memo.createdAt && (
                            <span className="text-gray-400">
                              · 更新于 {formatDate(memo.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Simple Attachment Preview Modal */}
      <Transition appear show={!!previewAttachment} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setPreviewAttachment(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/90" />
          </Transition.Child>

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
                <Dialog.Panel className="relative w-full max-w-4xl">
                  <button
                    onClick={() => setPreviewAttachment(null)}
                    className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {previewAttachment?.type.startsWith('image/') ? (
                    <img
                      src={previewAttachment.url}
                      alt={previewAttachment.filename}
                      className="max-w-full max-h-[80vh] mx-auto rounded-lg"
                    />
                  ) : previewAttachment?.type.startsWith('video/') ? (
                    <video
                      src={previewAttachment.url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[80vh] mx-auto rounded-lg"
                    />
                  ) : null}

                  <p className="text-center text-white/80 mt-4 text-sm">
                    {previewAttachment?.filename}
                  </p>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
