import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { AttachmentService } from '../../services/attachment.service';
import { GalleryFilter } from './components/gallery-filter';
import { GallerySearchBar } from './components/gallery-search-bar';
import { GalleryTimeline } from './components/gallery-timeline';
import { GalleryImageCard } from './components/gallery-image-card';
import { GalleryPreviewModal } from './components/gallery-preview-modal';
import type { AttachmentDto } from '@aimo/dto';

export const GalleryPage = view(() => {
  const attachmentService = useService(AttachmentService);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Initialize: fetch attachments on mount
  useEffect(() => {
    attachmentService.fetchAttachments(true).catch((err) => {
      console.error('Failed to fetch attachments:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAttachment = () => {
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-2xl h-full flex flex-col">
          {/* Header - Fixed */}
          <header className="flex-shrink-0 sticky top-0 z-30 px-8 pt-4 pb-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4">
              图廊
            </h1>
            <div className="flex gap-3 items-center">
              <GallerySearchBar />
              <GalleryFilter />
            </div>
          </header>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
            {attachmentService.loading && attachmentService.items.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
              </div>
            ) : (
              <GalleryTimeline
                onSelectAttachment={handleSelectAttachment}
                renderAttachment={(attachment: AttachmentDto, onSelect) => (
                  <GalleryImageCard
                    attachment={attachment}
                    onClick={() => onSelect(attachment)}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <GalleryPreviewModal isOpen={isPreviewOpen} onClose={handleClosePreview} />
    </Layout>
  );
});
