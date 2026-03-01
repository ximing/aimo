/**
 * Tag Service
 * Business logic for tag management
 */

import { eq, and, sql } from 'drizzle-orm';
import { Service } from 'typedi';

import { getDatabase } from '../db/connection.js';
import { tags } from '../db/schema/index.js';
import { generateTagId } from '../utils/id.js';

import type { Tag } from '../db/schema/tags.js';
import type { TagDto, CreateTagDto, UpdateTagDto } from '@aimo/dto';

@Service()
export class TagService {
  constructor() {}

  /**
   * Convert a Tag record to TagDto
   */
  private convertToTagDto(record: Tag): TagDto {
    return {
      tagId: record.tagId,
      name: record.name,
      color: record.color ?? undefined,
      usageCount: record.usageCount,
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
    };
  }

  /**
   * Generate a unique tag ID
   * @deprecated Use generateTagId from @/utils/id instead
   */
  private generateTagId(): string {
    return generateTagId();
  }

  /**
   * Normalize tag name (trim, lowercase for comparison)
   */
  private normalizeTagName(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Get all tags for a user
   */
  async getTagsByUser(uid: string): Promise<TagDto[]> {
    const db = getDatabase();
    const results = await db.select().from(tags).where(eq(tags.uid, uid));

    return results.map((record) => this.convertToTagDto(record));
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(tagId: string, uid: string): Promise<TagDto | null> {
    const db = getDatabase();
    const results = await db
      .select()
      .from(tags)
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.convertToTagDto(results[0]);
  }

  /**
   * Get multiple tags by IDs
   */
  async getTagsByIds(tagIds: string[], uid: string): Promise<TagDto[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const db = getDatabase();

    // Use sql.inArray for IN clause
    const results = await db
      .select()
      .from(tags)
      .where(
        and(
          sql`${tags.tagId} IN ${sql.raw(`(${tagIds.map((id) => `'${id}'`).join(',')})`)}`,
          eq(tags.uid, uid)
        )
      );

    // Convert records to DTOs, preserving order
    const tagMap = new Map<string, TagDto>();
    for (const record of results) {
      tagMap.set(record.tagId, this.convertToTagDto(record));
    }

    // Return in the original order of tagIds
    return tagIds.map((id) => tagMap.get(id)).filter((tag): tag is TagDto => tag !== undefined);
  }

  /**
   * Find a tag by name (case-insensitive) for a user
   */
  async findTagByName(name: string, uid: string): Promise<TagDto | null> {
    const db = getDatabase();
    const normalizedName = this.normalizeTagName(name);

    // Use case-insensitive comparison in MySQL
    const results = await db
      .select()
      .from(tags)
      .where(and(sql`LOWER(${tags.name}) = LOWER(${normalizedName})`, eq(tags.uid, uid)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.convertToTagDto(results[0]);
  }

  /**
   * Find existing tag or create a new one
   * Returns the tag (existing or newly created)
   */
  async findOrCreateTag(name: string, uid: string, color?: string): Promise<TagDto> {
    // First try to find existing tag
    const existingTag = await this.findTagByName(name, uid);
    if (existingTag) {
      return existingTag;
    }

    // Create new tag
    return this.createTag({ name: name.trim(), color }, uid);
  }

  /**
   * Create a new tag
   */
  async createTag(dto: CreateTagDto, uid: string): Promise<TagDto> {
    const db = getDatabase();

    const newTag = {
      tagId: generateTagId(),
      uid,
      name: dto.name.trim(),
      color: dto.color,
      usageCount: 0,
    };

    await db.insert(tags).values(newTag);

    // Fetch the created tag to get auto-generated timestamps
    const created = await db.select().from(tags).where(eq(tags.tagId, newTag.tagId)).limit(1);

    return this.convertToTagDto(created[0]);
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, dto: UpdateTagDto, uid: string): Promise<TagDto | null> {
    const db = getDatabase();

    // Check if tag exists and belongs to user
    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    // Build update object with only changed fields
    const updates: Partial<Tag> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name.trim();
    }

    if (dto.color !== undefined) {
      updates.color = dto.color;
    }

    // Perform update
    await db
      .update(tags)
      .set(updates)
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)));

    // Return updated tag
    return this.getTagById(tagId, uid);
  }

