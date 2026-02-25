import { useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import type { MemoListItemDto, MemoListItemWithScoreDto, AttachmentDto, TagDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';
import { AttachmentService } from '../../../services/attachment.service';
import { CategoryService } from '../../../services/category.service';
import copyToClipboard from 'copy-to-clipboard';
import {
  FileText,
  Film,
  Edit2,
  Trash2,
  Link,
  Download,
  Folder,
  Copy,
  Globe,
  Sparkles,
} from 'lucide-react';
import { RelatedMemosModal } from './related-memos-modal';
import { ConfirmDeleteModal } from './confirm-delete-modal';
import { MemoEditorForm } from '../../../components/memo-editor-form';
import { AttachmentPreviewModal } from '../../../components/attachment-preview-modal';
import { AIToolSelectorModal, TagGeneratorModal } from '../../../components/ai';
import { downloadFileFromUrl } from '../../../utils/download';
import { toast } from '../../../services/toast.service';
import { AudioItem } from './audio-item';
import { AIToolsService } from '../../../services/ai-tools.service';

interface MemoCardProps {
  memo: MemoListItemDto | MemoListItemWithScoreDto;
}

// Extract plain text without markdown syntax
// Handle tag click for filtering
const handleTagClick = (e: React.MouseEvent, tagName: string, memoService: MemoService) => {
  e.stopPropagation();
  memoService.setTagFilter(tagName);
};

// Render tags as hashtags
const renderTags = (tags: TagDto[] | undefined, memoService: MemoService) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {tags.map((tag) => (
        <button
          key={tag.tagId}
          onClick={(e) => handleTagClick(e, tag.name, memoService)}
          className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors cursor-pointer"
          title={`点击筛选 "${tag.name}" 标签`}
        >
          #{tag.name}
        </button>
      ))}
    </div>
  );
};

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

