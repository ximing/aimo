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

import { ErrorCode } from '../../constants/error-codes.js';
import { SpacedRepetitionService } from '../../services/spaced-repetition.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

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
}
