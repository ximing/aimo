import { Service } from '@rabjs/react';
import type {
  ExploreSourceDto,
  RelationGraphDto,
  AIConversationDto,
  AIMessageDto,
} from '@aimo/dto';
import * as exploreApi from '../api/explore';
import * as conversationApi from '../api/explore-conversation';
import { toast } from './toast.service';

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
 * Network error with fallback flag
 */
interface NetworkError {
  code: number;
  message: string;
  isFallback?: boolean;
}

/**
 * Explore Service
 * Manages AI exploration chat state and operations
 */

// LocalStorage key for persisting selected conversation
const STORAGE_KEY = 'ai-explore-current-conversation';

export class ExploreService extends Service {
  // Chat messages (current conversation)
  messages: ChatMessage[] = [];

  // Conversations list
  conversations: AIConversationDto[] = [];

  // Current conversation ID
  currentConversationId: string | null = null;

  // Conversations loading state
  conversationsLoading = false;

  // Loading state for AI response
  loading = false;

  // Error message
  error: string | null = null;

  // Network status
  isOnline = true;

  // Relationship graph state
  relationshipGraph: RelationGraphDto | null = null;
  relationshipGraphLoading = false;
  relationshipGraphError: string | null = null;

  // Conversation context for follow-up questions
  private conversationContext = '';

  // Maximum number of messages per conversation (10 rounds = 20 messages)
  private readonly MAX_MESSAGES = 20;

  /**
   * Save selected conversation ID to localStorage
   */
  private saveSelectedConversation(conversationId: string | null) {
    try {
      if (conversationId) {
        localStorage.setItem(STORAGE_KEY, conversationId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save selected conversation:', error);
    }
  }

  /**
   * Get saved conversation ID from localStorage
   */
  private getSavedConversationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to get saved conversation:', error);
      return null;
    }
  }

