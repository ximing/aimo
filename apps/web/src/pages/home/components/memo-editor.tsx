import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';
import { AttachmentUploader, type AttachmentItem } from '../../../components/attachment-uploader';
import { attachmentApi } from '../../../api/attachment';
import * as memoApi from '../../../api/memo';
import { Paperclip, X } from 'lucide-react';
import type { MemoListItemDto } from '@aimo/dto';

export const MemoEditor = view(() => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(3);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedRelations, setSelectedRelations] = useState<MemoListItemDto[]>([]);
  const [suggestions, setSuggestions] = useState<MemoListItemDto[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingRelations, setSearchingRelations] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const memoService = useService(MemoService);

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

    try {
      // 上传附件（如果有）
      let attachmentIds: string[] | undefined;
      if (attachments.length > 0) {
        const filesToUpload = attachments.filter((a) => a.file).map((a) => a.file!);
        if (filesToUpload.length > 0) {
          const uploadedAttachments = await attachmentApi.uploadBatch(filesToUpload);
          attachmentIds = uploadedAttachments.map((a) => a.attachmentId);
        }
      }

      // 获取关系 IDs
      const relationIds = selectedRelations.map((r) => r.memoId);

      // 创建 memo（带关系）
      const result = await memoService.createMemo(content, attachmentIds, relationIds);

      if (result.success) {
        setContent('');
        setAttachments([]);
        setSelectedRelations([]);
        setSuggestions([]);
        setShowSuggestions(false);
        setRows(3);
      } else {
        setError(result.message || '保存失败');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('保存失败，请重试');
    } finally {
      setLoading(false);
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
    setSearchingRelations(true);
    try {
      const response = await memoApi.vectorSearch({
        query,
        limit: 10,
        page: 1,
      });
      if (response.code === 0 && response.data) {
        // 排除已选中的关系
        const selectedIds = selectedRelations.map((r) => r.memoId);
        const filtered = response.data.items.filter((item) => !selectedIds.includes(item.memoId));
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
    // 聚焦时展开到5行
    if (rows < 5) {
      setRows(5);
    }
  };

  const handleBlur = () => {
    // 失焦时，如果内容为空则还原到3行
    if (!content.trim()) {
      setRows(3);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: AttachmentItem[] = files.map((file) => ({
      attachmentId: `temp-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
    }));

    setAttachments([...attachments, ...newAttachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
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
          placeholder="记录你的想法..."
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
          <AttachmentUploader
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            disabled={loading}
          />
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        {/* 操作栏：附件按钮和保存按钮 */}
        <div className="flex items-center justify-between">
          {/* 左侧：附件按钮 */}
          <button
            type="button"
            onClick={handleAttachmentClick}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="添加附件"
            title={`添加附件${attachments.length > 0 ? ` (${attachments.length})` : ''}`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* 右侧：保存按钮 */}
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label={loading ? 'Creating memo' : 'Create memo'}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </form>
  );
});
