import { mysqlTable, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/mysql-core';

/**
 * Push devices — one row per Huawei Push Kit token.
 * A token belongs to the account that last registered it.
 * token_key is sha256(provider + token) so the unique index stays within MySQL's key length.
 */
export const pushDevices = mysqlTable(
  'push_devices',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    provider: varchar('provider', { length: 16 }).notNull(),
    token: varchar('token', { length: 512 }).notNull(),
    tokenKey: varchar('token_key', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('push_devices_uid_idx').on(table.uid),
    tokenKeyUnique: uniqueIndex('push_devices_token_key_unique').on(table.tokenKey),
  })
);

export type PushDevice = typeof pushDevices.$inferSelect;
export type NewPushDevice = typeof pushDevices.$inferInsert;
