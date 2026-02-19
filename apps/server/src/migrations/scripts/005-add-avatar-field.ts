/**
 * Migration v5: Add avatar field to users table
 * Adds avatar field for user profile pictures using LanceDB's addColumns()
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';

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

      // Add the avatar column (nullable, no default value needed)
      const newColumns = [
        {
          name: 'avatar',
          valueSql: 'NULL',
        },
      ];

      await usersTable.addColumns(newColumns);
      console.log('Successfully added avatar column to users table');
    } catch (error: any) {
      // Check if the column already exists
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log('Avatar column already exists in users table, skipping migration');
        return;
      }
      console.error('Error running migration v5:', error);
      throw error;
    }
  },
};
