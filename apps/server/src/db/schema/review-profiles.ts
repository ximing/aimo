import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  mysqlEnum,
  json,
  index,
} from 'drizzle-orm/mysql-core';

/**
 * Review Profiles table - stores named AI review configurations per user
 */
export const reviewProfiles = mysqlTable(
  'review_profiles',
  {
    profileId: varchar('profile_id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    scope: mysqlEnum('scope', ['all', 'category', 'tag', 'recent']).notNull().default('all'),
    filterValues: json('filter_values').$type<string[]>(),
    recentDays: int('recent_days'),
    questionCount: int('question_count').notNull().default(10),
    userModelId: varchar('user_model_id', { length: 191 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
  })
);

export type ReviewProfile = typeof reviewProfiles.$inferSelect;
export type NewReviewProfile = typeof reviewProfiles.$inferInsert;
