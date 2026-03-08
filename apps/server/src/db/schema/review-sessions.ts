import { mysqlTable, varchar, int, timestamp, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const reviewSessions = mysqlTable(
  'review_sessions',
  {
    sessionId: varchar('session_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    profileId: varchar('profile_id', { length: 191 }),
    scope: mysqlEnum('scope', ['all', 'category', 'tag', 'recent']).notNull().default('all'),
    scopeValue: varchar('scope_value', { length: 255 }),
    status: mysqlEnum('status', ['active', 'completed', 'abandoned']).notNull().default('active'),
    score: int('score'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date', fsp: 3 }),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    statusIdx: index('status_idx').on(table.status),
    profileIdIdx: index('profile_id_idx').on(table.profileId),
  })
);

export type ReviewSession = typeof reviewSessions.$inferSelect;
export type NewReviewSession = typeof reviewSessions.$inferInsert;
