import { Service } from 'typedi';
import { LanceDbService } from '../sources/lancedb.js';
import type { MemoRelationRecord } from '../models/db/schema.js';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

@Service()
export class MemoRelationService {
  constructor(private lanceDb: LanceDbService) {}

  /**
   * Create a relation from sourceMemoId to targetMemoId
   */
  async createRelation(uid: string, sourceMemoId: string, targetMemoId: string): Promise<MemoRelationRecord> {
    try {
      if (sourceMemoId === targetMemoId) {
        throw new Error('A memo cannot be related to itself');
      }

      const relationId = generateTypeId(OBJECT_TYPE.RELATION);
      const now = Date.now();

      const relation: MemoRelationRecord = {
        relationId,
        uid,
        sourceMemoId,
        targetMemoId,
        createdAt: now,
      };

      const table = await this.lanceDb.openTable('memo_relations');
      await table.add([relation as unknown as Record<string, unknown>]);

      return relation;
    } catch (error) {
      console.error('Failed to create relation:', error);
      throw error;
    }
  }

  /**
   * Get all related memos for a given source memo (A's relations)
   */
  async getRelatedMemos(uid: string, sourceMemoId: string): Promise<string[]> {
    try {
      const table = await this.lanceDb.openTable('memo_relations');

      const results = await table
        .query()
        .where(`uid = '${uid}' AND sourceMemoId = '${sourceMemoId}'`)
        .toArray();

      return results.map((record: any) => record.targetMemoId);
    } catch (error) {
      console.error('Failed to get related memos:', error);
      throw error;
    }
  }

  /**
   * Delete a single relation
   */
  async deleteRelation(uid: string, sourceMemoId: string, targetMemoId: string): Promise<boolean> {
    try {
      const table = await this.lanceDb.openTable('memo_relations');

      await table.delete(
        `uid = '${uid}' AND sourceMemoId = '${sourceMemoId}' AND targetMemoId = '${targetMemoId}'`
      );

      return true;
    } catch (error) {
      console.error('Failed to delete relation:', error);
      throw error;
    }
  }

  /**
   * Delete all relations from a source memo (cascading delete)
   */
  async deleteRelationsBySourceMemo(uid: string, sourceMemoId: string): Promise<void> {
    try {
      const table = await this.lanceDb.openTable('memo_relations');

      await table.delete(`uid = '${uid}' AND sourceMemoId = '${sourceMemoId}'`);
    } catch (error) {
      console.error('Failed to delete relations by source memo:', error);
      throw error;
    }
  }

  /**
   * Delete all relations to a target memo (cleanup when target is deleted)
   */
  async deleteRelationsByTargetMemo(uid: string, targetMemoId: string): Promise<void> {
    try {
      const table = await this.lanceDb.openTable('memo_relations');

      await table.delete(`uid = '${uid}' AND targetMemoId = '${targetMemoId}'`);
    } catch (error) {
      console.error('Failed to delete relations by target memo:', error);
      throw error;
    }
  }

  /**
   * Replace all relations for a source memo (update relations)
   */
  async replaceRelations(uid: string, sourceMemoId: string, targetMemoIds: string[]): Promise<void> {
    try {
      // Delete existing relations
      await this.deleteRelationsBySourceMemo(uid, sourceMemoId);

      // Create new relations
      if (targetMemoIds && targetMemoIds.length > 0) {
        for (const targetMemoId of targetMemoIds) {
          await this.createRelation(uid, sourceMemoId, targetMemoId);
        }
      }
    } catch (error) {
      console.error('Failed to replace relations:', error);
      throw error;
    }
  }
}
