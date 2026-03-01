/**
 * Migration v18: Backfill memo_vectors from legacy memos table
 *
 * In the old architecture, memo embeddings were stored in `memos.embedding`.
 * In the new hybrid architecture, embeddings are stored in `memo_vectors`.
 * This migration copies existing embeddings into memo_vectors so semantic search
 * continues to work after upgrade.
 */

import { config } from '../../config/config.js';
import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

interface LegacyMemoRecord {
  memoId?: unknown;
  embedding?: unknown;
}

function normalizeEmbedding(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
      return value;
    }
    return undefined;
  }

  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const vector = [...(value as unknown as Iterable<number>)];
    if (vector.every((item) => Number.isFinite(item))) {
      return vector;
    }
  }

  return undefined;
}

/**
 * Backfill migration for memo_vectors table
 */
export const backfillMemoVectorsMigration: Migration = {
  version: 18,
  tableName: 'memo_vectors',
  description: 'Backfill memo_vectors with embeddings from legacy memos table',
  up: async (connection: Connection) => {
    const tableNames = await connection.tableNames();

    if (!tableNames.includes('memo_vectors')) {
      logger.warn('memo_vectors table does not exist, skipping backfill migration');
      return;
    }

    if (!tableNames.includes('memos')) {
      logger.info('memos table does not exist, skipping memo_vectors backfill migration');
      return;
    }

    const memoVectorsTable = await connection.openTable('memo_vectors');
    const memosTable = await connection.openTable('memos');

    const sourceMemos = (await memosTable.query().toArray()) as LegacyMemoRecord[];
    if (sourceMemos.length === 0) {
      logger.info('No records found in memos table, skipping memo_vectors backfill migration');
      return;
    }

    const existingVectorRecords = await memoVectorsTable.query().toArray();
    const existingMemoIds = new Set<string>();

    for (const record of existingVectorRecords) {
      const memoId = (record as { memoId?: unknown }).memoId;
      if (typeof memoId === 'string' && memoId.length > 0) {
        existingMemoIds.add(memoId);
      }
    }

    const expectedDimensions = config.openai.embeddingDimensions || 1536;
    const vectorsToInsert: Array<Record<string, unknown>> = [];

    let skippedExisting = 0;
    let skippedNoEmbedding = 0;
    let skippedInvalidDimension = 0;
    let skippedInvalidMemoId = 0;

    for (const memo of sourceMemos) {
      if (typeof memo.memoId !== 'string' || memo.memoId.length === 0) {
        skippedInvalidMemoId++;
        continue;
      }

      if (existingMemoIds.has(memo.memoId)) {
        skippedExisting++;
        continue;
      }

      const embedding = normalizeEmbedding(memo.embedding);
      if (!embedding || embedding.length === 0) {
        skippedNoEmbedding++;
        continue;
      }

      if (embedding.length !== expectedDimensions) {
        skippedInvalidDimension++;
        continue;
      }

      vectorsToInsert.push({
        memoId: memo.memoId,
        embedding,
      });

      existingMemoIds.add(memo.memoId);
    }

    if (vectorsToInsert.length === 0) {
      logger.info('No memo vectors need backfill', {
        skippedExisting,
        skippedNoEmbedding,
        skippedInvalidDimension,
        skippedInvalidMemoId,
      });
      return;
    }

    const batchSize = 200;
    let batchStart = 0;
    while (batchStart < vectorsToInsert.length) {
      const batch = vectorsToInsert.slice(batchStart, batchStart + batchSize);
      await memoVectorsTable.add(batch);
      batchStart += batchSize;
    }

    logger.info('Memo vectors backfill completed', {
      inserted: vectorsToInsert.length,
      skippedExisting,
      skippedNoEmbedding,
      skippedInvalidDimension,
      skippedInvalidMemoId,
      sourceCount: sourceMemos.length,
      existingVectorCount: existingVectorRecords.length,
    });
  },
};
