import { mysqlTable, varchar, int, bigint, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

/**
 * Tags table - stores tags per user with usage count
 */
export const tags = mysqlTable(
  'tags',
  {
    tagId: varchar('tag_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 20 }),
    usageCount: int('usage_count').notNull().default(0),
    deletedAt: bigint('deleted_at', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    deletedAtIdx: index('deleted_at_idx').on(table.deletedAt),
  })
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
