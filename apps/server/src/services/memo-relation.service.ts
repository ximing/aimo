import { Service } from 'typedi';

import { OBJECT_TYPE } from '../models/constant/type.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { MemoRelationRecord } from '../models/db/schema.js';

@Service()
export class MemoRelationService {
  constructor(private lanceDatabase: LanceDatabaseService) {}

  /**
   * Create a relation from sourceMemoId to targetMemoId
   */
  async createRelation(
    uid: string,
    sourceMemoId: string,
    targetMemoId: string
  ): Promise<MemoRelationRecord> {
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

      const table = await this.lanceDatabase.openTable('memo_relations');
      await table.add([relation as unknown as Record<string, unknown>]);

      return relation;
    } catch (error) {
      logger.error('Failed to create relation:', error);
      throw error;
    }
  }

  /**
   * Get all related memos for a given source memo (A's relations)
   */
  async getRelatedMemos(uid: string, sourceMemoId: string): Promise<string[]> {
    try {
      const table = await this.lanceDatabase.openTable('memo_relations');

      const results = await table
        .query()
        .where(`uid = '${uid}' AND sourceMemoId = '${sourceMemoId}'`)
        .toArray();

      return results.map((record: any) => record.targetMemoId);
    } catch (error) {
      logger.error('Failed to get related memos:', error);
      throw error;
    }
  }

  /**
   * Delete a single relation
   */
  async deleteRelation(uid: string, sourceMemoId: string, targetMemoId: string): Promise<boolean> {
    try {
      const table = await this.lanceDatabase.openTable('memo_relations');

      await table.delete(
        `uid = '${uid}' AND sourceMemoId = '${sourceMemoId}' AND targetMemoId = '${targetMemoId}'`
      );

      return true;
    } catch (error) {
      logger.error('Failed to delete relation:', error);
      throw error;
    }
  }

  /**
   * Delete all relations from a source memo (cascading delete)
   */
  async deleteRelationsBySourceMemo(uid: string, sourceMemoId: string): Promise<void> {
    try {
      const table = await this.lanceDatabase.openTable('memo_relations');

      await table.delete(`uid = '${uid}' AND sourceMemoId = '${sourceMemoId}'`);
    } catch (error) {
      logger.error('Failed to delete relations by source memo:', error);
      throw error;
    }
  }

  /**
   * Delete all relations to a target memo (cleanup when target is deleted)
   */
  async deleteRelationsByTargetMemo(uid: string, targetMemoId: string): Promise<void> {
    try {
      const table = await this.lanceDatabase.openTable('memo_relations');

      await table.delete(`uid = '${uid}' AND targetMemoId = '${targetMemoId}'`);
    } catch (error) {
      logger.error('Failed to delete relations by target memo:', error);
      throw error;
    }
  }

  /**
   * Replace all relations for a source memo (update relations)
   */
  async replaceRelations(
    uid: string,
    sourceMemoId: string,
    targetMemoIds: string[]
  ): Promise<void> {
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
      logger.error('Failed to replace relations:', error);
      throw error;
    }
  }

  /**
   * Get all memos that link to the given target memo (backlinks)
   * Returns array of source memo IDs that have relations pointing to targetMemoId
   */
  async getBacklinks(uid: string, targetMemoId: string): Promise<string[]> {
    try {
      const table = await this.lanceDatabase.openTable('memo_relations');

      const results = await table
        .query()
        .where(`uid = '${uid}' AND targetMemoId = '${targetMemoId}'`)
        .toArray();

      return results.map((record: any) => record.sourceMemoId);
    } catch (error) {
      logger.error('Failed to get backlinks:', error);
      throw error;
    }
  }
}