export const MemoCard = view(({ memo }: MemoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRelatedModal, setShowRelatedModal] = useState(false);
  const [selectedRelationMemo, setSelectedRelationMemo] = useState<MemoListItemDto | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const memoService = useService(MemoService);
  const attachmentService = useService(AttachmentService);
  const categoryService = useService(CategoryService);
  const aiToolsService = useService(AIToolsService);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    await memoService.deleteMemo(memo.memoId);
    setLoading(false);
    setShowDeleteModal(false);
  };

  const handleAttachmentClick = (attachment: AttachmentDto) => {
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');

    if (isImage || isVideo) {
      // Set up attachment service with current memo's attachments for preview
      // This allows next/prev navigation within the memo's attachments
      if (memo.attachments && memo.attachments.length > 0) {
        attachmentService.items = memo.attachments;
        attachmentService.total = memo.attachments.length;
        attachmentService.filter = 'all'; // Reset filter to show all attachments
        attachmentService.searchQuery = ''; // Clear search
      }
      // Set selected attachment and open preview
      attachmentService.setSelectedAttachment(attachment);
      setIsPreviewOpen(true);
    } else {
      // Download other file types (audio files are handled by AudioItem component)
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

  const plainText = extractPlainText(memo.content);
  const TRUNCATE_LENGTH = 150;
  const shouldTruncate = plainText.length > TRUNCATE_LENGTH;
  const displayText = isExpanded ? plainText : plainText.substring(0, TRUNCATE_LENGTH);

  const handleCopyMemo = useCallback(() => {
    const contentToCopy = plainText.trim() || memo.content;
    if (!contentToCopy) {
      toast.error('没有可复制的内容');
      return;
    }

    try {
      const copied = copyToClipboard(contentToCopy);
      if (copied) {
        toast.success('已复制到剪贴板');
        return;
      }
      toast.error('复制失败，请重试');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('复制失败，请重试');
    }
  }, [memo.content, plainText]);

  // 渲染附件网格
  const renderAttachments = () => {
    if (!memo.attachments || memo.attachments.length === 0) return null;

    // 分离音频附件和其他附件
    const audioAttachments = memo.attachments.filter((a) => a.type.startsWith('audio/'));
    const otherAttachments = memo.attachments.filter((a) => !a.type.startsWith('audio/'));

    // 渲染非音频附件（九宫格）
    const renderOtherAttachments = () => {
      if (otherAttachments.length === 0) return null;

      return (
        <div className="grid grid-cols-5 gap-2">
          {otherAttachments.map((attachment) => {
            const isImage = attachment.type.startsWith('image/');
            const isVideo = attachment.type.startsWith('video/');
            const isDocument = !isImage && !isVideo;
            const isAttachmentDownloading = isDownloading === attachment.attachmentId;

            return (
              <button
                key={attachment.attachmentId}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAttachmentClick(attachment);
                }}
                disabled={isAttachmentDownloading}
                className={`relative aspect-square ${
                  isDocument
                    ? 'bg-gray-100 dark:bg-dark-800'
                    : 'bg-gray-100 dark:bg-dark-800 group-hover:bg-transparent dark:group-hover:bg-transparent'
                } rounded overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50`}
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
                    <FileText className="w-6 h-6 text-gray-400 dark:text-gray-600" />
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

    // 渲染音频附件（微信录音样式）
    const renderAudioAttachments = () => {
      if (audioAttachments.length === 0) return null;

      return (
        <div className="flex flex-col gap-2">
          {audioAttachments.map((attachment) => (
            <AudioItem
              key={attachment.attachmentId}
              attachment={attachment}
              isDownloading={isDownloading === attachment.attachmentId}
            />
          ))}
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-1">
        {renderAudioAttachments()}
        {renderOtherAttachments()}
      </div>
    );
  };

  const handleCardClick = () => {
    // Only open modal if not in editing mode and not already a selected relation
    if (!isEditing && !selectedRelationMemo) {
      setShowRelatedModal(true);
    }
  };

  return (
    <>
      <div
        id={`memo-${memo.memoId}`}
        onClick={handleCardClick}
        className="bg-white dark:bg-dark-800 rounded-lg p-3 animate-fade-in transition-all hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer group"
        role="article"
      >
        {isEditing ? (
          <MemoEditorForm
            mode="edit"
            initialMemo={memo}
            onSave={() => {
              setIsEditing(false);
            }}
            onCancel={() => {
              setIsEditing(false);
            }}
          />
        ) : (
          <div className="space-y-2">
            {/* Content Section */}
            <div className="space-y-2">
              {/* Tags */}
              {renderTags(memo.tags, memoService)}

              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {displayText}
                {shouldTruncate && !isExpanded && (
                  <>
                    <span>...</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 cursor-pointer font-medium ml-1 transition-colors"
                      aria-label="Expand memo content"
                    >
                      展开
                    </button>
                  </>
                )}
                {isExpanded && shouldTruncate && (
                  <>
                    <span> </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 cursor-pointer font-medium transition-colors"
                      aria-label="Collapse memo content"
                    >
                      收起
                    </button>
                  </>
                )}
              </p>

              {/* Attachments (九宫格) */}
              {renderAttachments()}
            </div>

            {/* Relations Section */}
            {memo.relations && memo.relations.length > 0 && (
              <div className="space-y-0.5">
                {memo.relations.map((relation) => (
                  <button
                    key={relation.memoId}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRelationMemo(relation);
                      setShowRelatedModal(true);
                    }}
                    className="w-full flex items-start gap-2 px-2 py-1.5 bg-gray-50 dark:bg-dark-800/50 hover:bg-primary-50 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-200 dark:hover:border-primary-900/50 rounded transition-all duration-150 cursor-pointer group text-left"
                    title={relation.content}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Link className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 line-clamp-2 leading-snug transition-colors">
                        {relation.content}
                      </p>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        className="w-3 h-3 text-gray-400 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400"
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
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(memo.createdAt)}
                </span>
                {/* Category Badge */}
                {memo.categoryId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                    <Folder className="w-3 h-3" />
                    {categoryService.getCategoryName(memo.categoryId) || '...'}
                  </span>
                )}
                {/* Public Badge */}
                {memo.isPublic && (
                  <a
                    href={`/share/${memo.memoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 text-xs rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors cursor-pointer"
                    title="公开笔记 - 点击新窗口打开"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="w-3 h-3" />
                    公开
                  </a>
                )}
                {/* Show relevance score if available (from vector search) */}
                {'relevanceScore' in memo &&
                  (memo as MemoListItemWithScoreDto).relevanceScore !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 dark:text-gray-600">相关度:</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => {
                          const score = (memo as MemoListItemWithScoreDto).relevanceScore!;
                          const filled = i + 1 <= Math.round(score * 5);
                          return (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                filled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
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
                  onClick={(e) => {
                    e.stopPropagation();
                    aiToolsService.openToolSelector(memo.memoId, memo.content);
                  }}
                  className="p-1.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-700 rounded hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors cursor-pointer"
                  title="AI Tools"
                  aria-label="AI Tools"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-1.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-700 rounded hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-900/50 transition-colors cursor-pointer"
                  title="Edit this memo"
                  aria-label="Edit memo"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyMemo();
                  }}
                  className="p-1.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-700 rounded hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-200 dark:hover:border-primary-900/50 transition-colors cursor-pointer"
                  title="Copy memo"
                  aria-label="Copy memo"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick();
                  }}
                  disabled={loading}
                  className="p-1.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-700 rounded hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Delete this memo"
                  aria-label="Delete memo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Related Memos Modal */}
      <RelatedMemosModal
        isOpen={showRelatedModal}
        onClose={() => {
          setShowRelatedModal(false);
          setSelectedRelationMemo(null);
        }}
        memo={selectedRelationMemo || memo}
        onMemoClick={(memoId) => {
          // Scroll to the memo in the list
          const element = document.getElementById(`memo-${memoId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight effect
            element.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
            }, 2000);
          }
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={loading}
      />

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal isOpen={isPreviewOpen} onClose={handleClosePreview} />

      {/* AI Tool Selector Modal */}
      <AIToolSelectorModal
        isOpen={aiToolsService.modal.isOpen && aiToolsService.modal.toolType === null}
        onClose={() => aiToolsService.closeModal()}
        onSelectTool={(toolId) => aiToolsService.selectTool(toolId as 'generate-tags')}
      />

      {/* Tag Generator Modal */}
      <TagGeneratorModal
        isOpen={aiToolsService.modal.isOpen && aiToolsService.modal.toolType === 'generate-tags'}
        onClose={() => aiToolsService.closeModal()}
        onBack={() => aiToolsService.backToToolSelector()}
      />
    </>
  );
});
