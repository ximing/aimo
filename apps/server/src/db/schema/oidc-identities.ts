import { mysqlTable, varchar, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core';

/**
 * Maps an Aimo user to one Keycloak subject in one issuer.
 * Login looks up (issuer, sub) and never merges by email.
 */
export const oidcIdentities = mysqlTable(
  'oidc_identities',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    issuer: varchar('issuer', { length: 191 }).notNull(),
    sub: varchar('sub', { length: 191 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    issuerSubUidx: uniqueIndex('oidc_identities_issuer_sub_uidx').on(table.issuer, table.sub),
    userIssuerUidx: uniqueIndex('oidc_identities_user_issuer_uidx').on(table.userId, table.issuer),
  })
);

export type OidcIdentity = typeof oidcIdentities.$inferSelect;
export type NewOidcIdentity = typeof oidcIdentities.$inferInsert;
