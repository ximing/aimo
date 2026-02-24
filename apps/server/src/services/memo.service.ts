import { Service } from 'typedi';

import { OBJECT_TYPE } from '../models/constant/type.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { generateTypeId } from '../utils/id.js';

import { AttachmentService } from './attachment.service.js';
import { EmbeddingService } from './embedding.service.js';
import { MemoRelationService } from './memo-relation.service.js';
import { TagService } from './tag.service.js';

import type { Memo, NewMemo } from '../models/db/memo.schema.js';
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
  tag?: string; // Filter by tag name (single tag)
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
  constructor(
    private lanceDatabase: LanceDatabaseService,
    private embeddingService: EmbeddingService,
    private attachmentService: AttachmentService,
    private memoRelationService: MemoRelationService,
    private tagService: TagService
  ) {}

  /**
   * Convert Arrow List<Utf8> attachmentIds to plain string array
   */
  private convertArrowAttachments(arrowAttachments: any): string[] {
    if (!arrowAttachments) {
      return [];
    }

    // If it's already a plain array, return as is
    if (Array.isArray(arrowAttachments)) {
      return arrowAttachments;
    }

    // If it's an Arrow StringVector, convert to array
    if (arrowAttachments.toArray) {
      return arrowAttachments.toArray();
    }

    // If it's an Arrow Vector with data property
    if (arrowAttachments.data && Array.isArray(arrowAttachments.data)) {
      return arrowAttachments.data;
    }

    // Fallback: return empty array
    return [];
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
        // Clear tags field since there are no tagIds
        return items.map((item) => ({
          ...item,
          tags: [],
        }));
      }

      // Fetch all tags in one batch
      const tagDtos = await this.tagService.getTagsByIds(Array.from(allTagIds), uid);
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
      console.error('Error enriching tags:', error);
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
    tagIds?: string[]
  ): Promise<MemoWithAttachmentsDto> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Validate attachment IDs exist (only verify they belong to user, don't fetch full details)
      if (attachments && attachments.length > 0) {
        try {
          // Quick validation that attachments belong to this user
          const attachmentDtos = await this.attachmentService.getAttachmentsByIds(attachments, uid);
          if (attachmentDtos.length !== attachments.length) {
            console.warn(`Some attachments not found or don't belong to user ${uid}`);
          }
        } catch (error) {
          console.warn(`Failed to validate attachments for user ${uid}:`, error);
        }
      }

      // Resolve tag names to tag IDs if tagIds not provided
      let resolvedTagIds: string[] = [];
      let resolvedTagNames: string[] = [];

      if (tagIds && tagIds.length > 0) {
        // Use provided tag IDs
        resolvedTagIds = tagIds;
        // Get tag names for the legacy tags field
        const existingTags = await this.tagService.getTagsByIds(tagIds, uid);
        resolvedTagNames = existingTags.map((t) => t.name);
      } else if (tags && tags.length > 0) {
        // Create or find tags by name
        resolvedTagIds = await this.tagService.resolveTagNamesToIds(tags, uid);
        resolvedTagNames = tags;
      }

      const now = Date.now();
      const memoId = generateTypeId(OBJECT_TYPE.MEMO);
      const memo: Memo = {
        memoId,
        uid,
        categoryId: categoryId || undefined,
        type,
        content,
        attachments,
        tagIds: resolvedTagIds.length > 0 ? resolvedTagIds : undefined,
        embedding,
        isPublic: isPublic || false,
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
      };

      // Prepare record for LanceDB with only attachment IDs
      // Convert embedding to array if it's an Arrow object
      const embeddingArray = Array.isArray(embedding) ? embedding : [...embedding || []];

      const memoRecord = {
        ...memo,
        embedding: embeddingArray,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };

      const memosTable = await this.lanceDatabase.openTable('memos');
      await memosTable.add([memoRecord as unknown as Record<string, unknown>]);

      // Create relations if provided
      if (relationIds && relationIds.length > 0) {
        try {
          await this.memoRelationService.replaceRelations(uid, memoId, relationIds);
        } catch (error) {
          console.warn('Failed to create memo relations:', error);
          // Don't throw - allow memo creation even if relations fail
        }
      }

      // Increment usage count for each tag
      for (const tagId of resolvedTagIds) {
        try {
          await this.tagService.incrementUsageCount(tagId, uid);
        } catch (error) {
          console.warn(`Failed to increment usage count for tag ${tagId}:`, error);
        }
      }

      // Get full attachment DTOs for response
      const attachmentDtos: AttachmentDto[] =
        attachments && attachments.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachments, uid)
          : [];

      // Get tag DTOs for response
      const tagDtos: TagDto[] =
        resolvedTagIds.length > 0
          ? await this.tagService.getTagsByIds(resolvedTagIds, uid)
          : [];

      // Return with attachment DTOs (exclude embedding to reduce payload)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedding: _embedding, tagIds: _tagIds, ...memoWithoutEmbedding } = memo;
      return {
        ...memoWithoutEmbedding,
        type,
        attachments: attachmentDtos,
        tags: tagDtos,
      };
    } catch (error) {
      console.error('Error creating memo:', error);
      throw error;
    }
  }

  /**
   * Get memos for a user with pagination and filters (excludes embedding to reduce payload)
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
        tag,
        tags,
        startDate,
        endDate,
      } = options;

      const memosTable = await this.lanceDatabase.openTable('memos');

      // Resolve tag names to tag IDs for filtering
      let tagIdsToFilter: string[] | undefined;
      if (tags && tags.length > 0) {
        // Multiple tags - resolve all
        tagIdsToFilter = await this.tagService.resolveTagNamesToIds(tags, uid);
      } else if (tag) {
        // Single tag
        tagIdsToFilter = await this.tagService.resolveTagNamesToIds([tag], uid);
      }

      // Build filter conditions
      // Note: LanceDB Timestamp type cannot be compared with integer literals in SQL
      // So we build WHERE clause without date filters and apply them in JavaScript
      const filterConditions: string[] = [`uid = '${uid}'`];
      const isUncategorizedFilter = categoryId === UNCATEGORIZED_CATEGORY_ID;

      // Add category filter
      if (categoryId && !isUncategorizedFilter) {
        filterConditions.push(`categoryId = '${categoryId}'`);
      }

      // Add search filter
      if (search && search.trim().length > 0) {
        filterConditions.push(`content LIKE '%${search}%'`);
      }

      const whereClause = filterConditions.join(' AND ');

      // Get all matching records (without date range, which will be filtered in JavaScript)
      let allResults = await memosTable.query().where(whereClause).toArray();

      // Apply date range filters in JavaScript (LanceDB cannot compare Timestamp with Int64 literals in SQL)
      const startTimestamp = startDate && !isNaN(startDate.getTime()) ? startDate.getTime() : null;
      const endTimestamp = endDate && !isNaN(endDate.getTime()) ? endDate.getTime() : null;

      if (startTimestamp !== null || endTimestamp !== null) {
        allResults = allResults.filter((memo: any) => {
          const memoTime = memo.createdAt as number;
          if (startTimestamp !== null && memoTime < startTimestamp) return false;
          if (endTimestamp !== null && memoTime > endTimestamp) return false;
          return true;
        });
      }

      if (isUncategorizedFilter) {
        allResults = allResults.filter((memo: any) => memo.categoryId == undefined);
      }

      // Apply tag filter - memos must have ALL specified tags (AND logic)
      if (tagIdsToFilter && tagIdsToFilter.length > 0) {
        allResults = allResults.filter((memo: any) => {
          const memoTagIds = this.convertArrowAttachments(memo.tagIds);
          // Check if memo has ALL the specified tag IDs
          return tagIdsToFilter!.every((tagId) => memoTagIds.includes(tagId));
        });
      }

      const total = allResults.length;

      // Get paginated results
      const offset = (page - 1) * limit;
      const results = allResults
        .sort((a: any, b: any) => {
          const aValue = sortBy === 'createdAt' ? a.createdAt : a.updatedAt;
          const bValue = sortBy === 'createdAt' ? b.createdAt : b.updatedAt;
          const comparison = aValue - bValue;
          return sortOrder === 'asc' ? comparison : -comparison;
        })
        .slice(offset, offset + limit);

      // Get attachment IDs and convert to DTOs
      const items: MemoListItemDto[] = [];
      for (const memo of results) {
        const attachmentIds = this.convertArrowAttachments(memo.attachments);
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          tagIds: this.convertArrowAttachments(memo.tagIds),
          isPublic: memo.isPublic ?? false,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
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
      console.error('Error getting memos:', error);
      throw error;
    }
  }

  /**
   * Get a single memo by ID
   */
  async getMemoById(memoId: string, uid: string): Promise<MemoWithAttachmentsDto | null> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      const results = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return null;
      }

      const memo: any = results[0];
      const attachmentIds = this.convertArrowAttachments(memo.attachments);
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
        categoryId: memo.categoryId,
        attachments: attachmentDtos,
        tagIds: this.convertArrowAttachments(memo.tagIds),
        isPublic: memo.isPublic ?? false,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      };

      // Enrich with tags
      const itemsWithTags = await this.enrichTags(uid, [memoWithAttachments]);

      // Enrich with relations using the same logic as getMemos
      const enrichedItems = await this.enrichMemosWithRelations(uid, itemsWithTags);

      // Return the enriched memo (without embedding)
      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      console.error('Error getting memo by ID:', error);
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
    isPublic?: boolean
  ): Promise<MemoWithAttachmentsDto | null> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Find existing memo (get original data with attachmentIds)
      const memosTable = await this.lanceDatabase.openTable('memos');
      const results = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        throw new Error('Memo not found');
      }

      const existingMemo: any = results[0];

      // Generate new embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Validate attachments if provided
      if (attachments !== undefined && attachments.length > 0) {
        try {
          const attachmentDtos = await this.attachmentService.getAttachmentsByIds(attachments, uid);
          if (attachmentDtos.length !== attachments.length) {
            console.warn(`Some attachments not found or don't belong to user ${uid}`);
          }
        } catch (error) {
          console.warn(`Failed to validate attachments for user ${uid}:`, error);
        }
      }

      // Update the memo
      const now = Date.now();
      // Convert embedding to array if it's an Arrow object
      const embeddingArray = Array.isArray(embedding) ? embedding : [...embedding || []];

      const updateValues: Record<string, any> = {
        content,
        embedding: embeddingArray,
        updatedAt: now,
      };

      // Add type to update if provided (null = clear, undefined = no change)
      if (type !== undefined) {
        updateValues.type = type === null ? null : type;
      }

      // Add categoryId to update if provided
      if (categoryId !== undefined) {
        // Only add if not null/undefined (LanceDB doesn't support undefined values in update)
        if (categoryId === null) {
          // For null, we need to set it explicitly (clearing the category)
          updateValues.categoryId = null;
        } else {
          updateValues.categoryId = categoryId;
        }
      }

      // Add attachments to update if provided (only store attachment IDs)
      if (attachments !== undefined && // Only add attachments if there are any, otherwise omit to keep existing
        attachments.length > 0) {
          updateValues.attachments = attachments;
        }

      // Add isPublic to update if provided
      if (isPublic !== undefined) {
        updateValues.isPublic = isPublic;
      }

      // Update using proper update method with where clause
      await memosTable.update({
        where: `memoId = '${memoId}' AND uid = '${uid}'`,
        values: updateValues,
      });

      // Update relations if provided
      if (relationIds !== undefined) {
        try {
          await this.memoRelationService.replaceRelations(uid, memoId, relationIds);
        } catch (error) {
          console.warn('Failed to update memo relations:', error);
          // Don't throw - allow memo update even if relations fail
        }
      }

      // Build updated memo object with attachment DTOs
      const finalAttachmentIds =
        attachments === undefined
          ? this.convertArrowAttachments(existingMemo.attachments)
          : attachments;
      const finalAttachmentDtos: AttachmentDto[] =
        finalAttachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(finalAttachmentIds, uid)
          : [];

      const updatedMemo: MemoListItemDto = {
        memoId,
        uid,
        content,
        type: existingMemo.type as 'text' | 'audio' | 'video',
        categoryId: categoryId === undefined ? existingMemo.categoryId : categoryId || undefined,
        attachments: finalAttachmentDtos,
        isPublic: isPublic !== undefined ? isPublic : (existingMemo.isPublic ?? false),
        createdAt: existingMemo.createdAt,
        updatedAt: now,
      };

      // Enrich with relations (same logic as getMemoById)
      const enrichedItems = await this.enrichMemosWithRelations(uid, [updatedMemo]);

      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      console.error('Error updating memo:', error);
      throw error;
    }
  }

  /**
   * Update memo tags (batch update)
   * Replaces all existing tags with the new tags array
   * Supports both tag names (legacy) and tagIds
   */
  async updateTags(
    memoId: string,
    uid: string,
    tags?: string[],
    tagIds?: string[]
  ): Promise<MemoWithAttachmentsDto | null> {
    try {
      // Find existing memo
      const memosTable = await this.lanceDatabase.openTable('memos');
      const results = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        throw new Error('Memo not found');
      }

      const existingMemo: any = results[0];
      const existingTagIds = this.convertArrowAttachments(existingMemo.tagIds);

      // Resolve tags to tagIds
      let resolvedTagIds: string[] = [];
      let resolvedTagNames: string[] = [];

      if (tagIds && tagIds.length > 0) {
        // Use provided tag IDs
        resolvedTagIds = tagIds;
        const existingTags = await this.tagService.getTagsByIds(tagIds, uid);
        resolvedTagNames = existingTags.map((t) => t.name);
      } else if (tags && tags.length > 0) {
        // Create or find tags by name
        resolvedTagIds = await this.tagService.resolveTagNamesToIds(tags, uid);
        resolvedTagNames = tags;
      }

      // Calculate tag usage changes
      const addedTagIds = resolvedTagIds.filter((id) => !existingTagIds.includes(id));
      const removedTagIds = existingTagIds.filter((id) => !resolvedTagIds.includes(id));

      // Update the memo with new tag IDs
      // Note: LanceDB cannot automatically convert empty array to NULL for List types
      // We need to use valuesSql to explicitly set NULL when array is empty
      const now = Date.now();
      const updateValues: Record<string, any> = { updatedAt: now };
      const updateValuesSql: Record<string, string> = {};

      if (resolvedTagNames.length > 0) {
        updateValues.tags = resolvedTagNames;
      } else {
        // Use SQL expression to set NULL for list type
        updateValuesSql.tags = 'arrow_cast(NULL, \'List(Utf8)\')';
      }

      if (resolvedTagIds.length > 0) {
        updateValues.tagIds = resolvedTagIds;
      } else {
        // Use SQL expression to set NULL for list type
        updateValuesSql.tagIds = 'arrow_cast(NULL, \'List(Utf8)\')';
      }

      // Build update options
      const updateOptions: { where: string; values: Record<string, any>; valuesSql?: Record<string, string> } = {
        where: `memoId = '${memoId}' AND uid = '${uid}'`,
        values: updateValues,
      };

      // Only add valuesSql if there are fields to set via SQL
      if (Object.keys(updateValuesSql).length > 0) {
        updateOptions.valuesSql = updateValuesSql;
      }

      await memosTable.update(updateOptions);

      // Update usage counts for added tags
      for (const tagId of addedTagIds) {
        try {
          await this.tagService.incrementUsageCount(tagId, uid);
        } catch (error) {
          console.warn(`Failed to increment usage count for tag ${tagId}:`, error);
        }
      }

      // Update usage counts for removed tags
      for (const tagId of removedTagIds) {
        try {
          await this.tagService.decrementUsageCount(tagId, uid);
        } catch (error) {
          console.warn(`Failed to decrement usage count for tag ${tagId}:`, error);
        }
      }

      // Get attachment DTOs
      const attachmentIds = this.convertArrowAttachments(existingMemo.attachments);
      const attachmentDtos =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
          : [];

      // Get tag DTOs for response
      const tagDtos: TagDto[] =
        resolvedTagIds.length > 0
          ? await this.tagService.getTagsByIds(resolvedTagIds, uid)
          : [];

      // Build updated memo object
      const updatedMemo: MemoListItemDto = {
        memoId,
        uid,
        content: existingMemo.content,
        type: (existingMemo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: existingMemo.categoryId,
        attachments: attachmentDtos,
        tags: tagDtos,
        tagIds: resolvedTagIds,
        isPublic: existingMemo.isPublic ?? false,
        createdAt: existingMemo.createdAt,
        updatedAt: now,
      };

      // Enrich with relations
      const enrichedItems = await this.enrichMemosWithRelations(uid, [updatedMemo]);

      return {
        ...enrichedItems[0],
      } as MemoWithAttachmentsDto;
    } catch (error) {
      console.error('Error updating memo tags:', error);
      throw error;
    }
  }

  /**
   * Delete a memo
   */
  async deleteMemo(memoId: string, uid: string): Promise<boolean> {
    try {
      // Get the memo directly to access tagIds before deletion
      const memosTable = await this.lanceDatabase.openTable('memos');
      const results = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        throw new Error('Memo not found');
      }

      const existingMemo: any = results[0];
      const existingTagIds = this.convertArrowAttachments(existingMemo.tagIds);

      // Delete the memo using LanceDB's delete method
      await memosTable.delete(`memoId = '${memoId}' AND uid = '${uid}'`);

      // Clean up relations (both as source and as target)
      try {
        await this.memoRelationService.deleteRelationsBySourceMemo(uid, memoId);
        await this.memoRelationService.deleteRelationsByTargetMemo(uid, memoId);
      } catch (error) {
        console.warn('Failed to delete memo relations during memo deletion:', error);
        // Don't throw - allow memo deletion even if relation cleanup fails
      }

      // Decrement usage counts for tags
      for (const tagId of existingTagIds) {
        try {
          await this.tagService.decrementUsageCount(tagId, uid);
        } catch (error) {
          console.warn(`Failed to decrement usage count for tag ${tagId}:`, error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting memo:', error);
      throw error;
    }
  }

  /**
   * Vector search for memos using semantic search with pagination
   * Following LanceDB best practices: automatic prefiltering via BTREE index on uid
   * Results are automatically sorted by distance (ascending) = relevance descending
   *
   * Best practices from LanceDB official docs:
   * - Filter by uid BEFORE vector comparison using BTREE index (not full table scan)
   * - The BTREE index on uid column enables automatic prefiltering
   * - This narrows down the search space before comparing vectors
   * - Significantly improves performance by reducing vectors to compare
   * - .search() returns results sorted by _distance ascending (most similar first)
   * - _distance represents L2 distance (lower = more similar)
   * - Use .limit() and .offset() for efficient database-level pagination
   * - Results: most relevant items for current user only (no cross-user data leakage)
   */
  async vectorSearch(options: MemoVectorSearchOptions): Promise<PaginatedMemoListWithScoreDto> {
    try {
      const {
        uid,
        query,
        page = 1,
        limit = 20,
        categoryId,
        startDate,
        endDate,
      } = options;

      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      const memosTable = await this.lanceDatabase.openTable('memos');

      const offset = (page - 1) * limit;

      const filterConditions: string[] = [`uid = '${uid}'`];
      const isUncategorizedFilter = categoryId === UNCATEGORIZED_CATEGORY_ID;

      if (categoryId && !isUncategorizedFilter) {
        filterConditions.push(`categoryId = '${categoryId}'`);
      }

      const whereClause = filterConditions.join(' AND ');

      // Execute vector search with uid filtering for optimal performance
      // The BTREE index on uid column enables automatic prefiltering
      // LanceDB applies the uid filter BEFORE vector comparison (not after full table scan)
      // This ensures: 1) Only user's memos are searched, 2) Performance is optimized
      let allResults = await memosTable
        .search(queryEmbedding)
        .where(whereClause) // BTREE index enables prefiltering, not postfiltering
        .toArray();

      // Apply date range filters in JavaScript (LanceDB cannot compare Timestamp with Int64 literals in SQL)
      const startTimestamp = startDate && !isNaN(startDate.getTime()) ? startDate.getTime() : null;
      const endTimestamp = endDate && !isNaN(endDate.getTime()) ? endDate.getTime() : null;

      if (startTimestamp !== null || endTimestamp !== null) {
        allResults = allResults.filter((memo: any) => {
          const memoTime = memo.createdAt as number;
          if (startTimestamp !== null && memoTime < startTimestamp) return false;
          if (endTimestamp !== null && memoTime > endTimestamp) return false;
          return true;
        });
      }

      if (isUncategorizedFilter) {
        allResults = allResults.filter((memo: any) => memo.categoryId == undefined);
      }

      const total = allResults.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedResults = allResults.slice(offset, offset + limit);

      // Map results to DTOs, preserving the distance-based sort order
      // Results are already sorted by relevance (distance ascending = most similar first)
      const items: MemoListItemWithScoreDto[] = [];
      for (const memo of paginatedResults) {
        const attachmentIds = this.convertArrowAttachments(memo.attachments);
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          tagIds: this.convertArrowAttachments(memo.tagIds),
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
          // LanceDB returns _distance (L2 distance metric)
          // Lower _distance = higher similarity
          // Normalize to relevance score: 0-1, where 1.0 = perfect match
          // For normalized vectors, _distance ranges from 0 to 2
          relevanceScore: Math.max(0, Math.min(1, 1 - (memo._distance || 0) / 2)),
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
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error performing vector search:', error);
      throw error;
    }
  }

  /**
   * Get all memos for a user (for specific operations)
   */
  async getAllMemosByUid(uid: string): Promise<Memo[]> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      const results = await memosTable.query().where(`uid = '${uid}'`).toArray();

      // Convert attachment IDs to DTOs
      const memos: Memo[] = [];
      for (const memo of results) {
        const attachmentIds = this.convertArrowAttachments(memo.attachments);
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        memos.push({
          ...memo,
          attachments: attachmentDtos,
        });
      }

      return memos as Memo[];
    } catch (error) {
      console.error('Error getting all memos:', error);
      throw error;
    }
  }

  /**
   * Get total count of memos for a user
   * Uses countRows() which is more efficient than loading all records
   */
  async getMemoCount(uid: string): Promise<number> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');
      const count = await memosTable.countRows(`uid = '${uid}'`);
      return count;
    } catch (error) {
      console.error('Error getting memo count:', error);
      throw error;
    }
  }

  /**
   * Get a single memo by offset position
   * Used for efficient random sampling without loading all IDs
   */
  async getMemoByOffset(uid: string, offset: number): Promise<Memo | null> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');
      const results = await memosTable
        .query()
        .where(`uid = '${uid}'`)
        .offset(offset)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return null;
      }

      const memo = results[0];
      const attachmentIds = this.convertArrowAttachments(memo.attachments);
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
          : [];

      return {
        ...memo,
        attachments: attachmentDtos,
      } as Memo;
    } catch (error) {
      console.error('Error getting memo by offset:', error);
      return null;
    }
  }

  /**
   * Find related memos based on vector similarity to a given memo
   * Excludes the memo itself and returns paginated similar memos with relevance scores
   */
  async findRelatedMemos(
    memoId: string,
    uid: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedMemoListWithScoreDto> {
    try {
      // Get the memo to verify access and get the embedding directly from DB
      const memosTable = await this.lanceDatabase.openTable('memos');
      const memoResults = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (memoResults.length === 0) {
        throw new Error('Memo not found');
      }

      const sourceMemoData = memoResults[0];
      const sourceEmbedding = sourceMemoData.embedding;
      const offset = (page - 1) * limit;

      // Perform vector search with the memo's embedding
      const results = await memosTable
        .search(sourceEmbedding)
        .where(`uid = '${uid}' AND memoId != '${memoId}'`) // Exclude the memo itself
        .limit(limit)
        .offset(offset)
        .toArray();

      // Fetch total count for pagination (all candidate memos excluding self)
      const allResults = await memosTable
        .query()
        .where(`uid = '${uid}' AND memoId != '${memoId}'`)
        .toArray();

      const total = allResults.length;
      const totalPages = Math.ceil(total / limit);

      // Convert attachment IDs to DTOs and exclude embedding
      const items: MemoListItemWithScoreDto[] = [];
      for (const memo of results) {
        const attachmentIds = this.convertArrowAttachments(memo.attachments);
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          tagIds: this.convertArrowAttachments(memo.tagIds),
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
          relevanceScore: Math.max(0, Math.min(1, 1 - (memo._distance || 0) / 2)),
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
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error finding related memos:', error);
      throw error;
    }
  }

  /**
   * Get multiple memos by their IDs
   * Returns memos that belong to the specified user
   */
  async getMemosByIds(memoIds: string[], uid: string): Promise<MemoListItemDto[]> {
    try {
      if (!memoIds || memoIds.length === 0) {
        return [];
      }

      const memosTable = await this.lanceDatabase.openTable('memos');

      // Build filter for memo IDs
      const idConditions = memoIds.map((id) => `memoId = '${id}'`).join(' OR ');
      const whereClause = `uid = '${uid}' AND (${idConditions})`;

      const results = await memosTable.query().where(whereClause).toArray();

      // Convert to DTOs
      const items: MemoListItemDto[] = [];
      for (const memo of results) {
        const attachmentIds = this.convertArrowAttachments(memo.attachments);
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          tagIds: this.convertArrowAttachments(memo.tagIds),
          isPublic: memo.isPublic ?? false,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
        });
      }

      // Enrich items with tags
      const itemsWithTags = await this.enrichTags(uid, items);

      return itemsWithTags;
    } catch (error) {
      console.error('Error getting memos by IDs:', error);
      throw error;
    }
  }

  /**
   * Enrich memo list items with their relation data
   * Fetch all related memos for each item
   */
  private async enrichMemosWithRelations(
    uid: string,
    items: MemoListItemDto[]
  ): Promise<MemoListItemDto[]> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');
      const memosMap = new Map<string, any>();

      // Build a map of all memos for quick lookup
      const allMemos = await this.getAllMemosByUid(uid);
      for (const memo of allMemos) {
        memosMap.set(memo.memoId, memo);
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
              relations.push({
                memoId: relatedMemo.memoId,
                uid: relatedMemo.uid,
                content: relatedMemo.content,
                type: relatedMemo.type || 'text',
                categoryId: relatedMemo.categoryId,
                attachments: relatedMemo.attachments,
                tags: relatedMemo.tags,
                createdAt: relatedMemo.createdAt,
                updatedAt: relatedMemo.updatedAt,
              });
            }
          }

          enrichedItems.push({
            ...item,
            relations: relations.length > 0 ? relations : undefined,
          });
        } catch (error) {
          console.warn(`Failed to enrich memo ${item.memoId} with relations:`, error);
          enrichedItems.push(item);
        }
      }

      return enrichedItems;
    } catch (error) {
      console.error('Error enriching memos with relations:', error);
      // Return original items if enrichment fails
      return items;
    }
  }

  /**
   * Get activity stats for calendar heatmap
   * Returns daily memo counts for the last 90 days
   */
  async getActivityStats(uid: string, days: number = 90): Promise<MemoActivityStatsDto> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      // Calculate date range in UTC
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Format date key as YYYY-MM-DD in UTC
      const formatDateKeyUTC = (timestamp: number) => {
        const date = new Date(timestamp); // timestamp is milliseconds since epoch
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Get all memos for the user
      // LanceDB Timestamp type cannot be compared with integer literals in SQL, so we filter in JavaScript
      const allMemos = await memosTable.query().where(`uid = '${uid}'`).toArray();

      // Get timestamps for date range
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      // Filter memos by date range in JavaScript
      const memosByDate = allMemos.filter((memo: any) => {
        const createdAt = memo.createdAt as number;
        return createdAt >= startTimestamp && createdAt <= endTimestamp;
      });

      // Group memos by date (YYYY-MM-DD in UTC)
      const dateCountMap = new Map<string, number>();

      for (const memo of memosByDate) {
        const createdAt = memo.createdAt as number;
        const dateKey = formatDateKeyUTC(createdAt); // YYYY-MM-DD (UTC)

        dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
      }

      // Convert to array format
      const items: MemoActivityStatsItemDto[] = [];
      for (const [date, count] of dateCountMap) {
        items.push({ date, count });
      }

      // Sort by date
      items.sort((a, b) => a.date.localeCompare(b.date));

      return {
        items,
        startDate: formatDateKeyUTC(startTimestamp),
        endDate: formatDateKeyUTC(endTimestamp),
      };
    } catch (error) {
      console.error('Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Get memos from previous years on the same month/day as today
   * Excludes memos from the current year
   * Results are sorted by year descending (most recent first)
   * Limited to 10 results maximum
   */
  async getOnThisDayMemos(uid: string): Promise<OnThisDayResponseDto> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      const currentDay = now.getDate(); // 1-31

      // Format today's month-day as MM-DD
      const todayMonthDay = `${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

      // Get all memos for the user
      const memosTable = await this.lanceDatabase.openTable('memos');
      const allMemos = await memosTable.query().where(`uid = '${uid}'`).toArray();

      // Filter memos that match the current month/day but not current year
      const matchingMemos: OnThisDayMemoDto[] = [];

      for (const memo of allMemos) {
        const createdAt = memo.createdAt as number;
        const memoDate = new Date(createdAt);
        const memoYear = memoDate.getFullYear();
        const memoMonth = memoDate.getMonth();
        const memoDay = memoDate.getDate();

        // Match month and day, but exclude current year
        if (memoMonth === currentMonth && memoDay === currentDay && memoYear !== currentYear) {
          matchingMemos.push({
            memoId: memo.memoId,
            content: memo.content,
            createdAt,
            year: memoYear,
          });
        }
      }

      // Sort by year descending (most recent first)
      matchingMemos.sort((a, b) => b.year - a.year);

      // Limit to 10 results
      const limitedMemos = matchingMemos.slice(0, 10);

      return {
        items: limitedMemos,
        total: limitedMemos.length,
        todayMonthDay,
      };
    } catch (error) {
      console.error('Error getting on this day memos:', error);
      throw error;
    }
  }

  /**
   * Get public memos for a user (no authentication required)
   * Returns memos where isPublic = true for the specified user
   * Supports pagination and sorting
   */
  async getPublicMemos(
    uid: string,
    page: number = 1,
    limit: number = 20,
    sortBy: 'createdAt' | 'updatedAt' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedMemoListDto> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      // Query memos that are public for this user
      const whereClause = `uid = '${uid}' AND isPublic = true`;
      let allResults = await memosTable.query().where(whereClause).toArray();

      const total = allResults.length;

      // Get paginated results
      const offset = (page - 1) * limit;
      const results = allResults
        .sort((a: any, b: any) => {
          const aValue = sortBy === 'createdAt' ? a.createdAt : a.updatedAt;
          const bValue = sortBy === 'createdAt' ? b.createdAt : b.updatedAt;
          const comparison = aValue - bValue;
          return sortOrder === 'asc' ? comparison : -comparison;
        })
        .slice(offset, offset + limit);

      // Get attachment IDs and convert to DTOs
      const items: MemoListItemDto[] = [];
      for (const memo of results) {
        const attachmentIds = this.convertArrowAttachments(memo.attachments);
        const attachmentDtos: AttachmentDto[] =
          attachmentIds.length > 0
            ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
            : [];

        items.push({
          memoId: memo.memoId,
          uid: memo.uid,
          content: memo.content,
          type: (memo.type as 'text' | 'audio' | 'video') || 'text',
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          tagIds: this.convertArrowAttachments(memo.tagIds),
          isPublic: memo.isPublic ?? false,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
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
      console.error('Error getting public memos:', error);
      throw error;
    }
  }

  /**
   * Get a random public memo for a user (no authentication required)
   * Returns a single random memo where isPublic = true
   * Uses efficient count + offset approach to avoid loading all memos into memory
   */
  async getRandomPublicMemo(uid: string): Promise<MemoListItemDto | null> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      // Get count of public memos for this user
      const whereClause = `uid = '${uid}' AND isPublic = true`;
      const totalCount = await memosTable.countRows(whereClause);

      if (totalCount === 0) {
        return null;
      }

      // Pick a random offset
      const randomOffset = Math.floor(Math.random() * totalCount);

      // Get memo at the random offset position
      const results = await memosTable
        .query()
        .where(whereClause)
        .offset(randomOffset)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return null;
      }

      const memo = results[0];

      // Get attachment DTOs
      const attachmentIds = this.convertArrowAttachments(memo.attachments);
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, uid)
          : [];

      // Build memo object with tagIds
      const memoItem: MemoListItemDto = {
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        type: (memo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: memo.categoryId,
        attachments: attachmentDtos,
        tagIds: this.convertArrowAttachments(memo.tagIds),
        isPublic: memo.isPublic ?? false,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      };

      // Enrich with tags
      const [enrichedMemo] = await this.enrichTags(uid, [memoItem]);
      return enrichedMemo;
    } catch (error) {
      console.error('Error getting random public memo:', error);
      throw error;
    }
  }

  /**
   * Get a single public memo by ID (no authentication required)
   * Returns a memo where isPublic = true for the specified memoId
   */
  async getPublicMemoById(memoId: string): Promise<MemoWithAttachmentsDto | null> {
    try {
      const memosTable = await this.lanceDatabase.openTable('memos');

      // Query memo that is public with the given memoId
      const results = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND isPublic = true`)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return null;
      }

      const memo: any = results[0];
      const attachmentIds = this.convertArrowAttachments(memo.attachments);

      // For public memos, we need to get attachments with the owner's uid
      const attachmentDtos: AttachmentDto[] =
        attachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachmentIds, memo.uid)
          : [];

      // Build memo object with attachment DTOs
      const memoWithAttachments: MemoListItemDto = {
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        type: (memo.type as 'text' | 'audio' | 'video') || 'text',
        categoryId: memo.categoryId,
        attachments: attachmentDtos,
        tagIds: this.convertArrowAttachments(memo.tagIds),
        isPublic: memo.isPublic ?? false,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      };

      // Enrich with tags using the memo owner's uid
      const [enrichedMemo] = await this.enrichTags(memo.uid, [memoWithAttachments]);

      return enrichedMemo as MemoWithAttachmentsDto;
    } catch (error) {
      console.error('Error getting public memo by ID:', error);
      throw error;
    }
  }
}