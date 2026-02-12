/**
 * Gallery Preview Modal Component
 * Displays full preview of images or videos with navigation and delete functionality
 */

import { useEffect, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { X, ChevronLeft, ChevronRight, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { AttachmentService } from '../../../services/attachment.service';

interface GalleryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GalleryPreviewModalContent = view(({ isOpen, onClose }: GalleryPreviewModalProps) => {
  const attachmentService = useService(AttachmentService);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zoomLevelRef = useRef<number>(1);

  const attachment = attachmentService.selectedAttachment;
  if (!attachment) return null;

  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');

  const canGoPrev = attachmentService.getPrevAttachment() !== null;
  const canGoNext = attachmentService.getNextAttachment() !== null;

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handlePrevious = () => {
    const prev = attachmentService.getPrevAttachment();
    if (prev) {
      attachmentService.setSelectedAttachment(prev);
      zoomLevelRef.current = 1;
    }
  };

  const handleNext = () => {
    const next = attachmentService.getNextAttachment();
    if (next) {
      attachmentService.setSelectedAttachment(next);
      zoomLevelRef.current = 1;
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个文件吗？')) {
      return;
    }

    try {
      const next = attachmentService.getNextAttachment();
      const prev = attachmentService.getPrevAttachment();
      await attachmentService.deleteAttachment(attachment.attachmentId);

      if (next) {
        attachmentService.setSelectedAttachment(next);
      } else if (prev) {
        attachmentService.setSelectedAttachment(prev);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('删除失败，请重试');
    }
  };

  const handleZoomIn = () => {
    if (imageRef.current && zoomLevelRef.current < 3) {
      zoomLevelRef.current += 0.2;
      imageRef.current.style.transform = `scale(${zoomLevelRef.current})`;
    }
  };

  const handleZoomOut = () => {
    if (imageRef.current && zoomLevelRef.current > 0.5) {
      zoomLevelRef.current -= 0.2;
      imageRef.current.style.transform = `scale(${zoomLevelRef.current})`;
    }
  };

  const handleResetZoom = () => {
    if (imageRef.current) {
      zoomLevelRef.current = 1;
      imageRef.current.style.transform = 'scale(1)';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 text-white">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold truncate text-sm">{attachment.filename}</h3>
          <span className="text-gray-400 text-xs">
            {(attachment.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Image Preview */}
        {isImage && (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              ref={imageRef}
              src={attachment.url}
              alt={attachment.filename}
              className="max-w-[90%] max-h-[90%] object-contain cursor-move transition-transform duration-200"
            />
          </div>
        )}

        {/* Video Preview */}
        {isVideo && (
          <video
            ref={videoRef}
            src={attachment.url}
            controls
            className="max-w-[90%] max-h-[90%] object-contain"
            autoPlay
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between px-6">
        {/* Zoom Controls (for images) */}
        {isImage && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="缩小 (- 键)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-xs min-w-12 text-center">
              {Math.round(zoomLevelRef.current * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="放大 (+ 键)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-3 py-2 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="重置缩放"
            >
              重置
            </button>
          </div>
        )}

        {!isImage && <div />}

        {/* Navigation and Delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
            title="删除 (Del)"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={handlePrevious}
            disabled={!canGoPrev}
            className={`p-2 rounded-lg transition-colors ${
              canGoPrev ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'
            }`}
            title="上一个 (← 键)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`p-2 rounded-lg transition-colors ${
              canGoNext ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'
            }`}
            title="下一个 (→ 键)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});

/**
 * Wrapper component to handle conditional rendering without breaking React Hooks rules
 * Ensures Hooks are always called in the same order
 */
export const GalleryPreviewModal = ({ isOpen, onClose }: GalleryPreviewModalProps) => {
  if (!isOpen) return null;
  return <GalleryPreviewModalContent isOpen={isOpen} onClose={onClose} />;
};
