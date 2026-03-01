import jwt from 'jsonwebtoken';
import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Service } from 'typedi';

import { config } from '../../config/config.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { UserService } from '../../services/user.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { RegisterDto, LoginDto } from '@aimo/dto';
import type { Response } from 'express';

@Service()
@JsonController('/api/v1/auth')
export class AuthV1Controller {
  constructor(private userService: UserService) {}

  @Post('/register')
  async register(@Body() userData: RegisterDto) {
    try {
      if (!userData.email || !userData.password) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      // Hash password
      const { hashedPassword, salt } = await this.userService.hashPassword(userData.password);

      const nickname = userData.nickname?.trim();
      const resolvedNickname = nickname && nickname !== userData.email ? nickname : undefined;

      // Create new user
      const user = await this.userService.createUser({
        uid: '', // Will be generated in service
        email: userData.email,
        password: hashedPassword,
        salt,
        nickname: resolvedNickname,
        phone: userData.phone,
        status: 1,
      });

      return ResponseUtility.success({
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtility.error(ErrorCode.USER_ALREADY_EXISTS);
      }
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/login')
  async login(@Body() loginData: LoginDto, @Res() response: Response) {
    try {
      if (!loginData.email || !loginData.password) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      // Find user by email
      const user = await this.userService.findUserByEmail(loginData.email);
      if (!user) {
        return ResponseUtility.error(ErrorCode.USER_NOT_FOUND);
      }

      // Verify password
      const isPasswordValid = await this.userService.verifyPassword(
        loginData.password,
        user.password
      );
      if (!isPasswordValid) {
        return ResponseUtility.error(ErrorCode.PASSWORD_ERROR);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          uid: user.uid,
        },
        config.jwt.secret,
        { expiresIn: '90d' }
      );

      // Set cookie with token
      response.cookie('aimo_token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
      });

      return ResponseUtility.success({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
