/**
 * Memo Relation Repository
 * Handles Drizzle database operations for memo relations
 */

import { Service } from 'typedi';

import { DrizzleAdapter, getMemoRelationsTable } from '../sources/database/index.js';
import type { MemoRelationsSelect, MemoRelationsInsert } from '../sources/database/schema/memo-relations.js';

export interface CreateRelationData {
  relationId: string;
  uid: string;
  sourceMemoId: string;
  targetMemoId: string;
}

@Service()
export class MemoRelationRepository {
  constructor(private drizzleAdapter: DrizzleAdapter) {}

  /**
   * Get the database client and table
   */
  private getTable() {
    const db = this.drizzleAdapter.getDb() as any;
    const dbType = this.drizzleAdapter.getDbType();
    return getMemoRelationsTable(dbType);
  }

  /**
   * Create a new relation
   */
  async create(data: CreateRelationData): Promise<MemoRelationsSelect> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();
    const now = Date.now();

    const insertData: Omit<MemoRelationsInsert, 'id'> = {
      relationId: data.relationId,
      uid: data.uid,
      sourceMemoId: data.sourceMemoId,
      targetMemoId: data.targetMemoId,
      createdAt: new Date(now),
    };

    await db.insert(table).values(insertData);

    return insertData as MemoRelationsSelect;
  }

  /**
   * Find relations by source memo ID
   */
  async findBySourceMemoId(uid: string, sourceMemoId: string): Promise<string[]> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(and(eq(table.uid, uid), eq(table.sourceMemoId, sourceMemoId)));

    return results.map((r) => r.targetMemoId);
  }

  /**
   * Find relations by target memo ID (backlinks)
   */
  async findByTargetMemoId(uid: string, targetMemoId: string): Promise<string[]> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(and(eq(table.uid, uid), eq(table.targetMemoId, targetMemoId)));

    return results.map((r) => r.sourceMemoId);
  }

  /**
   * Delete a specific relation
   */
  async delete(uid: string, sourceMemoId: string, targetMemoId: string): Promise<boolean> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    await db
      .delete(table)
      .where(
        and(
          eq(table.uid, uid),
          eq(table.sourceMemoId, sourceMemoId),
          eq(table.targetMemoId, targetMemoId)
        )
      );

    return true;
  }

  /**
   * Delete all relations from a source memo
   */
  async deleteBySourceMemoId(uid: string, sourceMemoId: string): Promise<void> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    await db
      .delete(table)
      .where(and(eq(table.uid, uid), eq(table.sourceMemoId, sourceMemoId)));
  }

  /**
   * Delete all relations to a target memo
   */
  async deleteByTargetMemoId(uid: string, targetMemoId: string): Promise<void> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq, and } = await import('drizzle-orm');

    await db
      .delete(table)
      .where(and(eq(table.uid, uid), eq(table.targetMemoId, targetMemoId)));
  }

  /**
   * Replace all relations for a source memo
   */
  async replaceRelations(
    uid: string,
    sourceMemoId: string,
    targetMemoIds: string[],
    generateRelationId: () => string
  ): Promise<void> {
    // Delete existing relations
    await this.deleteBySourceMemoId(uid, sourceMemoId);

    // Create new relations
    for (const targetMemoId of targetMemoIds) {
      await this.create({
        relationId: generateRelationId(),
        uid,
        sourceMemoId,
        targetMemoId,
      });
    }
  }
}
