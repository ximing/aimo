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

  // Add future migrations here
  // Example:
  // - Version 3: Add new field to existing table
  // - Version 4: Add new table
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