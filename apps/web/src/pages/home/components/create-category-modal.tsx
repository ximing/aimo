import { useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useService } from '@rabjs/react';
import { CategoryService } from '../../../services/category.service';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (categoryId: string) => void;
}

const MAX_CATEGORY_NAME_LENGTH = 50;

export const CreateCategoryModal = ({
  isOpen,
  onClose,
  onCategoryCreated,
}: CreateCategoryModalProps) => {
  const categoryService = useService(CategoryService);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setError(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '类别名称不能为空';
    }
    if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
      return `类别名称最多${MAX_CATEGORY_NAME_LENGTH}个字符`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await categoryService.createCategory(name.trim());

    setLoading(false);

    if (result.success && result.category) {
      onCategoryCreated?.(result.category.categoryId);
      handleClose();
    } else {
      setError(result.message || '创建类别失败');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-40" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-dark-800 shadow-lg transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <FolderPlus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      新建类别
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-4">
                    <label
                      htmlFor="category-name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      类别名称
                    </label>
                    <input
                      type="text"
                      id="category-name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="请输入类别名称"
                      maxLength={MAX_CATEGORY_NAME_LENGTH}
                      disabled={loading}
                      className={`w-full px-3 py-2 text-sm bg-white dark:bg-dark-900 border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        error
                          ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 dark:border-dark-600 focus:ring-primary-500 focus:border-primary-500'
                      } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2">
                      {error ? (
                        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {name.length}/{MAX_CATEGORY_NAME_LENGTH}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 dark:bg-dark-700/50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !name.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '创建中...' : '确认创建'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
