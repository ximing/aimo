import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../services/memo.service';
import { CategoryService } from '../services/category.service';
import { TagService } from '../services/tag.service';
import { AIToolsService } from '../services/ai-tools.service';
import { AttachmentUploader, type AttachmentItem } from './attachment-uploader';
import { TagInput } from './tag-input';
import { attachmentApi } from '../api/attachment';
import * as memoApi from '../api/memo';
import { Paperclip, X, Check, ChevronDown, Plus, Globe, Lock, Sparkles, Tags } from 'lucide-react';
import type { MemoListItemDto, MemoWithAttachmentsDto } from '@aimo/dto';
import { CreateCategoryModal } from '../pages/home/components/create-category-modal';
import { AIToolSelectorModal, TagGeneratorModal } from './ai';

interface MemoEditorFormProps {
  mode: 'create' | 'edit';
  initialMemo?: MemoListItemDto; // 编辑模式必需
  onSave?: (memo: MemoWithAttachmentsDto) => void;
  onCancel?: () => void;
  defaultCategoryId?: string | null; // 默认选中的类别ID
}

export const MemoEditorForm = view(
  ({ mode, initialMemo, onSave, onCancel, defaultCategoryId }: MemoEditorFormProps) => {
    const [content, setContent] = useState(initialMemo?.content || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rows, setRows] = useState(mode === 'create' ? 3 : 5);
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [selectedRelations, setSelectedRelations] = useState<MemoListItemDto[]>([]);
    const [suggestions, setSuggestions] = useState<MemoListItemDto[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchingRelations, setSearchingRelations] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
      initialMemo?.categoryId || defaultCategoryId || null
    );
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [isEditorActive, setIsEditorActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // 标记是否正在提交中，用于防止推荐接口时序问题
    const [isPublic, setIsPublic] = useState<boolean>(initialMemo?.isPublic ?? false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isAIDropdownOpen, setIsAIDropdownOpen] = useState(false);

    // 当 defaultCategoryId 变化时，同步更新 selectedCategoryId（创建模式下）
    useEffect(() => {
      if (mode === 'create') {
        setSelectedCategoryId(defaultCategoryId || null);
      }
    }, [defaultCategoryId, mode]);
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const aiDropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const memoService = useService(MemoService);
    const categoryService = useService(CategoryService);
    const tagService = useService(TagService);
    const aiToolsService = useService(AIToolsService);

    // 初始化编辑模式的数据
    useEffect(() => {
      if (mode === 'edit' && initialMemo) {
        // 初始化附件
        if (initialMemo.attachments && initialMemo.attachments.length > 0) {
          const initialAttachments: AttachmentItem[] = initialMemo.attachments.map((att) => ({
            attachmentId: att.attachmentId,
            url: att.url,
            type: att.type,
            name: att.filename,
          }));
          setAttachments(initialAttachments);
        }

        // 初始化关联笔记
        if (initialMemo.relations && initialMemo.relations.length > 0) {
          setSelectedRelations(initialMemo.relations);
        }

        // 初始化类别
        if (initialMemo.categoryId) {
          setSelectedCategoryId(initialMemo.categoryId);
        }

        // 初始化标签
        if (initialMemo.tags && initialMemo.tags.length > 0) {
          setSelectedTags(initialMemo.tags.map((t) => t.name));
        }
      }
    }, [mode, initialMemo]);

    // 获取类别列表
    useEffect(() => {
      categoryService.fetchCategories();
    }, []);

    // 获取标签列表（用于标签输入建议）
    useEffect(() => {
      tagService.fetchTags();
    }, []);

    // 点击外部关闭类别下拉框
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          categoryDropdownRef.current &&
          !categoryDropdownRef.current.contains(event.target as Node)
        ) {
          setIsCategoryDropdownOpen(false);
        }
      };

      if (isCategoryDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isCategoryDropdownOpen]);

    // 点击外部关闭AI工具下拉框
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          aiDropdownRef.current &&
          !aiDropdownRef.current.contains(event.target as Node)
        ) {
          setIsAIDropdownOpen(false);
        }
      };

      if (isAIDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isAIDropdownOpen]);

    // 点击编辑区外部时收起（避免选择类别时失焦）
    useEffect(() => {
      const handleMouseDown = (event: MouseEvent) => {
        if (isCreateCategoryModalOpen) {
          return;
        }

        if (formRef.current?.contains(event.target as Node)) {
          if (!isEditorActive) {
            setIsEditorActive(true);
          }
          return;
        }

        setIsEditorActive(false);
        setIsCategoryDropdownOpen(false);
      };

      document.addEventListener('mousedown', handleMouseDown);
      return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isEditorActive, isCreateCategoryModalOpen]);

    // 清理防抖计时器
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!content.trim()) {
        setError('请输入内容');
        return;
      }

      setLoading(true);
      setIsSubmitting(true); // 标记正在提交，防止推荐接口时序问题

      try {
        // 获取附件 IDs（所有附件都已经上传）
        const attachmentIds = attachments.map((a) => a.attachmentId);

        // 获取关系 IDs
        const relationIds = selectedRelations.map((r) => r.memoId);

        let result;
        if (mode === 'create') {
          // 创建 memo
          result = await memoService.createMemo(
            content,
            'text', // type: default to text
            selectedCategoryId || undefined,
            attachmentIds.length > 0 ? attachmentIds : undefined,
            relationIds.length > 0 ? relationIds : undefined,
            isPublic,
            selectedTags.length > 0 ? selectedTags : undefined
          );
        } else {
          // 更新 memo
          if (!initialMemo?.memoId) {
            throw new Error('编辑模式缺少 memoId');
          }
          result = await memoService.updateMemo(
            initialMemo.memoId,
            content,
            'text', // type: default to text
            selectedCategoryId,
            attachmentIds.length > 0 ? attachmentIds : undefined,
            relationIds.length > 0 ? relationIds : undefined,
            isPublic,
            selectedTags.length > 0 ? selectedTags : undefined
          );
        }

        if (result.success) {
          // 清除推荐
          setSuggestions([]);
          setShowSuggestions(false);
          if (mode === 'create') {
            // 创建模式：清空表单
            setContent('');
            setAttachments([]);
            setSelectedRelations([]);
            setSelectedTags([]);
            setRows(3);
          }
          // 刷新标签列表（更新使用计数）
          void tagService.fetchTags();
          // 调用 onSave 回调
          if (onSave && result.memo) {
            onSave(result.memo);
          }
        } else {
          setError(result.message || '保存失败');
        }
      } catch (err) {
        console.error('Submit error:', err);
        setError('保存失败，请重试');
      } finally {
        setLoading(false);
        setIsSubmitting(false);
      }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContent(value);

      // 根据内容行数动态调整行数
      if (textareaRef.current) {
        const lineCount = value.split('\n').length;
        const newRows = Math.min(Math.max(lineCount + 1, 5), 10);
        setRows(newRows);
      }

      // 清除之前的防抖计时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 当内容变化时，使用防抖获取推荐的相关 memo
      if (value.trim().length >= 2) {
        // 设置新的防抖计时器（延迟 500ms）
        debounceTimerRef.current = setTimeout(() => {
          searchRelationSuggestions(value);
        }, 500);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const searchRelationSuggestions = async (query: string) => {
      // 如果正在提交中，跳过推荐搜索（防止时序问题）
      if (isSubmitting) {
        return;
      }
      setSearchingRelations(true);
      try {
        const response = await memoApi.vectorSearch({
          query,
          limit: 10,
          page: 1,
        });
        // 再次检查：如果在请求过程中开始提交了，跳过更新
        if (isSubmitting) {
          return;
        }
        if (response.code === 0 && response.data) {
          // 排除已选中的关系和自己（编辑模式）
          const selectedIds = selectedRelations.map((r) => r.memoId);
          const currentMemoId = mode === 'edit' && initialMemo ? initialMemo.memoId : null;
          const filtered = response.data.items.filter(
            (item) =>
              !selectedIds.includes(item.memoId) &&
              (currentMemoId ? item.memoId !== currentMemoId : true)
          );
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      } catch (error) {
        console.error('Failed to search relations:', error);
      } finally {
        setSearchingRelations(false);
      }
    };

    const handleAddRelation = (memo: MemoListItemDto) => {
      setSelectedRelations([...selectedRelations, memo]);
      // 从建议中移除
      setSuggestions(suggestions.filter((s) => s.memoId !== memo.memoId));
      if (suggestions.length <= 1) {
        setShowSuggestions(false);
      }
    };

    const handleRemoveRelation = (memoId: string) => {
      setSelectedRelations(selectedRelations.filter((r) => r.memoId !== memoId));
    };

    const handleFocus = () => {
      // 聚焦时展开到5行（仅创建模式）
      if (mode === 'create' && rows < 5) {
        setRows(5);
      }
    };

    const handleBlur = () => {
      // 失焦时，如果内容为空且焦点移出编辑区则还原到3行（仅创建模式）
      if (mode !== 'create' || content.trim()) {
        return;
      }

      requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        if (!formRef.current?.contains(activeElement)) {
          setRows(3);
        }
      });
    };

    // Command+Enter (Mac) 或 Ctrl+Enter (Windows/Linux) 提交表单
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (content.trim() && !loading) {
          // 立即清除推荐，避免显示问题
          setSuggestions([]);
          setShowSuggestions(false);
          // 触发表单提交
          handleSubmit(e as unknown as React.FormEvent);
        }
      }
    };

    const handleFormFocus = () => {
      if (!isEditorActive) {
        setIsEditorActive(true);
      }
    };

    const handleAttachmentClick = () => {
      fileInputRef.current?.click();
    };

    const handleAIToolClick = () => {
      setIsAIDropdownOpen(!isAIDropdownOpen);
    };

    const handleSelectAITool = (toolId: string) => {
      setIsAIDropdownOpen(false);

      if (toolId === 'generate-tags') {
        if (mode === 'edit' && initialMemo?.memoId) {
          // Edit mode: open tool selector with memoId
          aiToolsService.openToolSelector(initialMemo.memoId, content);
          aiToolsService.selectTool('generate-tags');
        } else {
          // Create mode: open tool selector without memoId, will add tags to local state
          aiToolsService.openToolSelector('', content);
          aiToolsService.selectTool('generate-tags');
        }
      }
    };

    // Handle tags received from tag generator (create mode)
    const handleAITagsConfirm = (tags: string[]) => {
      // Add tags to editor's selectedTags, avoiding duplicates
      setSelectedTags((prev) => {
        const newTags = tags.filter((tag) => !prev.some((t) => t.toLowerCase() === tag.toLowerCase()));
        return [...prev, ...newTags];
      });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // 检查数量限制
      const remainingSlots = 9 - attachments.length;
      if (remainingSlots <= 0) {
        setError('最多只能上传 9 个附件');
        return;
      }

      const filesToUpload = files.slice(0, remainingSlots);

      // 立即上传每个文件
      for (const file of filesToUpload) {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        setUploadingFiles((prev) => new Set(prev).add(tempId));

        // 先添加到列表（显示上传中状态）
        const tempAttachment: AttachmentItem = {
          attachmentId: tempId,
          file,
          url: URL.createObjectURL(file),
          type: file.type,
          name: file.name,
        };
        setAttachments((prev) => [...prev, tempAttachment]);

        try {
          // 立即上传
          const uploadedAttachment = await attachmentApi.upload(file);

          // 更新为已上传的附件
          setAttachments((prev) =>
            prev.map((att) =>
              att.attachmentId === tempId
                ? {
                    attachmentId: uploadedAttachment.attachmentId,
                    url: uploadedAttachment.url,
                    type: uploadedAttachment.type,
                    name: uploadedAttachment.filename,
                  }
                : att
            )
          );
        } catch (error) {
          console.error('Upload failed:', error);
          // 上传失败，移除这个附件
          setAttachments((prev) => prev.filter((att) => att.attachmentId !== tempId));
          setError(`文件 "${file.name}" 上传失败`);
        } finally {
          setUploadingFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(tempId);
            return newSet;
          });
        }
      }

      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleRemoveAttachment = async (attachmentId: string) => {
      // 如果是正在上传的，不允许删除
      if (uploadingFiles.has(attachmentId)) {
        return;
      }

      // 如果是已上传的附件（不是 temp- 开头），调用 API 删除
      if (!attachmentId.startsWith('temp-')) {
        try {
          await attachmentApi.delete(attachmentId);
        } catch (error) {
          console.error('Failed to delete attachment:', error);
          setError('删除附件失败');
          return;
        }
      }

      // 从列表中移除
      setAttachments((prev) => {
        const attachment = prev.find((a) => a.attachmentId === attachmentId);
        if (attachment && attachment.file) {
          URL.revokeObjectURL(attachment.url);
        }
        return prev.filter((a) => a.attachmentId !== attachmentId);
      });
    };

    const handleCancelEdit = () => {
      if (onCancel) {
        onCancel();
      }
    };

    const handleSelectCategory = (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      setIsCategoryDropdownOpen(false);
    };

    const handleOpenCreateCategoryModal = () => {
      setIsCategoryDropdownOpen(false);
      setIsCreateCategoryModalOpen(true);
    };

    const handleCategoryCreated = (categoryId: string) => {
      // Auto-select the newly created category
      setSelectedCategoryId(categoryId);
    };

    const showCategorySelector = mode === 'edit' || isEditorActive;

    // Get selected category name
    const selectedCategoryName = selectedCategoryId
      ? categoryService.getCategoryName(selectedCategoryId) || '选择类别'
      : '无类别';

    return (
      <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onFocusCapture={handleFormFocus}
        noValidate
        className="space-y-2"
      >
        {error && (
          <div
            className="px-3 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded text-xs animate-slide-up"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Textarea container with integrated submit button */}
        <div className="bg-white dark:bg-dark-800 rounded-lg p-3 flex flex-col gap-3 transition-colors">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'create' ? '记录你的想法... (⌘+Enter)' : '编辑你的笔记...'}
            className="w-full px-0 py-0 bg-transparent text-gray-900 dark:text-gray-50 rounded-lg focus:outline-none resize-none placeholder-gray-400 dark:placeholder-gray-600 text-sm leading-relaxed"
            rows={rows}
            disabled={loading}
            aria-label="Memo content"
          />

          {/* 推荐相关 memo 下拉框 */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="bg-gradient-to-b from-white/95 to-gray-50/95 dark:from-dark-700/95 dark:to-dark-800/95 backdrop-blur-md border border-gray-200/50 dark:border-dark-600/50 rounded-lg p-2 space-y-1 animate-fade-in shadow-md"
            >
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                推荐相关笔记
              </div>
              {searchingRelations ? (
                <div className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-500"></div>
                  搜索中...
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {suggestions.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion.memoId}
                      type="button"
                      onClick={() => handleAddRelation(suggestion)}
                      className="w-full text-left px-2 py-2 rounded text-xs bg-white dark:bg-dark-800 hover:bg-primary-50 dark:hover:bg-primary-950/20 border border-transparent hover:border-primary-300/50 dark:hover:border-primary-900/50 transition-all duration-150 cursor-pointer group"
                    >
                      <p className="text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2">
                        {suggestion.content.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(suggestion.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 已选择的关系标签 */}
          {selectedRelations.length > 0 && (
            <div className="bg-gradient-to-r from-primary-50/50 to-primary-100/30 dark:from-primary-950/20 dark:to-primary-900/10 border border-primary-200/30 dark:border-primary-900/30 rounded-lg p-2.5 space-y-2">
              <div className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">
                关联笔记 ({selectedRelations.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedRelations.map((relation) => (
                  <div
                    key={relation.memoId}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-dark-800 border border-primary-300/50 dark:border-primary-700/50 rounded-full text-xs text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors group"
                  >
                    <span className="truncate max-w-[150px]">{relation.content.substring(0, 50)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRelation(relation.memoId)}
                      className="text-primary-400 hover:text-primary-600 dark:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                      aria-label="Remove relation"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 附件预览区域 */}
          {attachments.length > 0 && (
            <div className="pt-1">
              <AttachmentUploader
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                onRemove={handleRemoveAttachment}
                uploadingFiles={uploadingFiles}
                disabled={loading}
              />
            </div>
          )}

          {/* 标签输入区域 */}
          <TagInput
            tags={selectedTags}
            onTagsChange={setSelectedTags}
            existingTags={tagService.tags}
            disabled={loading}
          />

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/mp4,audio/mpeg,.m4a,.doc,.docx,.xls,.xlsx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading}
          />

          {/* 操作栏：附件按钮和保存按钮 */}
          <div className="flex items-center justify-between">
            {/* 左侧：附件按钮和AI工具按钮 */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAttachmentClick}
                disabled={loading || attachments.length >= 9}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="添加附件"
                title={`添加附件${attachments.length > 0 ? ` (${attachments.length}/9)` : ' (0/9)'}`}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* AI Tools Dropdown */}
              <div className="relative" ref={aiDropdownRef}>
                <button
                  type="button"
                  onClick={handleAIToolClick}
                  disabled={loading}
                  className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isAIDropdownOpen
                      ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                  aria-label="AI工具"
                  title="AI工具"
                  aria-expanded={isAIDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <Sparkles className="w-5 h-5" />
                </button>

                {/* AI Tools Dropdown Menu */}
                {isAIDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50 py-1">
                    <button
                      type="button"
                      onClick={() => handleSelectAITool('generate-tags')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <Tags className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>智能生成标签</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {mode === 'edit' && onCancel && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Cancel editing"
                >
                  取消
                </button>
              )}
              {showCategorySelector && (
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedCategoryId
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-expanded={isCategoryDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="max-w-[100px] truncate">{selectedCategoryName}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Category Dropdown Menu */}
                  {isCategoryDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg z-50 py-1">
                      {/* No Category Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(null)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                          !selectedCategoryId
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                        }`}
                      >
                        <span>无类别</span>
                        {!selectedCategoryId && <Check size={14} />}
                      </button>

                      {/* Divider */}
                      {categoryService.categories.length > 0 && (
                        <div className="my-1 border-t border-gray-200 dark:border-dark-700" />
                      )}

                      {/* Category List */}
                      <div className="max-h-40 overflow-y-auto">
                        {categoryService.categories.map((category) => (
                          <button
                            key={category.categoryId}
                            type="button"
                            onClick={() => handleSelectCategory(category.categoryId)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                              selectedCategoryId === category.categoryId
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                            }`}
                          >
                            <span className="truncate">{category.name}</span>
                            {selectedCategoryId === category.categoryId && <Check size={14} />}
                          </button>
                        ))}
                      </div>

                      {/* Empty State */}
                      {categoryService.categories.length === 0 && !categoryService.loading && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          暂无类别
                        </div>
                      )}

                      {/* Divider */}
                      <div className="my-1 border-t border-gray-200 dark:border-dark-700" />

                      {/* Create New Category Button */}
                      <button
                        type="button"
                        onClick={handleOpenCreateCategoryModal}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      >
                        <Plus size={14} />
                        <span>新建类别</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Public Toggle */}
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isPublic
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-pressed={isPublic}
                title={isPublic ? '此笔记将对其他人公开' : '此笔记仅自己可见'}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                <span>{isPublic ? '公开' : '私有'}</span>
              </button>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label={loading ? 'Saving' : mode === 'create' ? 'Create memo' : 'Update memo'}
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* AI Tool Selector Modal */}
      <AIToolSelectorModal
        isOpen={aiToolsService.modal.isOpen && aiToolsService.modal.toolType === null}
        onClose={() => aiToolsService.closeModal()}
        onSelectTool={(toolId) => aiToolsService.selectTool(toolId as 'generate-tags')}
      />

      {/* Tag Generator Modal */}
      <TagGeneratorModal
        isOpen={aiToolsService.modal.isOpen && aiToolsService.modal.toolType === 'generate-tags'}
        onClose={() => aiToolsService.closeModal()}
        onBack={() => aiToolsService.backToToolSelector()}
        onConfirm={mode === 'create' && !initialMemo?.memoId ? handleAITagsConfirm : undefined}
      />
    </>
  );
});