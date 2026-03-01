/**
 * Memo Repository
 * Handles Drizzle database operations for memos
 * Scalar data only - vectors remain in LanceDB
 */

import { Service } from 'typedi';

import { DrizzleAdapter, getMemosTable } from '../sources/database/index.js';
import type { MemosSelect, MemosInsert } from '../sources/database/schema/memos.js';

import type { CreateMemoDto, UpdateMemoDto, MemoDto, MemoListItemDto } from '@aimo/dto';

export interface MemoSearchOptions {
  uid: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
}

@Service()
export class MemoRepository {
  constructor(private drizzleAdapter: DrizzleAdapter) {}

  /**
   * Get the database client and table
   */
  private getTable(): ReturnType<typeof getMemosTable> {
    const db = this.drizzleAdapter.getDb() as any;
    const dbType = this.drizzleAdapter.getDbType();
    return getMemosTable(dbType);
  }

  /**
   * Create a new memo
   */
  async create(data: CreateMemoDto & { memoId: string; uid: string }): Promise<MemoDto> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();
    const now = Date.now();

    const insertData: Omit<MemosInsert, 'id'> = {
      memoId: data.memoId,
      uid: data.uid,
      categoryId: data.categoryId || null,
      content: data.content,
      type: data.type || 'text',
      source: data.source || null,
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      tagIds: data.tagIds ? JSON.stringify(data.tagIds) : null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(now),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(now),
    };

    await db.insert(table).values(insertData);

    return this.mapToDto(insertData as MemosSelect);
  }

  /**
   * Find memo by ID
   */
  async findById(memoId: string): Promise<MemoDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');
    const result = await db.select().from(table).where(eq(table.memoId, memoId)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToDto(result[0]);
  }

  /**
   * Find memos by user ID with pagination
   */
  async findByUserId(options: {
    uid: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: MemoDto[]; total: number }> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { uid, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    const { eq, desc, asc, and } = await import('drizzle-orm');

    // Build where conditions
    const conditions = [eq(table.uid, uid)];

    // Get total count - use a simpler approach
    const countResult = await db.select().from(table).where(and(...conditions));
    const total = countResult.length;

    // Get paginated results
    const orderColumn = sortBy === 'updatedAt' ? table.updatedAt : table.createdAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const results = await db
      .select()
      .from(table)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      items: results.map((r) => this.mapToDto(r)),
      total,
    };
  }

  /**
   * Find memos by multiple IDs (batch fetch)
   */
  async findByIds(memoIds: string[]): Promise<MemoDto[]> {
    if (!memoIds || memoIds.length === 0) {
      return [];
    }

    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { inArray } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(inArray(table.memoId, memoIds));

    // Preserve order of memoIds
    const memoMap = new Map<string, MemoDto>();
    for (const r of results) {
      memoMap.set(r.memoId, this.mapToDto(r));
    }

    return memoIds.map((id) => memoMap.get(id)).filter((m): m is MemoDto => m !== undefined);
  }

  /**
   * Update a memo
   */
  async update(memoId: string, data: UpdateMemoDto): Promise<MemoDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    // Build update data
    const updateData: Partial<MemosSelect> = {
      updatedAt: new Date(),
    };

    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId;
    }
    if (data.attachments !== undefined) {
      updateData.attachments = JSON.stringify(data.attachments);
    }
    if (data.tagIds !== undefined) {
      updateData.tagIds = JSON.stringify(data.tagIds);
    }
    if (data.tags !== undefined) {
      updateData.tags = JSON.stringify(data.tags);
    }
    if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic ? 1 : 0;
    }
    if (data.source !== undefined) {
      updateData.source = data.source;
    }

    await db.update(table).set(updateData).where(eq(table.memoId, memoId));

    return this.findById(memoId);
  }

  /**
   * Delete a memo
   */
  async delete(memoId: string): Promise<boolean> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    await db.delete(table).where(eq(table.memoId, memoId));
    return true;
  }

  /**
   * Search memos with scalar filters
   */
  async search(options: MemoSearchOptions): Promise<{ items: MemoDto[]; total: number }> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and, gte, lte, desc, asc } = await import('drizzle-orm');

    const { uid, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', categoryId, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: any[] = [eq(table.uid, uid)];

    if (categoryId) {
      conditions.push(eq(table.categoryId, categoryId));
    }

    if (startDate) {
      conditions.push(gte(table.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(table.createdAt, endDate));
    }

    // Get total count
    const countResult = await db
      .select()
      .from(table)
      .where(and(...conditions));

    const total = countResult.length;

    // Get paginated results
    const orderColumn = sortBy === 'updatedAt' ? table.updatedAt : table.createdAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const results = await db
      .select()
      .from(table)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      items: results.map((r) => this.mapToDto(r)),
      total,
    };
  }

  /**
   * Map database row to MemoDto
   */
  private mapToDto(row: MemosSelect): MemoDto {
    return {
      memoId: row.memoId,
      uid: row.uid,
      content: row.content,
      type: (row.type as 'text' | 'audio' | 'video') || 'text',
      categoryId: row.categoryId || undefined,
      attachments: row.attachments ? JSON.parse(String(row.attachments)) : undefined,
      tags: row.tags ? JSON.parse(String(row.tags)) : undefined,
      tagIds: row.tagIds ? JSON.parse(String(row.tagIds)) : undefined,
      isPublic: row.isPublic ? true : undefined,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
      source: row.source || undefined,
    };
  }
}
