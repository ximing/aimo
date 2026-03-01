import { JsonController, Get, QueryParam, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { MemoService } from '../../services/memo.service.js';
import { RecommendationService } from '../../services/recommendation.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/insights')
export class InsightsController {
  constructor(
    private memoService: MemoService,
    private recommendationService: RecommendationService
  ) {}

  /**
   * Get activity stats for calendar heatmap
   * Returns daily memo counts for the specified number of days (default: 90)
   */
  @Get('/activity')
  async getActivityStats(@QueryParam('days') days: number = 90, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate days parameter
      const validDays = Math.min(Math.max(days, 1), 365);

      const stats = await this.memoService.getActivityStats(user.uid, validDays);

      return ResponseUtility.success(stats);
    } catch (error) {
      logger.error('Get activity stats error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Get memos from previous years on the same month/day
   * Returns memos created on this day in history (excluding current year)
   */
  @Get('/on-this-day')
  async getOnThisDayMemos(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.memoService.getOnThisDayMemos(user.uid);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Get on this day memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Get daily memo recommendations
   * Returns AI-curated 3 memos for daily review, cached per day
   */
  @Get('/daily-recommendations')
  async getDailyRecommendations(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const memos = await this.recommendationService.generateDailyRecommendations(user.uid);

      return ResponseUtility.success({
        items: memos,
        total: memos.length,
      });
    } catch (error) {
      logger.error('Get daily recommendations error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
