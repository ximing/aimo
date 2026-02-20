/**
 * Migration v2: Create scalar indexes for query optimization
 * Creates BTREE and BITMAP indexes for all tables to optimize query performance
 *
 * Index Strategy:
 * - BTREE indexes: for exact match, range queries, and sorting on indexed fields
 * - BITMAP indexes: for low-cardinality fields (status, flags, modality types)
 * - Single-column indexes: LanceDB doesn't support composite indexes yet
 *
 * This migration creates indexes for all business tables to ensure optimal query performance.
 */

import * as lancedb from '@lancedb/lancedb';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Helper function to create a scalar index if it doesn't already exist
 */
async function createIndexIfNotExists(
  table: any,
  columnName: string,
  indexType: 'BTREE' | 'BITMAP' = 'BTREE',
  tableName: string = 'unknown'
): Promise<void> {
  try {
    // Create the appropriate index type using LanceDB API
    const indexConfig = indexType === 'BITMAP' ? { config: lancedb.Index.bitmap() } : { config: lancedb.Index.btree() };

    await table.createIndex(columnName, indexConfig);
    console.log(`Created ${indexType} index on ${tableName}.${columnName}`);
  } catch (error: any) {
    // Index already exists or other error
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.debug(`Index already exists on ${tableName}.${columnName}`);
    } else {
      console.warn(`Failed to create index on ${tableName}.${columnName}:`, error.message);
    }
  }
}

/**
 * Create all indexes for a specific table
 */
async function createIndexesForTable(connection: Connection, tableName: string): Promise<void> {
  const table = await connection.openTable(tableName);

  switch (tableName) {
    case 'users':
      // uid: BTREE for exact match queries
      // email, phone: BTREE for login and lookup queries
      // status: BITMAP for low-cardinality filtering
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'users');
      await createIndexIfNotExists(table, 'email', 'BTREE', 'users');
      await createIndexIfNotExists(table, 'phone', 'BTREE', 'users');
      await createIndexIfNotExists(table, 'status', 'BITMAP', 'users');
      break;

    case 'memos':
      // uid: BTREE for filtering by user
      // categoryId: BTREE for filtering by category
      // createdAt, updatedAt: BTREE for range queries and sorting
      // memoId: BTREE for exact match lookup
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'memos');
      await createIndexIfNotExists(table, 'memoId', 'BTREE', 'memos');
      await createIndexIfNotExists(table, 'categoryId', 'BTREE', 'memos');
      await createIndexIfNotExists(table, 'createdAt', 'BTREE', 'memos');
      await createIndexIfNotExists(table, 'updatedAt', 'BTREE', 'memos');
      break;

    case 'memo_relations':
      // uid: BTREE for user isolation
      // relationId: BTREE for exact match lookup
      // sourceMemoId: BTREE for querying relations from a memo
      // targetMemoId: BTREE for reverse lookup
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'memo_relations');
      await createIndexIfNotExists(table, 'relationId', 'BTREE', 'memo_relations');
      await createIndexIfNotExists(table, 'sourceMemoId', 'BTREE', 'memo_relations');
      await createIndexIfNotExists(table, 'targetMemoId', 'BTREE', 'memo_relations');
      break;

    case 'categories':
      // uid: BTREE for filtering by user
      // categoryId: BTREE for exact match lookup
      // createdAt: BTREE for date range queries
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'categories');
      await createIndexIfNotExists(table, 'categoryId', 'BTREE', 'categories');
      await createIndexIfNotExists(table, 'createdAt', 'BTREE', 'categories');
      break;

    case 'attachments':
      // uid: BTREE for filtering by user
      // attachmentId: BTREE for exact match lookup
      // createdAt: BTREE for date range queries
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'attachments');
      await createIndexIfNotExists(table, 'attachmentId', 'BTREE', 'attachments');
      await createIndexIfNotExists(table, 'createdAt', 'BTREE', 'attachments');
      break;

    case 'embedding_cache':
      // contentHash: BTREE for cache lookup
      // modelHash: BTREE for model-specific cache filtering
      await createIndexIfNotExists(table, 'contentHash', 'BTREE', 'embedding_cache');
      await createIndexIfNotExists(table, 'modelHash', 'BTREE', 'embedding_cache');
      break;

    case 'multimodal_embedding_cache':
      // contentHash: BTREE for cache lookup
      // modelHash: BTREE for model-specific cache filtering
      // modalityType: BITMAP for low-cardinality modality filtering (text, image, video)
      await createIndexIfNotExists(table, 'contentHash', 'BTREE', 'multimodal_embedding_cache');
      await createIndexIfNotExists(table, 'modelHash', 'BTREE', 'multimodal_embedding_cache');
      await createIndexIfNotExists(table, 'modalityType', 'BITMAP', 'multimodal_embedding_cache');
      break;

    case 'table_migrations':
      // tableName: BTREE for version lookup
      await createIndexIfNotExists(table, 'tableName', 'BTREE', 'table_migrations');
      break;
  }
}

/**
 * Migration for creating indexes on all tables
 */
export const createIndexesMigration: Migration = {
  version: 2,
  tableName: 'indexes',
  description: 'Create scalar indexes (BTREE and BITMAP) for query optimization on all tables',
  up: async (connection: Connection) => {
    try {
      console.log('Starting index creation migration...');

      // List of all tables that need indexes
      const tablesToIndex = [
        'users',
        'memos',
        'memo_relations',
        'categories',
        'attachments',
        'embedding_cache',
        'multimodal_embedding_cache',
        'table_migrations',
      ];

      // Get existing tables
      const existingTables = await connection.tableNames();

      // Create indexes for each existing table
      for (const tableName of tablesToIndex) {
        if (existingTables.includes(tableName)) {
          console.log(`Creating indexes for table: ${tableName}`);
          await createIndexesForTable(connection, tableName);
        } else {
          console.debug(`Table ${tableName} does not exist, skipping index creation`);
        }
      }

      console.log('Index creation migration completed successfully');
    } catch (error) {
      console.error('Index creation migration failed:', error);
      throw error;
    }
  },
};