  /**
   * Initialize service
   */
  constructor() {
    super();
    this.loadConversations();
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current conversation
   */
  get currentConversation(): AIConversationDto | null {
    if (!this.currentConversationId) return null;
    return this.conversations.find((c) => c.conversationId === this.currentConversationId) || null;
  }

  /**
   * Load all conversations from API
   */
  async loadConversations() {
    this.conversationsLoading = true;
    this.error = null;

    try {
      const response = await conversationApi.getConversations();
      if (response.code === 0 && response.data) {
        this.conversations = response.data.items || [];
        this.isOnline = true;

        // Check if there's a saved conversation ID and restore it
        const savedConversationId = this.getSavedConversationId();
        if (savedConversationId && this.conversations.length > 0) {
          // Verify the saved conversation still exists
          const exists = this.conversations.some((c) => c.conversationId === savedConversationId);
          if (exists) {
            await this.loadConversation(savedConversationId);
          } else {
            // Clear invalid saved ID
            this.saveSelectedConversation(null);
          }
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load conversations:', err);
      const error = err as NetworkError;
      this.error = error.message || '加载对话列表失败';
      this.isOnline = false;
    } finally {
      this.conversationsLoading = false;
    }
  }

  /**
   * Load a specific conversation with messages
   */
  async loadConversation(conversationId: string) {
    this.loading = true;
    this.error = null;

    try {
      const response = await conversationApi.getConversation(conversationId);
      if (response.code === 0 && response.data) {
        const conversation = response.data;
        this.currentConversationId = conversation.conversationId;

        // Convert API messages to ChatMessage format
        this.messages = (conversation.messages || []).map((msg: AIMessageDto) => ({
          id: msg.messageId,
          role: msg.role,
          content: msg.content,
          sources: msg.sources?.map((s) => ({
            memoId: s.memoId || '',
            content: s.content || '',
            relevanceScore: s.relevanceScore ?? s.similarity ?? 0,
            createdAt: s.createdAt ?? msg.createdAt,
          })),
          createdAt: msg.createdAt,
        }));

        // Rebuild conversation context from messages
        this.rebuildContext();
        this.isOnline = true;
      }
    } catch (err: unknown) {
      console.error('Failed to load conversation:', err);
      const error = err as NetworkError;
      this.error = error.message || '加载对话失败';
      this.isOnline = false;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Rebuild conversation context from current messages
   */
  private rebuildContext() {
    this.conversationContext = this.messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Trim context if it gets too long
    if (this.conversationContext.length > 4000) {
      this.conversationContext = this.conversationContext.slice(-4000);
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
   * Ensure a conversation exists, creating one if necessary
   */
  private async ensureConversation(): Promise<string | null> {
    if (this.currentConversationId) {
      return this.currentConversationId;
    }

    // Create a new conversation
    try {
      const response = await conversationApi.createConversation({
        title: '新对话',
      });
      if (response.code === 0 && response.data?.conversation) {
        const conversation = response.data.conversation;
        this.currentConversationId = conversation.conversationId;
        this.conversations.unshift(conversation);
        this.isOnline = true;
        return conversation.conversationId;
      }
    } catch (err: unknown) {
      console.error('Failed to create conversation:', err);
      const error = err as NetworkError;
      this.error = error.message || '创建对话失败';
      this.isOnline = false;
      toast.error(this.error);
    }
    return null;
  }

  /**
   * Update conversation title based on first user message
   */
  private async updateConversationTitle(conversationId: string, content: string) {
    // Only update if title is the default "新对话" and this is the first message
    const conversation = this.conversations.find((c) => c.conversationId === conversationId);
    if (conversation && conversation.title === '新对话' && this.messages.length <= 2) {
      // Generate title from content (first 20 chars)
      const newTitle = content.slice(0, 20) + (content.length > 20 ? '...' : '');
      try {
        const response = await conversationApi.updateConversation(conversationId, {
          title: newTitle,
        });
        if (response.code === 0 && response.data?.conversation) {
          conversation.title = response.data.conversation.title;
          conversation.updatedAt = response.data.conversation.updatedAt;
        }
      } catch (err) {
        console.error('Failed to update conversation title:', err);
      }
    }
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

    // Ensure we have a conversation
    const conversationId = await this.ensureConversation();
    if (!conversationId) {
      this.loading = false;
      return { success: false, message: this.error || '创建对话失败' };
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: query.trim(),
      createdAt: Date.now(),
    };
    this.messages.push(userMessage);

    // Save user message to backend
    try {
      await conversationApi.addMessage(conversationId, {
        role: 'user',
        content: query.trim(),
      });

      // Update conversation title if needed
      await this.updateConversationTitle(conversationId, query.trim());

      this.isOnline = true;
    } catch (err: unknown) {
      console.error('Failed to save user message:', err);
      const error = err as NetworkError;
      this.error = error.message || '保存消息失败';
      this.messages = this.messages.filter((m) => m.id !== userMessage.id);
      this.loading = false;
      this.isOnline = false;
      return { success: false, message: this.error };
    }

    try {
      const response = await exploreApi.explore({
        query: query.trim(),
        context: this.conversationContext || undefined,
      });

      if (response.code === 0 && response.data) {
        const { answer, sources, suggestedQuestions } = response.data;

        // Add AI response to local state
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

        // Save assistant message to backend
        try {
          await conversationApi.addMessage(conversationId, {
            role: 'assistant',
            content: answer,
            sources: sources?.map((s) => ({
              memoId: s.memoId,
              content: s.content,
              similarity: s.relevanceScore,
            })),
          });

          // Update conversation in list (move to top due to updatedAt)
          const conversationIndex = this.conversations.findIndex(
            (c) => c.conversationId === conversationId
          );
          if (conversationIndex > 0) {
            const [conversation] = this.conversations.splice(conversationIndex, 1);
            conversation.updatedAt = Date.now();
            this.conversations.unshift(conversation);
          } else if (conversationIndex === 0) {
            this.conversations[0].updatedAt = Date.now();
          }
        } catch (err) {
          console.error('Failed to save assistant message:', err);
          // Continue even if save fails - user can still see the response
        }

        return { success: true };
      } else {
        this.error = response.data?.toString() || '探索失败，请重试';
        // Remove the user message on error
        this.messages = this.messages.filter((m) => m.id !== userMessage.id);
        return { success: false, message: this.error };
      }
    } catch (error: unknown) {
      console.error('Explore query error:', error);
      this.error = error instanceof Error ? error.message : '探索失败，请重试';
      // Remove the user message on error
      this.messages = this.messages.filter((m) => m.id !== userMessage.id);
      return { success: false, message: this.error };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Start a new conversation
   */
  async newConversation(title?: string): Promise<string | null> {
    this.loading = true;
    this.error = null;

    try {
      const response = await conversationApi.createConversation({
        title: title || '新对话',
      });

      if (response.code === 0 && response.data?.conversation) {
        const conversation = response.data.conversation;
        this.currentConversationId = conversation.conversationId;
        this.conversations.unshift(conversation);
        this.messages = [];
        this.conversationContext = '';
        this.isOnline = true;
        // Save to localStorage when creating a new conversation
        this.saveSelectedConversation(conversation.conversationId);
        return conversation.conversationId;
      } else {
        // Handle API error response
        this.error = response.data?.toString() || '创建对话失败';
        this.isOnline = false;
      }
    } catch (err: unknown) {
      console.error('Failed to create conversation:', err);
      const error = err as NetworkError;
      this.error = error.message || '创建对话失败';
      this.isOnline = false;
      toast.error(this.error);
    } finally {
      this.loading = false;
    }
    return null;
  }

  /**
   * Select an existing conversation
   */
  async selectConversation(conversationId: string) {
    if (conversationId === this.currentConversationId) return;
    await this.loadConversation(conversationId);
    // Save to localStorage when user selects a conversation
    this.saveSelectedConversation(conversationId);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    this.loading = true;
    this.error = null;

    try {
      const response = await conversationApi.deleteConversation(conversationId);

      if (response.code === 0) {
        // Remove from list
        this.conversations = this.conversations.filter((c) => c.conversationId !== conversationId);

        // If current conversation was deleted, clear it
        if (this.currentConversationId === conversationId) {
          this.currentConversationId = null;
          this.messages = [];
          this.conversationContext = '';
          // Clear saved conversation ID
          this.saveSelectedConversation(null);

          // Auto-select most recent if available
          if (this.conversations.length > 0) {
            await this.loadConversation(this.conversations[0].conversationId);
          }
        }

        this.isOnline = true;
        return true;
      }
    } catch (err: unknown) {
      console.error('Failed to delete conversation:', err);
      const error = err as NetworkError;
      this.error = error.message || '删除对话失败';
      this.isOnline = false;
    } finally {
      this.loading = false;
    }
    return false;
  }

  /**
   * Rename a conversation
   */
  async renameConversation(conversationId: string, newTitle: string): Promise<boolean> {
    if (!newTitle.trim()) {
      this.error = '标题不能为空';
      return false;
    }

    this.loading = true;
    this.error = null;

    try {
      const response = await conversationApi.updateConversation(conversationId, {
        title: newTitle.trim(),
      });

      if (response.code === 0 && response.data?.conversation) {
        const updated = response.data.conversation;
        const conversation = this.conversations.find((c) => c.conversationId === conversationId);
        if (conversation) {
          conversation.title = updated.title;
          conversation.updatedAt = updated.updatedAt;
        }
        this.isOnline = true;
        return true;
      }
    } catch (err: unknown) {
      console.error('Failed to rename conversation:', err);
      const error = err as NetworkError;
      this.error = error.message || '重命名对话失败';
      this.isOnline = false;
    } finally {
      this.loading = false;
    }
    return false;
  }

  /**
   * Refresh conversations list
   */
  async refreshConversations() {
    await this.loadConversations();
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
