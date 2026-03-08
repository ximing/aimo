import {
  JsonController,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';

import { ErrorCode } from '../../constants/error-codes.js';
import { SpacedRepetitionService } from '../../services/spaced-repetition.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { getDatabase } from '../../db/connection.js';
import { memos } from '../../db/schema/memos.js';

import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/spaced-repetition')
export class SpacedRepetitionController {
  constructor(private spacedRepetitionService: SpacedRepetitionService) {}

  /**
   * GET /api/v1/spaced-repetition/settings
   * Returns current user's SR settings (srEnabled, srDailyLimit)
   */
  @Get('/settings')
  async getSettings(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const settings = await this.spacedRepetitionService.getSettings(user.uid);
      if (!settings) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'User not found');
      }

      return ResponseUtility.success(settings);
    } catch (error) {
      logger.error('Get SR settings error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get settings');
    }
  }

  /**
   * PUT /api/v1/spaced-repetition/settings
   * Updates current user's SR settings
   */
  @Put('/settings')
  async updateSettings(
    @Body() body: { srEnabled?: boolean; srDailyLimit?: number },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const updates: { srEnabled?: boolean; srDailyLimit?: number } = {};

      if (body.srEnabled !== undefined) {
        updates.srEnabled = Boolean(body.srEnabled);
      }

      if (body.srDailyLimit !== undefined) {
        const limit = Number(body.srDailyLimit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          return ResponseUtility.error(
            ErrorCode.PARAMS_ERROR,
            'srDailyLimit must be an integer between 1 and 100'
          );
        }
        updates.srDailyLimit = limit;
      }

      const settings = await this.spacedRepetitionService.updateSettings(user.uid, updates);
      if (!settings) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'User not found');
      }

      return ResponseUtility.success(settings);
    } catch (error) {
      logger.error('Update SR settings error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to update settings');
    }
  }

  /**
   * GET /api/v1/spaced-repetition/rules
   * Returns current user's SR filter rules
   */
  @Get('/rules')
  async getRules(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const rules = await this.spacedRepetitionService.getRules(user.uid);

      return ResponseUtility.success({ rules });
    } catch (error) {
      logger.error('Get SR rules error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get rules');
    }
  }

  /**
   * POST /api/v1/spaced-repetition/rules
   * Creates a new SR filter rule
   */
  @Post('/rules')
  async createRule(
    @Body() body: { mode: 'include' | 'exclude'; filterType: 'category' | 'tag'; filterValue: string },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!body.mode || !['include', 'exclude'].includes(body.mode)) {
        return ResponseUtility.error(
          ErrorCode.PARAMS_ERROR,
          'mode must be "include" or "exclude"'
        );
      }

      if (!body.filterType || !['category', 'tag'].includes(body.filterType)) {
        return ResponseUtility.error(
          ErrorCode.PARAMS_ERROR,
          'filterType must be "category" or "tag"'
        );
      }

      if (!body.filterValue || body.filterValue.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'filterValue is required');
      }

      const rule = await this.spacedRepetitionService.createRule(user.uid, {
        mode: body.mode,
        filterType: body.filterType,
        filterValue: body.filterValue.trim(),
      });

      return ResponseUtility.success({ rule });
    } catch (error) {
      logger.error('Create SR rule error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to create rule');
    }
  }

  /**
   * DELETE /api/v1/spaced-repetition/rules/:ruleId
   * Deletes a SR filter rule; returns 404 if not owned by current user
   */
  @Delete('/rules/:ruleId')
  async deleteRule(@Param('ruleId') ruleId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!ruleId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Rule ID is required');
      }

      const success = await this.spacedRepetitionService.deleteRule(ruleId, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Rule not found');
      }

      return ResponseUtility.success({ message: 'Rule deleted successfully' });
    } catch (error) {
      logger.error('Delete SR rule error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to delete rule');
    }
  }

  /**
   * GET /api/v1/spaced-repetition/due
   * Returns due cards (nextReviewAt <= now) with memo info, sorted by nextReviewAt asc
   */
  @Get('/due')
  async getDueCards(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Get user's srDailyLimit setting
      const settings = await this.spacedRepetitionService.getSettings(user.uid);
      const dailyLimit = settings?.srDailyLimit ?? 5;

      const cards = await this.spacedRepetitionService.getDueCards(user.uid);
      const totalDue = cards.length;

      // Truncate to daily limit (cards are already sorted by nextReviewAt asc)
      const limitedCards = cards.slice(0, dailyLimit);

      // Fetch memo info for each card
      const db = getDatabase();
      const cardWithMemos = await Promise.all(
        limitedCards.map(async (card) => {
          const memoResults = await db
            .select({ memoId: memos.memoId, content: memos.content })
            .from(memos)
            .where(and(eq(memos.memoId, card.memoId), eq(memos.deletedAt, 0)))
            .limit(1);

          const memo = memoResults[0];
          if (!memo) {
            return null;
          }

          const firstLine = memo.content.split('\n')[0].trim();
          const title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;
          const contentPreview =
            memo.content.length > 200 ? memo.content.slice(0, 200) : memo.content;

          return {
            cardId: card.cardId,
            memoId: card.memoId,
            memo: {
              id: memo.memoId,
              title,
              content: contentPreview,
            },
            easeFactor: card.easeFactor,
            interval: card.interval,
            repetitions: card.repetitions,
            lapseCount: card.lapseCount,
            nextReviewAt: card.nextReviewAt,
          };
        })
      );

      // Filter out cards whose memo was deleted
      const validCards = cardWithMemos.filter(Boolean);

      return ResponseUtility.success({ cards: validCards, totalDue, dailyLimit });
    } catch (error) {
      logger.error('Get due cards error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get due cards');
    }
  }

  /**
   * GET /api/v1/spaced-repetition/stats
   * Returns total card count for the user
   */
  @Get('/stats')
  async getStats(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const totalCards = await this.spacedRepetitionService.getTotalCardCount(user.uid);

      return ResponseUtility.success({ totalCards });
    } catch (error) {
      logger.error('Get SR stats error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get SR stats');
    }
  }

  /**
   * POST /api/v1/spaced-repetition/cards/:cardId/review
   * Submit a review result for a card
   * quality: 'mastered'|'remembered'|'fuzzy'|'forgot'|'skip'
   */
  @Post('/cards/:cardId/review')
  async reviewCard(
    @Param('cardId') cardId: string,
    @Body() body: { quality: 'mastered' | 'remembered' | 'fuzzy' | 'forgot' | 'skip' },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!cardId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Card ID is required');
      }

      const validQualities = ['mastered', 'remembered', 'fuzzy', 'forgot', 'skip'];
      if (!body.quality || !validQualities.includes(body.quality)) {
        return ResponseUtility.error(
          ErrorCode.PARAMS_ERROR,
          'quality must be one of: mastered, remembered, fuzzy, forgot, skip'
        );
      }

      const card = await this.spacedRepetitionService.getCardById(cardId, user.uid);
      if (!card) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Card not found');
      }

      // Skip: return current card without updating
      if (body.quality === 'skip') {
        return ResponseUtility.success({ card });
      }

      // Map quality string to SM-2 numeric quality
      const qualityMap: Record<string, 1 | 3 | 4 | 5> = {
        mastered: 5,
        remembered: 4,
        fuzzy: 3,
        forgot: 1,
      };
      const numericQuality = qualityMap[body.quality];

      // Calculate next review using SM-2
      const nextReview = this.spacedRepetitionService.calculateNextReview(card, numericQuality);

      // Update card in database
      const updatedCard = await this.spacedRepetitionService.updateCardAfterReview(
        cardId,
        user.uid,
        {
          easeFactor: nextReview.easeFactor,
          interval: nextReview.interval,
          repetitions: nextReview.repetitions,
          lapseCount: nextReview.lapseCount,
          nextReviewAt: nextReview.nextReviewAt,
          lastReviewAt: new Date(),
        }
      );

      return ResponseUtility.success({ card: updatedCard });
    } catch (error) {
      logger.error('Review card error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to submit review');
    }
  }

  /**
   * POST /api/v1/spaced-repetition/import-existing
   * Import all existing memos into the SR pool
   */
  @Post('/import-existing')
  async importExistingMemos(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.spacedRepetitionService.importExistingMemos(user.uid);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Import existing memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to import existing memos');
    }
  }
}
