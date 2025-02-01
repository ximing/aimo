import { Attachment } from '@/api/types';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export interface MenuItem {
  id?: string;
  title?: string;
  icon?: string;
  type?: 'separator';
  active?: (state: EditorState) => boolean;
  run?: (
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    view: EditorView,
    options?: {
      onAttachmentsChange?: (attachments: Attachment[]) => void;
    }
  ) => boolean;
}
