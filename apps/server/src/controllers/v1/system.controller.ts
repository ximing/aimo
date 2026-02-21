import { JsonController, Get, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto } from '@aimo/dto';


@Service()
@JsonController('/api/v1/system')
export class SystemController {

  @Get('/version')
  async getVersion(@CurrentUser() user: UserInfoDto) {
    // 需要登录后才能访问，返回服务端版本号
    const packageJson = await import('../../../package.json', { with: { type: 'json' } });
    return ResponseUtility.success({
      version: packageJson.default.version,
    });
  }
}
