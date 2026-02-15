/**
 * Gallery Image Card Component
 * Displays a single image or video thumbnail with overlay
 */

import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { Play, FileText, Music, Trash2 } from 'lucide-react';
import type { AttachmentDto } from '@aimo/dto';
import { AttachmentService } from '../../../services/attachment.service';
import { ConfirmDeleteModal } from '../../home/components/confirm-delete-modal';

interface GalleryImageCardProps {
  attachment: AttachmentDto;
  onClick: () => void;
  onDelete?: (attachmentId: string) => void;
}

export const GalleryImageCard = view(({ attachment, onClick, onDelete }: GalleryImageCardProps) => {
  const attachmentService = useService(AttachmentService);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');
  const isDocument = !isImage && !isVideo && !isAudio;

  // Get icon for non-media files
  const getFileIcon = () => {
    if (isAudio) {
      return <Music className="w-8 h-8" />;
    }
    return <FileText className="w-8 h-8" />;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await attachmentService.deleteAttachment(attachment.attachmentId);
      setShowDeleteModal(false);
      onDelete?.(attachment.attachmentId);
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        className="relative group w-full aspect-square overflow-hidden rounded-xl bg-gray-200 dark:bg-dark-700 hover:shadow-xl hover:scale-102 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer flex items-center justify-center p-2"
      >
        {/* Image/Video Thumbnail */}
        {(isImage || isVideo) && (
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full h-full object-contain rounded-lg"
            loading="lazy"
          />
        )}

        {/* Document/Audio Placeholder */}
        {isDocument && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 dark:from-dark-600 dark:to-dark-700">
            <div className="text-slate-600 dark:text-slate-400">{getFileIcon()}</div>
          </div>
        )}

        {/* Video Play Icon */}
        {isVideo && (
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-gray-900 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Elegant Hover Overlay with Delete Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
          <div className="flex justify-end">
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="删除文件"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-white text-xs font-medium truncate font-serif">{attachment.filename}</p>
            <p className="text-slate-300 text-xs mt-2">
              {(attachment.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </button>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="确认删除"
        message="确定要删除这个文件吗？此操作无法撤销。"
      />
    </>
  );
});
