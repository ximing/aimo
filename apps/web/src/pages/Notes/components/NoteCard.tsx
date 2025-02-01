import { Card, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Note } from '@/api/types';
import type { MenuProps } from 'antd';
import MarkdownView from '@/components/MarkdownView';

interface NoteCardProps {
  note: Note;
  menuItems: MenuProps['items'];
}

export const NoteCard = ({ note, menuItems }: NoteCardProps) => {
  return (
    <Card className="note-card">
      <div className="note-header">
        <div className="note-time">
          {dayjs(note.createdAt).format('YYYY-MM-DD HH:mm')}
        </div>
        <Dropdown
          menu={{ items: menuItems }}
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
    </Card>
  );
};
