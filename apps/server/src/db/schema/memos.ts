import { mysqlTable, varchar, text, json, timestamp, boolean, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';
import { categories } from './categories.js';

/**
 * Memos table - stores memo content (scalar fields only, embeddings in LanceDB)
 * Attachments and tagIds stored as JSON arrays
 */
export const memos = mysqlTable(
  'memos',
  {
    memoId: varchar('memo_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 191 }).references(() => categories.categoryId, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    type: varchar('type', { length: 50 }).default('text'),
    source: varchar('source', { length: 500 }),
    attachments: json('attachments').$type<string[]>(),
    tagIds: json('tag_ids').$type<string[]>(),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    categoryIdIdx: index('category_id_idx').on(table.categoryId),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
  })
);

export type Memo = typeof memos.$inferSelect;
export type NewMemo = typeof memos.$inferInsert;
