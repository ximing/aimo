import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core';
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
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uidIdx: index('uid_idx').on(table.uid),
  })
);

export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;
