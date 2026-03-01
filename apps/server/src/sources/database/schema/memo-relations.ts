/**
 * Drizzle schema for memo_relations table
 * Stores directed relations between memos (A -> B means A is related to B)
 * No vector embeddings needed - purely scalar data
 */

import { mysqlTable } from 'drizzle-orm/mysql-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { serial, varchar, timestamp, index } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, varchar as pgVarchar, timestamp as pgTimestamp, index as pgIndex } from 'drizzle-orm/pg-core';
import { text as sqliteText, integer as sqliteInteger, index as sqliteIndex, uniqueIndex } from 'drizzle-orm/sqlite-core';

// MySQL schema
export const mysqlMemoRelations = mysqlTable('memo_relations', {
  id: serial('id').primaryKey(),
  relationId: varchar('relation_id', { length: 64 }).notNull().unique(),
  uid: varchar('uid', { length: 64 }).notNull(),
  sourceMemoId: varchar('source_memo_id', { length: 64 }).notNull(),
  targetMemoId: varchar('target_memo_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).default(new Date()),
}, (table) => ({
  relationIdIdx: index('idx_memo_relations_relation_id').on(table.relationId),
  uidIdx: index('idx_memo_relations_uid').on(table.uid),
  sourceMemoIdIdx: index('idx_memo_relations_source_memo_id').on(table.sourceMemoId),
  targetMemoIdIdx: index('idx_memo_relations_target_memo_id').on(table.targetMemoId),
}));

// PostgreSQL schema
export const pgMemoRelations = pgTable('memo_relations', {
  id: pgSerial('id').primaryKey(),
  relationId: pgVarchar('relation_id', { length: 64 }).notNull().unique(),
  uid: pgVarchar('uid', { length: 64 }).notNull(),
  sourceMemoId: pgVarchar('source_memo_id', { length: 64 }).notNull(),
  targetMemoId: pgVarchar('target_memo_id', { length: 64 }).notNull(),
  createdAt: pgTimestamp('created_at', { mode: 'date' }).default(new Date()),
}, (table) => ({
  relationIdIdx: pgIndex('idx_memo_relations_relation_id').on(table.relationId),
  uidIdx: pgIndex('idx_memo_relations_uid').on(table.uid),
  sourceMemoIdIdx: pgIndex('idx_memo_relations_source_memo_id').on(table.sourceMemoId),
  targetMemoIdIdx: pgIndex('idx_memo_relations_target_memo_id').on(table.targetMemoId),
}));

// SQLite schema
export const sqliteMemoRelations = sqliteTable('memo_relations', {
  id: sqliteInteger({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  relationId: sqliteText('relation_id').notNull().unique(),
  uid: sqliteText('uid').notNull(),
  sourceMemoId: sqliteText('source_memo_id').notNull(),
  targetMemoId: sqliteText('target_memo_id').notNull(),
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }),
}, (table) => ({
  relationIdIdx: uniqueIndex('idx_memo_relations_relation_id').on(table.relationId),
  uidIdx: sqliteIndex('idx_memo_relations_uid').on(table.uid),
  sourceMemoIdIdx: sqliteIndex('idx_memo_relations_source_memo_id').on(table.sourceMemoId),
  targetMemoIdIdx: sqliteIndex('idx_memo_relations_target_memo_id').on(table.targetMemoId),
}));

// Type exports
export type MemoRelationsSelect = typeof mysqlMemoRelations.$inferSelect;
export type MemoRelationsInsert = typeof mysqlMemoRelations.$inferInsert;
