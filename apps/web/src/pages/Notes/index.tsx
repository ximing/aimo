import { useState, useEffect, useCallback, useRef } from 'react';
import { Select, message, Modal, Spin } from 'antd';
import { useNoteStore } from '@/stores/noteStore';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSpring, animated } from '@react-spring/web';
import { useScroll } from 'react-use';
import type { Attachment, Note } from '@/api/types';
import type { MenuProps } from 'antd';
import { SearchBar } from './components/SearchBar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import './style.css';

export default function Notes() {
  const {
    notes,
    error,
    sortBy,
    isLoading,
    hasMore,
    newNoteContent,
    currentPage,
    newNoteAttachments,
    isPublishing,
    fetchNotes,
    addNote,
    setSortBy,
    setNewNoteContent,
    setNewNoteTags,
    setNewNoteAttachments,
  } = useNoteStore();

  // 添加一个 loading 锁，防止重复请求
  const loadingRef = useRef(false);

  // 处理错误提示
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  const handleCreateNote = async () => {
    if (!newNoteContent) {
      message.warning('请输入笔记内容');
      return;
    }

    try {
      await addNote();
      message.success('笔记创建成功');
    } catch (error) {
      message.error('创建笔记失败');
    }
  };

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

  // 滚动处理
  const scrollRef = useRef<HTMLDivElement>(null);
  const { y: scrollY } = useScroll(scrollRef as React.RefObject<HTMLElement>);

  // 编辑器高度动画
  const MIN_EDITOR_HEIGHT = 120;
  const MAX_EDITOR_HEIGHT = 190;
  const ATTACHMENT_HEIGHT = 150;

  const editorStyle = useSpring({
    height: Math.max(
      MIN_EDITOR_HEIGHT,
      (newNoteAttachments.length > 0
        ? MAX_EDITOR_HEIGHT + ATTACHMENT_HEIGHT
        : MAX_EDITOR_HEIGHT) - Math.max(0, scrollY * 0.8)
    ),
    config: {
      tension: 180,
      friction: 24,
      clamp: false,
      mass: 1.2,
    },
  });

  // 处理滚动加载
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (!isLoading && !loadingRef.current && hasMore) {
        loadingRef.current = true;
        fetchNotes(currentPage + 1).finally(() => {
          loadingRef.current = false;
        });
      }
    }
  }, [isLoading, hasMore, fetchNotes, currentPage]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="notes-container">
      <div className="notes-header">
        <div className="content-header">
          <SearchBar />
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
            onTagsChange={setNewNoteTags}
            onAttachmentsChange={setNewNoteAttachments}
            attachments={newNoteAttachments}
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
          <NoteList notes={notes} renderFooter={renderFooter} />
        </div>
      </div>
    </div>
  );
}
