import { mysqlTable, varchar, int, bigint, text, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Push Rules table - stores user push notification rule configurations
 * channels stored as JSON string
 */
export const pushRules = mysqlTable(
  'push_rules',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    pushTime: int('push_time').notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    channels: text('channels'),
    enabled: int('enabled').notNull().default(1),
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

export type PushRule = typeof pushRules.$inferSelect;
export type NewPushRule = typeof pushRules.$inferInsert;
