import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core';

/**
 * User tokens table - stores API tokens for users
 */
export const userTokens = mysqlTable('user_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  tokenKey: varchar('token_key', { length: 64 }).notNull().unique(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date', fsp: 3 }),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { mode: 'date', fsp: 3 }),
});

export type UserToken = typeof userTokens.$inferSelect;
export type NewUserToken = typeof userTokens.$inferInsert;
