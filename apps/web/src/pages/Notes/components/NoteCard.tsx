import { App, Card, Dropdown, Modal } from 'antd';
import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Note } from '@/api/types';
import MarkdownView from '@/components/MarkdownView';
import { useNoteStore } from '@/stores/noteStore';
import { getWordCount } from '@/utils/getWordCount';
import { useCallback } from 'react';

interface NoteCardProps {
  note: Note;
}

export const NoteCard = ({ note }: NoteCardProps) => {
  const { startEditNote, deleteNote } = useNoteStore();
  const [modal, contextHolder] = Modal.useModal();
  const { message } = App.useApp();

  const showDeleteConfirm = useCallback(() => {
    modal.confirm({
      title: '删除笔记',
      content: '确定要删除这条笔记吗？',
      onOk: async () => {
        try {
          await deleteNote(note.id);
          message.success('笔记已删除');
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  }, [deleteNote, note.id, modal]);

  return (
    <Card className="note-card" onDoubleClick={() => startEditNote(note)}>
      <div className="note-header">
        <div className="note-time">
          {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm')}
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: '编辑',
                onClick: () => startEditNote(note),
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: '删除',
                onClick: showDeleteConfirm,
              },
              {
                type: 'divider',
              },
              {
                key: 'info',
                className: 'note-info-item',
                label: (
                  <div className="note-info">
                    <div>{getWordCount(note.content)} 字</div>
                    <div>
                      创建于 {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm')}
                    </div>
                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                      <div>
                        最后编辑于{' '}
                        {dayjs(note.updatedAt).format('YYYY-MM-DD HH:mm')}
                      </div>
                    )}
                  </div>
                ),
              },
            ],
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <MoreOutlined className="note-more-btn" />
        </Dropdown>
      </div>
      <div className="note-content">
        <MarkdownView content={note.content} />
      </div>
      {note.attachments?.length > 0 && (
        <div className="note-attachments">
          {note.attachments.map((att, index) => (
            <div key={index} className="attachment-item">
              {att.mimeType.startsWith('image/') ? (
                <div className="image-preview">
                  <img src={att.url} alt={att.filename} />
                </div>
              ) : att.mimeType.startsWith('video/') ? (
                <div className="video-preview">
                  <video controls>
                    <source src={att.url} type={att.mimeType} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : att.mimeType.startsWith('audio/') ? (
                <div className="audio-preview">
                  <audio controls>
                    <source src={att.url} type={att.mimeType} />
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              ) : (
                <div className="file-preview">
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    {att.filename}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {note.tags?.length > 0 && (
        <div className="note-tags">
          {note.tags.map((tag) => (
            <span key={tag} className="note-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      {contextHolder}
    </Card>
  );
};
