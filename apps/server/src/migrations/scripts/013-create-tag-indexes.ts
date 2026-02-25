/**
 * Migration v13: Create indexes on tags table
 * Creates BTREE indexes for efficient tag queries
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
    const indexConfig =
      indexType === 'BITMAP'
        ? { config: lancedb.Index.bitmap() }
        : { config: lancedb.Index.btree() };

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
 * Migration for creating indexes on tags table
 */
export const createTagIndexesMigration: Migration = {
  version: 13,
  tableName: 'tags',
  description: 'Create indexes on tags table for efficient queries',
  up: async (connection: Connection) => {
    try {
      console.log('Starting tags table index creation...');

      const tableNames = await connection.tableNames();
      if (!tableNames.includes('tags')) {
        console.log('Tags table does not exist, skipping index creation');
        return;
      }

      const table = await connection.openTable('tags');

      // uid: BTREE for filtering by user
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'tags');

      // tagId: BTREE for exact match lookup
      await createIndexIfNotExists(table, 'tagId', 'BTREE', 'tags');

      // createdAt: BTREE for date range queries
      await createIndexIfNotExists(table, 'createdAt', 'BTREE', 'tags');

      console.log('Tags table index creation completed successfully');
    } catch (error) {
      console.error('Tags table index creation failed:', error);
      throw error;
    }
  },
};
