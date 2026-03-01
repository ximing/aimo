import { Service } from 'typedi';
import { eq, and, desc, asc, sql, or, inArray, gte, lte } from 'drizzle-orm';
import * as lancedb from '@lancedb/lancedb';

import { OBJECT_TYPE } from '../models/constant/type.js';
import { getDatabase } from '../db/connection.js';
import { memos } from '../db/schema/memos.js';
import { withTransaction } from '../db/transaction.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

import { AttachmentService } from './attachment.service.js';
import { EmbeddingService } from './embedding.service.js';
import { MemoRelationService } from './memo-relation.service.js';
import { TagService } from './tag.service.js';

import type { Memo, NewMemo } from '../db/schema/memos.js';
import type { MemoVectorRecord } from '../models/db/schema.js';
import type {
  MemoWithAttachmentsDto,
  PaginatedMemoWithAttachmentsDto,
  MemoListItemDto,
  PaginatedMemoListDto,
  MemoListItemWithScoreDto,
  PaginatedMemoListWithScoreDto,
  AttachmentDto,
  TagDto,
  MemoActivityStatsDto,
  MemoActivityStatsItemDto,
  OnThisDayMemoDto,
  OnThisDayResponseDto,
} from '@aimo/dto';
import type { Connection, Table } from '@lancedb/lancedb';

const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__';

/**
 * Service-specific options for memo search (internal use)
 */
export interface MemoSearchOptions {
  uid: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  categoryId?: string; // Filter by category ID
  tags?: string[]; // Filter by multiple tag names (AND logic)
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service-specific options for vector search (internal use)
 */
export interface MemoVectorSearchOptions {
  uid: string;
  query: string;
  page?: number;
  limit?: number;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Service()
export class MemoService {
  private lanceDb!: Connection;
  private initialized = false;

  constructor(
    private embeddingService: EmbeddingService,
    private attachmentService: AttachmentService,
    private memoRelationService: MemoRelationService,
    private tagService: TagService
  ) {
    // Initialize local LanceDB instance for vector operations
    this.initLanceDb().catch((error) => {
      logger.error('Failed to initialize LanceDB in MemoService:', error);
    });
  }

  /**
   * Initialize local LanceDB connection for vector operations
   */
  private async initLanceDb(): Promise<void> {
    try {
      const storageType = config.lancedb.storageType;
      const path = config.lancedb.path;

      if (storageType === 's3') {
        const s3Config = config.lancedb.s3;
        if (!s3Config) {
          throw new Error('S3 configuration is missing');
        }

        const storageOptions: Record<string, string> = {
          virtualHostedStyleRequest: 'true',
          conditionalPut: 'disabled',
        };

        if (s3Config.awsAccessKeyId) storageOptions.awsAccessKeyId = s3Config.awsAccessKeyId;
        if (s3Config.awsSecretAccessKey) storageOptions.awsSecretAccessKey = s3Config.awsSecretAccessKey;
        if (s3Config.region) storageOptions.awsRegion = s3Config.region;
        if (s3Config.endpoint) {
          storageOptions.awsEndpoint = `https://${s3Config.bucket}.oss-${s3Config.region}.aliyuncs.com`;
        }

        this.lanceDb = await lancedb.connect(path, { storageOptions });
      } else {
        this.lanceDb = await lancedb.connect(path);
      }

      this.initialized = true;
      logger.info('MemoService LanceDB initialized for vector operations');
    } catch (error) {
      logger.error('Failed to initialize LanceDB for MemoService:', error);
      throw error;
    }
  }

  /**
   * Get LanceDB connection
   */
  private getLanceDb(): Connection {
    if (!this.initialized) {
      throw new Error('LanceDB not initialized in MemoService');
    }
    return this.lanceDb;
  }

  /**
   * Open memo_vectors table
   */
  private async openMemoVectorsTable(): Promise<Table> {
    const db = this.getLanceDb();
    return await db.openTable('memo_vectors');
  }

  /**
   * Enrich memo items with tag data
   * Converts tagIds to TagDto objects
   */
  private async enrichTags(uid: string, items: MemoListItemDto[]): Promise<MemoListItemDto[]> {
    try {
      // Collect all unique tag IDs from all items
      const allTagIds = new Set<string>();
      for (const item of items) {
        if (item.tagIds && item.tagIds.length > 0) {
          for (const tagId of item.tagIds) {
            allTagIds.add(tagId);
          }
        }
      }

      // If no tags to enrich, return items as-is
      if (allTagIds.size === 0) {
        return items.map((item) => ({
          ...item,
          tags: [],
        }));
      }

      // Fetch all tags in one batch
      const tagDtos = await this.tagService.getTagsByIds([...allTagIds], uid);
      const tagMap = new Map<string, TagDto>();
      for (const tag of tagDtos) {
        tagMap.set(tag.tagId, tag);
      }

      // Enrich each item with tag objects
      return items.map((item) => {
        if (!item.tagIds || item.tagIds.length === 0) {
          return {
            ...item,
            tags: [],
          };
        }

        const enrichedTags = item.tagIds
          .map((tagId) => tagMap.get(tagId))
          .filter((tag): tag is TagDto => tag !== undefined);

        return {
          ...item,
          tags: enrichedTags,
        };
      });
    } catch (error) {
      logger.error('Error enriching tags:', error);
      // Return items with empty tags if enrichment fails
      return items.map((item) => ({
        ...item,
        tags: [],
      }));
    }
  }

