/**
 * Migration v10: Add tags table
 * Creates a separate tags table for storing tag metadata (name, color, usage count)
 */

import { logger } from '../../utils/logger.js';

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
        logger.info('Table already exists: tags');
        return;
      }

      logger.info('Creating table: tags');
      await connection.createEmptyTable('tags', tagsSchema);
      logger.info('Table created: tags');
    } catch (error: any) {
      logger.error('Error running migration v10:', error);
      throw error;
    }
  },
};
