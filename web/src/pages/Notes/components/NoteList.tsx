import { Empty, Spin } from "antd";
import { Fragment } from "react";
import type { Note } from "@/api/types";
import { NoteCard } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";
import type { MenuProps } from "antd";
import { useNoteStore } from "@/stores/noteStore";

interface NoteListProps {
  notes: Note[];
  getMenuItems: (note: Note) => MenuProps["items"];
  renderFooter: () => React.ReactNode;
}

export const NoteList = ({
  notes,
  getMenuItems,
  renderFooter,
}: NoteListProps) => {
  const {
    isLoading,
    editingNoteId,
    editingContent,
    editingAttachments,
    isPublishing,
    setEditingContent,
    setEditingAttachments,
    setEditingTags,
    updateNote,
    cancelEditNote,
  } = useNoteStore();

  const renderNoteContent = (note: Note) => {
    if (editingNoteId === note.id) {
      return (
        <NoteEditor
          value={editingContent}
          onChange={setEditingContent}
          onPublish={() => updateNote(note.id)}
          onCancel={cancelEditNote}
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
