import { mysqlTable, varchar, int, text, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

/**
 * Push Rules table - stores user push notification rule configurations
 * channels stored as JSON string
 */
export const pushRules = mysqlTable(
  'push_rules',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    pushTime: int('push_time').notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    channels: text('channels'),
    enabled: int('enabled').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
  })
);

export type PushRule = typeof pushRules.$inferSelect;
export type NewPushRule = typeof pushRules.$inferInsert;
