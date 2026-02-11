import { useState, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';

export const MemoEditor = view(() => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(3);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const memoService = useService(MemoService);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('请输入内容');
      return;
    }

    setLoading(true);

    const result = await memoService.createMemo(content);

    setLoading(false);

    if (result.success) {
      setContent('');
      setRows(3);
    } else {
      setError(result.message || 'Failed to create memo');
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      {error && (
        <div
          className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded text-xs animate-slide-up"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Textarea container with integrated submit button */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3 flex flex-col gap-2 transition-colors">
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

        <div className="flex items-center justify-end">
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
