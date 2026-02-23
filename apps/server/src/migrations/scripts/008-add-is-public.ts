/**
 * Migration v8: Add isPublic field to memos table
 * Adds isPublic field for controlling memo visibility (public/private)
 */

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add isPublic column to memos table
 * Uses LanceDB's addColumns() to add the isPublic column as nullable boolean
 */
export const addIsPublicToMemosMigration: Migration = {
  version: 8,
  tableName: 'memos',
  description: 'Add isPublic field to memos table for controlling visibility',
  up: async (connection: Connection) => {
    try {
      const memosTable = await connection.openTable('memos');

      // Add the isPublic column (nullable boolean, default to false)
      const newColumns = [
        {
          name: 'isPublic',
          valueSql: 'false',
        },
      ];

      await memosTable.addColumns(newColumns);
      console.log('Successfully added isPublic column to memos table');
    } catch (error: any) {
      // Check if the column already exists or is already compatible
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between')
      ) {
        console.log('isPublic column already exists in memos table, skipping migration');
        return;
      }
      console.error('Error running migration v8:', error);
      throw error;
    }
  },
};
