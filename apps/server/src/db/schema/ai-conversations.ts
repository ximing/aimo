import { mysqlTable, varchar, bigint, timestamp, index } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

/**
 * AI Conversations table - stores AI conversation sessions with metadata
 */
export const aiConversations = mysqlTable(
  'ai_conversations',
  {
    conversationId: varchar('conversation_id', { length: 191 }).primaryKey().notNull(),
    uid: varchar('uid', { length: 191 })
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    deletedAt: bigint('deleted_at', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
    deletedAtIdx: index('deleted_at_idx').on(table.deletedAt),
  })
);

export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;
