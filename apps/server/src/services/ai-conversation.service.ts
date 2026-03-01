import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { Service } from 'typedi';

import { getDatabase } from '../db/connection.js';
import { aiConversations, aiMessages } from '../db/schema/index.js';
import { OBJECT_TYPE } from '../models/constant/type.js';
import { generateTypeId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type {
  AIConversationDto,
  AIConversationDetailDto,
  AIMessageDto,
  AIMessageSourceDto,
  AddMessageDto,
  CreateConversationDto,
  UpdateConversationDto,
} from '@aimo/dto';

/**
 * Service for managing AI conversations and messages
 * Handles CRUD operations for conversation persistence
 * Uses Drizzle ORM with MySQL for relational data storage
 */
@Service()
export class AIConversationService {
  constructor() {}

  /**
   * Generate a default conversation title from the first message
   */
  private generateDefaultTitle(message?: string): string {
    if (!message) {
      return '新对话';
    }
    // Use first 20 characters of the first message as title
    const firstLine = message.split('\n')[0].trim();
    return firstLine.length > 20 ? firstLine.slice(0, 20) + '...' : firstLine;
  }

  /**
   * Convert database record to conversation DTO
   */
  private toConversationDto(
    record: typeof aiConversations.$inferSelect,
    messageCount = 0
  ): AIConversationDto {
    return {
      conversationId: record.conversationId,
      title: record.title,
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
      messageCount,
    };
  }

  /**
   * Convert database record to message DTO
   */
  private toMessageDto(record: typeof aiMessages.$inferSelect): AIMessageDto {
    // Sources are stored as JSON in MySQL
    let sources: AIMessageSourceDto[] | undefined;

    if (record.sources && Array.isArray(record.sources) && record.sources.length > 0) {
      sources = record.sources.map((item: any) => ({
        memoId: item.memoId ?? undefined,
        content: item.content ?? undefined,
        similarity: item.similarity ?? undefined,
        relevanceScore: item.relevanceScore ?? undefined,
        createdAt: item.createdAt ?? undefined,
      })) as AIMessageSourceDto[];
    }

    return {
      messageId: record.messageId,
      conversationId: record.conversationId,
      role: record.role as 'user' | 'assistant',
      content: record.content,
      sources,
      createdAt: record.createdAt.getTime(),
    };
  }

  /**
   * Get all conversations for a user (sorted by updatedAt desc)
   */
  async getConversations(uid: string): Promise<AIConversationDto[]> {
    try {
      const db = getDatabase();

      // Query conversations for this user, sorted by updatedAt desc
      const result = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.uid, uid))
        .orderBy(desc(aiConversations.updatedAt));

      // Get message counts for each conversation
      const conversations: AIConversationDto[] = [];
      for (const record of result) {
        const messageCount = await this.getMessageCount(record.conversationId);
        conversations.push(this.toConversationDto(record, messageCount));
      }

      return conversations;
    } catch (error) {
      logger.error('Get conversations error:', error);
      throw new Error('Failed to get conversations');
    }
  }

  /**
   * Get a single conversation by ID with all messages
   */
  async getConversation(
    conversationId: string,
    uid: string
  ): Promise<AIConversationDetailDto | null> {
    try {
      const db = getDatabase();

      // Query the conversation
      const result = await db
        .select()
        .from(aiConversations)
        .where(
          and(eq(aiConversations.conversationId, conversationId), eq(aiConversations.uid, uid))
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const record = result[0];
      const messages = await this.getMessages(conversationId);

      return {
        ...this.toConversationDto(record, messages.length),
        messages,
      };
    } catch (error) {
      logger.error('Get conversation error:', error);
      throw new Error('Failed to get conversation');
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(uid: string, data: CreateConversationDto): Promise<AIConversationDto> {
    try {
      const db = getDatabase();

      const conversationId = generateTypeId(OBJECT_TYPE.CONVERSATION);
      const title = data.title || this.generateDefaultTitle();

      await db.insert(aiConversations).values({
        conversationId,
        uid,
        title,
      });

      // Fetch the created conversation to get auto-generated timestamps
      const result = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.conversationId, conversationId))
        .limit(1);

      return this.toConversationDto(result[0], 0);
    } catch (error) {
      logger.error('Create conversation error:', error);
      throw new Error('Failed to create conversation');
    }
  }

  /**
   * Update a conversation (rename title)
   */
  async updateConversation(
    conversationId: string,
    uid: string,
    data: UpdateConversationDto
  ): Promise<AIConversationDto | null> {
    try {
      const db = getDatabase();

      // First verify the conversation exists and belongs to the user
      const existing = await db
        .select()
        .from(aiConversations)
        .where(
          and(eq(aiConversations.conversationId, conversationId), eq(aiConversations.uid, uid))
        )
        .limit(1);

      if (existing.length === 0) {
        return null;
      }

      // Update the conversation
      await db
        .update(aiConversations)
        .set({ title: data.title })
        .where(eq(aiConversations.conversationId, conversationId));

      // Fetch the updated conversation
      const result = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.conversationId, conversationId))
        .limit(1);

      const messageCount = await this.getMessageCount(conversationId);
      return this.toConversationDto(result[0], messageCount);
    } catch (error) {
      logger.error('Update conversation error:', error);
      throw new Error('Failed to update conversation');
    }
  }

  /**
   * Delete a conversation and all its messages
   * Messages are automatically deleted via foreign key cascade
   */
  async deleteConversation(conversationId: string, uid: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // First verify the conversation exists and belongs to the user
      const existing = await db
        .select()
        .from(aiConversations)
        .where(
          and(eq(aiConversations.conversationId, conversationId), eq(aiConversations.uid, uid))
        )
        .limit(1);

      if (existing.length === 0) {
        return false;
      }

      // Delete the conversation (messages are cascade deleted via foreign key)
      await db.delete(aiConversations).where(eq(aiConversations.conversationId, conversationId));

      return true;
    } catch (error) {
      logger.error('Delete conversation error:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId: string): Promise<AIMessageDto[]> {
    try {
      const db = getDatabase();

      const result = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(asc(aiMessages.createdAt));

      return result.map((record) => this.toMessageDto(record));
    } catch (error) {
      logger.error('Get messages error:', error);
      throw new Error('Failed to get messages');
    }
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    try {
      const db = getDatabase();
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId));

      return result[0]?.count || 0;
    } catch (error) {
      logger.error('Get message count error:', error);
      return 0;
    }
  }

  /**
   * Add a message to a conversation
   * Also updates the conversation's updatedAt timestamp
   */
  async addMessage(
    conversationId: string,
    uid: string,
    data: AddMessageDto
  ): Promise<AIMessageDto | null> {
    try {
      const db = getDatabase();

      // First verify the conversation exists and belongs to the user
      const conversation = await db
        .select()
        .from(aiConversations)
        .where(
          and(eq(aiConversations.conversationId, conversationId), eq(aiConversations.uid, uid))
        )
        .limit(1);

      if (conversation.length === 0) {
        return null;
      }

      const messageId = generateTypeId(OBJECT_TYPE.MESSAGE);

      // Insert the message
      await db.insert(aiMessages).values({
        messageId,
        conversationId,
        role: data.role,
        content: data.content,
        sources: data.sources || [],
      });

      // Update conversation's updatedAt timestamp (triggers $onUpdate)
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.conversationId, conversationId));

      // Fetch the created message to get auto-generated timestamps
      const result = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.messageId, messageId))
        .limit(1);

      return this.toMessageDto(result[0]);
    } catch (error) {
      logger.error('Add message error:', error);
      throw new Error('Failed to add message');
    }
  }

  /**
   * Get the most recent conversation for a user
   * Returns null if no conversations exist
   */
  async getMostRecentConversation(uid: string): Promise<AIConversationDto | null> {
    try {
      const db = getDatabase();

      const result = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.uid, uid))
        .orderBy(desc(aiConversations.updatedAt))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const messageCount = await this.getMessageCount(result[0].conversationId);
      return this.toConversationDto(result[0], messageCount);
    } catch (error) {
      logger.error('Get most recent conversation error:', error);
      return null;
    }
  }
}
