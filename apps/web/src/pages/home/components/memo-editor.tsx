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
      setError('Please enter some content');
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

  const insertText = (prefix: string, suffix: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    setContent(before + prefix + selectedText + suffix + after);
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6 transition-colors duration-200">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Editor Toolbar */}
        <div className="mb-3 flex items-center gap-1 p-2 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600 flex-wrap">
          <button
            type="button"
            onClick={() => insertText('# ', '\n')}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            title="Heading"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertText('**', '**')}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            title="Bold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4a2 2 0 012-2h6a2 2 0 012 2v2H6V4zm0 4h8v8H6V8zm10 0v8h2a2 2 0 012-2h-2V8zm0 10H6v2a2 2 0 002 2h6a2 2 0 002-2v-2z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertText('*', '*')}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            title="Italic"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 5a1 1 0 100-2H5a1 1 0 000 2h2l3 12H8a1 1 0 100 2h4a1 1 0 100-2h-2l-3-12h2z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertText('- ', '')}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            title="Bullet list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertText('[', ']')}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            title="Link"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertText('@', '')}
            className="p-2 text-gray-600 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-600 rounded transition-colors"
            title="Mention"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="现在的想法是..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none placeholder-gray-500 dark:placeholder-dark-400"
          rows={5}
          disabled={loading}
        />

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-dark-400">{content.length} characters</p>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            {loading ? 'Creating...' : 'Create Memo'}
          </button>
        </div>
      </form>
    </div>
  );
});
