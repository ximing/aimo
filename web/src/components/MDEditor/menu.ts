import { EditorState } from "prosemirror-state";
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { MenuItem } from "./types";
import { icons } from "./icons";
import { uploadAttachments } from "@/api/notes";

export function buildMenuItems(schema: any): MenuItem[] {
  const markActive = (state: EditorState, type: any) => {
    const { from, $from, to, empty } = state.selection;
    if (empty) return type.isInSet(state.storedMarks || $from.marks());
    return state.doc.rangeHasMark(from, to, type);
  };

  return [
    {
      id: "bold",
      title: "加粗",
      icon: icons.bold,
      active: (state) => markActive(state, schema.marks.strong),
      run: toggleMark(schema.marks.strong),
    },
    {
      id: "italic",
      title: "斜体",
      icon: icons.italic,
      active: (state) => markActive(state, schema.marks.em),
      run: toggleMark(schema.marks.em),
    },
    { type: "separator" },
    {
      id: "bullet_list",
      title: "无序列表",
      icon: icons.bulletList,
      active: (state) => {
        const { $from, to, node } = state.selection;
        if (node && node.type === schema.nodes.bullet_list) return true;
        return (
          to <= $from.end() && $from.parent.type === schema.nodes.bullet_list
        );
      },
      run: wrapInList(schema.nodes.bullet_list),
    },
    {
      id: "ordered_list",
      title: "有序列表",
      icon: icons.orderedList,
      active: (state) => {
        const { $from, to, node } = state.selection;
        if (node && node.type === schema.nodes.ordered_list) return true;
        return (
          to <= $from.end() && $from.parent.type === schema.nodes.ordered_list
        );
      },
      run: wrapInList(schema.nodes.ordered_list),
    },
    { type: "separator" },
    {
      id: "code_block",
      title: "代码块",
      icon: icons.codeBlock,
      active: (state) => {
        const { $from, to, node } = state.selection;
        if (node && node.type === schema.nodes.code_block) return true;
        return (
          to <= $from.end() && $from.parent.type === schema.nodes.code_block
        );
      },
      run: setBlockType(schema.nodes.code_block),
    },
    { type: "separator" },
    {
      id: "image",
      title: "插入图片",
      icon: icons.image,
      active: () => false,
      run: async (state, dispatch, view, options) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        input.onchange = async () => {
          const files = Array.from(input.files || []);
          if (files.length) {
            try {
              const formData = new FormData();
              files.forEach((file) => formData.append("files", file));
              const attachments = await uploadAttachments(formData);
              options?.onAttachmentsChange?.(attachments);
            } catch (error) {
              console.error("Upload failed:", error);
            }
          }
        };
        input.click();
        return true;
      },
    },
    {
      id: "video",
      title: "插入视频",
      icon: icons.video,
      active: () => false,
      run: async (state, dispatch, view, options) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "video/*";
        input.multiple = true;
        input.onchange = async () => {
          const files = Array.from(input.files || []);
          if (files.length) {
            try {
              const formData = new FormData();
              files.forEach((file) => formData.append("files", file));
              const attachments = await uploadAttachments(formData);
              options?.onAttachmentsChange?.(attachments);
            } catch (error) {
              console.error("Upload failed:", error);
            }
          }
        };
        input.click();
        return true;
      },
    },
    {
      id: "audio",
      title: "插入音频",
      icon: icons.audio,
      active: () => false,
      run: async (state, dispatch, view, options) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.multiple = true;
        input.onchange = async () => {
          const files = Array.from(input.files || []);
          if (files.length) {
            try {
              const formData = new FormData();
              files.forEach((file) => formData.append("files", file));
              const attachments = await uploadAttachments(formData);
              options?.onAttachmentsChange?.(attachments);
            } catch (error) {
              console.error("Upload failed:", error);
            }
          }
        };
        input.click();
        return true;
      },
    },
  ];
}
