import { mysqlTable, varchar, timestamp, index, boolean } from 'drizzle-orm/mysql-core';

/**
 * User models table - stores user-configured LLM model configurations
 */
export const userModels = mysqlTable(
  'user_models',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    apiBaseUrl: varchar('api_base_url', { length: 500 }),
    apiKey: varchar('api_key', { length: 500 }).notNull(),
    modelName: varchar('model_name', { length: 100 }).notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index('user_models_user_id_idx').on(table.userId),
    isDefaultIdx: index('user_models_is_default_idx').on(table.isDefault),
  })
);

export type UserModel = typeof userModels.$inferSelect;
export type NewUserModel = typeof userModels.$inferInsert;
