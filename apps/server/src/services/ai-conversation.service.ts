import { Service } from 'typedi';

import type { Table } from '@lancedb/lancedb';

import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

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
 */
@Service()
export class AIConversationService {
  constructor(private lanceDatabase: LanceDatabaseService) {}

  /**
   * Get the conversations table
   */
  private async getConversationsTable(): Promise<Table> {
    return this.lanceDatabase.openTable('ai_conversations');
  }

  /**
   * Get the messages table
   */
  private async getMessagesTable(): Promise<Table> {
    return this.lanceDatabase.openTable('ai_messages');
  }

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
    record: Record<string, unknown>,
    messageCount = 0
  ): AIConversationDto {
    return {
      conversationId: String(record.conversationId),
      title: String(record.title),
      createdAt: Number(record.createdAt),
      updatedAt: Number(record.updatedAt),
      messageCount,
    };
  }

  /**
   * Convert database record to message DTO
   * LanceDB List<Struct> type is returned as an Arrow List that needs .toArray() conversion
   */
  private toMessageDto(record: Record<string, unknown>): AIMessageDto {
    // Convert LanceDB List<Struct> to plain JavaScript array
    // The sources field comes from schema: List(Struct([memoId, content, similarity]))
    let sources: AIMessageSourceDto[] | undefined;

    if (record.sources) {
      // Handle Arrow List type - call toArray() to convert to plain array
      let sourcesArray: any[] = [];

      if (typeof record.sources === 'object' && 'toArray' in record.sources) {
        // It's an Arrow List object, convert to array
        sourcesArray = (record.sources as any).toArray();
      } else if (Array.isArray(record.sources)) {
        // Already a plain array
        sourcesArray = record.sources;
      }

      // Convert each source item to plain object if needed
      sources = sourcesArray.map((item: any) => {
        // Handle both plain objects and potential Arrow objects
        if (item && typeof item === 'object') {
          return {
            memoId: item.memoId ?? undefined,
            content: item.content ?? undefined,
            similarity: item.similarity ?? undefined,
            relevanceScore: item.relevanceScore ?? undefined,
            createdAt: item.createdAt ?? undefined,
          } as AIMessageSourceDto;
        }
        return item;
      });

      // Filter out empty arrays
      if (sources.length === 0) {
        sources = undefined;
      }
    }

    return {
      messageId: String(record.messageId),
      conversationId: String(record.conversationId),
      role: String(record.role) as 'user' | 'assistant',
      content: String(record.content),
      sources,
      createdAt: Number(record.createdAt),
    };
  }

  /**
   * Get all conversations for a user (sorted by updatedAt desc)
   */
  async getConversations(uid: string): Promise<AIConversationDto[]> {
    try {
      const table = await this.getConversationsTable();

      // Query conversations for this user
      const result = await table
        .query()
        .where(`uid = '${uid}'`)
        .toArray();

      // Sort by updatedAt desc in JavaScript (LanceDB doesn't support orderBy directly)
      result.sort((a: any, b: any) => Number(b.updatedAt) - Number(a.updatedAt));

      // Get message counts for each conversation
      const conversations: AIConversationDto[] = [];
      for (const record of result) {
        const conversationId = String(record.conversationId);
        const messageCount = await this.getMessageCount(conversationId);
        conversations.push(this.toConversationDto(record, messageCount));
      }

      return conversations;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw new Error('Failed to get conversations');
    }
  }

  /**
   * Get a single conversation by ID with all messages
   */
  async getConversation(conversationId: string, uid: string): Promise<AIConversationDetailDto | null> {
    try {
      const table = await this.getConversationsTable();

      // Query the conversation
      const result = await table
        .query()
        .where(`conversationId = '${conversationId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

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
      console.error('Get conversation error:', error);
      throw new Error('Failed to get conversation');
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    uid: string,
    data: CreateConversationDto
  ): Promise<AIConversationDto> {
    try {
      const table = await this.getConversationsTable();

      const now = Date.now();
      const conversationId = generateTypeId(OBJECT_TYPE.CONVERSATION);
      const title = data.title || this.generateDefaultTitle();

      const record = {
        conversationId,
        uid,
        title,
        createdAt: now,
        updatedAt: now,
      };

      await table.add([record]);

      return this.toConversationDto(record, 0);
    } catch (error) {
      console.error('Create conversation error:', error);
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
      const table = await this.getConversationsTable();

      // First verify the conversation exists and belongs to the user
      const existing = await table
        .query()
        .where(`conversationId = '${conversationId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (existing.length === 0) {
        return null;
      }

      const now = Date.now();
      const updatedRecord = {
        ...existing[0],
        title: data.title,
        updatedAt: now,
      };

      await table.update({
        where: `conversationId = '${conversationId}'`,
        values: updatedRecord,
      });

      const messageCount = await this.getMessageCount(conversationId);
      return this.toConversationDto(updatedRecord, messageCount);
    } catch (error) {
      console.error('Update conversation error:', error);
      throw new Error('Failed to update conversation');
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string, uid: string): Promise<boolean> {
    try {
      const conversationsTable = await this.getConversationsTable();
      const messagesTable = await this.getMessagesTable();

      // First verify the conversation exists and belongs to the user
      const existing = await conversationsTable
        .query()
        .where(`conversationId = '${conversationId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (existing.length === 0) {
        return false;
      }

      // Delete all messages in the conversation
      await messagesTable.delete(`conversationId = '${conversationId}'`);

      // Delete the conversation
      await conversationsTable.delete(`conversationId = '${conversationId}'`);

      return true;
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId: string): Promise<AIMessageDto[]> {
    try {
      const table = await this.getMessagesTable();

      const result = await table
        .query()
        .where(`conversationId = '${conversationId}'`)
        .toArray();

      // Sort by createdAt asc in JavaScript (LanceDB doesn't support orderBy directly)
      result.sort((a: any, b: any) => Number(a.createdAt) - Number(b.createdAt));

      return result.map((record) => this.toMessageDto(record));
    } catch (error) {
      console.error('Get messages error:', error);
      throw new Error('Failed to get messages');
    }
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    try {
      const table = await this.getMessagesTable();
      const result = await table
        .query()
        .where(`conversationId = '${conversationId}'`)
        .toArray();
      return result.length;
    } catch (error) {
      console.error('Get message count error:', error);
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
      const messagesTable = await this.getMessagesTable();
      const conversationsTable = await this.getConversationsTable();

      // First verify the conversation exists and belongs to the user
      const conversation = await conversationsTable
        .query()
        .where(`conversationId = '${conversationId}' AND uid = '${uid}'`)
        .limit(1)
        .toArray();

      if (conversation.length === 0) {
        return null;
      }

      const now = Date.now();
      const messageId = generateTypeId(OBJECT_TYPE.MESSAGE);

      const record = {
        messageId,
        conversationId,
        role: data.role,
        content: data.content,
        sources: data.sources || [],
        createdAt: now,
      };

      await messagesTable.add([record]);

      // Update conversation's updatedAt timestamp
      const updatedConversation = {
        ...conversation[0],
        updatedAt: now,
      };
      await conversationsTable.update({
        where: `conversationId = '${conversationId}'`,
        values: updatedConversation,
      });

      return this.toMessageDto(record);
    } catch (error) {
      console.error('Add message error:', error);
      throw new Error('Failed to add message');
    }
  }

  /**
   * Get the most recent conversation for a user
   * Returns null if no conversations exist
   */
  async getMostRecentConversation(uid: string): Promise<AIConversationDto | null> {
    try {
      const table = await this.getConversationsTable();

      const result = await table
        .query()
        .where(`uid = '${uid}'`)
        .toArray();

      if (result.length === 0) {
        return null;
      }

      // Sort by updatedAt desc in JavaScript (LanceDB doesn't support orderBy directly)
      result.sort((a: any, b: any) => Number(b.updatedAt) - Number(a.updatedAt));

      const messageCount = await this.getMessageCount(String(result[0].conversationId));
      return this.toConversationDto(result[0], messageCount);
    } catch (error) {
      console.error('Get most recent conversation error:', error);
      return null;
    }
  }
}
