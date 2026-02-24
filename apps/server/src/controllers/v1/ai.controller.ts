import { JsonController, Post, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { AIService } from '../../services/ai.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { GenerateTagsRequestDto, UserInfoDto } from '@aimo/dto';

/**
 * Controller for AI-powered features
 * Provides endpoints for tag generation and other AI utilities
 */
@Service()
@JsonController('/api/v1/ai')
export class AIV1Controller {
  constructor(private aiService: AIService) {}

  /**
   * POST /api/v1/ai/generate-tags
   * Generate tag suggestions from memo content using AI
   * Returns 3-8 relevant tags based on content analysis
   */
  @Post('/generate-tags')
  async generateTags(
    @Body() body: GenerateTagsRequestDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      // Check authentication
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate content parameter
      if (!body.content || body.content.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      // Generate tags using AI service
      const tags = await this.aiService.generateTags(body.content);

      return ResponseUtility.success({
        tags,
      });
    } catch (error) {
      console.error('Generate tags error:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to generate tags'
      );
    }
  }
}
