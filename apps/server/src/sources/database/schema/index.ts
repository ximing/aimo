/**
 * Drizzle schema exports
 * Provides database-type-specific schemas
 */

import { mysqlUsers, pgUsers, sqliteUsers, type UsersSelect, type UsersInsert } from './users.js';
import { mysqlMemos, pgMemos, sqliteMemos, type MemosSelect, type MemosInsert } from './memos.js';
import { mysqlMemoRelations, pgMemoRelations, sqliteMemoRelations, type MemoRelationsSelect, type MemoRelationsInsert } from './memo-relations.js';
import { mysqlAttachments, pgAttachments, sqliteAttachments, type AttachmentsSelect, type AttachmentsInsert } from './attachments.js';
import { mysqlMigrations, pgMigrations, sqliteMigrations, type MigrationsSelect, type MigrationsInsert } from './_migrations.js';

import type { DatabaseType } from '../drizzle-adapter.js';

// Re-export for external use
export { mysqlUsers, pgUsers, sqliteUsers, type UsersSelect, type UsersInsert };
export { mysqlMemos, pgMemos, sqliteMemos, type MemosSelect, type MemosInsert };
export { mysqlMemoRelations, pgMemoRelations, sqliteMemoRelations, type MemoRelationsSelect, type MemoRelationsInsert };
export { mysqlAttachments, pgAttachments, sqliteAttachments, type AttachmentsSelect, type AttachmentsInsert };
export { mysqlMigrations, pgMigrations, sqliteMigrations, type MigrationsSelect, type MigrationsInsert };

/**
 * Get the appropriate users table based on database type
 */
export function getUsersTable(dbType: DatabaseType) {
  switch (dbType) {
    case 'mysql':
      return mysqlUsers;
    case 'postgresql':
      return pgUsers;
    case 'sqlite':
      return sqliteUsers;
  }
}

/**
 * Get the appropriate memos table based on database type
 */
export function getMemosTable(dbType: DatabaseType) {
  switch (dbType) {
    case 'mysql':
      return mysqlMemos;
    case 'postgresql':
      return pgMemos;
    case 'sqlite':
      return sqliteMemos;
  }
}

/**
 * Get the appropriate memo_relations table based on database type
 */
export function getMemoRelationsTable(dbType: DatabaseType) {
  switch (dbType) {
    case 'mysql':
      return mysqlMemoRelations;
    case 'postgresql':
      return pgMemoRelations;
    case 'sqlite':
      return sqliteMemoRelations;
  }
}

/**
 * Get the appropriate attachments table based on database type
 */
export function getAttachmentsTable(dbType: DatabaseType) {
  switch (dbType) {
    case 'mysql':
      return mysqlAttachments;
    case 'postgresql':
      return pgAttachments;
    case 'sqlite':
      return sqliteAttachments;
  }
}

/**
 * Get the appropriate _migrations table based on database type
 */
export function getMigrationsTable(dbType: DatabaseType) {
  switch (dbType) {
    case 'mysql':
      return mysqlMigrations;
    case 'postgresql':
      return pgMigrations;
    case 'sqlite':
      return sqliteMigrations;
  }
}
