import type {
  AIConversationDto,
  AIConversationDetailDto,
  AIMessageDto,
  CreateConversationDto,
  UpdateConversationDto,
  AddMessageDto,
  ConversationListResponseDto,
  ConversationListQueryDto,
} from '@aimo/dto';
import request from '../utils/request';

/**
 * Get all conversations for the current user (sorted by updatedAt desc)
 */
export const getConversations = (params?: ConversationListQueryDto) => {
  return request.get<unknown, { code: number; data: ConversationListResponseDto }>(
    '/api/v1/explore/conversations',
    { params }
  );
};

/**
 * Get a single conversation with all messages
 */
export const getConversation = (conversationId: string) => {
  return request.get<unknown, { code: number; data: AIConversationDetailDto }>(
    `/api/v1/explore/conversations/${conversationId}`
  );
};

/**
 * Create a new conversation
 */
export const createConversation = (data: CreateConversationDto) => {
  return request.post<
    unknown,
    { code: number; data: { message: string; conversation: AIConversationDto } }
  >('/api/v1/explore/conversations', data);
};

/**
 * Update a conversation (rename title)
 */
export const updateConversation = (conversationId: string, data: UpdateConversationDto) => {
  return request.put<
    unknown,
    { code: number; data: { message: string; conversation: AIConversationDto } }
  >(`/api/v1/explore/conversations/${conversationId}`, data);
};

/**
 * Delete a conversation and all its messages
 */
export const deleteConversation = (conversationId: string) => {
  return request.delete<unknown, { code: number; data: { message: string } }>(
    `/api/v1/explore/conversations/${conversationId}`
  );
};

/**
 * Add a message to a conversation
 */
export const addMessage = (conversationId: string, data: AddMessageDto) => {
  return request.post<unknown, { code: number; data: { message: string; data: AIMessageDto } }>(
    `/api/v1/explore/conversations/${conversationId}/messages`,
    data
  );
};
