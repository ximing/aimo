import { Service, resolve } from '@rabjs/react';
import type {
  GenerateTagsRequestDto,
  UpdateMemoTagsRequestDto,
  MemoWithAttachmentsDto,
} from '@aimo/dto';
import * as aiApi from '../api/ai';
import { MemoService } from './memo.service';
import { toast } from './toast.service';

/**
 * Type of AI tool - used for dynamic modal rendering
 */
export type AIToolType =
  | 'generate-tags'
  | 'summarize'
  | 'translate'
  | 'expand'
  | 'grammar-check';

/**
 * Modal state for AI tools
 */
export interface AIModalState {
  isOpen: boolean;
  toolType: AIToolType | null;
  memoId: string | null;
  memoContent: string | null;
}

/**
 * State for tag generation feature
 */
export interface TagGenerationState {
  isLoading: boolean;
  suggestedTags: string[];
  selectedTags: string[];
  error: string | null;
}

/**
 * AI Tool Definition - configuration for each AI tool
 * This structure allows easy extension with new AI tools
 */
export interface AIToolDefinition {
  id: AIToolType;
  name: string;
  description: string;
  icon: string;
  component?: string; // Component name for dynamic rendering
}

/**
 * AI Tools Service
 * Manages AI tool state, configuration, and operations
 * Designed for easy extension with new AI tools
 */
export class AIToolsService extends Service {
  // Modal state
  modal: AIModalState = {
    isOpen: false,
    toolType: null,
    memoId: null,
    memoContent: null,
  };

  // Tag generation state
  tagGeneration: TagGenerationState = {
    isLoading: false,
    suggestedTags: [],
    selectedTags: [],
    error: null,
  };

  // Available AI tools configuration
  // Add new tools here to extend functionality
  tools: AIToolDefinition[] = [
    {
      id: 'generate-tags',
      name: '智能添加标签',
      description: 'AI 分析笔记内容，自动生成相关标签建议',
      icon: 'Tags',
      component: 'TagGeneratorModal',
    },
    // Future tools - reserved slots:
    // {
    //   id: 'summarize',
    //   name: '智能总结',
    //   description: 'AI 生成笔记内容摘要',
    //   icon: 'FileText',
    //   component: 'SummarizeModal',
    // },
    // {
    //   id: 'translate',
    //   name: '翻译',
    //   description: '将笔记内容翻译成其他语言',
    //   icon: 'Languages',
    //   component: 'TranslateModal',
    // },
  ];

  // Loading state for API calls
  isSaving = false;

  /**
   * Open AI tool selection modal
   */
  openToolSelector(memoId: string, memoContent: string) {
    this.modal = {
      isOpen: true,
      toolType: null,
      memoId,
      memoContent,
    };
  }

  /**
   * Select a specific AI tool and open its modal
   */
  selectTool(toolType: AIToolType) {
    this.modal.toolType = toolType;

    // Initialize tool-specific state
    if (toolType === 'generate-tags') {
      this.tagGeneration = {
        isLoading: false,
        suggestedTags: [],
        selectedTags: [],
        error: null,
      };
    }
  }

  /**
   * Close AI modal and reset state
   */
  closeModal() {
    this.modal = {
      isOpen: false,
      toolType: null,
      memoId: null,
      memoContent: null,
    };
    this.tagGeneration = {
      isLoading: false,
      suggestedTags: [],
      selectedTags: [],
      error: null,
    };
  }

  /**
   * Go back to tool selection from a specific tool
   */
  backToToolSelector() {
    this.modal.toolType = null;
    this.tagGeneration = {
      isLoading: false,
      suggestedTags: [],
      selectedTags: [],
      error: null,
    };
  }

  /**
   * Generate tags using AI
   */
  async generateTags(content: string) {
    this.tagGeneration.isLoading = true;
    this.tagGeneration.error = null;

    try {
      const request: GenerateTagsRequestDto = {
        content,
        memoId: this.modal.memoId || undefined,
      };

      const response = await aiApi.generateTags(request);

      if (response.code === 0 && response.data) {
        this.tagGeneration.suggestedTags = response.data.tags;
        // Default select all tags
        this.tagGeneration.selectedTags = [...response.data.tags];
        return { success: true, tags: response.data.tags };
      } else {
        this.tagGeneration.error = '生成标签失败';
        return { success: false, message: '生成标签失败' };
      }
    } catch (error: unknown) {
      console.error('Generate tags error:', error);
      const message = error instanceof Error ? error.message : '生成标签失败';
      this.tagGeneration.error = message;
      return { success: false, message };
    } finally {
      this.tagGeneration.isLoading = false;
    }
  }

