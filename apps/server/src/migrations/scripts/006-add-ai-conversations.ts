/**
 * Migration v6: Add AI conversations and messages tables
 * Creates tables for storing AI conversation data
 */

import { logger } from '../../utils/logger.js';

import { aiConversationsSchema, aiMessagesSchema } from '../../models/db/schema.js';

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Helper function to create a table if it doesn't exist
 */
async function createTableIfNotExists(
  connection: Connection,
  tableName: string,
  schema: any
): Promise<void> {
  const tableNames = await connection.tableNames();

  if (tableNames.includes(tableName)) {
    logger.info(`Table already exists: ${tableName}`);
  } else {
    logger.info(`Creating table: ${tableName}`);
    await connection.createEmptyTable(tableName, schema);
    logger.info(`Table created: ${tableName}`);
  }
}

/**
 * Migration for ai_conversations table
 */
export const aiConversationsTableMigration: Migration = {
  version: 6,
  tableName: 'ai_conversations',
  description: 'Initialize ai_conversations table for storing AI conversation sessions',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'ai_conversations', aiConversationsSchema);
  },
};

/**
 * Migration for ai_messages table
 */
export const aiMessagesTableMigration: Migration = {
  version: 6,
  tableName: 'ai_messages',
  description: 'Initialize ai_messages table for storing AI conversation messages',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'ai_messages', aiMessagesSchema);
  },
};
