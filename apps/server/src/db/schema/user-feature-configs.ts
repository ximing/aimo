import { mysqlTable, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/mysql-core';

/**
 * User feature configs table - stores user preferences for AI feature model selections
 * e.g., Tag generation model preference per user
 */
export const userFeatureConfigs = mysqlTable(
  'user_feature_configs',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    feature: varchar('feature', { length: 50 }).notNull(),
    userModelId: varchar('user_model_id', { length: 191 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userFeatureIdx: uniqueIndex('user_feature_configs_user_feature_idx').on(
      table.userId,
      table.feature
    ),
  })
);

export type UserFeatureConfig = typeof userFeatureConfigs.$inferSelect;
export type NewUserFeatureConfig = typeof userFeatureConfigs.$inferInsert;
