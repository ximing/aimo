/**
 * Migration v17: Add vector-only tables for memo and attachment embeddings
 * This migration creates separate tables for storing only vector embeddings
 * Scalar data is now stored in MySQL (from US-001 to US-015)
 */

import {
  memoVectorsSchema,
  attachmentVectorsSchema,
} from '../../models/db/schema.js';
import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Helper function to create a table if it doesn't exist
 */
async function createTableIfNotExists(
  connection: Connection,
  tableName: string,
  schema: any
): Promise<void> {
  const tableNames = await connection.tableNames();

  if (tableNames.includes(tableName)) {
    logger.info(`Table already exists: ${tableName}`);
  } else {
    logger.info(`Creating table: ${tableName}`);
    await connection.createEmptyTable(tableName, schema);
    logger.info(`Table created: ${tableName}`);
  }
}

/**
 * Migration for memo_vectors table
 */
export const memoVectorsTableMigration: Migration = {
  version: 17,
  tableName: 'memo_vectors',
  description: 'Create memo_vectors table for storing only memo embeddings (scalar data in MySQL)',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'memo_vectors', memoVectorsSchema);
  },
};

/**
 * Migration for attachment_vectors table
 */
export const attachmentVectorsTableMigration: Migration = {
  version: 17,
  tableName: 'attachment_vectors',
  description: 'Create attachment_vectors table for storing only multimodal embeddings (scalar data in MySQL)',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'attachment_vectors', attachmentVectorsSchema);
  },
};
