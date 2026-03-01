/**
 * Test Setup - In-memory SQLite for Drizzle testing
 *
 * This module provides utilities for setting up tests with an in-memory SQLite database.
 * It initializes the database schema and provides utilities for creating test data.
 */

import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// Import schema
import {
  getUsersTable,
  getMemosTable,
  getAttachmentsTable,
  getMemoRelationsTable,
  getMigrationsTable,
} from '../sources/database/schema/index.js';

/**
 * Create an in-memory SQLite database for testing
 */
export function createTestDatabase(): {
  db: BetterSQLite3Database;
  sqliteDb: Database.Database;
  close: () => void;
} {
  const sqliteDb = new Database(':memory:');
  const db = drizzleSqlite(sqliteDb) as unknown as BetterSQLite3Database;

  // Enable foreign keys
  sqliteDb.pragma('foreign_keys = ON');

  return {
    db,
    sqliteDb,
    close: () => {
      sqliteDb.close();
    },
  };
}

/**
 * Initialize the database schema for testing
 * Creates all necessary tables
 */
export function initializeTestSchema(sqliteDb: Database.Database): void {
  // Create users table
  sqliteDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL UNIQUE,
      email TEXT,
      phone TEXT,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      status INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Create memos table
  sqliteDb.exec(`
    CREATE TABLE memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memo_id TEXT NOT NULL UNIQUE,
      uid TEXT NOT NULL,
      category_id TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      source TEXT,
      attachments TEXT,
      tag_ids TEXT,
      tags TEXT,
      is_public INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX idx_memos_uid ON memos(uid);
    CREATE INDEX idx_memos_created_at ON memos(created_at);
    CREATE INDEX idx_memos_category_id ON memos(category_id);
  `);

  // Create attachments table
  sqliteDb.exec(`
    CREATE TABLE attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attachment_id TEXT NOT NULL UNIQUE,
      uid TEXT NOT NULL,
      memo_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      bucket TEXT,
      endpoint TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX idx_attachments_uid ON attachments(uid);
    CREATE INDEX idx_attachments_memo_id ON attachments(memo_id);
  `);

  // Create memo_relations table
  sqliteDb.exec(`
    CREATE TABLE memo_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relation_id TEXT NOT NULL UNIQUE,
      source_memo_id TEXT NOT NULL,
      target_memo_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX idx_memo_relations_source ON memo_relations(source_memo_id);
    CREATE INDEX idx_memo_relations_target ON memo_relations(target_memo_id);
  `);

  // Create _migrations table
  sqliteDb.exec(`
    CREATE TABLE _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
  `);
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sample test user data
 */
export const testUser = {
  uid: generateTestId('user'),
  email: 'test@example.com',
  password: 'hashed_password',
  salt: 'random_salt',
  nickname: 'Test User',
  avatar: 'https://example.com/avatar.png',
  status: 1,
};

/**
 * Sample test memo data
 */
export function createTestMemoData(overrides: Partial<{
  memoId: string;
  uid: string;
  content: string;
  categoryId: string | null;
  type: string;
  tags: string[];
}> = {}): {
  memoId: string;
  uid: string;
  content: string;
  categoryId: string | null;
  type: string;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    memoId: generateTestId('memo'),
    uid: testUser.uid,
    content: 'Test memo content',
    categoryId: null,
    type: 'text',
    tags: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