  async createMemo(
    uid: string,
    content: string,
    type: 'text' | 'audio' | 'video' = 'text',
    attachments?: string[],
    categoryId?: string,
    relationIds?: string[],
    isPublic?: boolean,
    createdAt?: number,
    updatedAt?: number,
    tags?: string[],
    tagIds?: string[],
    source?: string
  ): Promise<MemoWithAttachmentsDto> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Validate attachment IDs exist
      if (attachments && attachments.length > 0) {
        try {
          const attachmentDtos = await this.attachmentService.getAttachmentsByIds(attachments, uid);
          if (attachmentDtos.length !== attachments.length) {
            logger.warn(`Some attachments not found or don't belong to user ${uid}`);
          }
        } catch (error) {
          logger.warn(`Failed to validate attachments for user ${uid}:`, error);
        }
      }

      // Resolve tag names to tag IDs if tagIds not provided
      let resolvedTagIds: string[] = [];

      if (tagIds && tagIds.length > 0) {
        resolvedTagIds = tagIds;
      } else if (tags && tags.length > 0) {
        resolvedTagIds = await this.tagService.resolveTagNamesToIds(tags, uid);
      }

      const now = Date.now();
      const memoId = generateTypeId(OBJECT_TYPE.MEMO);
      const db = getDatabase();

      // Use transaction to insert both scalar and vector data
      await withTransaction(async (tx) => {
        // Insert scalar data into MySQL
        await tx.insert(memos).values({
          memoId,
          uid,
          categoryId: categoryId || null,
          content,
          type,
          source: source || null,
          attachments: attachments && attachments.length > 0 ? attachments : null,
          tagIds: resolvedTagIds.length > 0 ? resolvedTagIds : null,
          isPublic: isPublic || false,
          createdAt: createdAt ? new Date(createdAt) : new Date(now),
          updatedAt: updatedAt ? new Date(updatedAt) : new Date(now),
        });

        logger.info('Memo scalar data inserted into MySQL:', { memoId, uid });
      });

      // Insert embedding into LanceDB memo_vectors (outside transaction)
      const memoVectorsTable = await this.openMemoVectorsTable();
      const embeddingArray = Array.isArray(embedding) ? embedding : [...(embedding || [])];
      
      await memoVectorsTable.add([
        {
          memoId,
          embedding: embeddingArray,
        } as unknown as Record<string, unknown>,
      ]);

      logger.info('Memo embedding inserted into LanceDB:', { memoId });

      // Create relations if provided
      if (relationIds && relationIds.length > 0) {
        try {
          await this.memoRelationService.replaceRelations(uid, memoId, relationIds);
        } catch (error) {
          logger.warn('Failed to create memo relations:', error);
        }
      }

      // Increment usage count for each tag
      for (const tagId of resolvedTagIds) {
        try {
          await this.tagService.incrementUsageCount(tagId, uid);
        } catch (error) {
          logger.warn(`Failed to increment usage count for tag ${tagId}:`, error);
        }
      }

      // Get full attachment DTOs for response
      const attachmentDtos: AttachmentDto[] =
        attachments && attachments.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachments, uid)
          : [];

      // Get tag DTOs for response
      const tagDtos: TagDto[] =
        resolvedTagIds.length > 0 ? await this.tagService.getTagsByIds(resolvedTagIds, uid) : [];

      // Fetch the created record from MySQL
      const results = await db
        .select()
        .from(memos)
        .where(eq(memos.memoId, memoId))
        .limit(1);

      const record = results[0]!;

      return {
        memoId: record.memoId,
        uid: record.uid,
        content: record.content,
        type: (record.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: record.categoryId || undefined,
        source: record.source || undefined,
        attachments: attachmentDtos,
        tags: tagDtos,
        isPublic: record.isPublic,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
      };
    } catch (error) {
      logger.error('Error creating memo:', error);
      throw error;
    }
  }

