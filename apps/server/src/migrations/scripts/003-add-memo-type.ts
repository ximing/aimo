/**
 * Migration v3: Add type field to memos table
 * Adds the 'type' field to support different memo types: text, audio, video
 * Sets all existing memos to 'text' type for backward compatibility
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';

/**
 * Migration to add type field to memos table
 * Uses LanceDB's addColumns() to add the type column with default value 'text'
 */
export const addMemoTypeMigration: Migration = {
  version: 3,
  tableName: 'memos',
  description: 'Add type field to memos table (text, audio, video)',
  up: async (connection: Connection) => {
    try {
      const memosTable = await connection.openTable('memos');

      // Add the type column with literal default value 'text' for all existing records
      // Using a literal string instead of referencing the column (which doesn't exist yet)
      const newColumns = [
        {
          name: 'type',
          valueSql: "'text'",
        },
      ];

      await memosTable.addColumns(newColumns);
      console.log('Successfully added type column to memos table with default value "text"');
    } catch (error: any) {
      // Check if the column already exists
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('Type column already exists in memos table, skipping migration');
        return;
      }
      console.error('Error running migration v3:', error);
      throw error;
    }
  },
};
