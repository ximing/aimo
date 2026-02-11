import { Service } from 'typedi';
import { LanceDbService } from '../sources/lancedb.js';
import { EmbeddingService } from './embedding.service.js';
import { BackupService } from './backup.service.js';
import { AttachmentService } from './attachment.service.js';
import type { Memo, NewMemo } from '../models/db/memo.schema.js';
import type { MemoWithAttachmentsDto, PaginatedMemoWithAttachmentsDto, MemoListItemDto, PaginatedMemoListDto } from '@aimo/dto';
import type { DenormalizedAttachment } from '../models/db/schema.js';
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
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service-specific options for vector search (internal use)
 */
export interface MemoVectorSearchOptions {
  uid: string;
  query: string;
  limit?: number;
  threshold?: number;
}

@Service()
export class MemoService {
  constructor(
    private lanceDb: LanceDbService,
    private embeddingService: EmbeddingService,
    private backupService: BackupService,
    private attachmentService: AttachmentService
  ) {}

  /**
   * Convert Arrow List<Struct> attachments to plain JSON array
   */
  private convertArrowAttachments(arrowAttachments: any): DenormalizedAttachment[] {
    if (!arrowAttachments) {
      return [];
    }

    // If it's already a plain array, return as is
    if (Array.isArray(arrowAttachments)) {
      return arrowAttachments;
    }

    // If it's an Arrow StructVector, convert to array
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
  async createMemo(uid: string, content: string, attachments?: string[]): Promise<MemoWithAttachmentsDto> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Get full attachment details for denormalization (immutable at creation time)
      const denormalizedAttachments: DenormalizedAttachment[] = [];
      if (attachments && attachments.length > 0) {
        const attachmentDetails = await Promise.all(
          attachments.map(async (attachmentId) => {
            try {
              const att = await this.attachmentService.getAttachment(attachmentId, uid);
              if (!att) {
                console.warn(`Attachment not found: ${attachmentId}`);
              }
              return att;
            } catch (error) {
              console.warn(`Failed to get attachment ${attachmentId}:`, error);
              return null;
            }
          })
        );

        // Filter and convert to denormalized format
        attachmentDetails.forEach((att) => {
          if (att) {
            denormalizedAttachments.push({
              attachmentId: att.attachmentId,
              filename: att.filename,
              url: att.url,
              type: att.type,
              size: att.size,
              createdAt: att.createdAt,
            });
          }
        });
      }

      const now = Date.now();
      const memo: Memo = {
        memoId: generateTypeId(OBJECT_TYPE.MEMO),
        uid,
        content,
        attachments,
        embedding,
        createdAt: now,
        updatedAt: now,
      };

      // Prepare record for LanceDB with denormalized attachments
      // Convert embedding to array if it's an Arrow object
      const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding || []);
      
      const memoRecord = {
        ...memo,
        embedding: embeddingArray,
        attachments: denormalizedAttachments.length > 0 ? denormalizedAttachments : undefined,
      };

      const memosTable = await this.lanceDb.openTable('memos');
      await memosTable.add([memoRecord as unknown as Record<string, unknown>]);

      // Trigger backup on memo creation
      this.triggerBackup('memo_created');

