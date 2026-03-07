import { mysqlTable, varchar, timestamp, mysqlEnum, index } from 'drizzle-orm/mysql-core';

/**
 * Spaced Repetition Rules table - stores user filter rules for SR card inclusion/exclusion
 */
export const spacedRepetitionRules = mysqlTable(
  'spaced_repetition_rules',
  {
    ruleId: varchar('rule_id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    mode: mysqlEnum('mode', ['include', 'exclude']).notNull(),
    filterType: mysqlEnum('filter_type', ['category', 'tag']).notNull(),
    filterValue: varchar('filter_value', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
  })
);

export type SpacedRepetitionRule = typeof spacedRepetitionRules.$inferSelect;
export type NewSpacedRepetitionRule = typeof spacedRepetitionRules.$inferInsert;
