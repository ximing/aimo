/**
 * Drizzle schema for _migrations table
 * Tracks Drizzle migrations that have been applied
 * This is separate from the LanceDB migration system
 */

import { mysqlTable } from 'drizzle-orm/mysql-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, varchar as pgVarchar, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex } from 'drizzle-orm/pg-core';
import { text as sqliteText, integer as sqliteInteger, uniqueIndex as sqliteUniqueIndex } from 'drizzle-orm/sqlite-core';

// MySQL schema
export const mysqlMigrations = mysqlTable('_migrations', {
  id: serial('id').primaryKey(),
  hash: varchar('hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).default(new Date()),
}, (table) => ({
  hashIdx: uniqueIndex('idx_migrations_hash').on(table.hash),
}));

// PostgreSQL schema
export const pgMigrations = pgTable('_migrations', {
  id: pgSerial('id').primaryKey(),
  hash: pgVarchar('hash', { length: 255 }).notNull(),
  createdAt: pgTimestamp('created_at', { mode: 'date' }).default(new Date()),
}, (table) => ({
  hashIdx: pgUniqueIndex('idx_migrations_hash').on(table.hash),
}));

// SQLite schema
export const sqliteMigrations = sqliteTable('_migrations', {
  id: sqliteInteger({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  hash: sqliteText('hash').notNull(),
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }),
}, (table) => ({
  hashIdx: sqliteUniqueIndex('idx_migrations_hash').on(table.hash),
}));

// Type exports
export type MigrationsSelect = typeof mysqlMigrations.$inferSelect;
export type MigrationsInsert = typeof mysqlMigrations.$inferInsert;
