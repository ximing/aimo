import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { PushRuleService } from '../../services/push-rule.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { CreatePushRuleDto, UpdatePushRuleDto, UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/push-rules')
export class PushRuleV1Controller {
  constructor(private pushRuleService: PushRuleService) {}

  @Get()
  async getPushRules(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const pushRules = await this.pushRuleService.findByUid(user.uid);

      return ResponseUtility.success({
        message: 'Push rules fetched successfully',
        pushRules,
      });
    } catch (error) {
      console.error('Get push rules error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:id')
  async getPushRule(@Param('id') id: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const pushRule = await this.pushRuleService.findById(id, user.uid);
      if (!pushRule) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Push rule fetched successfully',
        pushRule,
      });
    } catch (error) {
      console.error('Get push rule error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post()
  async createPushRule(@Body() data: CreatePushRuleDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!data.name || data.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Push rule name is required');
      }

      if (data.pushTime === undefined || data.pushTime < 0 || data.pushTime > 23) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Push time must be between 0 and 23');
      }

      if (!data.contentType || !['daily_pick', 'daily_memos'].includes(data.contentType)) {
        return ResponseUtility.error(
          ErrorCode.PARAMS_ERROR,
          'Content type must be daily_pick or daily_memos'
        );
      }

      if (!data.channels || data.channels.length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'At least one channel is required');
      }

      const pushRule = await this.pushRuleService.create(user.uid, data);

      return ResponseUtility.success({
        message: 'Push rule created successfully',
        pushRule,
      });
    } catch (error) {
      console.error('Create push rule error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/:id')
  async updatePushRule(
    @Param('id') id: string,
    @Body() data: UpdatePushRuleDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const pushRule = await this.pushRuleService.update(id, user.uid, data);
      if (!pushRule) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Push rule updated successfully',
        pushRule,
      });
    } catch (error) {
      console.error('Update push rule error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:id')
  async deletePushRule(@Param('id') id: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const success = await this.pushRuleService.delete(id, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Push rule deleted successfully',
      });
    } catch (error) {
      console.error('Delete push rule error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
