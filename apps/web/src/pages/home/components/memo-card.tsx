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
    if (!confirm('Are you sure you want to delete this memo?')) return;

    setLoading(true);
    await memoService.deleteMemo(memo.memoId);
    setLoading(false);
  };

  const handleCancel = () => {
    setEditContent(memo.content);
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const images = extractImages(memo.content);
  const plainText = extractPlainText(memo.content);

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md dark:shadow-lg border border-gray-200 dark:border-dark-700 p-6 hover:shadow-lg dark:hover:shadow-xl transition-all animate-fade-in duration-300 cursor-pointer group" role="article">
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none placeholder-gray-500 dark:placeholder-dark-400"
            rows={5}
            disabled={loading}
          />

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleUpdate}
              disabled={loading || !editContent.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px] shadow-md hover:shadow-lg"
              aria-label="Save memo changes"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-dark-300 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer min-h-[44px]"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Images Grid */}
          {images.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
              {images.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`memo-image-${idx}`}
                  className="w-full h-24 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <p className="text-gray-800 dark:text-dark-300 text-sm leading-relaxed">{plainText}</p>

          {/* Metadata */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-700 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-dark-400">
              <p>{formatDate(memo.createdAt)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2.5 text-gray-600 dark:text-dark-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Edit this memo"
                aria-label="Edit memo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              <button
                onClick={handleDelete}
                disabled={loading}
                className="p-2.5 text-gray-600 dark:text-dark-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                title="Delete this memo"
                aria-label="Delete memo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              <button
                onClick={() => {
                  /* TODO: 实现菜单功能 */
                }}
                className="p-2.5 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-all duration-150 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="More options"
                aria-label="More options"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
