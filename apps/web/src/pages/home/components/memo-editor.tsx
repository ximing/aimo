import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';

export const MemoEditor = view(() => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } else {
      setError(result.message || 'Failed to create memo');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {error && (
        <div
          className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded text-sm animate-slide-up"
          role="alert"
        >
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="记录你的想法..."
        className="w-full px-4 py-3 border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none placeholder-gray-400 dark:placeholder-gray-600"
        rows={5}
        disabled={loading}
        aria-label="Memo content"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{content.length} 字符</p>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label={loading ? 'Creating memo' : 'Create memo'}
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
});
