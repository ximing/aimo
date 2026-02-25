import { JsonController, Post, Get, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { AIService } from '../../services/ai.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { GenerateTagsRequestDto, UserInfoDto, AIToolConfigDto } from '@aimo/dto';

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
  async generateTags(@Body() body: GenerateTagsRequestDto, @CurrentUser() user: UserInfoDto) {
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

  /**
   * GET /api/v1/ai/tools
   * Get list of available AI tools
   * Returns configuration for all enabled AI tools
   */
  @Get('/tools')
  async getAvailableTools(@CurrentUser() user: UserInfoDto) {
    // Check authentication
    if (!user?.uid) {
      return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
    }

    // Define available AI tools
    // This array can be easily extended with new tools
    const tools: AIToolConfigDto[] = [
      {
        id: 'generate-tags',
        name: '智能添加标签',
        description: 'AI 分析笔记内容，自动生成相关标签建议',
        icon: 'Tags',
      },
      // Reserved slots for future AI tools:
      // {
      //   id: 'summarize',
      //   name: '智能总结',
      //   description: 'AI 生成笔记内容摘要',
      //   icon: 'FileText',
      // },
      // {
      //   id: 'translate',
      //   name: '翻译',
      //   description: '将笔记内容翻译成其他语言',
      //   icon: 'Languages',
      // },
    ];

    return ResponseUtility.success({ tools });
  }
}
