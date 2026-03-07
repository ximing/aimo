import {
  mysqlTable,
  varchar,
  text,
  json,
  bigint,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/mysql-core';

/**
 * Memos table - stores memo content (scalar fields only, embeddings in LanceDB)
 * Attachments and tagIds stored as JSON arrays
 */
export const memos = mysqlTable(
  'memos',
  {
    memoId: varchar('memo_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    categoryId: varchar('category_id', { length: 191 }),
    content: text('content').notNull(),
    type: varchar('type', { length: 50 }).default('text'),
    source: varchar('source', { length: 500 }),
    attachments: json('attachments').$type<string[]>(),
    tagIds: json('tag_ids').$type<string[]>(),
    isPublic: boolean('is_public').default(false).notNull(),
    deletedAt: bigint('deleted_at', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    categoryIdIdx: index('category_id_idx').on(table.categoryId),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
    deletedAtIdx: index('deleted_at_idx').on(table.deletedAt),
  })
);

export type Memo = typeof memos.$inferSelect;
export type NewMemo = typeof memos.$inferInsert;
