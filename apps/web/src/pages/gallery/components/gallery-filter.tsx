/**
 * Gallery Filter Component
 * Provides filter buttons for image/video type selection
 */

import { view, useService } from '@rabjs/react';
import { Image, Video, Image as ImageIcon } from 'lucide-react';
import { AttachmentService, type AttachmentFilter } from '../../../services/attachment.service';

export const GalleryFilter = view(() => {
  const attachmentService = useService(AttachmentService);

  const filters: { id: AttachmentFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: '全部', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'images', label: '图片', icon: <Image className="w-4 h-4" /> },
    { id: 'videos', label: '视频', icon: <Video className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => attachmentService.setFilter(f.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
            attachmentService.filter === f.id
              ? 'bg-primary-500 text-white shadow-md dark:bg-primary-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600'
          }`}
        >
          {f.icon}
          <span className="text-sm font-medium">{f.label}</span>
        </button>
      ))}
    </div>
  );
});
