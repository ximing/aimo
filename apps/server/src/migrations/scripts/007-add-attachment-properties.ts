/**
 * Migration v7: Add properties field to attachments table
 * Adds properties field for storing attachment metadata (duration, width, height, etc.)
 */

import { logger } from '../../utils/logger.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add properties field to attachments table
 * Uses LanceDB's addColumns() to add the properties column as JSON string
 */
export const addPropertiesToAttachmentsMigration: Migration = {
  version: 7,
  tableName: 'attachments',
  description:
    'Add properties field to attachments table for storing metadata like duration, width, height',
  up: async (connection: Connection) => {
    try {
      const attachmentsTable = await connection.openTable('attachments');

      // Add the properties column (nullable JSON string, default to empty object)
      // Use CAST(NULL AS STRING) to explicitly set the column type as Utf8 instead of Null
      const newColumns = [
        {
          name: 'properties',
          valueSql: "'{}'",
        },
      ];

      await attachmentsTable.addColumns(newColumns);
      logger.info('Successfully added properties column to attachments table');
    } catch (error: any) {
      // Check if the column already exists or is already compatible
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate') ||
        error.message?.includes('Type conflicts between properties')
      ) {
        logger.info('Properties column already exists in attachments table, skipping migration');
        return;
      }
      logger.error('Error running migration v7:', error);
      throw error;
    }
  },
};
