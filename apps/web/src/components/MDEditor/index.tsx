import React, { useState } from 'react';
import { useEffect, useRef } from 'react';
import { Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { MenuItem } from './types';
import { buildMenuItems } from './menu';
import { buildKeymap } from './keymap';
import { buildInputRules } from './inputrules';
import { mySchema, myParser, mySerializer } from './schema';
import 'prosemirror-view/style/prosemirror.css';
import './styles.css';
import { icons } from './icons';
import { CloseOutlined } from '@ant-design/icons';
import { Attachment } from '@/api/types';

interface MDEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onPublish?: () => void;
  onTagsChange?: (tags: string[]) => void;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  attachments?: Attachment[];
  placeholder?: string;
  readOnly?: boolean;
  toolbar?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

function MenuBar({
  items,
  editorView,
  onAttachmentsChange,
}: {
  items: MenuItem[];
  editorView: EditorView;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
}) {
  return (
    <div className="editor-menubar">
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={i} className="menubar-separator" />;
        }
        const isActive = item.active?.(editorView.state);
        return (
          <button
            key={item.id}
            className={`menubar-item ${isActive ? 'is-active' : ''}`}
            title={item.title}
            onMouseDown={(e) => {
              e.preventDefault();
              item.run?.(editorView.state, editorView.dispatch, editorView, {
                onAttachmentsChange: onAttachmentsChange,
              });
            }}
            dangerouslySetInnerHTML={{ __html: item.icon || '' }}
          />
        );
      })}
    </div>
  );
}

export default function MDEditor({
  value = '',
  onChange,
  onPublish,
  onTagsChange,
  onAttachmentsChange,
  attachments = [],
  placeholder = '写点什么...',
  readOnly = false,
  toolbar,
  disabled = false,
  loading = false,
}: MDEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const menuItems = buildMenuItems(mySchema);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // 收集文档中的所有标签
  const collectTags = (state: EditorState) => {
    const tags: string[] = [];
    state.doc.descendants((node) => {
      if (node.type.name === 'tag') {
        tags.push(node.attrs.name);
      }
    });
    return Array.from(new Set(tags)); // 去重
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // 创建初始文档
    const doc = myParser.parse(value || '');

    // 创建编辑器状态
    const state = EditorState.create({
      doc,
      schema: mySchema,
      plugins: [
        history(),
        buildInputRules(mySchema),
        buildKeymap(mySchema),
        keymap(baseKeymap),
        keymap({
          'Mod-Enter': () => {
            onPublish?.();
            return true;
          },
        }),
      ],
    });

    // 创建编辑器视图
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);

        if (onChange) {
          const content = mySerializer.serialize(newState.doc);
          onChange(content);
        }

        // 当内容变化时，通知标签变化
        if (onTagsChange) {
          onTagsChange(collectTags(newState));
        }
      },
      editable: () => !readOnly,
    });

    viewRef.current = view;
    setIsEditorReady(true);

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        setIsEditorReady(false);
      }
    };
  }, []);

  // 当 value prop 改变时更新编辑器内容
  useEffect(() => {
    if (!viewRef.current) return;

    const currentContent = mySerializer.serialize(viewRef.current.state.doc);
    if (currentContent !== value) {
      const doc = myParser.parse(value || '');
      viewRef.current.dispatch(
        viewRef.current.state.tr.replace(
          0,
          viewRef.current.state.doc.content.size,
          doc.slice(0)
        )
      );
    }
  }, [value]);

  // 检查内容是否为空
  const isEmpty = !value || value.trim() === '';

  const removeAttachment = (index: number) => {
    onAttachmentsChange?.(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="md-editor">
      <div className="editor-main">
        <div
          ref={editorRef}
          className="editor-content"
          data-placeholder={placeholder}
        />
      </div>
      {attachments.length > 0 && (
        <div className="md-editor-attachments">
          {attachments.map((att, index) => (
            <div key={index} className="attachment-preview">
              {att.mimeType.startsWith('image/') && (
                <div className="image-preview-wrapper">
                  <img
                    src={att.url}
                    alt={att.filename}
                    className="image-preview"
                  />
                </div>
              )}
              {att.mimeType.startsWith('video/') && (
                <div className="video-preview">
                  <div className="preview-icon">{icons.video}</div>
                  <span className="preview-filename">{att.filename}</span>
                </div>
              )}
              {att.mimeType.startsWith('audio/') && (
                <div className="audio-preview">
                  <div className="preview-icon">{icons.audio}</div>
                  <span className="preview-filename">{att.filename}</span>
                </div>
              )}
              <button
                className="remove-attachment"
                onClick={() => removeAttachment(index)}
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="editor-footer">
        <div className="editor-toolbar">
          {isEditorReady && viewRef.current && (
            <MenuBar
              items={menuItems}
              editorView={viewRef.current}
              onAttachmentsChange={(_attachments) => {
                onAttachmentsChange?.([...attachments, ..._attachments]);
              }}
            />
          )}
        </div>
        <div className="editor-actions">
          {toolbar || (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={onPublish}
              disabled={disabled || isEmpty}
              loading={loading}
            >
              发布
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
