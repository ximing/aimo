/**
 * Gallery Grid Component
 * Displays attachments in a responsive grid with infinite scroll support
 */

import { useEffect, useRef, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Loader2 } from 'lucide-react';
import type { AttachmentDto } from '@aimo/dto';
import { AttachmentService } from '../../../services/attachment.service';
import { GalleryImageCard } from './gallery-image-card';

interface GalleryGridProps {
  onSelectAttachment: (attachment: AttachmentDto) => void;
}

export const GalleryGrid = view(({ onSelectAttachment }: GalleryGridProps) => {
  const attachmentService = useService(AttachmentService);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && attachmentService.hasMore && !attachmentService.loading) {
          attachmentService.loadMore().catch((err) => {
            console.error('Failed to load more attachments:', err);
          });
        }
      },
      {
        rootMargin: '100px',
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [attachmentService]);

  const handleSelectAttachment = useCallback(
    (attachment: AttachmentDto) => {
      attachmentService.setSelectedAttachment(attachment);
      onSelectAttachment(attachment);
    },
    [attachmentService, onSelectAttachment]
  );

   
  const handleDeleteAttachment = useCallback(
    () => {
      // The deletion is already handled in the service
      // This callback is just for any additional UI updates
    },
    []
  );

  const filteredItems = attachmentService.filteredItems;

  // Empty state
  if (filteredItems.length === 0 && !attachmentService.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {attachmentService.items.length === 0 ? '还没有附件' : '没有找到匹配的文件'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
        {filteredItems.map((attachment) => (
          <GalleryImageCard
            key={attachment.attachmentId}
            attachment={attachment}
            onClick={() => handleSelectAttachment(attachment)}
            onDelete={handleDeleteAttachment}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      {attachmentService.loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-1 w-full" />

      {/* End of list indicator */}
      {!attachmentService.hasMore && filteredItems.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            已加载全部 {filteredItems.length} 个文件
          </p>
        </div>
      )}
    </div>
  );
});
