import { JsonController, Get, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { GitHubReleaseService } from '../../services/github-release.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/system')
export class SystemController {
  constructor(private gitHubReleaseService: GitHubReleaseService) {}

  @Get('/version')
  async getVersion(@CurrentUser() user: UserInfoDto) {
    // 需要登录后才能访问，返回服务端版本号
    const packageJson = await import('../../../package.json', { with: { type: 'json' } });
    return ResponseUtility.success({
      version: packageJson.default.version,
    });
  }

  /**
   * Get latest app versions from GitHub releases
   * Public endpoint - no authentication required
   */
  @Get('/app-versions')
  async getAppVersions() {
    try {
      const versions = await this.gitHubReleaseService.getAllVersions();
      return ResponseUtility.success(versions);
    } catch (error) {
      logger.error('Error fetching app versions:', error);
      return ResponseUtility.error(
        ErrorCode.SYSTEM_ERROR,
        error instanceof Error ? error.message : 'Failed to fetch app versions'
      );
    }
  }
}
