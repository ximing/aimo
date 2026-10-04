import { JsonController, Post, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { PushDeviceService } from '../../services/push-device.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { RegisterPushDeviceDto, UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/push-devices')
export class PushDeviceV1Controller {
  constructor(private pushDeviceService: PushDeviceService) {}

  @Post()
  async register(@Body() data: RegisterPushDeviceDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const token = typeof data?.token === 'string' ? data.token.trim() : '';
      if (data?.provider !== 'huawei') {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Push provider must be huawei');
      }
      if (token.length === 0 || token.length > 512 || /\s/.test(token)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Push token is invalid');
      }

      const device = await this.pushDeviceService.register(user.uid, 'huawei', token);
      return ResponseUtility.success(device, 'Push device registered');
    } catch (error) {
      logger.error('Register push device error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
