import { Service } from 'typedi';
import { LanceDbService } from '../sources/lancedb.js';
import { EmbeddingService } from './embedding.service.js';
import { BackupService } from './backup.service.js';
import type { Memo, NewMemo } from '../models/db/memo.schema.js';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

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

export interface MemoVectorSearchOptions {
  uid: string;
  query: string;
  limit?: number;
  threshold?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Service()
export class MemoService {
  constructor(
    private lanceDb: LanceDbService,
    private embeddingService: EmbeddingService,
    private backupService: BackupService
  ) {}

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
   * Create a new memo with automatic embedding
   */
  async createMemo(uid: string, content: string): Promise<Memo> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      const memo: Memo = {
        memoId: generateTypeId(OBJECT_TYPE.MEMO),
        uid,
        content,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const memosTable = await this.lanceDb.openTable('memos');
      await memosTable.add([memo as unknown as Record<string, unknown>]);

      // Trigger backup on memo creation
      this.triggerBackup('memo_created');

      return memo;
    } catch (error) {
      console.error('Error creating memo:', error);
      throw error;
    }
  }

  /**
   * Get memos for a user with pagination and filters
   */
  async getMemos(options: MemoSearchOptions): Promise<PaginatedResult<Memo>> {
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

      // Add date filters
      if (startDate) {
        filterConditions.push(`createdAt >= '${startDate.toISOString()}'`);
      }
      if (endDate) {
        filterConditions.push(`createdAt <= '${endDate.toISOString()}'`);
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
          const comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
          return sortOrder === 'asc' ? comparison : -comparison;
        })
        .slice(offset, offset + limit);

      return {
        items: results as Memo[],
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
  async getMemoById(memoId: string, uid: string): Promise<Memo | null> {
    try {
      const memosTable = await this.lanceDb.openTable('memos');

      const results = await memosTable
        .query()
        .where(`memoId = '${memoId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      return results.length > 0 ? (results[0] as Memo) : null;
    } catch (error) {
      console.error('Error getting memo by ID:', error);
      throw error;
    }
  }

  /**
   * Update a memo
   */
  async updateMemo(memoId: string, uid: string, content: string): Promise<Memo | null> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Memo content cannot be empty');
      }

      // Find existing memo
      const existingMemo = await this.getMemoById(memoId, uid);
      if (!existingMemo) {
        throw new Error('Memo not found');
      }

      // Generate new embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      const memosTable = await this.lanceDb.openTable('memos');

      // Update the memo
      const updateData: Record<string, string> = {
        content,
        embedding: JSON.stringify(embedding),
        updatedAt: new Date().toISOString(),
      };

      await memosTable.update(updateData, { where: `memoId = '${memoId}' AND uid = '${uid}'` });

      // Trigger backup on memo update
      this.triggerBackup('memo_updated');

      return {
        ...existingMemo,
        content,
        embedding,
        updatedAt: new Date(),
      };
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
   * Vector search for memos using semantic search
   */
  async vectorSearch(options: MemoVectorSearchOptions): Promise<Memo[]> {
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

      return filtered as Memo[];
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

      return results as Memo[];
    } catch (error) {
      console.error('Error getting all memos:', error);
      throw error;
    }
  }
}
