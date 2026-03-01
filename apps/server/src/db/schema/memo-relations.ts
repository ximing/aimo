import { mysqlTable, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { users } from './users.js';
import { memos } from './memos.js';

/**
 * Memo Relations table - stores directed relations between memos
 * A -> B means A is related to B
 */
export const memoRelations = mysqlTable(
  'memo_relations',
  {
    relationId: varchar('relation_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    sourceMemoId: varchar('source_memo_id', { length: 191 })
      .notNull()
      .references(() => memos.memoId, { onDelete: 'cascade' }),
    targetMemoId: varchar('target_memo_id', { length: 191 })
      .notNull()
      .references(() => memos.memoId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    sourceMemoIdIdx: index('source_memo_id_idx').on(table.sourceMemoId),
    targetMemoIdIdx: index('target_memo_id_idx').on(table.targetMemoId),
    sourceTargetUnique: uniqueIndex('source_target_unique').on(
      table.sourceMemoId,
      table.targetMemoId
    ),
  })
);

export type MemoRelation = typeof memoRelations.$inferSelect;
export type NewMemoRelation = typeof memoRelations.$inferInsert;
