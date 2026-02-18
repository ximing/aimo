import { view, useService } from '@rabjs/react';
import { MemoEditorForm } from '../../../components/memo-editor-form';
import { MemoService, UNCATEGORIZED_CATEGORY_ID } from '../../../services/memo.service';

/**
 * MemoEditor - 创建新 memo 的编辑器组件
 * 这是 MemoEditorForm 的简单包装器，专门用于创建模式
 * 自动传入当前筛选的类别作为默认类别
 */
export const MemoEditor = view(() => {
  const memoService = useService(MemoService);

  const defaultCategoryId =
    memoService.categoryFilter === UNCATEGORIZED_CATEGORY_ID ? null : memoService.categoryFilter;

  return <MemoEditorForm mode="create" defaultCategoryId={defaultCategoryId} />;
});
