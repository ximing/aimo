import { mysqlTable, varchar, json, timestamp, uniqueIndex, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

/**
 * Daily Recommendations table - stores cached daily memo recommendations per user
 * memoIds stored as JSON array
 */
export const dailyRecommendations = mysqlTable(
  'daily_recommendations',
  {
    recommendationId: varchar('recommendation_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(),
    memoIds: json('memo_ids').$type<string[]>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    uidDateUnique: uniqueIndex('uid_date_unique').on(table.uid, table.date),
  })
);

export type DailyRecommendation = typeof dailyRecommendations.$inferSelect;
export type NewDailyRecommendation = typeof dailyRecommendations.$inferInsert;
