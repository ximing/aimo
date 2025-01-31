import { EditorState, Transaction } from "prosemirror-state";

export interface MenuItem {
  id?: string;
  title?: string;
  icon?: string;
  type?: "separator";
  active?: (state: EditorState) => boolean;
  run?: (state: EditorState, dispatch: (tr: Transaction) => void) => boolean;
} 