  /**
   * Get memos for a user with pagination and filters
   */
  async getMemos(options: MemoSearchOptions): Promise<PaginatedMemoListDto> {
    try {
      const {
        uid,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        categoryId,
        tags,
        startDate,
        endDate,
      } = options;

      const db = getDatabase();

      // Resolve tag names to tag IDs for filtering
      let tagIdsToFilter: string[] | undefined;
      if (tags && tags.length > 0) {
        tagIdsToFilter = await this.tagService.resolveTagNamesToIds(tags, uid);
      }

      // Build filter conditions
      const conditions: any[] = [eq(memos.uid, uid)];

      const isUncategorizedFilter = categoryId === UNCATEGORIZED_CATEGORY_ID;

      // Add category filter
      if (categoryId && !isUncategorizedFilter) {
        conditions.push(eq(memos.categoryId, categoryId));
      } else if (isUncategorizedFilter) {
        conditions.push(sql`${memos.categoryId} IS NULL`);
      }

      // Add search filter
      if (search && search.trim().length > 0) {
        conditions.push(sql`${memos.content} LIKE ${`%${search}%`}`);
      }

      // Add date range filters
      if (startDate && !isNaN(startDate.getTime())) {
        conditions.push(gte(memos.createdAt, startDate));
      }
      if (endDate && !isNaN(endDate.getTime())) {
        conditions.push(lte(memos.createdAt, endDate));
      }

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(memos)
        .where(and(...conditions));

      const countResult = await countQuery;
      let total = countResult[0]?.count || 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const sortColumn = sortBy === 'createdAt' ? memos.createdAt : memos.updatedAt;
      const sortDirection = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

      let query = db
        .select()
        .from(memos)
        .where(and(...conditions))
        .orderBy(sortDirection)
        .limit(limit)
        .offset(offset);

      let results = await query;

      // Apply tag filter if needed (post-query filtering for JSON array)
      if (tagIdsToFilter && tagIdsToFilter.length > 0) {
        results = results.filter((memo) => {
          const memoTagIds = memo.tagIds || [];
          // Check if memo has ALL the specified tag IDs
          return tagIdsToFilter!.every((tagId) => memoTagIds.includes(tagId));
        });
        // Recalculate total after tag filtering
        total = results.length;
      }

      // Convert to DTOs
      const items: MemoListItemDto[] = [];
      for (const memo of results) {
        const attachmentIds = memo.attachments || [];
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId || undefined,
          attachments: attachmentDtos,
          tagIds: memo.tagIds || [],
          isPublic: memo.isPublic,
          createdAt: memo.createdAt.getTime(),
          updatedAt: memo.updatedAt.getTime(),
          source: memo.source || undefined,
        });
      }

      // Enrich items with tags
      const itemsWithTags = await this.enrichTags(uid, items);

      // Enrich items with relations
      const enrichedItems = await this.enrichMemosWithRelations(uid, itemsWithTags);

