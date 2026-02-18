import { useEffect, useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { view } from '@rabjs/react';
import type { MemoWithAttachmentsDto, AttachmentDto } from '@aimo/dto';
import * as memoApi from '../../../api/memo';
import { AttachmentPreviewModal } from '../../../components/attachment-preview-modal';
import { downloadFileFromUrl } from '../../../utils/download';
import { FileText, Film, Download } from 'lucide-react';

interface MemoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoId: string | null;
}

// Extract plain text without markdown syntax
const extractPlainText = (content: string): string => {
  // Remove markdown image syntax
  const withoutImages = content.replace(/!\[.*?\]\((.*?)\)/g, '');
  // Remove markdown link syntax but keep the text
  const withoutLinks = withoutImages.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  // Remove markdown bold/italic
  const plainText = withoutLinks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1');

  return plainText;
};

export const MemoDetailModal = view(({ isOpen, onClose, memoId }: MemoDetailModalProps) => {
  const [memo, setMemo] = useState<MemoWithAttachmentsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Fetch memo data when modal opens
  useEffect(() => {
    if (isOpen && memoId) {
      const fetchMemo = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await memoApi.getMemo(memoId);
          if (response.code === 0 && response.data) {
            setMemo(response.data);
          } else {
            setError('加载失败');
          }
        } catch (err) {
          setError('加载失败，请重试');
          console.error('Failed to fetch memo:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchMemo();
    } else {
      setMemo(null);
      setError(null);
    }
  }, [isOpen, memoId]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handleAttachmentClick = (attachment: AttachmentDto) => {
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');

    if (isImage || isVideo) {
      setIsPreviewOpen(true);
    } else {
      handleDownloadAttachment(attachment);
    }
  };

  const handleDownloadAttachment = async (attachment: AttachmentDto) => {
    setIsDownloading(attachment.attachmentId);
    try {
      await downloadFileFromUrl(attachment.url, attachment.filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
    } finally {
      setIsDownloading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getYear = (timestamp: number) => {
    return new Date(timestamp).getFullYear();
  };

  // Render attachments grid
  const renderAttachments = () => {
    if (!memo?.attachments || memo.attachments.length === 0) return null;

    return (
      <div className="grid grid-cols-4 gap-2 mt-4">
        {memo.attachments.map((attachment) => {
          const isImage = attachment.type.startsWith('image/');
          const isVideo = attachment.type.startsWith('video/');
          const isDocument = !isImage && !isVideo;
          const isAttachmentDownloading = isDownloading === attachment.attachmentId;

          return (
            <button
              key={attachment.attachmentId}
              onClick={() => handleAttachmentClick(attachment)}
              disabled={isAttachmentDownloading}
              className="relative aspect-square bg-gray-100 dark:bg-dark-800 rounded-lg overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              title={`点击${isDocument ? '下载' : '预览'}: ${attachment.filename}`}
            >
              {isImage ? (
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : isVideo ? (
                <>
                  <img
                    src={attachment.url}
                    alt={attachment.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Film className="w-5 h-5 text-gray-900 fill-current" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                  <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-full px-1">
                    {attachment.filename}
                  </span>
                </div>
              )}

              {/* Download indicator overlay for documents */}
              {isDocument && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Download className="w-5 h-5 text-gray-900 fill-current" />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isAttachmentDownloading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
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
              <Dialog.Panel className="w-full max-w-lg mx-4 sm:mx-6 transform overflow-hidden rounded-xl bg-white dark:bg-dark-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-medium rounded-full">
                      <Calendar className="w-3.5 h-3.5" />
                      {memo ? `${getYear(memo.createdAt)}年` : '...'}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    aria-label="关闭"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-4 sm:px-6 py-5">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                      <button
                        onClick={onClose}
                        className="mt-3 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                      >
                        关闭
                      </button>
                    </div>
                  ) : memo ? (
                    <div className="space-y-4">
                      {/* Memo Content */}
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
                          {extractPlainText(memo.content)}
                        </p>
                      </div>

                      {/* Attachments */}
                      {renderAttachments()}

                      {/* Footer - Date */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-dark-700">
                        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(memo.createdAt)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-dark-700 px-4 sm:px-6 py-3 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    关闭
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal isOpen={isPreviewOpen} onClose={handleClosePreview} />
    </Transition>
  );
});
