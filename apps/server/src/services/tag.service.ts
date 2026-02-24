/**
 * Tag Service
 * Business logic for tag management
 */

import { Service } from 'typedi';

import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { generateTagId } from '../utils/id.js';

import type { TagRecord } from '../models/db/schema.js';
import type { TagDto, CreateTagDto, UpdateTagDto } from '@aimo/dto';

@Service()
export class TagService {
  constructor(private lanceDatabaseService: LanceDatabaseService) {}

  /**
   * Convert a TagRecord to TagDto
   */
  private convertToTagDto(record: TagRecord): TagDto {
    return {
      tagId: record.tagId,
      name: record.name,
      color: record.color,
      usageCount: record.usageCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
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
    const table = await this.lanceDatabaseService.openTable('tags');
    const results = await table.query().where(`uid = '${uid}'`).toArray();

    return results.map((record) => this.convertToTagDto(record as unknown as TagRecord));
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(tagId: string, uid: string): Promise<TagDto | null> {
    const table = await this.lanceDatabaseService.openTable('tags');
    const results = await table
      .query()
      .where(`tagId = '${tagId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return null;
    }

    return this.convertToTagDto(results[0] as unknown as TagRecord);
  }

  /**
   * Get multiple tags by IDs
   */
  async getTagsByIds(tagIds: string[], uid: string): Promise<TagDto[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    const table = await this.lanceDatabaseService.openTable('tags');

    // Fetch all tags in a single query
    const whereConditions = tagIds.map((id) => `tagId = '${id}'`).join(' OR ');
    const query = `(${whereConditions}) AND uid = '${uid}'`;

    const results = await table.query().where(query).toArray();

    // Convert records to DTOs, preserving order
    const tagMap = new Map<string, TagDto>();
    for (const record of results) {
      const r = record as unknown as TagRecord;
      tagMap.set(r.tagId, this.convertToTagDto(r));
    }

    // Return in the original order of tagIds
    return tagIds
      .map((id) => tagMap.get(id))
      .filter((tag): tag is TagDto => tag !== undefined);
  }

  /**
   * Find a tag by name (case-insensitive) for a user
   */
  async findTagByName(name: string, uid: string): Promise<TagDto | null> {
    const table = await this.lanceDatabaseService.openTable('tags');
    const normalizedName = this.normalizeTagName(name);

    // LanceDB doesn't support case-insensitive search directly,
    // so we fetch all user tags and filter in memory
    const results = await table.query().where(`uid = '${uid}'`).toArray();

    for (const record of results) {
      const r = record as unknown as TagRecord;
      if (this.normalizeTagName(r.name) === normalizedName) {
        return this.convertToTagDto(r);
      }
    }

    return null;
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
    const now = Date.now();

    const record: TagRecord = {
      tagId: this.generateTagId(),
      uid,
      name: dto.name.trim(),
      color: dto.color,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const table = await this.lanceDatabaseService.openTable('tags');
    await table.add([record as unknown as Record<string, unknown>]);

    return this.convertToTagDto(record);
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, dto: UpdateTagDto, uid: string): Promise<TagDto | null> {
    const table = await this.lanceDatabaseService.openTable('tags');

    // Check if tag exists and belongs to user
    const results = await table
      .query()
      .where(`tagId = '${tagId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return null;
    }

    const existingRecord = results[0] as unknown as TagRecord;
    const now = Date.now();

    // Build update values - fetch existing record and merge changes
    const updatedRecord = {
      ...results[0],
      updatedAt: now,
    };

    if (dto.name !== undefined) {
      updatedRecord.name = dto.name.trim();
    }

    if (dto.color !== undefined) {
      updatedRecord.color = dto.color;
    }

    await table.update({
      where: `tagId = '${tagId}' AND uid = '${uid}'`,
      values: updatedRecord,
    });

    // Return updated tag
    return this.getTagById(tagId, uid);
  }

  /**
   * Delete a tag and remove it from all memos
   * Returns true if deleted, false if not found
   */
  async deleteTag(tagId: string, uid: string): Promise<boolean> {
    const table = await this.lanceDatabaseService.openTable('tags');

    // Check if tag exists and belongs to user
    const results = await table
      .query()
      .where(`tagId = '${tagId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return false;
    }

    // Remove tag from all memos that reference it
    await this.removeTagFromAllMemos(tagId, uid);

    // Delete the tag
    await table.delete(`tagId = '${tagId}' AND uid = '${uid}'`);

    return true;
  }

  /**
   * Increment usage count for a tag
   */
  async incrementUsageCount(tagId: string, uid: string): Promise<void> {
    const table = await this.lanceDatabaseService.openTable('tags');

    const results = await table
      .query()
      .where(`tagId = '${tagId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return;
    }

    const record = results[0] as unknown as TagRecord;
    const newCount = (record.usageCount || 0) + 1;

    await table.update({
      where: `tagId = '${tagId}' AND uid = '${uid}'`,
      values: {
        usageCount: newCount,
        updatedAt: Date.now(),
      },
    });
  }

  /**
   * Decrement usage count for a tag
   */
  async decrementUsageCount(tagId: string, uid: string): Promise<void> {
    const table = await this.lanceDatabaseService.openTable('tags');

    const results = await table
      .query()
      .where(`tagId = '${tagId}' AND uid = '${uid}'`)
      .limit(1)
      .toArray();

    if (results.length === 0) {
      return;
    }

    const record = results[0] as unknown as TagRecord;
    const newCount = Math.max(0, (record.usageCount || 0) - 1);

    await table.update({
      where: `tagId = '${tagId}' AND uid = '${uid}'`,
      values: {
        usageCount: newCount,
        updatedAt: Date.now(),
      },
    });
  }

  /**
   * Remove a tag from all memos that reference it
   */
  private async removeTagFromAllMemos(tagId: string, uid: string): Promise<void> {
    const memosTable = await this.lanceDatabaseService.openTable('memos');

    // Find all memos that have this tagId in their tagIds array
    // LanceDB doesn't support array contains query, so we fetch all and filter
    const allMemos = await memosTable.query().where(`uid = '${uid}'`).toArray();

    const memosToUpdate: Array<{ memoId: string; newTagIds: string[]; newTags: string[] }> = [];

    for (const memo of allMemos) {
      const m = memo as unknown as { memoId: string; tagIds?: string[]; tags?: string[] };
      if (m.tagIds && m.tagIds.includes(tagId)) {
        const newTagIds = m.tagIds.filter((id) => id !== tagId);
        // Also update the legacy tags field if it exists
        const tagToRemove = m.tags?.[m.tagIds.indexOf(tagId)];
        const newTags = tagToRemove ? (m.tags || []).filter((t) => t !== tagToRemove) : m.tags || [];

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
        updateValuesSql.tagIds = 'arrow_cast(NULL, \'List(Utf8)\')';
      }

      if (newTags && newTags.length > 0) {
        updateValues.tags = newTags;
      } else if (newTags && newTags.length === 0) {
        updateValuesSql.tags = 'arrow_cast(NULL, \'List(Utf8)\')';
      }

      const updateOptions: { where: string; values: Record<string, any>; valuesSql?: Record<string, string> } = {
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
