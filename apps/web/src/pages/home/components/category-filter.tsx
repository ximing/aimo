import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { CategoryService } from '../../../services/category.service';
import { MemoService } from '../../../services/memo.service';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { CreateCategoryModal } from './create-category-modal';

export const CategoryFilter = view(() => {
  const categoryService = useService(CategoryService);
  const memoService = useService(MemoService);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    categoryService.fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectCategory = (categoryId: string | null) => {
    memoService.setCategoryFilter(categoryId);
    setIsOpen(false);
  };

  const handleOpenCreateModal = () => {
    setIsOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleCategoryCreated = (categoryId: string) => {
    // Auto-select the newly created category
    memoService.setCategoryFilter(categoryId);
  };

  // Get current selected category name
  const selectedCategoryName = memoService.categoryFilter
    ? categoryService.getCategoryName(memoService.categoryFilter) || '全部类别'
    : '全部类别';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
          memoService.categoryFilter
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="max-w-[80px] truncate">{selectedCategoryName}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50 py-1">
          {/* All Categories Option */}
          <button
            onClick={() => handleSelectCategory(null)}
            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
              !memoService.categoryFilter
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}
          >
            <span>全部类别</span>
            {!memoService.categoryFilter && <Check size={14} />}
          </button>

          {/* Divider */}
          {categoryService.categories.length > 0 && (
            <div className="my-1 border-t border-gray-200 dark:border-dark-700" />
          )}

          {/* Category List */}
          <div className="max-h-48 overflow-y-auto">
            {categoryService.categories.map((category) => (
              <button
                key={category.categoryId}
                onClick={() => handleSelectCategory(category.categoryId)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  memoService.categoryFilter === category.categoryId
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                }`}
              >
                <span className="truncate">{category.name}</span>
                {memoService.categoryFilter === category.categoryId && <Check size={14} />}
              </button>
            ))}
          </div>

          {/* Empty State */}
          {categoryService.categories.length === 0 && !categoryService.loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              暂无类别
            </div>
          )}

          {/* Loading State */}
          {categoryService.loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              加载中...
            </div>
          )}

          {/* Divider */}
          <div className="my-1 border-t border-gray-200 dark:border-dark-700" />

          {/* Create New Category Button */}
          <button
            onClick={handleOpenCreateModal}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <Plus size={14} />
            <span>新建类别</span>
          </button>
        </div>
      )}

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
});
