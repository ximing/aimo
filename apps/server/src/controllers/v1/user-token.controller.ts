import { JsonController, Get, Post, Delete, Body, Param, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { UserTokenService } from '../../services/user-token.service.js';
import { CreateUserTokenDto, UserTokenResponseDto, UserTokenListResponseDto } from '@aimo/dto';
import { ErrorCode } from '../../constants/error-codes.js';
import { ResponseUtil } from '../../utils/response.js';

@Service()
@JsonController('/api/v1/user/tokens')
export class UserTokenController {
  constructor(private userTokenService: UserTokenService) {}

  @Post()
  async createToken(
    @CurrentUser() user: { uid: string },
    @Body() dto: CreateUserTokenDto
  ) {
    if (!dto.name || dto.name.length < 1 || dto.name.length > 100) {
      return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Token name must be between 1 and 100 characters');
    }

    const { token, id } = await this.userTokenService.createToken(user.uid, dto.name, dto.expiresAt ?? 0);
    const tokens = await this.userTokenService.getTokensByUserId(user.uid);
    const created = tokens.find((t) => t.id === id)!;

    return ResponseUtil.success({ ...created, token });
  }

  @Get()
  async listTokens(@CurrentUser() user: { uid: string }) {
    const tokens = await this.userTokenService.getTokensByUserId(user.uid);
    return ResponseUtil.success({ tokens });
  }

  @Delete('/:id')
  async revokeToken(
    @CurrentUser() user: { uid: string },
    @Param('id') id: string
  ) {
    await this.userTokenService.revokeToken(id, user.uid);
    return ResponseUtil.success({ success: true });
  }
}
