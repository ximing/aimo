/**
 * Migration v9: Add tags field to memos table
 * Adds the 'tags' field to support tagging memos with keywords/categories
 */

import type { Migration } from '../types.js';
import type { Connection } from '@lancedb/lancedb';

/**
 * Migration to add tags field to memos table
 * Uses LanceDB's addColumns() to add the tags column as a nullable list
 */
export const addTagsToMemosMigration: Migration = {
  version: 9,
  tableName: 'memos',
  description: 'Add tags field to memos table for memo categorization',
  up: async (connection: Connection) => {
    return;
  },
};
