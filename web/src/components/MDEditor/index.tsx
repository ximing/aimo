import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import {
  SendOutlined,
  PictureOutlined,
  FontSizeOutlined,
  UnorderedListOutlined,
  NumberOutlined,
} from "@ant-design/icons";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser, DOMSerializer } from "prosemirror-model";
import { schema } from "prosemirror-markdown";
import { addListNodes } from "prosemirror-schema-list";
import { keymap } from "prosemirror-keymap";
import { MenuItem } from "./types";
import { buildMenuItems } from "./menu";
import { buildKeymap } from "./keymap";
import { buildInputRules } from "./inputrules";
import "prosemirror-view/style/prosemirror.css";
import "./styles.css";

interface MDEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onPublish?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  toolbar?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

// 扩展基础 schema，添加列表支持
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks,
});

function MenuBar({
  items,
  editorView,
}: {
  items: MenuItem[];
  editorView: EditorView;
}) {
  return (
    <div className="editor-menubar">
      {items.map((item, i) => {
        if (item.type === "separator") {
          return <div key={i} className="menubar-separator" />;
        }
        const isActive = item.active?.(editorView.state);
        return (
          <button
            key={item.id}
            className={`menubar-item ${isActive ? "is-active" : ""}`}
            title={item.title}
            onMouseDown={(e) => {
              e.preventDefault();
              item.run?.(editorView.state, editorView.dispatch);
            }}
            dangerouslySetInnerHTML={{ __html: item.icon || "" }}
          />
        );
      })}
    </div>
  );
}

export default function MDEditor({
  value = "",
  onChange,
  onPublish,
  placeholder = "写点什么...",
  readOnly = false,
  toolbar,
  disabled = false,
  loading = false,
}: MDEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const menuItems = buildMenuItems(mySchema);
  const [isEditorReady, setIsEditorReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // 创建初始文档
    const doc = DOMParser.fromSchema(mySchema).parse(
      document.createElement("div")
    );

    // 创建编辑器状态
    const state = EditorState.create({
      doc,
      schema: mySchema,
      plugins: [
        buildInputRules(mySchema),
        buildKeymap(mySchema),
        keymap({
          "Mod-Enter": () => {
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
          const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(
            newState.doc.content
          );
          const temp = document.createElement("div");
          temp.appendChild(fragment);
          onChange(temp.innerHTML);
        }
      },
      editable: () => !readOnly,
    });

    viewRef.current = view;
    setIsEditorReady(true);

    // 设置初始内容
    if (value) {
      const parser = DOMParser.fromSchema(mySchema);
      const element = document.createElement("div");
      element.innerHTML = value;
      const doc = parser.parse(element);
      view.dispatch(
        view.state.tr.replace(0, view.state.doc.content.size, doc.slice(0))
      );
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        setIsEditorReady(false);
      }
    };
  }, []);

  // 当 value prop 改变时更新编辑器内容
  useEffect(() => {
    if (!viewRef.current || !value) return;

    const currentContent = (() => {
      const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(
        viewRef.current.state.doc.content
      );
      const temp = document.createElement("div");
      temp.appendChild(fragment);
      return temp.innerHTML;
    })();

    if (currentContent !== value) {
      const parser = DOMParser.fromSchema(mySchema);
      const element = document.createElement("div");
      element.innerHTML = value;
      const doc = parser.parse(element);
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
  const isEmpty = !value || value === "<p></p>" || value === "<p><br></p>";

  return (
    <div className="md-editor">
      <div className="editor-main">
        <div
          ref={editorRef}
          className="editor-content"
          data-placeholder={placeholder}
        />
      </div>
      <div className="editor-toolbar">
        <div className="editor-menubar">
          {isEditorReady && viewRef.current && (
            <MenuBar items={menuItems} editorView={viewRef.current} />
          )}
        </div>
        {toolbar ||
          (onPublish && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={onPublish}
              disabled={disabled}
              loading={loading}
            >
              发布
            </Button>
          ))}
      </div>
    </div>
  );
}
