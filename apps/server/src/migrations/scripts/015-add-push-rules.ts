/**
 * Migration v15: Add push_rules table
 * Creates the push_rules table for storing user push notification configurations
 */

import { pushRulesSchema } from '../../models/db/schema.js';

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
    console.log(`Table already exists: ${tableName}`);
  } else {
    console.log(`Creating table: ${tableName}`);
    await connection.createEmptyTable(tableName, schema);
    console.log(`Table created: ${tableName}`);
  }
}

/**
 * Migration for push_rules table
 */
export const pushRulesTableMigration: Migration = {
  version: 15,
  tableName: 'push_rules',
  description: 'Initialize push_rules table for storing user push notification configurations',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'push_rules', pushRulesSchema);
  },
};
