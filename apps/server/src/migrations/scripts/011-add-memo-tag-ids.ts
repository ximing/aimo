/**
 * Migration v11: Add tagIds field to memos table
 * Adds the 'tagIds' field to store references to tags in the tags table
 */

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add tagIds field to memos table
 * Uses LanceDB's addColumns() to add the tagIds column as a nullable list
 */
export const addTagIdsToMemosMigration: Migration = {
  version: 11,
  tableName: 'memos',
  description: 'Add tagIds field to memos table for tag ID references',
  up: async (connection: Connection) => {
    try {
      const memosTable = await connection.openTable('memos');

      // Add the tagIds column - explicitly cast NULL to list type
      // This prevents the column from being inferred as a Null type
      const newColumns = [
        {
          name: 'tagIds',
          valueSql: "arrow_cast(NULL, 'List(Utf8)')",
        },
      ];

      await memosTable.addColumns(newColumns);
      console.log('Successfully added tagIds column to memos table');
    } catch (error: any) {
      // Check if the column already exists
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between')
      ) {
        console.log('TagIds column already exists in memos table, skipping migration');
        return;
      }
      console.error('Error running migration v11:', error);
      throw error;
    }
  },
};
