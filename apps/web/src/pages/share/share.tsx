import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { view, useService } from '@rabjs/react';
import { Calendar, FileText, Film, Download, ArrowLeft, Tag } from 'lucide-react';
import type { AttachmentDto, PublicMemoDto } from '@aimo/dto';
import * as memoApi from '../../api/memo';
import { AttachmentPreviewModal } from '../../components/attachment-preview-modal';
import { downloadFileFromUrl } from '../../utils/download';
import { toast } from '../../services/toast.service';
import { AttachmentService } from '../../services/attachment.service';

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

// Default avatar
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';

export const SharePage = view(({ memoId: propMemoId }: { memoId?: string }) => {
  const attachmentService = useService(AttachmentService);
  const [publicMemo, setPublicMemo] = useState<PublicMemoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Get memoId from params if not provided via props
  const urlMemoId = useParams<{ memoId: string }>().memoId;
  const effectiveMemoId = propMemoId || urlMemoId;

  // Get memo and user from publicMemo
  const memo = publicMemo?.memo;
  const user = publicMemo?.user;

  // Fetch memo data on mount
  useEffect(() => {
    if (effectiveMemoId) {
      const fetchMemo = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await memoApi.getPublicMemoById(effectiveMemoId);
          if (response.code === 0 && response.data) {
            setPublicMemo(response.data);
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
      setError('无效的链接');
      setLoading(false);
    }
  }, [effectiveMemoId]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    attachmentService.setSelectedAttachment(null);
  }, [attachmentService]);

  const handleAttachmentClick = (attachment: AttachmentDto) => {
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');

    if (isImage || isVideo) {
      attachmentService.setSelectedAttachment(attachment);
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
      toast.error('下载失败，请重试');
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
    <div className="min-h-screen bg-white dark:bg-dark-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-dark-700">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-xl font-bold text-gray-900 dark:text-white">AIMO</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回首页</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">{error}</p>
              <Link
                to="/"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                返回首页
              </Link>
            </div>
          </div>
        ) : memo && user ? (
          <div className="space-y-6">
            {/* User Info - Like a social media post with speech bubble style */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <img
                src={user.avatar || DEFAULT_AVATAR}
                alt={user.nickname || '用户'}
                className="w-14 h-14 rounded-full object-cover bg-gray-100 dark:bg-dark-700 ring-4 ring-primary-500/20 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                {/* User name and date */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white text-lg">
                    {user.nickname || '匿名用户'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500 text-sm">说</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(memo.createdAt)}
                </span>
              </div>
            </div>

            {/* Content - Speech bubble style */}
            <div className="bg-gray-50 dark:bg-dark-800 rounded-2xl px-6 py-5 border border-gray-200 dark:border-dark-700">
              {/* Tags */}
              {memo.tags && memo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {memo.tags.map((tag) => (
                    <Link
                      key={tag.tagId}
                      to={`/public/${memo.uid}?tag=${encodeURIComponent(tag.name)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-full text-xs text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                      <span>#{tag.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed whitespace-pre-wrap">
                  {extractPlainText(memo.content)}
                </p>
              </div>

              {/* Attachments */}
              {renderAttachments()}
            </div>

            {/* Year tag */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                <Calendar className="w-3 h-3" />
                {getYear(memo.createdAt)}年
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
    </div>
  );
});