  /**
   * Toggle tag selection
   */
  toggleTagSelection(tag: string) {
    const index = this.tagGeneration.selectedTags.indexOf(tag);
    if (index > -1) {
      this.tagGeneration.selectedTags.splice(index, 1);
    } else {
      this.tagGeneration.selectedTags.push(tag);
    }
  }

  /**
   * Select all suggested tags
   */
  selectAllTags() {
    this.tagGeneration.selectedTags = [...this.tagGeneration.suggestedTags];
  }

  /**
   * Deselect all tags
   */
  deselectAllTags() {
    this.tagGeneration.selectedTags = [];
  }

  /**
   * Add a custom tag
   */
  addCustomTag(tag: string) {
    const normalizedTag = tag.trim().toLowerCase();
    if (
      normalizedTag &&
      !this.tagGeneration.selectedTags.some(
        (t) => t.toLowerCase() === normalizedTag
      )
    ) {
      this.tagGeneration.selectedTags.push(tag.trim());
      return true;
    }
    return false;
  }

  /**
   * Remove a tag from selection
   */
  removeTag(tag: string) {
    const index = this.tagGeneration.selectedTags.indexOf(tag);
    if (index > -1) {
      this.tagGeneration.selectedTags.splice(index, 1);
    }
  }

  /**
   * Delete a tag entirely (from both selection and suggestions)
   */
  deleteTag(tag: string) {
    // Remove from selectedTags
    const selectedIndex = this.tagGeneration.selectedTags.indexOf(tag);
    if (selectedIndex > -1) {
      this.tagGeneration.selectedTags.splice(selectedIndex, 1);
    }

    // Remove from suggestedTags
    const suggestedIndex = this.tagGeneration.suggestedTags.indexOf(tag);
    if (suggestedIndex > -1) {
      this.tagGeneration.suggestedTags.splice(suggestedIndex, 1);
    }
  }

  /**
   * Update a tag in the selection (for editing)
   */
  updateTag(oldTag: string, newTag: string) {
    const normalizedNewTag = newTag.trim().toLowerCase();
    const normalizedOldTag = oldTag.trim().toLowerCase();

    // Don't allow duplicates (case-insensitive)
    if (
      normalizedNewTag !== normalizedOldTag &&
      this.tagGeneration.selectedTags.some(
        (t) => t.toLowerCase() === normalizedNewTag
      )
    ) {
      return false;
    }

    // Update in selectedTags
    const selectedIndex = this.tagGeneration.selectedTags.indexOf(oldTag);
    if (selectedIndex > -1 && normalizedNewTag) {
      this.tagGeneration.selectedTags[selectedIndex] = newTag.trim();
    }

    // Also update in suggestedTags to keep them in sync
    const suggestedIndex = this.tagGeneration.suggestedTags.indexOf(oldTag);
    if (suggestedIndex > -1 && normalizedNewTag) {
      this.tagGeneration.suggestedTags[suggestedIndex] = newTag.trim();
    }

    return selectedIndex > -1 || suggestedIndex > -1;
  }

  /**
   * Save tags to memo
   */
  async saveTags(memoId: string): Promise<{ success: boolean; memo?: MemoWithAttachmentsDto; message?: string }> {
    this.isSaving = true;

    try {
      const request: UpdateMemoTagsRequestDto = {
        tags: this.tagGeneration.selectedTags,
      };

      const response = await aiApi.updateMemoTags(memoId, request);

      if (response.code === 0 && response.data) {
        // Update the memo in MemoService's list so UI reflects changes immediately
        const memoService = resolve(MemoService);
        const index = memoService.memos.findIndex((m) => m.memoId === memoId);
        if (index !== -1) {
          memoService.memos[index] = {
            ...memoService.memos[index],
            tags: response.data.memo.tags,
          };
        }

        // Show success toast
        toast.success('标签添加成功');

        return {
          success: true,
          memo: response.data.memo,
          message: '标签添加成功',
        };
      } else {
        return {
          success: false,
          message: '保存标签失败',
        };
      }
    } catch (error: unknown) {
      console.error('Save tags error:', error);
      const message = error instanceof Error ? error.message : '保存标签失败';
      toast.error(message);
      return {
        success: false,
        message,
      };
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Get tool configuration by ID
   */
  getToolById(toolId: AIToolType): AIToolDefinition | undefined {
    return this.tools.find((tool) => tool.id === toolId);
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolId: AIToolType): boolean {
    return this.tools.some((tool) => tool.id === toolId);
  }
}
