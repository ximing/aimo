/**
 * Migration v16: Add source field to memos table
 * Adds source field for storing source URL (e.g., from Chrome extension)
 */

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add source field to memos table
 * Uses LanceDB's addColumns() to add the source column
 */
export const addSourceToMemosMigration: Migration = {
  version: 16,
  tableName: 'memos',
  description: 'Add source field to memos table for storing source URL',
  up: async (connection: Connection) => {
    try {
      const memosTable = await connection.openTable('memos');

      // Add the source column (nullable string, no default value needed)
      // Use an explicit cast to keep the column type as Utf8 instead of Null.
      const newColumns = [
        {
          name: 'source',
          valueSql: 'CAST(NULL AS STRING)',
        },
      ];

      await memosTable.addColumns(newColumns);
      console.log('Successfully added source column to memos table');
    } catch (error: any) {
      // Check if the column already exists or is already compatible
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between source')
      ) {
        console.log('Source column already exists in memos table, skipping migration');
        return;
      }
      console.error('Error running migration v16:', error);
      throw error;
    }
  },
};
