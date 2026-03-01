/**
 * Migration v17: DEPRECATED - Vector-only tables are no longer used
 *
 * We now keep complete memos and attachments tables in LanceDB (scalar + vector)
 * This allows for efficient filtering during vector search
 *
 * This migration is kept for historical reference but does nothing
 */

import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration for memo_vectors table - DEPRECATED
 */
export const memoVectorsTableMigration: Migration = {
  version: 17,
  tableName: 'memo_vectors',
  description: 'DEPRECATED: Vector-only tables no longer used',
  up: async (connection: Connection) => {
    logger.info('Migration 017 (memo_vectors): Skipped - vector-only tables deprecated');
    // No-op: We keep complete memos table in LanceDB instead
  },
};

/**
 * Migration for attachment_vectors table - DEPRECATED
 */
export const attachmentVectorsTableMigration: Migration = {
  version: 17,
  tableName: 'attachment_vectors',
  description: 'DEPRECATED: Vector-only tables no longer used',
  up: async (connection: Connection) => {
    logger.info('Migration 017 (attachment_vectors): Skipped - vector-only tables deprecated');
    // No-op: We keep complete attachments table in LanceDB instead
  },
};
