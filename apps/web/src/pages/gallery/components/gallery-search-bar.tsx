/**
 * Gallery Search Bar Component
 * Provides search functionality for attachments by filename
 */

import { view, useService } from '@rabjs/react';
import { Search, X } from 'lucide-react';
import { AttachmentService } from '../../../services/attachment.service';

export const GallerySearchBar = view(() => {
  const attachmentService = useService(AttachmentService);

  const handleClear = () => {
    attachmentService.clearSearch();
  };

  return (
    <div className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索文件..."
          value={attachmentService.searchQuery}
          onChange={(e) => attachmentService.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {attachmentService.searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {attachmentService.searchQuery && (
        <div className="absolute left-0 top-full mt-1 text-xs text-gray-500 dark:text-gray-400">
          找到 {attachmentService.filteredCount} 个文件
        </div>
      )}
    </div>
  );
});
