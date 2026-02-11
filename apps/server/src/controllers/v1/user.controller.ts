import { JsonController, Get, Put, Body, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';
import type { UserInfoDto, UpdateUserDto } from '@aimo/dto';
import { UserService } from '../../services/user.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';

@Service()
@JsonController('/api/v1/user')
export class UserV1Controller {
  constructor(private userService: UserService) {}

  @Get('/info')
  async getUser(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const user = await this.userService.findUserByUid(userDto.uid);
      if (!user) {
        return ResponseUtil.error(ErrorCode.USER_NOT_FOUND);
      }

      // Return user info without sensitive data
      const userInfo: UserInfoDto = {
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
      };

      return ResponseUtil.success(userInfo);
    } catch (error) {
      console.error('Get user info error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/info')
  async updateUser(@Body() updateData: UpdateUserDto, @CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const updatedUser = await this.userService.updateUser(userDto.uid, updateData);
      if (!updatedUser) {
        return ResponseUtil.error(ErrorCode.USER_NOT_FOUND);
      }

      // Return updated user info without sensitive data
      const userInfo: UserInfoDto = {
        uid: updatedUser.uid,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
      };

      return ResponseUtil.success({
        message: 'User info updated successfully',
        user: userInfo,
      });
    } catch (error) {
      console.error('Update user info error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
