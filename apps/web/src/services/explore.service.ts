import { Service } from '@rabjs/react';
import type { ExploreSourceDto, RelationGraphDto } from '@aimo/dto';
import * as exploreApi from '../api/explore';

/**
 * Message type for chat interface
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ExploreSourceDto[];
  suggestedQuestions?: string[];
  createdAt: number;
}

/**
 * Explore Service
 * Manages AI exploration chat state and operations
 */
export class ExploreService extends Service {
  // Chat messages
  messages: ChatMessage[] = [];

  // Loading state for AI response
  loading = false;

  // Error message
  error: string | null = null;

  // Relationship graph state
  relationshipGraph: RelationGraphDto | null = null;
  relationshipGraphLoading = false;
  relationshipGraphError: string | null = null;

  // Conversation context for follow-up questions
  private conversationContext = '';

  // Maximum number of messages per conversation (10 rounds = 20 messages)
  private readonly MAX_MESSAGES = 20;

  /**
   * Initialize service and load messages from localStorage
   */
  constructor() {
    super();
    this.loadFromStorage();
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get localStorage key for current conversation
   */
  private getStorageKey(): string {
    return 'aimo_explore_conversation';
  }

  /**
   * Load conversation from localStorage
   */
  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.getStorageKey());
      if (saved) {
        const data = JSON.parse(saved);
        this.messages = data.messages || [];
        this.conversationContext = data.context || '';
      }
    } catch {
      // localStorage might not be available
      this.messages = [];
      this.conversationContext = '';
    }
  }

  /**
   * Save conversation to localStorage
   */
  private saveToStorage() {
    try {
      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify({
          messages: this.messages,
          context: this.conversationContext,
        })
      );
    } catch {
      // localStorage might not be available
    }
  }

  /**
   * Check if conversation has reached the 10-round limit
   */
  get isConversationLimitReached(): boolean {
    // Each round = 2 messages (user + assistant)
    return this.messages.length >= this.MAX_MESSAGES;
  }

  /**
   * Get current round number
   */
  get currentRound(): number {
    return Math.ceil(this.messages.length / 2);
  }

  /**
   * Send a query to the AI exploration endpoint
   */
  async sendQuery(query: string) {
    if (!query.trim()) {
      return { success: false, message: '请输入问题内容' };
    }

    // Check conversation limit
    if (this.isConversationLimitReached) {
      return {
        success: false,
        message: '已达到对话轮数上限（10轮），请新建话题继续',
        limitReached: true,
      };
    }

    this.loading = true;
    this.error = null;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: query.trim(),
      createdAt: Date.now(),
    };
    this.messages.push(userMessage);
    this.saveToStorage();

    try {
      const response = await exploreApi.explore({
        query: query.trim(),
        context: this.conversationContext || undefined,
      });

      if (response.code === 0 && response.data) {
        const { answer, sources, suggestedQuestions } = response.data;

        // Add AI response
        const assistantMessage: ChatMessage = {
          id: this.generateId(),
          role: 'assistant',
          content: answer,
          sources,
          suggestedQuestions,
          createdAt: Date.now(),
        };
        this.messages.push(assistantMessage);

        // Update conversation context
        this.conversationContext += `\nUser: ${query.trim()}\nAssistant: ${answer}`;

        // Trim context if it gets too long (keep last ~4000 chars)
        if (this.conversationContext.length > 4000) {
          this.conversationContext = this.conversationContext.slice(-4000);
        }

        this.saveToStorage();

        return { success: true };
      } else {
        this.error = response.data?.toString() || '探索失败，请重试';
        // Remove the user message on error
        this.messages = this.messages.filter((m) => m.id !== userMessage.id);
        this.saveToStorage();
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Explore query error:', error);
      this.error = error instanceof Error ? error.message : '探索失败，请重试';
      // Remove the user message on error
      this.messages = this.messages.filter((m) => m.id !== userMessage.id);
      this.saveToStorage();
      return { success: false, message: this.error };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Start a new conversation
   */
  newConversation() {
    this.messages = [];
    this.conversationContext = '';
    this.error = null;
    this.saveToStorage();
  }

  /**
   * Quick search without LLM processing
   */
  async quickSearch(query: string, limit = 5) {
    try {
      const response = await exploreApi.quickSearch(query, limit);
      if (response.code === 0 && response.data) {
        return { success: true, items: response.data.items };
      }
      return { success: false, message: '搜索失败' };
    } catch (error: unknown) {
      console.error('Quick search error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '搜索失败',
      };
    }
  }

  /**
   * Load relationship graph for a memo
   */
  async loadRelationshipGraph(memoId: string) {
    this.relationshipGraphLoading = true;
    this.relationshipGraphError = null;

    try {
      const response = await exploreApi.getRelations(memoId, true);

      if (response.code === 0 && response.data) {
        this.relationshipGraph = response.data.graph;
        return { success: true };
      } else {
        this.relationshipGraphError = '加载关系图谱失败';
        return { success: false, message: this.relationshipGraphError };
      }
    } catch (error: unknown) {
      console.error('Load relationship graph error:', error);
      this.relationshipGraphError = error instanceof Error ? error.message : '加载关系图谱失败';
      return { success: false, message: this.relationshipGraphError };
    } finally {
      this.relationshipGraphLoading = false;
    }
  }

  /**
   * Clear the relationship graph
   */
  clearRelationshipGraph() {
    this.relationshipGraph = null;
    this.relationshipGraphError = null;
  }
}
