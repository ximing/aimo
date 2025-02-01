import { Empty, Spin } from "antd";
import { Fragment } from "react";
import type { Attachment, Note } from "@/api/types";
import { NoteCard } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";
import type { MenuProps } from "antd";

interface NoteListProps {
  notes: Note[];
  isLoading: boolean;
  editingNoteId: number | null;
  editingContent: string;
  setEditingContent: (content: string) => void;
  handleUpdateNote: (noteId: number, content: string) => Promise<void>;
  setEditingNoteId: (id: number | null) => void;
  isPublishing: boolean;
  getMenuItems: (note: Note) => MenuProps["items"];
  renderFooter: () => React.ReactNode;
  editingAttachments: Attachment[];
  setEditingAttachments: (attachments: Attachment[]) => void;
  editingTags: string[];
  setEditingTags: (tags: string[]) => void;
}

export const NoteList = ({
  notes,
  isLoading,
  editingNoteId,
  editingContent,
  setEditingContent,
  handleUpdateNote,
  setEditingNoteId,
  isPublishing,
  getMenuItems,
  renderFooter,
  editingAttachments,
  setEditingAttachments,
  editingTags,
  setEditingTags,
}: NoteListProps) => {
  const renderNoteContent = (note: Note) => {
    if (editingNoteId === note.id) {
      return (
        <NoteEditor
          value={editingContent}
          onChange={setEditingContent}
          onPublish={() => handleUpdateNote(note.id, editingContent)}
          onCancel={() => setEditingNoteId(null)}
          loading={isPublishing}
          attachments={editingAttachments}
          onAttachmentsChange={setEditingAttachments}
          onTagsChange={setEditingTags}
        />
      );
    }

    return <NoteCard note={note} menuItems={getMenuItems(note)} />;
  };

  if (isLoading && !notes.length) {
    return (
      <div className="notes-loading">
        <Spin />
        <span>加载中...</span>
      </div>
    );
  }

  if (!notes.length) {
    return <Empty description="暂无笔记" />;
  }

  return (
    <>
      {notes.map((note) => (
        <Fragment key={note.id}>{renderNoteContent(note)}</Fragment>
      ))}
      {renderFooter()}
    </>
  );
};
