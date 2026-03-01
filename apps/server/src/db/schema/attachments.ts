import { mysqlTable, varchar, int, text, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

/**
 * Attachments table - stores file attachments with metadata (scalar fields only)
 * multimodalEmbedding stored separately in LanceDB attachment_vectors table
 */
export const attachments = mysqlTable(
  'attachments',
  {
    attachmentId: varchar('attachment_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    size: int('size').notNull(),
    storageType: varchar('storage_type', { length: 20 }).notNull(),
    path: varchar('path', { length: 500 }).notNull(),
    bucket: varchar('bucket', { length: 255 }),
    prefix: varchar('prefix', { length: 255 }),
    endpoint: varchar('endpoint', { length: 500 }),
    region: varchar('region', { length: 100 }),
    isPublicBucket: varchar('is_public_bucket', { length: 10 }),
    multimodalModelHash: varchar('multimodal_model_hash', { length: 255 }),
    properties: text('properties'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
  })
);

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
