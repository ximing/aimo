import { List, Card, Tag, Space, Button } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { Note } from '@/api/types';

interface NoteListProps {
  notes: Note[];
  loading?: boolean;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onShare?: (note: Note) => void;
}

export default function NoteList({
  notes,
  loading,
  onEdit,
  onDelete,
  onShare,
}: NoteListProps) {
  return (
    <List
      grid={{ gutter: 16, column: 3 }}
      dataSource={notes}
      loading={loading}
      renderItem={(note) => (
        <List.Item>
          <Card
            title={note.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            extra={
              <Space>
                {note.isPublic && onShare && (
                  <Button
                    icon={<ShareAltOutlined />}
                    size="small"
                    onClick={() => onShare(note)}
                  />
                )}
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => onEdit(note)}
                />
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                  onClick={() => onDelete(note.id)}
                />
              </Space>
            }
          >
            <div style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
          </Card>
        </List.Item>
      )}
    />
  );
}
