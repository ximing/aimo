import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Container } from 'typedi';

import { config } from '../config/config.js';
import { UserService } from '../services/user.service.js';
import { logger } from '../utils/logger.js';

import type { UserInfoDto } from '@aimo/dto';

// Paths that require authentication
const PROTECTED_PATHS = ['/api', '/home', '/ai-explore', '/gallery', '/settings'];

// Paths that don't require authentication even if they match protected prefixes
const AUTH_EXCLUDED_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/memos/public',
  '/api/v1/memos/ba',
  '/api/v1/attachments/ba',
  '/api/v1/debug/ba',
];

/**
 * Check if the request path requires authentication
 */
const requiresAuth = (path: string): boolean => {
  // First check if path is explicitly excluded from auth
  if (AUTH_EXCLUDED_PATHS.some((excluded) => path === excluded || path.startsWith(excluded))) {
    return false;
  }
  // Then check if path requires authentication
  return PROTECTED_PATHS.some((prefix) => path.startsWith(prefix));
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

    // Add user information to request context
    request.user = {
      uid: user.uid,
      email: user.email,
      nickname: user.nickname,
    };

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Handle token verification errors
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
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
