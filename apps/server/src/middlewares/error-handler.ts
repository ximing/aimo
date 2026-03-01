import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'routing-controllers';

import { logger } from '../utils/logger.js';

export function errorHandler(error: Error, request: Request, res: Response, next: NextFunction) {
  logger.error(error);
  if (error instanceof HttpError) {
    res.status(error.httpCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
