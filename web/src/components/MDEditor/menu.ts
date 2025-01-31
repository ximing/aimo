import { EditorState } from "prosemirror-state";
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import { MenuItem } from "./types";
import { icons } from "./icons";

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
    {
      id: "code",
      title: "代码",
      icon: icons.code,
      active: (state) => markActive(state, schema.marks.code),
      run: toggleMark(schema.marks.code),
    },
    { type: "separator" },
    {
      id: "bullet_list",
      title: "无序列表",
      icon: icons.bulletList,
      active: (state) => {
        const { $from, to, node } = state.selection;
        if (node && node.type === schema.nodes.bullet_list) return true;
        return to <= $from.end() && $from.parent.type === schema.nodes.bullet_list;
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
        return to <= $from.end() && $from.parent.type === schema.nodes.ordered_list;
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
        return to <= $from.end() && $from.parent.type === schema.nodes.code_block;
      },
      run: setBlockType(schema.nodes.code_block),
    },
  ];
} 