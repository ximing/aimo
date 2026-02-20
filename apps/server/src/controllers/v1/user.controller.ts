import multer from 'multer';
import { JsonController, Get, Put, Post, Body, CurrentUser, Req } from 'routing-controllers';
import { Service, Inject } from 'typedi';

import { config } from '../../config/config.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { AvatarService } from '../../services/avatar.service.js';
import { UserService } from '../../services/user.service.js';
import { ResponseUtil } from '../../utils/response.js';

import type { UserInfoDto, UpdateUserDto } from '@aimo/dto';
import type { Request } from 'express';


// Multer middleware for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.attachment.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

@Service()
@JsonController('/api/v1/user')
export class UserV1Controller {
  constructor(
    private userService: UserService,
    @Inject(() => AvatarService) private avatarService: AvatarService
  ) {}

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

      // Generate avatar access URL with 7-day expiry
      const avatar = user.avatar ? await this.avatarService.generateAvatarAccessUrl(user.avatar) : '';

      // Return user info
      const userInfo: UserInfoDto = {
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
        avatar: avatar,
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

      // Generate avatar access URL with 7-day expiry
      const avatar = updatedUser.avatar
        ? await this.avatarService.generateAvatarAccessUrl(updatedUser.avatar)
        : '';

      // Return updated user info
      const userInfo: UserInfoDto = {
        uid: updatedUser.uid,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        avatar: avatar,
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

  /**
   * Upload avatar
   */
  @Post('/avatar')
  async uploadAvatar(@Req() req: Request, @CurrentUser() userDto: UserInfoDto) {
    return new Promise((resolve) => {
      upload.single('avatar')(req, {} as any, async (err: any) => {
        if (err) {
          if (err.message === 'Only image files are allowed') {
            return resolve(ResponseUtil.error(ErrorCode.UNSUPPORTED_FILE_TYPE));
          }
          if (err.message.includes('File too large')) {
            return resolve(ResponseUtil.error(ErrorCode.FILE_TOO_LARGE));
          }
          console.error('Avatar upload error:', err);
          return resolve(ResponseUtil.error(ErrorCode.FILE_UPLOAD_ERROR));
        }

        const file = (req as any).file;
        if (!file) {
          return resolve(ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'No file uploaded'));
        }

        try {
          if (!userDto?.uid) {
            return resolve(ResponseUtil.error(ErrorCode.UNAUTHORIZED));
          }

          // Get old avatar path before update
          const oldUser = await this.userService.findUserByUid(userDto.uid);
          const oldAvatar = oldUser?.avatar;

          // Upload new avatar - returns path (not URL)
          const avatarPath = await this.avatarService.uploadAvatar({
            uid: userDto.uid,
            buffer: file.buffer,
            filename: file.originalname,
            mimeType: file.mimetype,
          });

          // Update user with new avatar path (not URL)
          await this.userService.updateUser(userDto.uid, { avatar: avatarPath });

          // Generate access URL for response (with 7-day expiry)
          const avatarUrl = await this.avatarService.generateAvatarAccessUrl(avatarPath);

          // Delete old avatar if exists
          if (oldAvatar) {
            this.avatarService.deleteAvatar(oldAvatar).catch((error) => {
              console.warn('Failed to delete old avatar:', error);
            });
          }

          return resolve(
            ResponseUtil.success({
              message: 'Avatar uploaded successfully',
              avatar: avatarUrl,
            })
          );
        } catch (error) {
          console.error('Failed to upload avatar:', error);
          return resolve(ResponseUtil.error(ErrorCode.STORAGE_ERROR));
        }
      });
    });
  }
}