      return {
        items: enrichedItems,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting memos:', error);
      throw error;
    }
  }

  /**
   * Get a single memo by ID
   */
  async getMemoById(memoId: string, uid: string): Promise<MemoWithAttachmentsDto | null> {
    try {
      const db = getDatabase();

      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const memo = results[0];
      const attachmentIds = memo.attachments || [];
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
          : [];

      // Build base memo object with attachment DTOs
      const memoWithAttachments: MemoListItemDto = {
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        type: (memo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: memo.categoryId || undefined,
        attachments: attachmentDtos,
        tagIds: memo.tagIds || [],
        isPublic: memo.isPublic,
        createdAt: memo.createdAt.getTime(),
        updatedAt: memo.updatedAt.getTime(),
        source: memo.source || undefined,
      };

      // Enrich with tags
      const itemsWithTags = await this.enrichTags(uid, [memoWithAttachments]);

      // Enrich with relations
      const enrichedItems = await this.enrichMemosWithRelations(uid, itemsWithTags);

      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      logger.error('Error getting memo by ID:', error);
      throw error;
    }
  }

  /**
   * Update a memo
   */
  async updateMemo(
    memoId: string,
    uid: string,
    content: string,
    type?: 'text' | 'audio' | 'video' | null,
    attachments?: string[],
    categoryId?: string | null,
    relationIds?: string[],
    isPublic?: boolean,
    tags?: string[],
    tagIds?: string[],
    source?: string
  ): Promise<MemoWithAttachmentsDto | null> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      const db = getDatabase();

      // Find existing memo
      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)))
        .limit(1);

      if (results.length === 0) {
        throw new Error('Memo not found');
      }

      const existingMemo = results[0];

      // Generate new embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Validate attachments if provided
      if (attachments !== undefined && attachments.length > 0) {
        try {
          const attachmentDtos = await this.attachmentService.getAttachmentsByIds(attachments, uid);
          if (attachmentDtos.length !== attachments.length) {
            logger.warn(`Some attachments not found or don't belong to user ${uid}`);
          }
        } catch (error) {
          logger.warn(`Failed to validate attachments for user ${uid}:`, error);
        }
      }

      const now = Date.now();

      // Build update values
      const updateValues: Partial<typeof memos.$inferInsert> = {
        content,
        updatedAt: new Date(now),
      };

      if (type !== undefined) {
        updateValues.type = type;
      }

      if (categoryId !== undefined) {
        updateValues.categoryId = categoryId;
      }

      if (attachments !== undefined) {
        updateValues.attachments = attachments.length > 0 ? attachments : null;
      }

      if (isPublic !== undefined) {
        updateValues.isPublic = isPublic;
      }

      if (source !== undefined) {
        updateValues.source = source;
      }

      // Update MySQL scalar data
      await db
        .update(memos)
        .set(updateValues)
        .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)));

      logger.info('Memo scalar data updated in MySQL:', { memoId, uid });

      // Update LanceDB embedding
      const memoVectorsTable = await this.openMemoVectorsTable();
      const embeddingArray = Array.isArray(embedding) ? embedding : [...(embedding || [])];

      await memoVectorsTable.update({
        where: `memoId = '${memoId}'`,
        values: {
          embedding: embeddingArray,
        },
      });

      logger.info('Memo embedding updated in LanceDB:', { memoId });

      // Update relations if provided
      if (relationIds !== undefined) {
        try {
          await this.memoRelationService.replaceRelations(uid, memoId, relationIds);
        } catch (error) {
          logger.warn('Failed to update memo relations:', error);
        }
      }

      // Update tags if provided
      let finalTagIds = existingMemo.tagIds || [];
      if (tags !== undefined || tagIds !== undefined) {
        try {
          let resolvedTagIds: string[] = [];
          if (tagIds && tagIds.length > 0) {
            resolvedTagIds = tagIds;
          } else if (tags && tags.length > 0) {
            resolvedTagIds = await this.tagService.resolveTagNamesToIds(tags, uid);
          }

          // Calculate tag usage changes
          const addedTagIds = resolvedTagIds.filter((id) => !finalTagIds.includes(id));
          const removedTagIds = finalTagIds.filter((id) => !resolvedTagIds.includes(id));

          // Update memo with new tag IDs
          await db
            .update(memos)
            .set({
              tagIds: resolvedTagIds.length > 0 ? resolvedTagIds : null,
              updatedAt: new Date(now),
            })
            .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)));

          // Update usage counts
          for (const tagId of addedTagIds) {
            try {
              await this.tagService.incrementUsageCount(tagId, uid);
            } catch (error) {
              logger.warn(`Failed to increment usage count for tag ${tagId}:`, error);
            }
          }

          for (const tagId of removedTagIds) {
            try {
              await this.tagService.decrementUsageCount(tagId, uid);
            } catch (error) {
              logger.warn(`Failed to decrement usage count for tag ${tagId}:`, error);
            }
          }

          finalTagIds = resolvedTagIds;
        } catch (error) {
          logger.warn('Failed to update memo tags:', error);
        }
      }

      // Build updated memo object
      const finalAttachmentIds =
        attachments === undefined ? existingMemo.attachments || [] : attachments;
      const finalAttachmentDtos: AttachmentDto[] =
        finalAttachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(finalAttachmentIds, uid)
          : [];

      const updatedMemo: MemoListItemDto = {
        memoId,
        uid,
        content,
        type: (type === undefined ? existingMemo.type : type) as 'text' | 'audio' | 'video',
        categoryId: categoryId === undefined ? (existingMemo.categoryId || undefined) : (categoryId || undefined),
        attachments: finalAttachmentDtos,
        tagIds: finalTagIds,
        isPublic: isPublic === undefined ? existingMemo.isPublic : isPublic,
        createdAt: existingMemo.createdAt.getTime(),
        updatedAt: now,
      };

      // Enrich with tags and relations
      const itemsWithTags = await this.enrichTags(uid, [updatedMemo]);
      const enrichedItems = await this.enrichMemosWithRelations(uid, itemsWithTags);

      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      logger.error('Error updating memo:', error);
      throw error;
    }
  }

  /**
   * Delete a memo
   */
  async deleteMemo(memoId: string, uid: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // Get the memo to access tagIds before deletion
      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)))
        .limit(1);

      if (results.length === 0) {
        throw new Error('Memo not found');
      }

      const existingMemo = results[0];
      const existingTagIds = existingMemo.tagIds || [];

      // Use transaction for multi-table delete
      await withTransaction(async (tx) => {
        // Delete from MySQL
        await tx.delete(memos).where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)));

        logger.info('Memo scalar data deleted from MySQL:', { memoId, uid });
      });

      // Delete from LanceDB memo_vectors (outside transaction)
      const memoVectorsTable = await this.openMemoVectorsTable();
      await memoVectorsTable.delete(`memoId = '${memoId}'`);

      logger.info('Memo embedding deleted from LanceDB:', { memoId });

      // Clean up relations
      try {
        await this.memoRelationService.deleteRelationsBySourceMemo(uid, memoId);
        await this.memoRelationService.deleteRelationsByTargetMemo(uid, memoId);
      } catch (error) {
        logger.warn('Failed to delete memo relations during memo deletion:', error);
      }

      // Decrement usage counts for tags
      for (const tagId of existingTagIds) {
        try {
          await this.tagService.decrementUsageCount(tagId, uid);
        } catch (error) {
          logger.warn(`Failed to decrement usage count for tag ${tagId}:`, error);
        }
      }

      return true;
    } catch (error) {
      logger.error('Error deleting memo:', error);
      throw error;
    }
  }

  /**
   * Update memo tags (batch update)
   * Replaces all existing tags with the new tags array
   */
  async updateTags(
    memoId: string,
    uid: string,
    tags?: string[],
    tagIds?: string[]
  ): Promise<MemoWithAttachmentsDto | null> {
    try {
      const db = getDatabase();

      // Find existing memo
      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)))
        .limit(1);

      if (results.length === 0) {
        throw new Error('Memo not found');
      }

      const existingMemo = results[0];
      const existingTagIds = existingMemo.tagIds || [];

      // Resolve tags to tagIds
      let resolvedTagIds: string[] = [];
      if (tagIds && tagIds.length > 0) {
        resolvedTagIds = tagIds;
      } else if (tags && tags.length > 0) {
        resolvedTagIds = await this.tagService.resolveTagNamesToIds(tags, uid);
      }

      // Calculate tag usage changes
      const addedTagIds = resolvedTagIds.filter((id) => !existingTagIds.includes(id));
      const removedTagIds = existingTagIds.filter((id) => !resolvedTagIds.includes(id));

      const now = Date.now();

      // Update memo with new tag IDs
      await db
        .update(memos)
        .set({
          tagIds: resolvedTagIds.length > 0 ? resolvedTagIds : null,
          updatedAt: new Date(now),
        })
        .where(and(eq(memos.memoId, memoId), eq(memos.uid, uid)));

      // Update usage counts
      for (const tagId of addedTagIds) {
        try {
          await this.tagService.incrementUsageCount(tagId, uid);
        } catch (error) {
          logger.warn(`Failed to increment usage count for tag ${tagId}:`, error);
        }
      }

      for (const tagId of removedTagIds) {
        try {
          await this.tagService.decrementUsageCount(tagId, uid);
        } catch (error) {
          logger.warn(`Failed to decrement usage count for tag ${tagId}:`, error);
        }
      }

      // Get updated memo
      const attachmentIds = existingMemo.attachments || [];
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
          : [];

      const updatedMemo: MemoListItemDto = {
        memoId: existingMemo.memoId,
        uid: existingMemo.uid,
        content: existingMemo.content,
        type: (existingMemo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: existingMemo.categoryId || undefined,
        attachments: attachmentDtos,
        tagIds: resolvedTagIds,
        isPublic: existingMemo.isPublic,
        createdAt: existingMemo.createdAt.getTime(),
        updatedAt: now,
      };

      // Enrich with relations
      const enrichedItems = await this.enrichMemosWithRelations(uid, [updatedMemo]);

      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      logger.error('Error updating memo tags:', error);
      throw error;
    }
  }

  /**
   * Vector search for memos using semantic search with pagination
   * (KEEP EXISTING LANCEDB IMPLEMENTATION - NOT REFACTORED YET)
   */
  async vectorSearch(options: MemoVectorSearchOptions): Promise<PaginatedMemoListWithScoreDto> {
    try {
      const { uid, query, page = 1, limit = 20, categoryId, startDate, endDate } = options;

      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Use memo_vectors table for vector search
      const memoVectorsTable = await this.openMemoVectorsTable();

      const offset = (page - 1) * limit;

      // Perform vector search on memo_vectors table (no uid filter here since it's vector-only)
      const vectorResults = await memoVectorsTable
        .search(queryEmbedding)
        .limit(limit + offset)
        .toArray();

      // Get memo IDs from vector results
      const memoIds = vectorResults.slice(offset, offset + limit).map((r: any) => r.memoId);

      if (memoIds.length === 0) {
        return {
          items: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

      // Fetch scalar data from MySQL
      const db = getDatabase();
      const conditions: any[] = [eq(memos.uid, uid), inArray(memos.memoId, memoIds)];

      const isUncategorizedFilter = categoryId === UNCATEGORIZED_CATEGORY_ID;

      if (categoryId && !isUncategorizedFilter) {
        conditions.push(eq(memos.categoryId, categoryId));
      } else if (isUncategorizedFilter) {
        conditions.push(sql`${memos.categoryId} IS NULL`);
      }

      if (startDate && !isNaN(startDate.getTime())) {
        conditions.push(gte(memos.createdAt, startDate));
      }
      if (endDate && !isNaN(endDate.getTime())) {
        conditions.push(lte(memos.createdAt, endDate));
      }

      const memosFromDb = await db.select().from(memos).where(and(...conditions));

      // Build result map from vector search results
      const memoMap = new Map<string, any>();
      for (const vr of vectorResults) {
        memoMap.set((vr as any).memoId, {
          distance: (vr as any)._distance || 0,
        });
      }

      const total = memosFromDb.length;

      // Convert to DTOs
      const items: MemoListItemWithScoreDto[] = [];
      for (const memo of memosFromDb) {
        const vectorInfo = memoMap.get(memo.memoId);
        const attachmentIds = memo.attachments || [];
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId || undefined,
          attachments: attachmentDtos,
          tagIds: memo.tagIds || [],
          createdAt: memo.createdAt.getTime(),
          updatedAt: memo.updatedAt.getTime(),
          relevanceScore: Math.max(0, Math.min(1, 1 - (vectorInfo?.distance || 0) / 2)),
        });
      }

      // Enrich items with tags
      const itemsWithTags = await this.enrichTags(uid, items);

      return {
        items: itemsWithTags,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Get all memos by user ID (internal use)
   * Used for relation enrichment
   */
  async getAllMemosByUid(uid: string): Promise<Memo[]> {
    try {
      const db = getDatabase();
      return await db.select().from(memos).where(eq(memos.uid, uid));
    } catch (error) {
      logger.error('Error getting all memos by uid:', error);
      throw error;
    }
  }

  /**
   * Get total memo count for a user
   */
  async getMemoCount(uid: string): Promise<number> {
    try {
      const db = getDatabase();
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(memos)
        .where(eq(memos.uid, uid));

      return result[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting memo count:', error);
      throw error;
    }
  }

  /**
   * Get memo by offset (for iteration)
   */
  async getMemoByOffset(uid: string, offset: number): Promise<Memo | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(memos)
        .where(eq(memos.uid, uid))
        .orderBy(desc(memos.createdAt))
        .limit(1)
        .offset(offset);

      return results[0] || null;
    } catch (error) {
      logger.error('Error getting memo by offset:', error);
      throw error;
    }
  }

  /**
   * Find related memos using vector similarity
   * (KEEP EXISTING LANCEDB IMPLEMENTATION)
   */
  async findRelatedMemos(
    memoId: string,
    uid: string,
    limit: number = 5,
    page: number = 1
  ): Promise<PaginatedMemoListWithScoreDto> {
    try {
      // Get the memo's embedding from LanceDB
      const memoVectorsTable = await this.openMemoVectorsTable();
      const vectorResults = await memoVectorsTable
        .query()
        .where(`memoId = '${memoId}'`)
        .limit(1)
        .toArray();

      if (vectorResults.length === 0) {
        throw new Error('Memo not found in vector store');
      }

      const memoEmbedding = (vectorResults[0] as any).embedding;

      // Search for similar memos (excluding the query memo itself)
      const offset = (page - 1) * limit;
      const similarMemos = await memoVectorsTable
        .search(memoEmbedding)
        .limit(limit + offset + 1) // +1 to exclude self
        .toArray();

      // Filter out the query memo itself and apply pagination
      const filteredResults = similarMemos
        .filter((m: any) => m.memoId !== memoId)
        .slice(offset, offset + limit);

      const total = similarMemos.filter((m: any) => m.memoId !== memoId).length;

      // Get scalar data from MySQL
      const db = getDatabase();
      const memoIds = filteredResults.map((m: any) => m.memoId);

      if (memoIds.length === 0) {
        return {
          items: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }

      const memosFromDb = await db
        .select()
        .from(memos)
        .where(and(eq(memos.uid, uid), inArray(memos.memoId, memoIds)));

      // Build result map
      const memoMap = new Map<string, any>();
      for (const fr of filteredResults) {
        memoMap.set((fr as any).memoId, {
          distance: (fr as any)._distance || 0,
        });
      }

      // Convert to DTOs
      const items: MemoListItemWithScoreDto[] = [];
      for (const memo of memosFromDb) {
        const vectorInfo = memoMap.get(memo.memoId);
        const attachmentIds = memo.attachments || [];
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId || undefined,
          attachments: attachmentDtos,
          tagIds: memo.tagIds || [],
          createdAt: memo.createdAt.getTime(),
          updatedAt: memo.updatedAt.getTime(),
          relevanceScore: Math.max(0, Math.min(1, 1 - (vectorInfo?.distance || 0) / 2)),
        });
      }

      // Enrich items with tags
      const itemsWithTags = await this.enrichTags(uid, items);

      return {
        items: itemsWithTags,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding related memos:', error);
      throw error;
    }
  }

  /**
   * Get multiple memos by their IDs
   */
  async getMemosByIds(memoIds: string[], uid: string): Promise<MemoListItemDto[]> {
    try {
      if (!memoIds || memoIds.length === 0) {
        return [];
      }

      const db = getDatabase();
      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.uid, uid), inArray(memos.memoId, memoIds)));

      // Convert to DTOs
      const items: MemoListItemDto[] = [];
      for (const memo of results) {
        const attachmentIds = memo.attachments || [];
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId || undefined,
          attachments: attachmentDtos,
          tagIds: memo.tagIds || [],
          isPublic: memo.isPublic,
          createdAt: memo.createdAt.getTime(),
          updatedAt: memo.updatedAt.getTime(),
        });
      }

      // Enrich items with tags
      const itemsWithTags = await this.enrichTags(uid, items);

      return itemsWithTags;
    } catch (error) {
      logger.error('Error getting memos by IDs:', error);
      throw error;
    }
  }

  /**
   * Enrich memo list items with their relation data
   */
  private async enrichMemosWithRelations(
    uid: string,
    items: MemoListItemDto[]
  ): Promise<MemoListItemDto[]> {
    try {
      const memosMap = new Map<string, any>();

      // Build a map of all memos for quick lookup
      const allMemos = await this.getAllMemosByUid(uid);
      for (const memo of allMemos) {
        const attachmentIds = memo.attachments || [];
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        memosMap.set(memo.memoId, {
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId || undefined,
          attachments: attachmentDtos,
          tags: [], // Will be enriched if needed
          createdAt: memo.createdAt.getTime(),
          updatedAt: memo.updatedAt.getTime(),
        });
      }

      // For each item, fetch its relations
      const enrichedItems: MemoListItemDto[] = [];
      for (const item of items) {
        try {
          const relatedMemoIds = await this.memoRelationService.getRelatedMemos(uid, item.memoId);
          const relations: MemoListItemDto[] = [];

          for (const relatedMemoId of relatedMemoIds) {
            const relatedMemo = memosMap.get(relatedMemoId);
            if (relatedMemo) {
              relations.push(relatedMemo);
            }
          }

          enrichedItems.push({
            ...item,
            relations: relations.length > 0 ? relations : undefined,
          });
        } catch (error) {
          logger.warn(`Failed to enrich memo ${item.memoId} with relations:`, error);
          enrichedItems.push(item);
        }
      }

      return enrichedItems;
    } catch (error) {
      logger.error('Error enriching memos with relations:', error);
      return items;
    }
  }

  /**
   * Get activity stats for calendar heatmap
   * (KEEP EXISTING MYSQL IMPLEMENTATION)
   */
  async getActivityStats(uid: string, days: number = 90): Promise<MemoActivityStatsDto> {
    try {
      const db = getDatabase();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Format date key as YYYY-MM-DD in UTC
      const formatDateKeyUTC = (date: Date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Get memos within date range
      const memosInRange = await db
        .select()
        .from(memos)
        .where(
          and(
            eq(memos.uid, uid),
            gte(memos.createdAt, startDate),
            lte(memos.createdAt, endDate)
          )
        );

      // Group memos by date
      const dateCountMap = new Map<string, number>();

      for (const memo of memosInRange) {
        const dateKey = formatDateKeyUTC(memo.createdAt);
        dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
      }

      // Convert to array
      const items: MemoActivityStatsItemDto[] = Array.from(dateCountMap.entries()).map(
        ([date, count]) => ({
          date,
          count,
        })
      );

      return {
        items,
        startDate: formatDateKeyUTC(startDate),
        endDate: formatDateKeyUTC(endDate),
      };
    } catch (error) {
      logger.error('Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Get "On This Day" memos
   */
  async getOnThisDayMemos(uid: string): Promise<OnThisDayResponseDto> {
    try {
      const db = getDatabase();
      const today = new Date();
      const currentMonth = today.getUTCMonth() + 1;
      const currentDay = today.getUTCDate();

      // Get all memos for this user
      const allMemos = await db.select().from(memos).where(eq(memos.uid, uid));

      // Filter memos by month and day
      const memosOnThisDay = allMemos.filter((memo) => {
        const memoDate = memo.createdAt;
        return (
          memoDate.getUTCMonth() + 1 === currentMonth &&
          memoDate.getUTCDate() === currentDay &&
          memoDate.getUTCFullYear() !== today.getUTCFullYear()
        );
      });

      // Convert to array of OnThisDayMemoDto
      const items: OnThisDayMemoDto[] = [];

      for (const memo of memosOnThisDay) {
        const year = memo.createdAt.getUTCFullYear();

        const memoDto: OnThisDayMemoDto = {
          memoId: memo.memoId,
          content: memo.content,
          createdAt: memo.createdAt.getTime(),
          year,
        };

        items.push(memoDto);
      }

      // Sort by year descending (newest first)
      items.sort((a, b) => b.year - a.year);

      // Format todayMonthDay as MM-DD
      const monthDay = `${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

      return {
        items,
        total: items.length,
        todayMonthDay: monthDay,
      };
    } catch (error) {
      logger.error('Error getting on this day memos:', error);
      throw error;
    }
  }

  /**
   * Get public memos with pagination
   */
  async getPublicMemos(
    uid: string,
    page: number = 1,
    limit: number = 20,
    sortBy: 'createdAt' | 'updatedAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedMemoListDto> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      // Get total count for this user's public memos
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(memos)
        .where(and(eq(memos.uid, uid), eq(memos.isPublic, true)));

      const total = countResult[0]?.count || 0;

      // Determine sort column and direction
      const sortColumn = sortBy === 'createdAt' ? memos.createdAt : memos.updatedAt;
      const sortDirection = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

      // Get paginated results
      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.uid, uid), eq(memos.isPublic, true)))
        .orderBy(sortDirection)
        .limit(limit)
        .offset(offset);

      // Convert to DTOs
      const items: MemoListItemDto[] = [];
      for (const memo of results) {
        const attachmentIds = memo.attachments || [];
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, memo.uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId || undefined,
          attachments: attachmentDtos,
          tagIds: memo.tagIds || [],
          isPublic: memo.isPublic,
          createdAt: memo.createdAt.getTime(),
          updatedAt: memo.updatedAt.getTime(),
        });
      }

      // Enrich items with tags
      const itemsWithTags: MemoListItemDto[] = [];
      for (const item of items) {
        const enriched = await this.enrichTags(item.uid, [item]);
        itemsWithTags.push(enriched[0]);
      }

      return {
        items: itemsWithTags,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting public memos:', error);
      throw error;
    }
  }

  /**
   * Get random public memo
   */
  async getRandomPublicMemo(uid: string): Promise<MemoListItemDto | null> {
    try {
      const db = getDatabase();

      // Get all public memos for this user
      const publicMemos = await db
        .select()
        .from(memos)
        .where(and(eq(memos.uid, uid), eq(memos.isPublic, true)));

      if (publicMemos.length === 0) {
        return null;
      }

      // Pick random memo
      const randomIndex = Math.floor(Math.random() * publicMemos.length);
      const memo = publicMemos[randomIndex];

      const attachmentIds = memo.attachments || [];
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
          : [];

      const memoItem: MemoListItemDto = {
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        type: (memo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: memo.categoryId || undefined,
        attachments: attachmentDtos,
        tagIds: memo.tagIds || [],
        isPublic: memo.isPublic,
        createdAt: memo.createdAt.getTime(),
        updatedAt: memo.updatedAt.getTime(),
      };

      // Enrich with tags
      const enriched = await this.enrichTags(uid, [memoItem]);

      return enriched[0];
    } catch (error) {
      logger.error('Error getting random public memo:', error);
      throw error;
    }
  }

  /**
   * Get public memo by ID (no auth required)
   */
  async getPublicMemoById(memoId: string): Promise<MemoWithAttachmentsDto | null> {
    try {
      const db = getDatabase();

      const results = await db
        .select()
        .from(memos)
        .where(and(eq(memos.memoId, memoId), eq(memos.isPublic, true)))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const memo = results[0];
      const attachmentIds = memo.attachments || [];
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, memo.uid)
          : [];

      const memoWithAttachments: MemoListItemDto = {
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        type: (memo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: memo.categoryId || undefined,
        attachments: attachmentDtos,
        tagIds: memo.tagIds || [],
        isPublic: memo.isPublic,
        createdAt: memo.createdAt.getTime(),
        updatedAt: memo.updatedAt.getTime(),
        source: memo.source || undefined,
      };

      // Enrich with tags
      const itemsWithTags = await this.enrichTags(memo.uid, [memoWithAttachments]);

      // Enrich with relations
      const enrichedItems = await this.enrichMemosWithRelations(memo.uid, itemsWithTags);

      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      logger.error('Error getting public memo by ID:', error);
      throw error;
    }
  }
}