  /**
   * Delete a tag and remove it from all memos
   * Returns true if deleted, false if not found
   */
  async deleteTag(tagId: string, uid: string): Promise<boolean> {
    const db = getDatabase();

    // Check if tag exists and belongs to user
    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    // Remove tag from all memos that reference it
    await this.removeTagFromAllMemos(tagId, uid);

    // Delete the tag
    await db.delete(tags).where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)));

    return true;
  }

  /**
   * Increment usage count for a tag (atomic operation)
   */
  async incrementUsageCount(tagId: string, uid: string): Promise<void> {
    const db = getDatabase();

    // Use SQL increment for atomic update
    await db
      .update(tags)
      .set({
        usageCount: sql`${tags.usageCount} + 1`,
      })
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)));
  }

  /**
   * Decrement usage count for a tag (atomic operation, prevents negative values)
   */
  async decrementUsageCount(tagId: string, uid: string): Promise<void> {
    const db = getDatabase();

    // Use SQL decrement with GREATEST to prevent negative values
    await db
      .update(tags)
      .set({
        usageCount: sql`GREATEST(0, ${tags.usageCount} - 1)`,
      })
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid)));
  }

  /**
   * Remove a tag from all memos that reference it
   * TODO: Update this method when MemoService is migrated to MySQL (US-010)
   * For now, memos are still in LanceDB, so we need to use LanceDB API
   */
  private async removeTagFromAllMemos(tagId: string, uid: string): Promise<void> {
    // Import LanceDB service dynamically to avoid circular dependency
    const { LanceDbService } = await import('../sources/lancedb.js');
    const lanceDbService = new LanceDbService();
    const memosTable = await lanceDbService.openTable('memos');

    // Find all memos that have this tagId in their tagIds array
    // LanceDB doesn't support array contains query, so we fetch all and filter
    const allMemos = await memosTable.query().where(`uid = '${uid}'`).toArray();

    const memosToUpdate: Array<{ memoId: string; newTagIds: string[]; newTags: string[] }> = [];

    for (const memo of allMemos) {
      const m = memo as unknown as {
        memoId: string;
        tagIds?: string[] | string | null;
        tags?: string[] | string | null;
      };

      // Normalize tagIds to an array (handle null, undefined, or string)
      let normalizedTagIds: string[] = [];
      if (Array.isArray(m.tagIds)) {
        normalizedTagIds = m.tagIds;
      } else if (typeof m.tagIds === 'string') {
        // Handle case where tagIds might be a comma-separated string
        normalizedTagIds = m.tagIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
      }

      if (normalizedTagIds.includes(tagId)) {
        const newTagIds = normalizedTagIds.filter((id) => id !== tagId);

        // Also update the legacy tags field if it exists
        // Normalize tags to an array as well
        let normalizedTags: string[] = [];
        if (Array.isArray(m.tags)) {
          normalizedTags = m.tags;
        } else if (typeof m.tags === 'string') {
          normalizedTags = m.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        }

        const tagToRemove = normalizedTags[normalizedTagIds.indexOf(tagId)];
        const newTags = tagToRemove
          ? normalizedTags.filter((t) => t !== tagToRemove)
          : normalizedTags;

        memosToUpdate.push({
          memoId: m.memoId,
          newTagIds,
          newTags,
        });
      }
    }

    // Update each memo
    // Note: LanceDB cannot automatically convert empty array to NULL for List types
    // We need to use valuesSql to explicitly set NULL when array is empty
    const now = Date.now();
    for (const { memoId, newTagIds, newTags } of memosToUpdate) {
      const updateValues: Record<string, any> = { updatedAt: now };
      const updateValuesSql: Record<string, string> = {};

      if (newTagIds.length > 0) {
        updateValues.tagIds = newTagIds;
      } else {
        updateValuesSql.tagIds = "arrow_cast(NULL, 'List(Utf8)')";
      }

      if (newTags && newTags.length > 0) {
        updateValues.tags = newTags;
      } else if (newTags && newTags.length === 0) {
        updateValuesSql.tags = "arrow_cast(NULL, 'List(Utf8)')";
      }

      const updateOptions: {
        where: string;
        values: Record<string, any>;
        valuesSql?: Record<string, string>;
      } = {
        where: `memoId = '${memoId}' AND uid = '${uid}'`,
        values: updateValues,
      };

      if (Object.keys(updateValuesSql).length > 0) {
        updateOptions.valuesSql = updateValuesSql;
      }

      await memosTable.update(updateOptions);
    }
  }

  /**
   * Resolve tag names to tag IDs
   * Creates new tags for names that don't exist
   * Returns array of tag IDs in the same order as input names
   */
  async resolveTagNamesToIds(names: string[], uid: string): Promise<string[]> {
    const tagIds: string[] = [];

    for (const name of names) {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      const tag = await this.findOrCreateTag(trimmedName, uid);
      tagIds.push(tag.tagId);
    }

    return tagIds;
  }

  /**
   * Get tags with usage count above threshold
   */
  async getPopularTags(uid: string, minUsageCount: number = 1): Promise<TagDto[]> {
    const allTags = await this.getTagsByUser(uid);
    return allTags.filter((tag) => (tag.usageCount || 0) >= minUsageCount);
  }
}
