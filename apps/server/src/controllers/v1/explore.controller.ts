import {
  JsonController,
  Post,
  Body,
  CurrentUser,
  Get,
  QueryParam,
  Param,
  Put,
  Delete,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { AIConversationService } from '../../services/ai-conversation.service.js';
import { ExploreService } from '../../services/explore.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type {
  AddMessageDto,
  CreateConversationDto,
  ExploreQueryDto,
  UpdateConversationDto,
  UserInfoDto,
} from '@aimo/dto';

/**
 * Controller for AI-powered exploration features
 * Provides endpoints for knowledge discovery and intelligent search
 */
@Service()
@JsonController('/api/v1/explore')
export class ExploreController {
  constructor(
    private exploreService: ExploreService,
    private aiConversationService: AIConversationService
  ) {}

  /**
   * POST /api/v1/explore
   * Process an exploration query using LangChain DeepAgents
   * Performs vector search, analysis, and generates an AI response
   */
  @Post('/')
  async explore(@Body() queryDto: ExploreQueryDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!queryDto.query || queryDto.query.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Query is required');
      }

      const result = await this.exploreService.explore(queryDto, user.uid);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Explore error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Exploration failed'
      );
    }
  }

  /**
   * POST /api/v1/explore/quick-search
   * Quick vector search without LLM processing
   * Returns memos with relevance scores
   */
  @Post('/quick-search')
  async quickSearch(
    @Body() body: { query: string; limit?: number },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!body.query || body.query.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Query is required');
      }

      const results = await this.exploreService.quickSearch(body.query, user.uid, body.limit || 5);

      return ResponseUtility.success({
        items: results,
        total: results.length,
      });
    } catch (error) {
      logger.error('Quick search error:', error);
      return ResponseUtility.error(ErrorCode.SYSTEM_ERROR, 'Search failed');
    }
  }

  /**
   * GET /api/v1/explore/relations/:memoId
   * Get relationship graph for a memo
   * Returns nodes (memos) and edges (relationships) for visualization
   */
  @Get('/relations/:memoId')
  async getRelations(
    @QueryParam('memoId') memoId: string,
    @QueryParam('includeBacklinks') includeBacklinks: boolean = true,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!memoId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Memo ID is required');
      }

      const result = await this.exploreService.getRelationshipGraph(
        memoId,
        user.uid,
        includeBacklinks
      );

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Get relations error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to get relationships'
      );
    }
  }

  // ==================== Conversation Management Endpoints ====================

  /**
   * GET /api/v1/explore/conversations
   * Get all conversations for the current user (sorted by updatedAt desc)
   */
  @Get('/conversations')
  async getConversations(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const conversations = await this.aiConversationService.getConversations(user.uid);

      return ResponseUtility.success({
        items: conversations,
        total: conversations.length,
      });
    } catch (error) {
      logger.error('Get conversations error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get conversations');
    }
  }

  /**
   * GET /api/v1/explore/conversations/:id
   * Get a single conversation with all messages
   */
  @Get('/conversations/:id')
  async getConversation(@Param('id') conversationId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!conversationId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Conversation ID is required');
      }

      const conversation = await this.aiConversationService.getConversation(
        conversationId,
        user.uid
      );

      if (!conversation) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Conversation not found');
      }

      return ResponseUtility.success(conversation);
    } catch (error) {
      logger.error('Get conversation error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get conversation');
    }
  }

  /**
   * POST /api/v1/explore/conversations
   * Create a new conversation
   */
  @Post('/conversations')
  async createConversation(@Body() data: CreateConversationDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const conversation = await this.aiConversationService.createConversation(user.uid, data);

      return ResponseUtility.success({
        message: 'Conversation created successfully',
        conversation,
      });
    } catch (error) {
      logger.error('Create conversation error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to create conversation');
    }
  }

  /**
   * PUT /api/v1/explore/conversations/:id
   * Update a conversation (rename title)
   */
  @Put('/conversations/:id')
  async updateConversation(
    @Param('id') conversationId: string,
    @Body() data: UpdateConversationDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!conversationId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Conversation ID is required');
      }

      if (!data.title || data.title.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Title is required');
      }

      const conversation = await this.aiConversationService.updateConversation(
        conversationId,
        user.uid,
        data
      );

      if (!conversation) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Conversation not found');
      }

      return ResponseUtility.success({
        message: 'Conversation updated successfully',
        conversation,
      });
    } catch (error) {
      logger.error('Update conversation error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to update conversation');
    }
  }

  /**
   * DELETE /api/v1/explore/conversations/:id
   * Delete a conversation and all its messages
   */
  @Delete('/conversations/:id')
  async deleteConversation(@Param('id') conversationId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!conversationId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Conversation ID is required');
      }

      const success = await this.aiConversationService.deleteConversation(conversationId, user.uid);

      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Conversation not found');
      }

      return ResponseUtility.success({
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      logger.error('Delete conversation error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to delete conversation');
    }
  }

  /**
   * POST /api/v1/explore/conversations/:id/messages
   * Add a message to a conversation
   */
  @Post('/conversations/:id/messages')
  async addMessage(
    @Param('id') conversationId: string,
    @Body() data: AddMessageDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!conversationId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Conversation ID is required');
      }

      if (!data.role || (data.role !== 'user' && data.role !== 'assistant')) {
        return ResponseUtility.error(
          ErrorCode.PARAMS_ERROR,
          'Valid role is required (user or assistant)'
        );
      }

      if (!data.content || data.content.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const message = await this.aiConversationService.addMessage(conversationId, user.uid, data);

      if (!message) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Conversation not found');
      }

      return ResponseUtility.success({
        message: 'Message added successfully',
        data: message,
      });
    } catch (error) {
      logger.error('Add message error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to add message');
    }
  }
}
