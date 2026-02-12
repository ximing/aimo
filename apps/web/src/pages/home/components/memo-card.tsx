import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import type { MemoListItemDto, MemoListItemWithScoreDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';
import { FileText, Film } from 'lucide-react';
import { RelatedMemosModal } from './related-memos-modal';

interface MemoCardProps {
  memo: MemoListItemDto | MemoListItemWithScoreDto;
}

// Extract plain text without markdown syntax
const extractPlainText = (content: string, maxLength = 150): string => {
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

  return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
};

export const MemoCard = view(({ memo }: MemoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memo.content);
  const [loading, setLoading] = useState(false);
  const [showRelatedModal, setShowRelatedModal] = useState(false);

  const memoService = useService(MemoService);

  const handleUpdate = async () => {
    if (!editContent.trim()) return;

    setLoading(true);
    const result = await memoService.updateMemo(memo.memoId, editContent);
    setLoading(false);

    if (result.success) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这条备忘录吗？')) return;

    setLoading(true);
    await memoService.deleteMemo(memo.memoId);
    setLoading(false);
  };

  const handleCancel = () => {
    setEditContent(memo.content);
    setIsEditing(false);
  };

  const formatDate = (timestamp: number) => {
    // timestamp is in milliseconds
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

  const plainText = extractPlainText(memo.content, 120);

  // 渲染附件网格
  const renderAttachments = () => {
    if (!memo.attachments || memo.attachments.length === 0) return null;

    return (
      <div className="grid grid-cols-5 gap-2">
        {memo.attachments.map((attachment) => {
          const isImage = attachment.type.startsWith('image/');
          const isVideo = attachment.type.startsWith('video/');

          return (
            <div
              key={attachment.attachmentId}
              className="relative aspect-square bg-gray-100 dark:bg-dark-800 rounded overflow-hidden"
            >
              {isImage ? (
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : isVideo ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <FileText className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                  <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-full px-1">
                    {attachment.filename}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleCardClick = () => {
    // Only open modal if not in editing mode
    if (!isEditing) {
      setShowRelatedModal(true);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-white dark:bg-dark-800 rounded-lg p-3 animate-fade-in transition-all hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer group"
        role="article"
      >
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none placeholder-gray-400 dark:placeholder-gray-600"
            rows={5}
            disabled={loading}
          />

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleUpdate}
              disabled={loading || !editContent.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Save memo changes"
            >
              {loading ? '保存中...' : '保存'}
            </button>

            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Cancel editing"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Content */}
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {plainText}
          </p>

          {/* Attachments (九宫格) */}
          {renderAttachments()}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {formatDate(memo.createdAt)}
              </span>
              {/* Show relevance score if available (from vector search) */}
              {'relevanceScore' in memo && (memo as MemoListItemWithScoreDto).relevanceScore !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 dark:text-gray-600">相关度:</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => {
                      const score = (memo as MemoListItemWithScoreDto).relevanceScore!;
                      const filled = (i + 1) <= Math.round(score * 5);
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            filled
                              ? 'bg-primary-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-700 rounded hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-900/50 transition-colors cursor-pointer"
                title="Edit this memo"
                aria-label="Edit memo"
              >
                编辑
              </button>

              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-700 rounded hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 transition-colors cursor-pointer disabled:opacity-50"
                title="Delete this memo"
                aria-label="Delete memo"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Related Memos Modal */}
      <RelatedMemosModal
        isOpen={showRelatedModal}
        onClose={() => setShowRelatedModal(false)}
        memo={memo}
      />
    </>
  );
});