      // Return with denormalized attachment data directly (no need to query again)
      return {
        ...memo,
        attachments: denormalizedAttachments,
      } ;
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
        startDate,
        endDate,
      } = options;

      const memosTable = await this.lanceDb.openTable('memos');

      // Build filter conditions
      const filterConditions: string[] = [`uid = '${uid}'`];

      // Add search filter
      if (search && search.trim().length > 0) {
        filterConditions.push(`content LIKE '%${search}%'`);
      }

      // Add date filters (convert Date objects to millisecond timestamps)
      if (startDate) {
        filterConditions.push(`createdAt >= ${startDate.getTime()}`);
      }
      if (endDate) {
        filterConditions.push(`createdAt <= ${endDate.getTime()}`);
      }

      const whereClause = filterConditions.join(' AND ');

      // Get total count
      const allResults = await memosTable.query().where(whereClause).toArray();

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

      // Use denormalized attachments directly and exclude embedding
      const items = results.map((memo: any) => ({
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        attachments: this.convertArrowAttachments(memo.attachments),
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      })) as MemoListItemDto[];

      return {
        items,
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

      // Use denormalized attachments directly (no need to query again)
      return {
        ...memo,
        attachments: this.convertArrowAttachments(memo.attachments),
      } as MemoWithAttachmentsDto;
    } catch (error) {
      console.error('Error getting memo by ID:', error);
      throw error;
    }
  }

  /**
   * Update a memo
   */
  async updateMemo(memoId: string, uid: string, content: string, attachments?: string[]): Promise<MemoWithAttachmentsDto | null> {
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

      // Get full attachment details for denormalization if attachments are provided
      let denormalizedAttachments: DenormalizedAttachment[] | undefined;
      if (attachments !== undefined) {
        denormalizedAttachments = [];
        if (attachments.length > 0) {
          const attachmentDetails = await Promise.all(
            attachments.map(async (attachmentId) => {
              try {
                const att = await this.attachmentService.getAttachment(attachmentId, uid);
                if (!att) {
                  console.warn(`Attachment not found: ${attachmentId}`);
                }
                return att;
              } catch (error) {
                console.warn(`Failed to get attachment ${attachmentId}:`, error);
                return null;
              }
            })
          );

           // Filter and convert to denormalized format
           attachmentDetails.forEach((att) => {
             if (att) {
               denormalizedAttachments!.push({
                 attachmentId: att.attachmentId,
                 filename: att.filename,
                 url: att.url,
                 type: att.type,
                 size: att.size,
                 createdAt: att.createdAt,
               });
             }
           });
        }
      }

      // Update the memo
      const now = Date.now();
      // Convert embedding to array if it's an Arrow object
      const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding || []);
      
      const updateData: Record<string, any> = {
        content,
        embedding: embeddingArray,
        updatedAt: now,
      };

      // Add attachments to update if provided
      if (attachments !== undefined) {
        updateData.attachments = denormalizedAttachments && denormalizedAttachments.length > 0 ? denormalizedAttachments : undefined;
      }

      await memosTable.update(updateData, { where: `memoId = '${memoId}' AND uid = '${uid}'` });

      // Trigger backup on memo update
      this.triggerBackup('memo_updated');

      // Build updated memo object with denormalized attachments
      const finalAttachments = denormalizedAttachments !== undefined 
        ? denormalizedAttachments 
        : this.convertArrowAttachments(existingMemo.attachments);
      return {
        ...existingMemo,
        content,
        attachments: finalAttachments,
        embedding,
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

      // Trigger backup on memo deletion
      this.triggerBackup('memo_deleted');

      return true;
    } catch (error) {
      console.error('Error deleting memo:', error);
      throw error;
    }
  }

  /**
   * Vector search for memos using semantic search (excludes embedding to reduce payload)
   */
  async vectorSearch(options: MemoVectorSearchOptions): Promise<MemoListItemDto[]> {
    try {
      const { uid, query, limit = 10, threshold = 0.5 } = options;

      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      const memosTable = await this.lanceDb.openTable('memos');

      // Perform vector search
      const results = await memosTable
        .search(queryEmbedding)
        .where(`uid = '${uid}'`)
        .limit(limit)
        .toArray();

      // Filter by threshold if needed
      const filtered = results.filter((item: any) => {
        // LanceDB returns _distance, lower is better
        // Convert to similarity score (0-1)
        const similarity = 1 - (item._distance || 0) / 2; // Normalize
        return similarity >= threshold;
      });

      // Use denormalized attachments directly and exclude embedding
      return filtered.map((memo: any) => ({
        memoId: memo.memoId,
        uid: memo.uid,
        content: memo.content,
        attachments: this.convertArrowAttachments(memo.attachments),
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      })) as MemoListItemDto[];
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

      // Use denormalized attachments directly
      return results.map((memo: any) => ({
        ...memo,
        attachments: this.convertArrowAttachments(memo.attachments),
      })) as Memo[];
    } catch (error) {
      console.error('Error getting all memos:', error);
      throw error;
    }
  }
}