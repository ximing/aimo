/**
 * Drizzle schema for tags table
 * Stores user-defined tags for organizing memos
 */

import { mysqlTable } from 'drizzle-orm/mysql-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { serial, varchar, int, timestamp, index } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, varchar as pgVarchar, integer as pgInteger, timestamp as pgTimestamp, index as pgIndex } from 'drizzle-orm/pg-core';
import { text as sqliteText, integer as sqliteInteger, index as sqliteIndex } from 'drizzle-orm/sqlite-core';

// MySQL schema
export const mysqlTags = mysqlTable('tags', {
  tagId: serial('tag_id').primaryKey(),
  uid: varchar('uid', { length: 64 }).notNull(),
  name: varchar('name', { length: 128 }).notNull(),
  color: varchar('color', { length: 32 }),
  usageCount: int('usage_count').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).default(new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 }).default(new Date()),
}, (table) => ({
  uidIdx: index('idx_tags_uid').on(table.uid),
}));

// PostgreSQL schema
export const pgTags = pgTable('tags', {
  tagId: pgSerial('tag_id').primaryKey(),
  uid: pgVarchar('uid', { length: 64 }).notNull(),
  name: pgVarchar('name', { length: 128 }).notNull(),
  color: pgVarchar('color', { length: 32 }),
  usageCount: pgInteger('usage_count').notNull().default(0),
  createdAt: pgTimestamp('created_at', { mode: 'date' }).default(new Date()),
  updatedAt: pgTimestamp('updated_at', { mode: 'date' }).default(new Date()),
}, (table) => ({
  uidIdx: pgIndex('idx_tags_uid').on(table.uid),
}));

// SQLite schema
export const sqliteTags = sqliteTable('tags', {
  tagId: sqliteInteger({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  uid: sqliteText('uid').notNull(),
  name: sqliteText('name').notNull(),
  color: sqliteText('color'),
  usageCount: sqliteInteger('usage_count').notNull().default(0),
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }),
  updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  uidIdx: sqliteIndex('idx_tags_uid').on(table.uid),
}));

// Type exports
export type TagsSelect = typeof mysqlTags.$inferSelect;
export type TagsInsert = typeof mysqlTags.$inferInsert;
