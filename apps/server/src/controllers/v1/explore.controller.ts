import { JsonController, Post, Body, CurrentUser, Get, QueryParam } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { ExploreService } from '../../services/explore.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { ExploreQueryDto, UserInfoDto } from '@aimo/dto';

/**
 * Controller for AI-powered exploration features
 * Provides endpoints for knowledge discovery and intelligent search
 */
@Service()
@JsonController('/api/v1/explore')
export class ExploreController {
  constructor(private exploreService: ExploreService) {}

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
      console.error('Explore error:', error);
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

      const results = await this.exploreService.quickSearch(
        body.query,
        user.uid,
        body.limit || 5
      );

      return ResponseUtility.success({
        items: results,
        total: results.length,
      });
    } catch (error) {
      console.error('Quick search error:', error);
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
      console.error('Get relations error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to get relationships'
      );
    }
  }
}
