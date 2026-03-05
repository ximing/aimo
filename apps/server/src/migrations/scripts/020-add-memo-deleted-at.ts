/**
 * Migration v20: Add deletedAt field to memos table
 * Adds soft delete support by adding deletedAt bigint column (default 0) to memos table
 * This migration is specifically for memos table since v19 uses tableName='_all_tables'
 * which doesn't register as a migration for the memos table
 */

import * as lancedb from '@lancedb/lancedb';

import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add deletedAt field to memos table
 * Uses LanceDB's addColumns() to add the deletedAt column with default value 0
 */
export const addDeletedAtToMemosMigration: Migration = {
  version: 20,
  tableName: 'memos',
  description: 'Add deletedAt field to memos table for soft delete support',
  up: async (connection: Connection) => {
    try {
      logger.info('Adding deletedAt column to memos table');
      const table = await connection.openTable('memos');

      // Add the deletedAt column (bigint, default 0)
      // Use CAST to ensure the column type is BIGINT
      const newColumns = [
        {
          name: 'deletedAt',
          valueSql: 'CAST(0 AS BIGINT)',
        },
      ];

      await table.addColumns(newColumns);
      logger.info('Successfully added deletedAt column to memos table');

      // Create index on deletedAt for query optimization
      try {
        await table.createIndex('deletedAt', {
          config: lancedb.Index.btree(),
        });
        logger.info('Successfully created index on deletedAt for memos table');
      } catch (indexError: any) {
        if (
          indexError.message?.includes('already exists') ||
          indexError.message?.includes('duplicate')
        ) {
          logger.info('Index on deletedAt already exists for memos table, skipping');
        } else {
          logger.warn(
            'Warning: Could not create index on deletedAt for memos:',
            indexError.message
          );
        }
      }
    } catch (error: any) {
      // Check if the column already exists
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between deletedAt')
      ) {
        logger.info('deletedAt column already exists in memos table, skipping');
        return;
      }
      logger.error('Error adding deletedAt to memos:', error);
      throw error;
    }
  },
};
