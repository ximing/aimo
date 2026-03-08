import { mysqlTable, varchar, text, int, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const reviewItems = mysqlTable(
  'review_items',
  {
    itemId: varchar('item_id', { length: 191 }).primaryKey().notNull(),
    sessionId: varchar('session_id', { length: 191 }).notNull(),
    memoId: varchar('memo_id', { length: 191 }).notNull(),
    question: text('question').notNull(),
    userAnswer: text('user_answer'),
    aiFeedback: text('ai_feedback'),
    mastery: mysqlEnum('mastery', ['remembered', 'fuzzy', 'forgot']),
    order: int('order').notNull().default(0),
  },
  (table) => ({
    sessionIdIdx: index('session_id_idx').on(table.sessionId),
  })
);

export type ReviewItem = typeof reviewItems.$inferSelect;
export type NewReviewItem = typeof reviewItems.$inferInsert;
