import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Service } from 'typedi';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { RegisterDto, LoginDto } from '@aimo/dto';
import { UserService } from '../../services/user.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { config } from '../../config/config.js';

@Service()
@JsonController('/api/v1/auth')
export class AuthV1Controller {
  constructor(private userService: UserService) {}

  @Post('/register')
  async register(@Body() userData: RegisterDto) {
    try {
      if (!userData.email || !userData.password) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      // Hash password
      const { hashedPassword, salt } = await this.userService.hashPassword(userData.password);

      // Create new user
      const user = await this.userService.createUser({
        uid: '', // Will be generated in service
        email: userData.email,
        password: hashedPassword,
        salt,
        nickname: userData.nickname,
        phone: userData.phone,
        status: 1,
      });

      return ResponseUtil.success({
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtil.error(ErrorCode.USER_ALREADY_EXISTS);
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/login')
  async login(@Body() loginData: LoginDto, @Res() response: Response) {
    try {
      if (!loginData.email || !loginData.password) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      // Find user by email
      const user = await this.userService.findUserByEmail(loginData.email);
      if (!user) {
        return ResponseUtil.error(ErrorCode.USER_NOT_FOUND);
      }

      // Verify password
      const isPasswordValid = await this.userService.verifyPassword(
        loginData.password,
        user.password
      );
      if (!isPasswordValid) {
        return ResponseUtil.error(ErrorCode.PASSWORD_ERROR);
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

      return ResponseUtil.success({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
