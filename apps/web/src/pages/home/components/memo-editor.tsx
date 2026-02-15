import { view } from '@rabjs/react';
import { MemoEditorForm } from '../../../components/memo-editor-form';

/**
 * MemoEditor - 创建新 memo 的编辑器组件
 * 这是 MemoEditorForm 的简单包装器，专门用于创建模式
 */
export const MemoEditor = view(() => {
  return <MemoEditorForm mode="create" />;
});
