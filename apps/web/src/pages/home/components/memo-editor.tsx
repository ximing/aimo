import { useState, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { MemoService } from '../../../services/memo.service';
import { AttachmentUploader, type AttachmentItem } from '../../../components/attachment-uploader';
import { attachmentApi } from '../../../api/attachment';
import { Paperclip } from 'lucide-react';

export const MemoEditor = view(() => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(3);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memoService = useService(MemoService);

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
          attachmentIds = uploadedAttachments.map((a) => a.id);
        }
      }

      // 创建 memo
      const result = await memoService.createMemo(content, attachmentIds);

      if (result.success) {
        setContent('');
        setAttachments([]);
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
    if (attachments.length >= 9) {
      alert('最多只能上传 9 个附件');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 9 - attachments.length;
    if (remainingSlots <= 0) {
      alert('最多只能上传 9 个附件');
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const newAttachments: AttachmentItem[] = filesToAdd.map((file) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
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

  const handleRemoveAttachment = (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (attachment && attachment.file) {
      URL.revokeObjectURL(attachment.url);
    }
    setAttachments(attachments.filter((a) => a.id !== id));
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
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3 flex flex-col gap-3 transition-colors">
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
            disabled={loading || attachments.length >= 9}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="添加附件"
            title={attachments.length >= 9 ? '已达到最大附件数量' : `添加附件 (${attachments.length}/9)`}
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