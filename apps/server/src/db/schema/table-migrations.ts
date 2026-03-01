import { mysqlTable, varchar, int, timestamp } from 'drizzle-orm/mysql-core';

/**
 * Table Migrations Metadata - stores version information for each table's schema
 * Used by migration system to track which versions have been applied
 */
export const tableMigrations = mysqlTable('table_migrations', {
  tableName: varchar('table_name', { length: 191 }).primaryKey().notNull(),
  currentVersion: int('current_version').notNull(),
  lastMigratedAt: timestamp('last_migrated_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
});

export type TableMigration = typeof tableMigrations.$inferSelect;
export type NewTableMigration = typeof tableMigrations.$inferInsert;
