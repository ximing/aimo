/**
 * Migration v10: Add tags table
 * Creates a separate tags table for storing tag metadata (name, color, usage count)
 */

import { tagsSchema } from '../../models/db/schema.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to create tags table
 */
export const addTagsTableMigration: Migration = {
  version: 10,
  tableName: 'tags',
  description: 'Create tags table for tag metadata storage',
  up: async (connection: Connection) => {
    try {
      const tableNames = await connection.tableNames();

      if (tableNames.includes('tags')) {
        console.log('Table already exists: tags');
        return;
      }

      console.log('Creating table: tags');
      await connection.createEmptyTable('tags', tagsSchema);
      console.log('Table created: tags');
    } catch (error: any) {
      console.error('Error running migration v10:', error);
      throw error;
    }
  },
};
