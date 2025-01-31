import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import {
  Input,
  Select,
  Card,
  message,
  Dropdown,
  Modal,
  Button,
  Spin,
  Empty,
} from "antd";
import { useNoteStore } from "@/stores/noteStore";
import MDEditor from "@/components/MDEditor";
import MarkdownView from "@/components/MarkdownView";
import {
  SearchOutlined,
  MacCommandOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./style.css";
import { Note } from "@/api/types";
import { useSpring, animated } from "@react-spring/web";
import { useScroll } from "react-use";
import type { MenuProps } from "antd";

const SearchBar = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="search-wrapper">
    <SearchOutlined className="search-icon" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="搜索笔记..."
      bordered={false}
      className="search-input"
    />
    <div className="search-shortcut">
      <MacCommandOutlined />
      <span>K</span>
    </div>
  </div>
);

export default function Notes() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const {
    error,
    sortBy,
    searchText,
    fetchNotes,
    addNote,
    setSortBy,
    setSearchText,
    filteredNotes,
    deleteNote,
    updateNote,
    isLoading,
    hasMore,
    newNoteContent,
    setNewNoteContent,
    currentPage,
    setCurrentPage,
    refreshHeatmap,
  } = useNoteStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [noteTags, setNoteTags] = useState<string[]>([]);

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
      });
      await fetchNotes();
      // 刷新热力图数据
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
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  const handleUpdateNote = async (noteId: number, content: string) => {
    setIsPublishing(true);
    try {
      await updateNote(noteId, { content });
      setEditingNoteId(null);
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

  const renderNoteContent = (note: Note) => {
    if (editingNoteId === note.id) {
      return (
        <div className="note-editor-wrapper">
          <MDEditor
            value={editingContent}
            onChange={(content) => {
              setEditingContent(content);
            }}
            toolbar={
              <div className="editor-actions">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => handleUpdateNote(note.id, editingContent)}
                  loading={isPublishing}
                >
                  发布
                </Button>
                <Button
                  onClick={() => setEditingNoteId(null)}
                  disabled={isPublishing}
                >
                  取消
                </Button>
              </div>
            }
          />
        </div>
      );
    }

    return (
      <Card className="note-card">
        <div className="note-header">
          <div className="note-time">
            {dayjs(note.createdAt).format("YYYY-MM-DD HH:mm")}
          </div>
          <Dropdown
            menu={{ items: getMenuItems(note) }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <MoreOutlined className="note-more-btn" />
          </Dropdown>
        </div>
        <div className="note-content">
          <MarkdownView content={note.content} />
        </div>
      </Card>
    );
  };

  // 检查新建内容是否为空
  const isNewNoteEmpty = !newNoteContent || !newNoteContent.trim();

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

  const editorStyle = useSpring({
    height: Math.max(
      MIN_EDITOR_HEIGHT,
      MAX_EDITOR_HEIGHT - Math.max(0, scrollY * 0.8) // 使用更平滑的缩放系数
    ),
    config: {
      tension: 180, // 降低张力
      friction: 24, // 增加摩擦力
      clamp: false, // 允许轻微的弹性
      mass: 1.2, // 增加质量使动画更有重量感
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
          <Select value={sortBy} onChange={setSortBy} style={{ width: 120 }}>
            <Select.Option value="newest">最新优先</Select.Option>
            <Select.Option value="oldest">最早优先</Select.Option>
          </Select>
          <SearchBar value={searchText} onChange={setSearchText} />
        </div>
        <animated.div style={editorStyle} className="note-editor">
          <MDEditor
            value={newNoteContent}
            onChange={setNewNoteContent}
            onTagsChange={setNoteTags}
            onPublish={handleCreateNote}
            placeholder="写点什么..."
            disabled={isNewNoteEmpty}
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
          {isLoading && !filteredNotes().length ? (
            <div className="notes-loading">
              <Spin />
              <span>加载中...</span>
            </div>
          ) : filteredNotes().length ? (
            <>
              {filteredNotes().map((note) => (
                <Fragment key={note.id}>{renderNoteContent(note)}</Fragment>
              ))}
              {renderFooter()}
            </>
          ) : (
            <Empty description="暂无笔记" />
          )}
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
