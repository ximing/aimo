/**
 * Gallery Timeline Component
 * Groups attachments by date and displays them in a timeline view
 */

import { view, useService } from '@rabjs/react';
import { AttachmentService } from '../../../services/attachment.service';
import type { AttachmentDto } from '@aimo/dto';

interface TimelineGroup {
  date: string;
  label: string;
  attachments: AttachmentDto[];
}

/**
 * Format timestamp to date string
 */
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Get timeline label based on date
 */
const getTimelineLabel = (timestamp: number): string => {
  const now = Date.now();
  const date = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = date.toLocaleDateString('zh-CN');
  const todayStr = today.toLocaleDateString('zh-CN');
  const yesterdayStr = yesterday.toLocaleDateString('zh-CN');

  if (dateStr === todayStr) return '今天';
  if (dateStr === yesterdayStr) return '昨天';

  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} 周前`;
  }

  return formatDate(timestamp);
};

/**
 * Group attachments by date
 */
const groupAttachmentsByDate = (attachments: AttachmentDto[]): TimelineGroup[] => {
  const groups: Map<string, AttachmentDto[]> = new Map();

  // Sort by newest first
  const sorted = [...attachments].sort((a, b) => b.createdAt - a.createdAt);

  sorted.forEach((attachment) => {
    const dateStr = formatDate(attachment.createdAt);
    if (!groups.has(dateStr)) {
      groups.set(dateStr, []);
    }
    groups.get(dateStr)!.push(attachment);
  });

  return Array.from(groups.entries()).map(([date, attachments]) => ({
    date,
    label: getTimelineLabel(attachments[0].createdAt),
    attachments,
  }));
};

interface GalleryTimelineProps {
  onSelectAttachment: (attachment: AttachmentDto) => void;
  renderAttachment: (attachment: AttachmentDto, onSelect: (att: AttachmentDto) => void) => React.ReactNode;
}

export const GalleryTimeline = view(({ onSelectAttachment, renderAttachment }: GalleryTimelineProps) => {
  const attachmentService = useService(AttachmentService);
  const filteredItems = attachmentService.filteredItems;
  const timelineGroups = groupAttachmentsByDate(filteredItems);

  if (filteredItems.length === 0) {
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
      {timelineGroups.map((group) => (
        <div key={group.date} className="mb-12">
          {/* Timeline Marker */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              {/* Timeline Line */}
              <div className="h-0.5 flex-1 bg-gradient-to-r from-primary-200 to-transparent dark:from-primary-800 dark:to-transparent" />
              
              {/* Timeline Badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                <span className="font-medium text-sm text-primary-700 dark:text-primary-300">{group.label}</span>
              </div>

              {/* Trailing Line */}
              <div className="h-0.5 flex-1 bg-gradient-to-l from-primary-200 to-transparent dark:from-primary-800 dark:to-transparent" />
            </div>
          </div>

          {/* Waterfall Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
            {group.attachments.map((attachment) => (
              <div key={attachment.attachmentId} className="transition-all duration-300 hover:shadow-lg">
                {renderAttachment(attachment, onSelectAttachment)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
