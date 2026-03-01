/**
 * Drizzle schema for users table
 * Stores user account information
 * Vector embeddings not needed - users are managed in relational DB
 */

import { mysqlTable } from 'drizzle-orm/mysql-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { serial, varchar, text, timestamp, int, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, varchar as pgVarchar, text as pgText, timestamp as pgTimestamp, index as pgIndex, uniqueIndex as pgUniqueIndex, integer as pgInteger } from 'drizzle-orm/pg-core';
import { text as sqliteText, integer as sqliteInteger, index as sqliteIndex, uniqueIndex as sqliteUniqueIndex } from 'drizzle-orm/sqlite-core';

// MySQL schema
export const mysqlUsers = mysqlTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  password: varchar('password', { length: 255 }).notNull(),
  salt: varchar('salt', { length: 64 }).notNull(),
  nickname: varchar('nickname', { length: 128 }),
  avatar: text('avatar'),
  status: int('status').notNull().default(1),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).default(new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 }).default(new Date()),
}, (table) => ({
  uidIdx: index('idx_users_uid').on(table.uid),
  emailIdx: index('idx_users_email').on(table.email),
}));

// PostgreSQL schema
export const pgUsers = pgTable('users', {
  id: pgSerial('id').primaryKey(),
  uid: pgVarchar('uid', { length: 64 }).notNull().unique(),
  email: pgVarchar('email', { length: 255 }),
  phone: pgVarchar('phone', { length: 32 }),
  password: pgVarchar('password', { length: 255 }).notNull(),
  salt: pgVarchar('salt', { length: 64 }).notNull(),
  nickname: pgVarchar('nickname', { length: 128 }),
  avatar: pgText('avatar'),
  status: pgInteger('status').notNull().default(1),
  createdAt: pgTimestamp('created_at', { mode: 'date' }).default(new Date()),
  updatedAt: pgTimestamp('updated_at', { mode: 'date' }).default(new Date()),
}, (table) => ({
  uidIdx: pgIndex('idx_users_uid').on(table.uid),
  emailIdx: pgIndex('idx_users_email').on(table.email),
}));

// SQLite schema
export const sqliteUsers = sqliteTable('users', {
  id: sqliteInteger({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  uid: sqliteText('uid').notNull().unique(),
  email: sqliteText('email'),
  phone: sqliteText('phone'),
  password: sqliteText('password').notNull(),
  salt: sqliteText('salt').notNull(),
  nickname: sqliteText('nickname'),
  avatar: sqliteText('avatar'),
  status: sqliteInteger('status').notNull().default(1),
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }),
  updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  uidIdx: sqliteIndex('idx_users_uid').on(table.uid),
  emailIdx: sqliteUniqueIndex('idx_users_email').on(table.email),
}));

// Type exports
export type UsersSelect = typeof mysqlUsers.$inferSelect;
export type UsersInsert = typeof mysqlUsers.$inferInsert;
