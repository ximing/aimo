import { Request, Response, NextFunction } from 'express';

import { config } from '../config/config.js';

/**
 * BA (Basic Auth) Authentication Interceptor
 *
 * This interceptor validates BA authentication token from the request header.
 * If BA_AUTH_ENABLED is not set to 'true' in environment variables,
 * this interceptor will always return 401.
 *
 * Environment variables:
 * - BA_AUTH_ENABLED: Set to 'true' to enable BA authentication
 * - BA_AUTH_TOKEN: The valid token for BA authentication
 *
 * Expected header format:
 * Authorization: Bearer <token>
 */
export const baAuthInterceptor = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  // Check if BA authentication is enabled
  if (!config.ba.enabled) {
    return response.status(401).json({
      success: false,
      message: 'BA authentication is not configured',
    });
  }

  // Get token from Authorization header
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return response.status(401).json({
      success: false,
      message: 'Authorization header is required',
    });
  }

  // Check Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return response.status(401).json({
      success: false,
      message: 'Invalid authorization format. Expected: Bearer <token>',
    });
  }

  const token = parts[1];

  // Validate token
  if (token !== config.ba.token) {
    return response.status(401).json({
      success: false,
      message: 'Invalid BA token',
    });
  }

  // Token is valid, continue to the next middleware or controller
  return next();
};
