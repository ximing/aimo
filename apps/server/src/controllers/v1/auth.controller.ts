import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Service } from 'typedi';

import { shouldUpgradePassword } from '../../auth/password.js';
import { normalizeEmail } from '../../auth/oidc-logic.js';
import { clearSession, issueSession } from '../../auth/session.js';
import { config } from '../../config/config.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { OidcProvisionError, OidcService } from '../../services/oidc.service.js';
import { UserService } from '../../services/user.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { RegisterDto, LoginDto } from '@aimo/dto';
import type { Response } from 'express';

@Service()
@JsonController('/api/v1/auth')
export class AuthV1Controller {
  constructor(
    private userService: UserService,
    private oidcService: OidcService
  ) {}

  @Post('/register')
  async register(@Body() userData: RegisterDto, @Res() response: Response) {
    try {
      // Check if registration is allowed
      if (!config.auth.allowRegistration) {
        return ResponseUtility.error(
          ErrorCode.OPERATION_NOT_ALLOWED,
          'Registration is currently disabled'
        );
      }

      if (!userData.email || !userData.password) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      const email = normalizeEmail(userData.email);
      if (await this.userService.findUserByEmail(email)) {
        return ResponseUtility.error(ErrorCode.USER_ALREADY_EXISTS);
      }

      try {
        await this.oidcService.assertEmailAvailable(email);
      } catch (error) {
        if (error instanceof OidcProvisionError) {
          return response
            .status(error.status)
            .json(
              ResponseUtility.error(
                error.status === 409
                  ? ErrorCode.USER_ALREADY_EXISTS
                  : ErrorCode.EXTERNAL_SERVICE_ERROR,
                error.message
              )
            );
        }
        throw error;
      }

      // Hash password
      const { hashedPassword, salt } = await this.userService.hashPassword(userData.password);

      const nickname = userData.nickname?.trim();
      const resolvedNickname = nickname && nickname !== email ? nickname : undefined;

      // Create new user
      const user = await this.userService.createUser({
        uid: '', // Will be generated in service
        email,
        password: hashedPassword,
        salt,
        nickname: resolvedNickname,
        phone: userData.phone,
        status: 1,
      });

      try {
        await this.oidcService.provisionRegistration(user, hashedPassword);
      } catch (error) {
        await this.userService.deleteCreatedUser(user.uid);
        if (error instanceof OidcProvisionError) {
          return response
            .status(error.status)
            .json(
              ResponseUtility.error(
                error.status === 409
                  ? ErrorCode.USER_ALREADY_EXISTS
                  : ErrorCode.EXTERNAL_SERVICE_ERROR,
                error.message
              )
            );
        }
        logger.error('Registration sync failed');
        return response
          .status(503)
          .json(
            ResponseUtility.error(
              ErrorCode.EXTERNAL_SERVICE_ERROR,
              '暂时无法开通统一账号，请稍后再试'
            )
          );
      }

      return ResponseUtility.success({
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      logger.error('Registration error');
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

      if (!user.password) {
        return ResponseUtility.error(ErrorCode.PASSWORD_ERROR);
      }

      // Verify password
      const isPasswordValid = await this.userService.verifyPassword(
        loginData.password,
        user.password
      );
      if (!isPasswordValid) {
        return ResponseUtility.error(ErrorCode.PASSWORD_ERROR);
      }

      if (shouldUpgradePassword(user.password)) {
        try {
          const upgraded = await this.userService.hashPassword(loginData.password);
          await this.userService.updateUser(user.uid, {
            password: upgraded.hashedPassword,
            salt: upgraded.salt,
          });
        } catch {
          logger.error('Password upgrade failed');
        }
      }

      const token = issueSession(response, user.uid);

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

  @Post('/logout')
  logout(@Res() response: Response) {
    clearSession(response);
    return ResponseUtility.success({ ok: true });
  }
}
