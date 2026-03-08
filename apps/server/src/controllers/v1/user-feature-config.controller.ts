import { JsonController, Get, Put, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { UserFeatureConfigService } from '../../services/user-feature-config.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto } from '@aimo/dto';

interface UpdateTagModelRequestDto {
  userModelId: string | null;
}

@Service()
@JsonController('/api/v1/user-feature-configs')
export class UserFeatureConfigController {
  constructor(private userFeatureConfigService: UserFeatureConfigService) {}

  /**
   * GET /api/v1/user-feature-configs/tag-model - Get tag model configuration
   */
  @Get('/tag-model')
  async getTagModel(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const userModelId = await this.userFeatureConfigService.getTagModelId(userDto.uid);
      return ResponseUtility.success({ userModelId });
    } catch (error) {
      logger.error('Get tag model config error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/user-feature-configs/tag-model - Update tag model configuration
   */
  @Put('/tag-model')
  async updateTagModel(@CurrentUser() userDto: UserInfoDto, @Body() body: UpdateTagModelRequestDto) {
    try {
      if (!userDto?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const { userModelId } = body;

      // Validate: userModelId must be string or null
      if (userModelId !== null && typeof userModelId !== 'string') {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'userModelId must be a string or null');
      }

      await this.userFeatureConfigService.setTagModelId(userDto.uid, userModelId);
      return ResponseUtility.success({ userModelId });
    } catch (error) {
      logger.error('Update tag model config error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
