/**
 * Migration v19: Add deletedAt field to all tables
 * Adds soft delete support by adding deletedAt bigint column (default 0) to all tables
 * Also creates indexes on deletedAt for query optimization
 */

import * as lancedb from '@lancedb/lancedb';

import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * List of all tables that need deletedAt column
 */
const TABLES_TO_MIGRATE = [
  'users',
  'memos',
  'memo_relations',
  'attachments',
  'ai_conversations',
  'ai_messages',
  'categories',
  'tags',
  'daily_recommendations',
  'push_rules',
];

/**
 * Migration to add deletedAt field to all tables
 * Uses LanceDB's addColumns() to add the deletedAt column with default value 0
 */
export const addDeletedAtMigration: Migration = {
  version: 19,
  tableName: '_all_tables',
  description: 'Add deletedAt field to all tables for soft delete support',
  up: async (connection: Connection) => {
    for (const tableName of TABLES_TO_MIGRATE) {
      try {
        logger.info(`Adding deletedAt column to ${tableName} table`);
        const table = await connection.openTable(tableName);

        // Add the deletedAt column (bigint, default 0)
        // Use CAST to ensure the column type is BIGINT
        const newColumns = [
          {
            name: 'deletedAt',
            valueSql: 'CAST(0 AS BIGINT)',
          },
        ];

        await table.addColumns(newColumns);
        logger.info(`Successfully added deletedAt column to ${tableName} table`);

        // Create index on deletedAt for query optimization
        try {
          await table.createIndex('deletedAt', {
            config: lancedb.Index.btree(),
          });
          logger.info(`Successfully created index on deletedAt for ${tableName} table`);
        } catch (indexError: any) {
          if (
            indexError.message?.includes('already exists') ||
            indexError.message?.includes('duplicate')
          ) {
            logger.info(`Index on deletedAt already exists for ${tableName} table, skipping`);
          } else {
            logger.warn(
              `Warning: Could not create index on deletedAt for ${tableName}:`,
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
          logger.info(`deletedAt column already exists in ${tableName} table, skipping`);
          continue;
        }
        logger.error(`Error adding deletedAt to ${tableName}:`, error);
        throw error;
      }
    }
  },
};
