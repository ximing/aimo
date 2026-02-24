/**
 * Migration v9: Add tags field to memos table
 * Adds the 'tags' field to support tagging memos with keywords/categories
 */

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add tags field to memos table
 * Uses LanceDB's addColumns() to add the tags column as a nullable list
 */
export const addTagsToMemosMigration: Migration = {
  version: 9,
  tableName: 'memos',
  description: 'Add tags field to memos table for memo categorization',
  up: async (connection: Connection) => {
    try {
      const memosTable = await connection.openTable('memos');

      // Add the tags column - use NULL as default value
      // Existing records will have NULL, which code handles as empty array
      const newColumns = [
        {
          name: 'tags',
          valueSql: 'NULL',
        },
      ];

      await memosTable.addColumns(newColumns);
      console.log('Successfully added tags column to memos table');
    } catch (error: any) {
      // Check if the column already exists
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between')
      ) {
        console.log('Tags column already exists in memos table, skipping migration');
        return;
      }
      console.error('Error running migration v9:', error);
      throw error;
    }
  },
};
