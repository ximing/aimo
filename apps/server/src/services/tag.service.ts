/**
 * Tag Service
 * Business logic for tag management
 */

import { eq, and, sql } from 'drizzle-orm';
import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';

import { getDatabase } from '../db/connection.js';
import { withTransaction } from '../db/transaction.js';
import { tags, memos } from '../db/schema/index.js';
import { generateTagId } from '../utils/id.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

import type { Tag } from '../db/schema/tags.js';
import type { TagDto, CreateTagDto, UpdateTagDto } from '@aimo/dto';
import type { Connection, Table } from '@lancedb/lancedb';

@Service()
export class TagService {
  private lanceDb: Connection | null = null;
  private initialized = false;

  constructor() {}

  /**
   * Initialize LanceDB connection
   */
  private async initLanceDb(): Promise<void> {
    try {
      const lanceDbPath = config.lancedb.path;
      this.lanceDb = await lancedb.connect(lanceDbPath);
      this.initialized = true;
      logger.info('LanceDB initialized in TagService');
    } catch (error) {
      logger.error('Failed to initialize LanceDB in TagService:', error);
      throw error;
    }
  }

  /**
   * Get LanceDB connection (throws if not initialized)
   */
  private getLanceDb(): Connection {
    if (!this.lanceDb || !this.initialized) {
      throw new Error('LanceDB not initialized in TagService');
    }
    return this.lanceDb;
  }

  /**
   * Open memos table in LanceDB
   */
  private async openMemosTable(): Promise<Table> {
    if (!this.initialized) {
      await this.initLanceDb();
    }
    const db = this.getLanceDb();
    return db.openTable('memos');
  }

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
    const results = await db
      .select()
      .from(tags)
      .where(and(eq(tags.uid, uid), eq(tags.deletedAt, 0)));

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
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid), eq(tags.deletedAt, 0)))
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
          eq(tags.uid, uid),
          eq(tags.deletedAt, 0)
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
      .where(
        and(
          sql`LOWER(${tags.name}) = LOWER(${normalizedName})`,
          eq(tags.uid, uid),
          eq(tags.deletedAt, 0)
        )
      )
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
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid), eq(tags.deletedAt, 0)))
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
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid), eq(tags.deletedAt, 0)));

    // Return updated tag
    return this.getTagById(tagId, uid);
  }

  /**
   * Delete a tag and remove it from all memos
   * Returns true if deleted, false if not found
   */
  async deleteTag(tagId: string, uid: string): Promise<boolean> {
    try {
      // Check if tag exists
      const tag = await this.getTagById(tagId, uid);
      if (!tag) {
        return false;
      }

      const deletedAt = Date.now();
      const db = getDatabase();

      // Use transaction for soft delete with memo cleanup
      await withTransaction(async (tx) => {
        // Soft delete tag in MySQL
        await tx
          .update(tags)
          .set({ deletedAt })
          .where(and(eq(tags.tagId, tagId), eq(tags.deletedAt, 0)));

        // Find all memos where tagIds contains this tagId (deletedAt = 0)
        const affectedMemos = await tx
          .select({ memoId: memos.memoId, tagIds: memos.tagIds })
          .from(memos)
          .where(and(eq(memos.deletedAt, 0)));

        // Filter memos that actually have this tagId in their tagIds array
        const memosWithTag = affectedMemos.filter((memo) => {
          if (!memo.tagIds || !Array.isArray(memo.tagIds)) {
            return false;
          }
          return memo.tagIds.includes(tagId);
        });

        // Remove tagId from each memo's tagIds array in MySQL
        if (memosWithTag.length > 0) {
          for (const memo of memosWithTag) {
            const newTagIds = (memo.tagIds as string[]).filter((id) => id !== tagId);
            await tx
              .update(memos)
              .set({ tagIds: newTagIds })
              .where(and(eq(memos.memoId, memo.memoId), eq(memos.deletedAt, 0)));
          }

          logger.info('Removed tagId from memos in MySQL:', {
            tagId,
            count: memosWithTag.length,
          });
        }

        logger.info('Tag soft deleted in MySQL with memo cleanup:', {
          tagId,
          uid,
          deletedAt,
        });
      });

      // Update memos in LanceDB (outside transaction)
      const memosTable = await this.openMemosTable();

      // Find all memos with this tagId in LanceDB
      const lanceDbMemos = await memosTable
        .query()
        .where(`uid = '${uid}' AND deletedAt = 0`)
        .toArray();

      // Filter and update memos that have this tagId
      for (const memo of lanceDbMemos) {
        const m = memo as unknown as {
          memoId: string;
          tagIds?: string[] | string | null;
        };

        // Normalize tagIds to an array
        let normalizedTagIds: string[] = [];
        if (Array.isArray(m.tagIds)) {
          normalizedTagIds = m.tagIds;
        } else if (typeof m.tagIds === 'string') {
          normalizedTagIds = m.tagIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
        }

        if (normalizedTagIds.includes(tagId)) {
          const newTagIds = normalizedTagIds.filter((id) => id !== tagId);

          // Update memo in LanceDB
          const updateValues: Record<string, any> = { updatedAt: Date.now() };
          const updateValuesSql: Record<string, string> = {};

          if (newTagIds.length > 0) {
            updateValues.tagIds = newTagIds;
          } else {
            // Set to NULL if array is empty
            updateValuesSql.tagIds = "arrow_cast(NULL, 'List(Utf8)')";
          }

          const updateOptions: {
            where: string;
            values: Record<string, any>;
            valuesSql?: Record<string, string>;
          } = {
            where: `memoId = '${m.memoId}' AND uid = '${uid}'`,
            values: updateValues,
          };

          if (Object.keys(updateValuesSql).length > 0) {
            updateOptions.valuesSql = updateValuesSql;
          }

          await memosTable.update(updateOptions);
        }
      }

      logger.info('Tag soft deleted in LanceDB with memo cleanup:', {
        tagId,
        uid,
      });

      return true;
    } catch (error) {
      logger.error('Failed to soft delete tag:', error);
      throw error;
    }
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
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid), eq(tags.deletedAt, 0)));
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
      .where(and(eq(tags.tagId, tagId), eq(tags.uid, uid), eq(tags.deletedAt, 0)));
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
