import { useState, useEffect, useCallback, useRef } from "react";
import { Select, message, Modal, Spin } from "antd";
import { useNoteStore } from "@/stores/noteStore";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSpring, animated } from "@react-spring/web";
import { useScroll } from "react-use";
import type { Attachment, Note } from "@/api/types";
import type { MenuProps } from "antd";
import { SearchBar } from "./components/SearchBar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import "./style.css";

export default function Notes() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [editingAttachments, setEditingAttachments] = useState<Attachment[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const {
    notes,
    error,
    sortBy,
    searchText,
    fetchNotes,
    addNote,
    setSortBy,
    setSearchText,
    deleteNote,
    updateNote,
    isLoading,
    hasMore,
    newNoteContent,
    setNewNoteContent,
    currentPage,
    setCurrentPage,
    refreshHeatmap,
    searchMode,
    setSearchMode,
    startDate,
    endDate,
  } = useNoteStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // 添加一个 loading 锁，防止重复请求
  const loadingRef = useRef(false);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleCreateNote = async () => {
    if (!newNoteContent) {
      message.warning("请输入笔记内容");
      return;
    }

    setIsPublishing(true);
    try {
      await addNote({
        content: newNoteContent,
        tags: noteTags,
        isPublic: false,
        attachments,
      });
      setAttachments([]);
      await fetchNotes();
      if (refreshHeatmap) {
        refreshHeatmap();
      }
      message.success("笔记创建成功");
    } catch (error) {
      message.error("创建笔记失败");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditingAttachments(note.attachments);
    setEditingTags(note.tags);
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  const handleUpdateNote = async (noteId: number, content: string) => {
    setIsPublishing(true);
    try {
      await updateNote(noteId, {
        content,
        attachments: editingAttachments,
        tags: editingTags,
      });
      setEditingNoteId(null);
      setEditingContent("");
      setEditingAttachments([]);
      setEditingTags([]);
      await fetchNotes();
      message.success("笔记更新成功");
    } catch (error) {
      message.error("更新失败");
    } finally {
      setIsPublishing(false);
    }
  };

  const getWordCount = (content: string) => {
    // 移除 HTML 标签，只统计实际文字
    const text = content.replace(/<[^>]+>/g, "");
    return text.length;
  };

  const getMenuItems = (note: Note): MenuProps["items"] => [
    {
      key: "edit",
      icon: <EditOutlined />,
      label: "编辑",
      onClick: () => handleEditNote(note),
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "删除",
      onClick: () => handleDeleteNote(note),
    },
    {
      type: "divider",
    },
    {
      key: "info",
      className: "note-info-item",
      label: (
        <div className="note-info">
          <div>{getWordCount(note.content)} 字</div>
          <div>创建于 {dayjs(note.createdAt).format("YYYY-MM-DD HH:mm")}</div>
          {note.updatedAt && note.updatedAt !== note.createdAt && (
            <div>
              最后编辑于 {dayjs(note.updatedAt).format("YYYY-MM-DD HH:mm")}
            </div>
          )}
        </div>
      ),
    },
  ];

  const renderFooter = () => {
    if (isLoading) {
      return (
        <div className="notes-loading">
          <Spin size="small" />
          <span>加载中...</span>
        </div>
      );
    }
    if (!hasMore) {
      return <div className="notes-end">没有更多笔记了</div>;
    }
    return null;
  };

  // 添加滚动处理
  const scrollRef = useRef<HTMLDivElement>(null);
  const { y: scrollY } = useScroll(scrollRef as React.RefObject<HTMLElement>);

  // 编辑器高度动画
  const MIN_EDITOR_HEIGHT = 120;
  const MAX_EDITOR_HEIGHT = 190;
  const ATTACHMENT_HEIGHT = 150; // 附件区域的高度

  const editorStyle = useSpring({
    height: Math.max(
      MIN_EDITOR_HEIGHT,
      // 如果有附件，增加额外高度
      (attachments.length > 0 ? MAX_EDITOR_HEIGHT + ATTACHMENT_HEIGHT : MAX_EDITOR_HEIGHT) - 
      Math.max(0, scrollY * 0.8)
    ),
    config: {
      tension: 180,
      friction: 24,
      clamp: false,
      mass: 1.2,
    },
  });

  // 添加处理滚动加载的函数
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // 当距离底部小于 50px 时触发加载
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (!isLoading && !loadingRef.current && hasMore) {
        loadingRef.current = true; // 设置加载锁
        fetchNotes(currentPage + 1).finally(() => {
          loadingRef.current = false; // 请求完成后释放加载锁
        });
      }
    }
  }, [isLoading, hasMore, fetchNotes, currentPage]);

  // 监听搜索文本变化，重置分页
  useEffect(() => {
    setCurrentPage(1);
    fetchNotes(1);
  }, [searchText, sortBy]);

  // 添加滚动事件监听
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="notes-container">
      <div className="notes-header">
        <div className="content-header">
          <SearchBar
            value={searchText}
            onChange={setSearchText}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            dateRange={[startDate, endDate]}
            onDateRangeChange={(dates) => setDateRange(dates[0], dates[1])}
          />
          <Select value={sortBy} onChange={setSortBy} style={{ width: 120 }}>
            <Select.Option value="newest">最新优先</Select.Option>
            <Select.Option value="oldest">最早优先</Select.Option>
          </Select>
        </div>
        <animated.div style={editorStyle} className="note-editor">
          <NoteEditor
            value={newNoteContent}
            onChange={setNewNoteContent}
            onPublish={handleCreateNote}
            onTagsChange={setNoteTags}
            onAttachmentsChange={setAttachments}
            attachments={attachments}
            loading={isPublishing}
          />
        </animated.div>
      </div>

      <div
        className="notes-scroll-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="note-list">
          <NoteList
            notes={notes}
            isLoading={isLoading}
            editingNoteId={editingNoteId}
            editingContent={editingContent}
            setEditingContent={setEditingContent}
            handleUpdateNote={handleUpdateNote}
            setEditingNoteId={setEditingNoteId}
            isPublishing={isPublishing}
            getMenuItems={getMenuItems}
            renderFooter={renderFooter}
            editingAttachments={editingAttachments}
            setEditingAttachments={setEditingAttachments}
            editingTags={editingTags}
            setEditingTags={setEditingTags}
          />
        </div>
      </div>

      <Modal
        title="删除笔记"
        open={showDeleteModal}
        onOk={async () => {
          if (noteToDelete) {
            try {
              await deleteNote(noteToDelete.id);
              message.success("笔记已删除");
              setShowDeleteModal(false);
              setNoteToDelete(null);
            } catch (error) {
              message.error("删除失败");
            }
          }
        }}
        onCancel={() => {
          setShowDeleteModal(false);
          setNoteToDelete(null);
        }}
      >
        <p>确定要删除这条笔记吗？</p>
      </Modal>
    </div>
  );
}
