import { mysqlTable, varchar, bigint, timestamp, index, uniqueIndex } from 'drizzle-orm/mysql-core';

/**
 * Memo Relations table - stores directed relations between memos
 * A -> B means A is related to B
 */
export const memoRelations = mysqlTable(
  'memo_relations',
  {
    relationId: varchar('relation_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 }).notNull(),
    sourceMemoId: varchar('source_memo_id', { length: 191 }).notNull(),
    targetMemoId: varchar('target_memo_id', { length: 191 }).notNull(),
    deletedAt: bigint('deleted_at', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    sourceMemoIdIdx: index('source_memo_id_idx').on(table.sourceMemoId),
    targetMemoIdIdx: index('target_memo_id_idx').on(table.targetMemoId),
    deletedAtIdx: index('deleted_at_idx').on(table.deletedAt),
    sourceTargetUnique: uniqueIndex('source_target_unique').on(
      table.sourceMemoId,
      table.targetMemoId
    ),
  })
);

export type MemoRelation = typeof memoRelations.$inferSelect;
export type NewMemoRelation = typeof memoRelations.$inferInsert;
