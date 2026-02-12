/**
 * Attachment Uploader Component
 * 九宫格附件上传组件，最多支持 9 个附件
 */

import { useRef } from 'react';
import { X, Upload, FileText, Film } from 'lucide-react';

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
  maxCount?: number;
  disabled?: boolean;
}

export const AttachmentUploader = ({
  attachments,
  onAttachmentsChange,
  maxCount = 9,
  disabled = false,
}: AttachmentUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查数量限制
    const remainingSlots = maxCount - attachments.length;
    if (remainingSlots <= 0) {
      alert(`最多只能上传 ${maxCount} 个附件`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);

    // 创建本地预览URL
    const newAttachments: AttachmentItem[] = filesToAdd.map((file) => ({
      attachmentId: `temp-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
    }));

    onAttachmentsChange([...attachments, ...newAttachments]);

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    const attachment = attachments.find((a) => a.attachmentId === id);
    if (attachment && attachment.file) {
      URL.revokeObjectURL(attachment.url);
    }
    onAttachmentsChange(attachments.filter((a) => a.attachmentId !== id));
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const renderAttachment = (attachment: AttachmentItem) => {
    const isImage = attachment.type.startsWith('image/');
    const isVideo = attachment.type.startsWith('video/');

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

        {/* 删除按钮 */}
        {!disabled && (
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

  const canAddMore = attachments.length < maxCount && !disabled;

  return (
    <div className="space-y-2">
      {/* 九宫格网格 */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">{attachments.map(renderAttachment)}</div>
      )}

      {/* 添加按钮 */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleAddClick}
            disabled={disabled}
            className="w-full py-2 px-3 border border-dashed border-gray-300 dark:border-dark-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>
              添加附件 ({attachments.length}/{maxCount})
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
