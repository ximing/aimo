import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Container } from 'typedi';
import crypto from 'crypto';

import { config } from '../config/config.js';
import { UserService } from '../services/user.service.js';
import { UserTokenService } from '../services/user-token.service.js';
import { logger } from '../utils/logger.js';

// Paths that don't require authentication even if they match protected prefixes
const AUTH_EXCLUDED_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/memos/public',
  '/api/v1/memos/ba',
  '/api/v1/attachments/ba',
  '/api/v1/debug/ba',
  '/api/v1/system/open',
];

/**
 * Check if the request path requires authentication.
 * Only API requests are guarded — page and static-asset requests must pass
 * through so the SPA can load and handle the login redirect client-side.
 */
const requiresAuth = (path: string): boolean => {
  if (!path.startsWith('/api')) {
    return false;
  }
  // Check if path is explicitly excluded from auth
  if (AUTH_EXCLUDED_PATHS.some((excluded) => path === excluded || path.startsWith(excluded))) {
    return false;
  }
  return true;
};

/**
 * Authentication middleware that validates the aimo_token from cookies or headers
 * and adds user information to the request context
 */
export const authHandler = async (request: Request, res: Response, next: NextFunction) => {
  try {
    // Check if path requires authentication
    if (!requiresAuth(request.path)) {
      return next();
    }

    // Get token from cookie or Authorization header
    const token =
      request.cookies?.aimo_token || request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret) as {
      uid: string;
    };

    // Get user from database
    const userService = Container.get(UserService);
    const user = await userService.findUserByUid(decoded.uid);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is soft-deleted
    if (user.deletedAt > 0) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted',
      });
    }

    // Add user information to request context
    request.user = {
      uid: user.uid,
      email: user.email ?? undefined,
      nickname: user.nickname ?? undefined,
    };

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Handle token verification errors
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      // Try personal token if JWT fails
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        // Skip if looks like JWT (contains two dots)
        if (!token.includes('.')) {
          try {
            const tokenKey = crypto.createHash('sha256').update(token).digest('hex');
            const userTokenService = Container.get(UserTokenService);
            const tokenRecord = await userTokenService.getTokenByKey(tokenKey);

            if (tokenRecord) {
              // Get user from database
              const userService = Container.get(UserService);
              const user = await userService.findUserByUid(tokenRecord.userId);

              if (user && user.deletedAt === 0) {
                // Add user information to request context
                request.user = {
                  uid: user.uid,
                  email: user.email ?? undefined,
                  nickname: user.nickname ?? undefined,
                };
                return next();
              }
            }
          } catch (tokenError) {
            // Token validation failed, continue to return JWT error
            logger.debug('Personal token validation failed:', {
              error: tokenError instanceof Error ? tokenError.message : String(tokenError),
            });
          }
        }
      }

      // Return JWT error if personal token didn't work
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // Log other errors and return a generic error response
    logger.error('Authentication error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
