/**
 * Drizzle schema for memos table
 * Stores memo scalar data - embedding vectors remain in LanceDB
 * This schema excludes the embedding field which is stored in LanceDB for vector search
 */

import { mysqlTable } from 'drizzle-orm/mysql-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { serial, varchar, text, timestamp, int, index, json } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, varchar as pgVarchar, text as pgText, timestamp as pgTimestamp, index as pgIndex, json as pgJson, integer as pgInteger } from 'drizzle-orm/pg-core';
import { text as sqliteText, integer as sqliteInteger, index as sqliteIndex, uniqueIndex } from 'drizzle-orm/sqlite-core';

// MySQL schema
export const mysqlMemos = mysqlTable('memos', {
  id: serial('id').primaryKey(),
  memoId: varchar('memo_id', { length: 64 }).notNull().unique(),
  uid: varchar('uid', { length: 64 }).notNull(),
  categoryId: varchar('category_id', { length: 64 }),
  content: text('content').notNull(),
  type: varchar('type', { length: 32 }), // 'text' | 'audio' | 'video'
  source: varchar('source', { length: 2048 }),
  isPublic: int('is_public').default(0), // Whether memo is public (0 = private, 1 = public)
  // attachments stored as JSON array of attachment IDs
  attachments: json('attachments'), // string[] - attachment IDs
  // tags stored as JSON array of tag IDs
  tagIds: json('tag_ids'), // string[] - tag IDs
  // legacy tags field for backward compatibility
  tags: json('tags'), // string[] - tag strings
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).default(new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 }).default(new Date()),
}, (table) => ({
  memoIdIdx: index('idx_memos_memo_id').on(table.memoId),
  uidIdx: index('idx_memos_uid').on(table.uid),
  categoryIdIdx: index('idx_memos_category_id').on(table.categoryId),
  createdAtIdx: index('idx_memos_created_at').on(table.createdAt),
}));

// PostgreSQL schema
export const pgMemos = pgTable('memos', {
  id: pgSerial('id').primaryKey(),
  memoId: pgVarchar('memo_id', { length: 64 }).notNull().unique(),
  uid: pgVarchar('uid', { length: 64 }).notNull(),
  categoryId: pgVarchar('category_id', { length: 64 }),
  content: pgText('content').notNull(),
  type: pgVarchar('type', { length: 32 }),
  source: pgVarchar('source', { length: 2048 }),
  isPublic: pgInteger('is_public').default(0), // Whether memo is public (0 = private, 1 = public)
  attachments: pgJson('attachments'), // string[]
  tagIds: pgJson('tag_ids'), // string[]
  tags: pgJson('tags'), // string[]
  createdAt: pgTimestamp('created_at', { mode: 'date' }).default(new Date()),
  updatedAt: pgTimestamp('updated_at', { mode: 'date' }).default(new Date()),
}, (table) => ({
  memoIdIdx: pgIndex('idx_memos_memo_id').on(table.memoId),
  uidIdx: pgIndex('idx_memos_uid').on(table.uid),
  categoryIdIdx: pgIndex('idx_memos_category_id').on(table.categoryId),
  createdAtIdx: pgIndex('idx_memos_created_at').on(table.createdAt),
}));

// SQLite schema
export const sqliteMemos = sqliteTable('memos', {
  id: sqliteInteger({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  memoId: sqliteText('memo_id').notNull().unique(),
  uid: sqliteText('uid').notNull(),
  categoryId: sqliteText('category_id'),
  content: sqliteText('content').notNull(),
  type: sqliteText('type'),
  source: sqliteText('source'),
  isPublic: sqliteInteger('is_public').default(0), // Whether memo is public (0 = private, 1 = public)
  attachments: sqliteText('attachments'), // JSON string
  tagIds: sqliteText('tag_ids'), // JSON string
  tags: sqliteText('tags'), // JSON string
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }),
  updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  memoIdIdx: uniqueIndex('idx_memos_memo_id').on(table.memoId),
  uidIdx: sqliteIndex('idx_memos_uid').on(table.uid),
  categoryIdIdx: sqliteIndex('idx_memos_category_id').on(table.categoryId),
  createdAtIdx: sqliteIndex('idx_memos_created_at').on(table.createdAt),
}));

// Type exports
export type MemosSelect = typeof mysqlMemos.$inferSelect;
export type MemosInsert = typeof mysqlMemos.$inferInsert;
