import { Service } from '@rabjs/react';
import type { TagDto } from '@aimo/dto';
import * as tagApi from '../api/tag';

/**
 * Tag Service
 * Manages tag data and operations
 */
export class TagService extends Service {
  tags: TagDto[] = [];
  loading = false;
  error: string | null = null;

  /**
   * Fetch all tags for the current user
   */
  async fetchTags() {
    this.loading = true;
    this.error = null;

    try {
      const response = await tagApi.getTags();

      if (response.code === 0 && response.data) {
        // Sort tags by usage count (most used first)
        this.tags = (response.data.tags || []).sort((a, b) => {
          const countA = a.usageCount || 0;
          const countB = b.usageCount || 0;
          return countB - countA;
        });
        return { success: true };
      } else {
        this.error = 'Failed to fetch tags';
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Fetch tags error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to fetch tags';
      return { success: false, message: this.error };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Get tag name by ID
   */
  getTagName(tagId: string): string | undefined {
    const tag = this.tags.find((t) => t.tagId === tagId);
    return tag?.name;
  }

  /**
   * Get tag by name (case-insensitive)
   */
  getTagByName(name: string): TagDto | undefined {
    return this.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }
}
