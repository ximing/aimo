import { Service } from 'typedi';
import { LanceDbService } from '../sources/lancedb.js';
import { EmbeddingService } from './embedding.service.js';
import { BackupService } from './backup.service.js';
import { AttachmentService } from './attachment.service.js';
import { MemoRelationService } from './memo-relation.service.js';
import type { Memo, NewMemo } from '../models/db/memo.schema.js';
import type {
  MemoWithAttachmentsDto,
  PaginatedMemoWithAttachmentsDto,
  MemoListItemDto,
  PaginatedMemoListDto,
  MemoListItemWithScoreDto,
  PaginatedMemoListWithScoreDto,
  AttachmentDto,
  MemoActivityStatsDto,
  MemoActivityStatsItemDto,
  OnThisDayMemoDto,
  OnThisDayResponseDto,
} from '@aimo/dto';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

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
}

@Service()
export class MemoService {
  constructor(
    private lanceDb: LanceDbService,
    private embeddingService: EmbeddingService,
    private backupService: BackupService,
    private attachmentService: AttachmentService,
    private memoRelationService: MemoRelationService
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
   * Trigger backup for data changes
   */
  private async triggerBackup(reason: string): Promise<void> {
    try {
      await this.backupService.triggerBackup(reason);
    } catch (error) {
      console.warn('Failed to trigger backup:', error);
      // Don't throw - backup failure shouldn't interrupt normal operations
    }
  }

  /**
   * Create a new memo with automatic embedding and denormalized attachments
   */
  async createMemo(
    uid: string,
    content: string,
    attachments?: string[],
    categoryId?: string,
    relationIds?: string[],
    createdAt?: number,
    updatedAt?: number
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

      const now = Date.now();
      const memoId = generateTypeId(OBJECT_TYPE.MEMO);
      const memo: Memo = {
        memoId,
        uid,
        categoryId: categoryId || undefined,
        content,
        attachments,
        embedding,
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
      };

      // Prepare record for LanceDB with only attachment IDs
      // Convert embedding to array if it's an Arrow object
      const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding || []);

      const memoRecord = {
        ...memo,
        embedding: embeddingArray,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };

      const memosTable = await this.lanceDb.openTable('memos');
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

      // Trigger backup on memo creation
      this.triggerBackup('memo_created');

      // Get full attachment DTOs for response
      const attachmentDtos: AttachmentDto[] =
        attachments && attachments.length > 0
          ? await this.attachmentService.getAttachmentsByIds(attachments, uid)
          : [];

      // Return with attachment DTOs
      return {
        ...memo,
        attachments: attachmentDtos,
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
        startDate,
        endDate,
      } = options;

      const memosTable = await this.lanceDb.openTable('memos');

      // Build filter conditions
      // Note: LanceDB Timestamp type cannot be compared with integer literals in SQL
      // So we build WHERE clause without date filters and apply them in JavaScript
      const filterConditions: string[] = [`uid = '${uid}'`];

      // Add category filter
      if (categoryId) {
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
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
        });
      }

      // Enrich items with relations
      const enrichedItems = await this.enrichMemosWithRelations(uid, items);

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
      const memosTable = await this.lanceDb.openTable('memos');

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
        categoryId: memo.categoryId,
        attachments: attachmentDtos,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      };

      // Enrich with relations using the same logic as getMemos
      const enrichedItems = await this.enrichMemosWithRelations(uid, [memoWithAttachments]);

      // Return the enriched memo with embedding
      return {
        ...enrichedItems[0],
        embedding: memo.embedding,
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
    attachments?: string[],
    categoryId?: string | null,
    relationIds?: string[]
  ): Promise<MemoWithAttachmentsDto | null> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Find existing memo (get original data with attachmentIds)
      const memosTable = await this.lanceDb.openTable('memos');
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
      const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding || []);

      const updateValues: Record<string, any> = {
        content,
        embedding: embeddingArray,
        updatedAt: now,
      };

      // Add categoryId to update if provided
      if (categoryId !== undefined) {
        // Only add if not null/undefined (LanceDB doesn't support undefined values in update)
        if (categoryId !== null) {
          updateValues.categoryId = categoryId;
        } else {
          // For null, we need to set it explicitly (clearing the category)
          updateValues.categoryId = null;
        }
      }

      // Add attachments to update if provided (only store attachment IDs)
      if (attachments !== undefined) {
        // Only add attachments if there are any, otherwise omit to keep existing
        if (attachments.length > 0) {
          updateValues.attachments = attachments;
        }
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

      // Trigger backup on memo update
      this.triggerBackup('memo_updated');

      // Build updated memo object with attachment DTOs
      const finalAttachmentIds =
        attachments !== undefined
          ? attachments
          : this.convertArrowAttachments(existingMemo.attachments);
      const finalAttachmentDtos: AttachmentDto[] =
        finalAttachmentIds.length > 0
          ? await this.attachmentService.getAttachmentsByIds(finalAttachmentIds, uid)
          : [];

      return {
        memoId,
        uid,
        content,
        categoryId: categoryId !== undefined ? categoryId || undefined : existingMemo.categoryId,
        attachments: finalAttachmentDtos,
        embedding,
        createdAt: existingMemo.createdAt,
        updatedAt: now,
      } as MemoWithAttachmentsDto;
    } catch (error) {
      console.error('Error updating memo:', error);
      throw error;
    }
  }

  /**
   * Delete a memo
   */
  async deleteMemo(memoId: string, uid: string): Promise<boolean> {
    try {
      const existingMemo = await this.getMemoById(memoId, uid);
      if (!existingMemo) {
        throw new Error('Memo not found');
      }

      const memosTable = await this.lanceDb.openTable('memos');

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

      // Trigger backup on memo deletion
      this.triggerBackup('memo_deleted');

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
      const { uid, query, page = 1, limit = 20 } = options;

      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      const memosTable = await this.lanceDb.openTable('memos');

      const offset = (page - 1) * limit;

      // Execute vector search with uid filtering for optimal performance
      // The BTREE index on uid column enables automatic prefiltering
      // LanceDB applies the uid filter BEFORE vector comparison (not after full table scan)
      // This ensures: 1) Only user's memos are searched, 2) Performance is optimized
      const paginatedResults = await memosTable
        .search(queryEmbedding)
        .where(`uid = '${uid}'`) // BTREE index enables prefiltering, not postfiltering
        .limit(limit)
        .offset(offset)
        .toArray();

      // Get total count for pagination metadata
      // Also filter by uid to count only user's memos efficiently
      const allResults = await memosTable
        .search(queryEmbedding)
        .where(`uid = '${uid}'`) // Uses BTREE index for efficient counting
        .toArray();

      const total = allResults.length;
      const totalPages = Math.ceil(total / limit);

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
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
          // LanceDB returns _distance (L2 distance metric)
          // Lower _distance = higher similarity
          // Normalize to relevance score: 0-1, where 1.0 = perfect match
          // For normalized vectors, _distance ranges from 0 to 2
          relevanceScore: Math.max(0, Math.min(1, 1 - (memo._distance || 0) / 2)),
        });
      }

      return {
        items,
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
      const memosTable = await this.lanceDb.openTable('memos');

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
   * Find related memos based on vector similarity to a given memo
   * Excludes the memo itself and returns top N similar memos
   */
  async findRelatedMemos(
    memoId: string,
    uid: string,
    limit: number = 10
  ): Promise<MemoListItemDto[]> {
    try {
      // Get the memo to find related ones
      const sourceMemo = await this.getMemoById(memoId, uid);
      if (!sourceMemo) {
        throw new Error('Memo not found');
      }

      const memosTable = await this.lanceDb.openTable('memos');

      // Use the memo's existing embedding to search for similar memos
      const sourceEmbedding = sourceMemo.embedding;

      // Perform vector search with the memo's embedding
      const results = await memosTable
        .search(sourceEmbedding)
        .where(`uid = '${uid}' AND memoId != '${memoId}'`) // Exclude the memo itself
        .limit(limit)
        .toArray();

      // Convert attachment IDs to DTOs and exclude embedding
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
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
        });
      }

      return items;
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

      const memosTable = await this.lanceDb.openTable('memos');

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
          categoryId: memo.categoryId,
          attachments: attachmentDtos,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt,
        });
      }

      return items;
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
      const memosTable = await this.lanceDb.openTable('memos');
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
                categoryId: relatedMemo.categoryId,
                attachments: relatedMemo.attachments,
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
      const memosTable = await this.lanceDb.openTable('memos');

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
      const memosTable = await this.lanceDb.openTable('memos');
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
}