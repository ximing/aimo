/**
 * Migration v5: Add avatar field to users table
 * Adds avatar field for user profile pictures using LanceDB's addColumns()
 */

import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add avatar field to users table
 * Uses LanceDB's addColumns() to add the avatar column
 */
export const addAvatarToUsersMigration: Migration = {
  version: 5,
  tableName: 'users',
  description: 'Add avatar field to users table for profile pictures',
  up: async (connection: Connection) => {
    try {
      const usersTable = await connection.openTable('users');

      // Add the avatar column (nullable string, no default value needed)
      // Use an explicit cast to keep the column type as Utf8 instead of Null.
      const newColumns = [
        {
          name: 'avatar',
          valueSql: 'CAST(NULL AS STRING)',
        },
      ];

      await usersTable.addColumns(newColumns);
      logger.info('Successfully added avatar column to users table');
    } catch (error: any) {
      // Check if the column already exists or is already compatible
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between avatar')
      ) {
        logger.info('Avatar column already exists in users table, skipping migration');
        return;
      }
      logger.error('Error running migration v5:', error);
      throw error;
    }
  },
};
