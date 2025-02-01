import {
  wrapIn,
  setBlockType,
  chainCommands,
  toggleMark,
  exitCode,
  joinUp,
  joinDown,
  lift,
  selectParentNode,
} from 'prosemirror-commands';
import {
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem,
} from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import { undoInputRule } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';

const mac =
  typeof navigator != 'undefined'
    ? /Mac|iP(hone|[oa]d)/.test(navigator.platform)
    : false;

export function buildKeymap(schema: Schema) {
  const keys: { [key: string]: any } = {};

  // 基础编辑操作
  keys['Mod-z'] = undo;
  keys['Shift-Mod-z'] = redo;
  if (!mac) keys['Mod-y'] = redo;
  keys['Backspace'] = undoInputRule;
  keys['Alt-ArrowUp'] = joinUp;
  keys['Alt-ArrowDown'] = joinDown;
  keys['Mod-BracketLeft'] = lift;
  keys['Escape'] = selectParentNode;

  // 文本标记
  let type;
  if ((type = schema.marks.strong)) {
    keys['Mod-b'] = toggleMark(type);
    keys['Mod-B'] = toggleMark(type);
  }
  if ((type = schema.marks.em)) {
    keys['Mod-i'] = toggleMark(type);
    keys['Mod-I'] = toggleMark(type);
  }
  if ((type = schema.marks.code)) {
    keys['Mod-`'] = toggleMark(type);
  }

  // 列表操作
  if ((type = schema.nodes.bullet_list)) {
    keys['Shift-Ctrl-8'] = wrapInList(type);
  }
  if ((type = schema.nodes.ordered_list)) {
    keys['Shift-Ctrl-9'] = wrapInList(type);
  }
  if ((type = schema.nodes.list_item)) {
    keys['Enter'] = splitListItem(type);
    keys['Mod-['] = liftListItem(type);
    keys['Mod-]'] = sinkListItem(type);
  }

  // 块级操作
  if ((type = schema.nodes.blockquote)) {
    keys['Ctrl->'] = wrapIn(type);
  }
  if ((type = schema.nodes.paragraph)) {
    keys['Shift-Ctrl-0'] = setBlockType(type);
  }
  if ((type = schema.nodes.code_block)) {
    keys['Shift-Ctrl-\\'] = setBlockType(type);
  }
  if ((type = schema.nodes.heading)) {
    for (let i = 1; i <= 6; i++) {
      keys['Shift-Ctrl-' + i] = setBlockType(type, { level: i });
    }
  }

  // 换行和分隔符
  if ((type = schema.nodes.hard_break)) {
    const br = type;
    const cmd = chainCommands(exitCode, (state, dispatch) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
      }
      return true;
    });
    keys['Mod-Enter'] = cmd;
    keys['Shift-Enter'] = cmd;
    if (mac) keys['Ctrl-Enter'] = cmd;
  }
  if ((type = schema.nodes.horizontal_rule)) {
    const hr = type;
    keys['Mod-_'] = (state: any, dispatch: any) => {
      if (dispatch) {
        dispatch(state.tr.replaceSelectionWith(hr.create()).scrollIntoView());
      }
      return true;
    };
  }

  return keymap(keys);
}
