/**
 * Attachment Uploader Component
 * 九宫格附件上传组件，最多支持 9 个附件
 */

import { X, FileText, Film } from 'lucide-react';

export interface AttachmentItem {
  attachmentId: string;
  file?: File;
  url: string;
  type: string;
  name: string;
}

interface AttachmentUploaderProps {
  attachments: AttachmentItem[];
  onAttachmentsChange: (attachments: AttachmentItem[]) => void;
  onRemove?: (attachmentId: string) => void | Promise<void>; // 删除回调
  uploadingFiles?: Set<string>; // 正在上传的文件 IDs
  maxCount?: number;
  disabled?: boolean;
}

export const AttachmentUploader = ({
  attachments,
  onAttachmentsChange,
  onRemove,
  uploadingFiles = new Set(),
  disabled = false,
}: AttachmentUploaderProps) => {
  const handleRemove = async (id: string) => {
    // 如果提供了 onRemove 回调，使用它（支持即时删除）
    if (onRemove) {
      await onRemove(id);
    } else {
      // 否则使用默认行为
      const attachment = attachments.find((a) => a.attachmentId === id);
      if (attachment && attachment.file) {
        URL.revokeObjectURL(attachment.url);
      }
      onAttachmentsChange(attachments.filter((a) => a.attachmentId !== id));
    }
  };

  const renderAttachment = (attachment: AttachmentItem) => {
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');
    const isUploading = uploadingFiles.has(attachment.attachmentId);

    return (
      <div
        key={attachment.attachmentId}
        className="relative aspect-square bg-gray-100 dark:bg-dark-800 rounded-lg overflow-hidden group"
      >
        {isImage ? (
          <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2">
            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full px-1">
              {attachment.name}
            </span>
          </div>
        )}

        {/* 上传中遮罩 */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}

        {/* 删除按钮 */}
        {!disabled && !isUploading && (
          <button
            type="button"
            onClick={() => handleRemove(attachment.attachmentId)}
            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="删除附件"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* 九宫格网格 */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-5 gap-2">{attachments.map(renderAttachment)}</div>
      )}
    </div>
  );
};
