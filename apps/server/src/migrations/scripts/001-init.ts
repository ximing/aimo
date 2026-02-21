/**
 * Migration v1: Initialize all tables
 * This is the initial schema setup for all core tables
 */

import {
  usersSchema,
  memosSchema,
  memoRelationsSchema,
  categoriesSchema,
  embeddingCacheSchema,
  attachmentsSchema,
  multimodalEmbeddingCacheSchema,
  dailyRecommendationsSchema,
} from '../../models/db/schema.js';

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
    console.log(`Table already exists: ${tableName}`);
  } else {
    console.log(`Creating table: ${tableName}`);
    await connection.createEmptyTable(tableName, schema);
    console.log(`Table created: ${tableName}`);
  }
}

/**
 * Migration for users table
 */
export const usersTableMigration: Migration = {
  version: 1,
  tableName: 'users',
  description: 'Initialize users table with user account information',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'users', usersSchema);
  },
};

/**
 * Migration for memos table
 */
export const memosTableMigration: Migration = {
  version: 1,
  tableName: 'memos',
  description: 'Initialize memos table with embedding vectors for semantic search',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'memos', memosSchema);
  },
};

/**
 * Migration for memo_relations table
 */
export const memoRelationsTableMigration: Migration = {
  version: 1,
  tableName: 'memo_relations',
  description: 'Initialize memo_relations table for memo relationship tracking',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'memo_relations', memoRelationsSchema);
  },
};

/**
 * Migration for categories table
 */
export const categoriesTableMigration: Migration = {
  version: 1,
  tableName: 'categories',
  description: 'Initialize categories table for memo categorization',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'categories', categoriesSchema);
  },
};

/**
 * Migration for embedding_cache table
 */
export const embeddingCacheTableMigration: Migration = {
  version: 1,
  tableName: 'embedding_cache',
  description: 'Initialize embedding_cache table for caching text embeddings',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'embedding_cache', embeddingCacheSchema);
  },
};

/**
 * Migration for attachments table
 */
export const attachmentsTableMigration: Migration = {
  version: 1,
  tableName: 'attachments',
  description: 'Initialize attachments table with file metadata',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'attachments', attachmentsSchema);
  },
};

/**
 * Migration for multimodal_embedding_cache table
 */
export const multimodalEmbeddingCacheTableMigration: Migration = {
  version: 1,
  tableName: 'multimodal_embedding_cache',
  description: 'Initialize multimodal_embedding_cache table for caching multimodal embeddings',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'multimodal_embedding_cache', multimodalEmbeddingCacheSchema);
  },
};

/**
 * Migration for daily_recommendations table
 */
export const dailyRecommendationsTableMigration: Migration = {
  version: 1,
  tableName: 'daily_recommendations',
  description: 'Initialize daily_recommendations table for caching daily memo recommendations',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'daily_recommendations', dailyRecommendationsSchema);
  },
};
