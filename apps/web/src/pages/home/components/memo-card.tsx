import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import type { MemoDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';

interface MemoCardProps {
  memo: MemoDto;
}

// Extract image URLs from content (simple markdown image syntax)
const extractImages = (content: string): string[] => {
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const matches: string[] = [];
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }

  return matches.slice(0, 2); // Limit to 2 images per card
};

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

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return d.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const images = extractImages(memo.content);
  const plainText = extractPlainText(memo.content, 120);

  return (
    <div
      className="bg-gray-50 dark:bg-dark-800 rounded-lg p-5 animate-fade-in transition-all hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer group"
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
        <div className="space-y-3">
          {/* Images */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`memo-image-${idx}`}
                  className="w-full h-20 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{plainText}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500 dark:text-gray-500">{formatDate(memo.createdAt)}</span>

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
  );
});
