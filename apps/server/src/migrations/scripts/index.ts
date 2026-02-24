/**
 * Migration Scripts Index
 * Exports all available migrations
 */

import {
  usersTableMigration,
  memosTableMigration,
  memoRelationsTableMigration,
  categoriesTableMigration,
  embeddingCacheTableMigration,
  attachmentsTableMigration,
  multimodalEmbeddingCacheTableMigration,
  dailyRecommendationsTableMigration,
} from './001-init.js';
import { createIndexesMigration } from './002-create-indexes.js';
import { addMemoTypeMigration } from './003-add-memo-type.js';
import { addDiaryCategoryMigration } from './004-add-diary-category.js';
import { addAvatarToUsersMigration } from './005-add-avatar-field.js';
import {
  aiConversationsTableMigration,
  aiMessagesTableMigration,
} from './006-add-ai-conversations.js';
import { addPropertiesToAttachmentsMigration } from './007-add-attachment-properties.js';
import { addIsPublicToMemosMigration } from './008-add-is-public.js';
import { addTagsToMemosMigration } from './009-add-tags-field.js';
import { addTagsTableMigration } from './010-add-tags-table.js';
import { addTagIdsToMemosMigration } from './011-add-memo-tag-ids.js';
import { migrateTagsDataMigration } from './012-migrate-tags-data.js';
import { createTagIndexesMigration } from './013-create-tag-indexes.js';
import { fixTagIdsColumnTypeMigration } from './014-fix-tag-ids-column-type.js';

import type { Migration } from '../types.js';

/**
 * All available migrations organized by table and version
 * Each migration is executed in order of version number
 *
 * Execution order:
 * 1. Version 1: Initialize all tables (001-init.ts)
 * 2. Version 2: Create indexes on all tables (002-create-indexes.ts)
 * 3. Future versions can add new fields, tables, or optimizations
 */
export const ALL_MIGRATIONS: Migration[] = [
  // Version 1: Initial schema - create all tables
  usersTableMigration,
  memosTableMigration,
  memoRelationsTableMigration,
  categoriesTableMigration,
  embeddingCacheTableMigration,
  attachmentsTableMigration,
  multimodalEmbeddingCacheTableMigration,
  dailyRecommendationsTableMigration,

  // Version 2: Create scalar indexes for query optimization
  createIndexesMigration,

  // Version 3: Add type field to memos table
  addMemoTypeMigration,

  // Version 4: Add "日记" category for existing users
  addDiaryCategoryMigration,

  // Version 5: Add avatar field to users table
  addAvatarToUsersMigration,

  // Version 6: Add AI conversations and messages tables
  aiConversationsTableMigration,
  aiMessagesTableMigration,

  // Version 7: Add properties field to attachments table
  addPropertiesToAttachmentsMigration,

  // Version 8: Add isPublic field to memos table
  addIsPublicToMemosMigration,

  // Version 9: Add tags field to memos table
  addTagsToMemosMigration,

  // Version 10: Create tags table
  addTagsTableMigration,

  // Version 11: Add tagIds field to memos table
  addTagIdsToMemosMigration,

  // Version 12: Migrate existing tags data
  migrateTagsDataMigration,

  // Version 13: Create indexes on tags table
  createTagIndexesMigration,

  // Version 14: Fix tagIds column type if it was inferred as Null
  fixTagIdsColumnTypeMigration,

  // Add future migrations here
  // Example:
  // - Version 14: Add new field to existing table
  // - Version 15: Add new table
  // etc.
];

/**
 * Get all migrations for a specific table
 */
export function getMigrationsForTable(tableName: string): Migration[] {
  return ALL_MIGRATIONS.filter((m) => m.tableName === tableName).sort((a, b) => a.version - b.version);
}

/**
 * Get migrations from a specific version onwards for a table
 */
export function getMigrationsFromVersion(tableName: string, fromVersion: number): Migration[] {
  return getMigrationsForTable(tableName).filter((m) => m.version > fromVersion);
}

/**
 * Get the latest version for a table
 */
export function getLatestVersion(tableName: string): number {
  const migrations = getMigrationsForTable(tableName);
  if (migrations.length === 0) {
    return 0;
  }
  return Math.max(...migrations.map((m) => m.version));
}

/**
 * Get all table names that have migrations
 */
export function getAllTableNames(): string[] {
  return [...new Set(ALL_MIGRATIONS.map((m) => m.tableName))];
}