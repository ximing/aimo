import type { AttachmentItem } from '../components/attachment-uploader';
import type { MemoListItemDto } from '@aimo/dto';

/**
 * 草稿数据结构
 */
export interface DraftData {
  content: string;
  categoryId: string | null;
  isPublic: boolean;
  tags: string[];
  attachments: AttachmentItem[];
  relations: MemoListItemDto[];
  timestamp: number; // 保存时间戳
}

/**
 * DraftService - 草稿管理服务
 * 负责将编辑中的内容保存到 localStorage，防止刷新丢失
 */
export class DraftService {
  private readonly DRAFT_KEY_PREFIX = 'memo_draft_';
  private readonly CREATE_DRAFT_KEY = 'memo_draft_create';

  /**
   * 保存草稿
   * @param mode 编辑模式 (create/edit)
   * @param memoId 编辑模式下的 memo ID
   * @param data 草稿数据
   */
  saveDraft(mode: 'create' | 'edit', data: DraftData, memoId?: string): void {
    const key = this.getDraftKey(mode, memoId);
    const draftWithTimestamp: DraftData = {
      ...data,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(key, JSON.stringify(draftWithTimestamp));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  /**
   * 获取草稿
   * @param mode 编辑模式 (create/edit)
   * @param memoId 编辑模式下的 memo ID
   * @returns 草稿数据，如果不存在则返回 null
   */
  getDraft(mode: 'create' | 'edit', memoId?: string): DraftData | null {
    const key = this.getDraftKey(mode, memoId);
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft = JSON.parse(stored) as DraftData;

      // 检查草稿是否过期（超过 7 天自动清除）
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天
      if (Date.now() - draft.timestamp > MAX_AGE) {
        this.clearDraft(mode, memoId);
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to get draft:', error);
      return null;
    }
  }

  /**
   * 清除草稿
   * @param mode 编辑模式 (create/edit)
   * @param memoId 编辑模式下的 memo ID
   */
  clearDraft(mode: 'create' | 'edit', memoId?: string): void {
    const key = this.getDraftKey(mode, memoId);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  /**
   * 检查是否存在草稿
   * @param mode 编辑模式 (create/edit)
   * @param memoId 编辑模式下的 memo ID
   * @returns 是否存在草稿
   */
  hasDraft(mode: 'create' | 'edit', memoId?: string): boolean {
    return this.getDraft(mode, memoId) !== null;
  }

  /**
   * 获取草稿的存储 key
   */
  private getDraftKey(mode: 'create' | 'edit', memoId?: string): string {
    if (mode === 'create') {
      return this.CREATE_DRAFT_KEY;
    }
    if (!memoId) {
      throw new Error('memoId is required for edit mode');
    }
    return `${this.DRAFT_KEY_PREFIX}edit_${memoId}`;
  }

  /**
   * 清除所有过期的草稿（可在应用启动时调用）
   */
  clearExpiredDrafts(): void {
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天
    const now = Date.now();

    try {
      // 遍历所有 localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.DRAFT_KEY_PREFIX) || key === this.CREATE_DRAFT_KEY) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const draft = JSON.parse(stored) as DraftData;
              if (now - draft.timestamp > MAX_AGE) {
                localStorage.removeItem(key);
              }
            } catch {
              // 如果解析失败，也删除这个损坏的草稿
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to clear expired drafts:', error);
    }
  }
}
