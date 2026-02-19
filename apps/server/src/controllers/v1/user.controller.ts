import { JsonController, Get, Put, Post, Body, CurrentUser, Req } from 'routing-controllers';
import { Service, Inject } from 'typedi';
import multer from 'multer';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import type { UserInfoDto, UpdateUserDto } from '@aimo/dto';
import { UserService } from '../../services/user.service.js';
import { AvatarService } from '../../services/avatar.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { config } from '../../config/config.js';

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

  /**
   * Get avatar image - streams avatar from storage
   */
  @Get('/avatar')
  async getAvatar(@CurrentUser() userDto: UserInfoDto, @Req() req: Request) {
    const res = req.res as Response;

    try {
      // Check authentication
      if (!userDto?.uid) {
        return this.serveDefaultAvatar(res);
      }

      // Get user info to find avatar path
      const user = await this.userService.findUserByUid(userDto.uid);
      if (!user || !user.avatar) {
        return this.serveDefaultAvatar(res);
      }

      // Get avatar path (not URL)
      const avatarPath = user.avatar;

      // Try to download avatar from storage
      try {
        const { buffer, etag, contentType } = await this.avatarService.downloadAvatar(avatarPath);

        // Set headers
        res.setHeader('Content-Type', contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.setHeader('ETag', etag || this.generateEtag(avatarPath));
        res.setHeader('Content-Length', buffer.length);

        // Check if client sent If-None-Match header
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag && clientEtag === etag) {
          res.status(304);
          res.end();
          return;
        }

        // Send the buffer
        res.status(200);
        res.end(buffer);
        return;
      } catch (error) {
        console.warn('Failed to download avatar, serving default:', error);
        return this.serveDefaultAvatar(res);
      }
    } catch (error) {
      console.error('Error in avatar controller:', error);
      return this.serveDefaultAvatar(res);
    }
  }

  /**
   * Serve default avatar
   */
  private async serveDefaultAvatar(res: Response) {
    try {
      const defaultAvatarPath = './public/default-avatar.svg';
      const buffer = await fs.readFile(defaultAvatarPath);
      const etag = `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // Cache for 30 days
      res.setHeader('ETag', etag);
      res.setHeader('Content-Length', buffer.length);

      res.status(200);
      res.end(buffer);
      return;
    } catch (error) {
      console.error('Failed to serve default avatar:', error);
      // Return a minimal SVG if even default avatar fails
      const minimalSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#e5e7eb" width="200" height="200"/></svg>`
      );

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      res.setHeader('Content-Length', minimalSvg.length);

      res.status(200);
      res.end(minimalSvg);
      return;
    }
  }

  /**
   * Generate ETag from avatar path
   */
  private generateEtag(path: string): string {
    return `"${crypto.createHash('md5').update(path).digest('hex')}"`;
  }

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

      // Generate avatar access URL if avatar exists
      const avatar = user.avatar ? await this.avatarService.generateAvatarAccessUrl(user.avatar) : '';

      // Return user info without sensitive data
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

      // Generate avatar access URL if avatar exists
      const avatar = updatedUser.avatar ? await this.avatarService.generateAvatarAccessUrl(updatedUser.avatar) : '';

      // Return updated user info without sensitive data
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

          // Generate access URL for response (with 10-year expiry)
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
