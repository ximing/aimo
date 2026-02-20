import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Container } from 'typedi';

import { config } from '../config/config.js';
import { UserService } from '../services/user.service.js';

import type { UserInfoDto } from '@aimo/dto';

// Whitelist paths that don't require authentication
const WHITELIST_PATHS = new Set(['/', '/api/v1/auth/login', '/api/v1/auth/register']);

// Whitelist path prefixes for static assets and public resources
const WHITELIST_PREFIXES = [
  '/assets/', // Static assets (JS, CSS, images)
  '/fonts/', // Static assets (JS, CSS, images)
  '/open', // Open API endpoints
  '/logo.png', // Logo image
  '/logo-dark.png', // Dark logo image
  '/vite.svg', // Favicon and public assets
  '/favicon', // Favicon
];

/**
 * Authentication middleware that validates the aimo_token from cookies or headers
 * and adds user information to the request context
 */
export const authHandler = async (request: Request, res: Response, next: NextFunction) => {
  try {
    // Check if path is in whitelist
    if (WHITELIST_PATHS.has(request.path)) {
      return next();
    }

    // Check if path starts with any whitelisted prefix
    if (WHITELIST_PREFIXES.some((prefix) => request.path.startsWith(prefix))) {
      return next();
    }

    // Get token from cookie or Authorization header
    const token = request.cookies?.aimo_token || request.headers.authorization?.replace('Bearer ', '');

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
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
