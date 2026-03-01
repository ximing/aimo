import { mysqlTable, varchar, int, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Users table - stores user account information
 * All fields except embeddings from LanceDB users table
 */
export const users = mysqlTable(
  'users',
  {
    uid: varchar('uid', { length: 191 }).primaryKey().notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    password: varchar('password', { length: 255 }).notNull(),
    salt: varchar('salt', { length: 255 }).notNull(),
    nickname: varchar('nickname', { length: 100 }),
    avatar: varchar('avatar', { length: 500 }),
    status: int('status').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailIdx: index('email_idx').on(table.email),
    phoneIdx: index('phone_idx').on(table.phone),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
