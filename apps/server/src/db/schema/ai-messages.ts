import { mysqlTable, varchar, text, json, timestamp, index } from 'drizzle-orm/mysql-core';
import { aiConversations } from './ai-conversations.js';

/**
 * AI message source reference type
 */
export interface AIMessageSource {
  memoId?: string;
  content?: string;
  similarity?: number;
}

/**
 * AI Messages table - stores messages within AI conversations
 * Sources stored as JSON array
 */
export const aiMessages = mysqlTable(
  'ai_messages',
  {
    messageId: varchar('message_id', { length: 191 }).primaryKey().notNull(),
    conversationId: varchar('conversation_id', { length: 191 })
      .notNull()
      .references(() => aiConversations.conversationId, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    sources: json('sources').$type<AIMessageSource[]>(),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('conversation_id_idx').on(table.conversationId),
  })
);

export type AIMessage = typeof aiMessages.$inferSelect;
export type NewAIMessage = typeof aiMessages.$inferInsert;
