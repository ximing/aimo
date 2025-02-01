import MDEditor from '@/components/MDEditor';
import { Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import type { Attachment } from '@/api/types';

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPublish: () => void;
  onCancel?: () => void;
  loading?: boolean;
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  onTagsChange?: (tags: string[]) => void;
}

export const NoteEditor = ({
  value,
  onChange,
  onPublish,
  onCancel,
  loading,
  attachments = [],
  onAttachmentsChange,
  onTagsChange,
}: NoteEditorProps) => {
  return (
    <MDEditor
      value={value}
      onChange={onChange}
      onTagsChange={onTagsChange}
      attachments={attachments}
      onAttachmentsChange={onAttachmentsChange}
      toolbar={
        <div className="editor-actions">
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onPublish}
            loading={loading}
          >
            发布
          </Button>
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              取消
            </Button>
          )}
        </div>
      }
    />
  );
};
