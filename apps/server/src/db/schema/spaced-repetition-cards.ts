import { mysqlTable, varchar, float, int, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * Spaced Repetition Cards table - stores SM-2 algorithm state per memo per user
 */
export const spacedRepetitionCards = mysqlTable(
  'spaced_repetition_cards',
  {
    cardId: varchar('card_id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    memoId: varchar('memo_id', { length: 191 }).notNull(),
    easeFactor: float('ease_factor').notNull().default(2.5),
    interval: int('interval').notNull().default(1),
    repetitions: int('repetitions').notNull().default(0),
    lapseCount: int('lapse_count').notNull().default(0),
    nextReviewAt: timestamp('next_review_at', { mode: 'date', fsp: 3 }).notNull(),
    lastReviewAt: timestamp('last_review_at', { mode: 'date', fsp: 3 }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    memoIdIdx: index('memo_id_idx').on(table.memoId),
    nextReviewAtIdx: index('next_review_at_idx').on(table.nextReviewAt),
    userMemoIdx: index('user_memo_idx').on(table.userId, table.memoId),
  })
);

export type SpacedRepetitionCard = typeof spacedRepetitionCards.$inferSelect;
export type NewSpacedRepetitionCard = typeof spacedRepetitionCards.$inferInsert;
