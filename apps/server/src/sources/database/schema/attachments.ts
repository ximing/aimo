/**
 * Drizzle schema for attachments table
 * Stores file attachment metadata - multimodal embeddings remain in LanceDB
 * File storage (local/S3/OSS) is handled by attachment service
 */

import { mysqlTable } from 'drizzle-orm/mysql-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { serial, varchar, text, timestamp, int, index, json } from 'drizzle-orm/mysql-core';
import { serial as pgSerial, varchar as pgVarchar, text as pgText, timestamp as pgTimestamp, index as pgIndex, json as pgJson, integer as pgInteger } from 'drizzle-orm/pg-core';
import { text as sqliteText, integer as sqliteInteger, index as sqliteIndex, uniqueIndex } from 'drizzle-orm/sqlite-core';

// MySQL schema
export const mysqlAttachments = mysqlTable('attachments', {
  id: serial('id').primaryKey(),
  attachmentId: varchar('attachment_id', { length: 64 }).notNull().unique(),
  uid: varchar('uid', { length: 64 }).notNull(),
  filename: varchar('filename', { length: 512 }).notNull(),
  type: varchar('type', { length: 128 }).notNull(),
  size: int('size').notNull(),
  storageType: varchar('storage_type', { length: 16 }).notNull(), // 'local' | 's3' | 'oss'
  path: varchar('path', { length: 1024 }).notNull(),
  bucket: varchar('bucket', { length: 256 }),
  prefix: varchar('prefix', { length: 512 }),
  endpoint: varchar('endpoint', { length: 512 }),
  region: varchar('region', { length: 64 }),
  isPublicBucket: varchar('is_public_bucket', { length: 8 }),
  // multimodalEmbedding remains in LanceDB - not stored here
  multimodalModelHash: varchar('multimodal_model_hash', { length: 128 }),
  // properties stored as JSON: audio(duration), image(width,height), video(duration)
  properties: json('properties'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).default(new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 }).default(new Date()),
}, (table) => ({
  attachmentIdIdx: index('idx_attachments_attachment_id').on(table.attachmentId),
  uidIdx: index('idx_attachments_uid').on(table.uid),
}));

// PostgreSQL schema
export const pgAttachments = pgTable('attachments', {
  id: pgSerial('id').primaryKey(),
  attachmentId: pgVarchar('attachment_id', { length: 64 }).notNull().unique(),
  uid: pgVarchar('uid', { length: 64 }).notNull(),
  filename: pgVarchar('filename', { length: 512 }).notNull(),
  type: pgVarchar('type', { length: 128 }).notNull(),
  size: pgInteger('size').notNull(),
  storageType: pgVarchar('storage_type', { length: 16 }).notNull(),
  path: pgVarchar('path', { length: 1024 }).notNull(),
  bucket: pgVarchar('bucket', { length: 256 }),
  prefix: pgVarchar('prefix', { length: 512 }),
  endpoint: pgVarchar('endpoint', { length: 512 }),
  region: pgVarchar('region', { length: 64 }),
  isPublicBucket: pgVarchar('is_public_bucket', { length: 8 }),
  multimodalModelHash: pgVarchar('multimodal_model_hash', { length: 128 }),
  properties: pgJson('properties'),
  createdAt: pgTimestamp('created_at', { mode: 'date' }).default(new Date()),
  updatedAt: pgTimestamp('updated_at', { mode: 'date' }).default(new Date()),
}, (table) => ({
  attachmentIdIdx: pgIndex('idx_attachments_attachment_id').on(table.attachmentId),
  uidIdx: pgIndex('idx_attachments_uid').on(table.uid),
}));

// SQLite schema
export const sqliteAttachments = sqliteTable('attachments', {
  id: sqliteInteger({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  attachmentId: sqliteText('attachment_id').notNull().unique(),
  uid: sqliteText('uid').notNull(),
  filename: sqliteText('filename').notNull(),
  type: sqliteText('type').notNull(),
  size: sqliteInteger('size').notNull(),
  storageType: sqliteText('storage_type').notNull(),
  path: sqliteText('path').notNull(),
  bucket: sqliteText('bucket'),
  prefix: sqliteText('prefix'),
  endpoint: sqliteText('endpoint'),
  region: sqliteText('region'),
  isPublicBucket: sqliteText('is_public_bucket'),
  multimodalModelHash: sqliteText('multimodal_model_hash'),
  properties: sqliteText('properties'), // JSON string
  createdAt: sqliteInteger('created_at', { mode: 'timestamp' }),
  updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  attachmentIdIdx: uniqueIndex('idx_attachments_attachment_id').on(table.attachmentId),
  uidIdx: sqliteIndex('idx_attachments_uid').on(table.uid),
}));

// Type exports
export type AttachmentsSelect = typeof mysqlAttachments.$inferSelect;
export type AttachmentsInsert = typeof mysqlAttachments.$inferInsert;
