import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'routing-controllers';

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
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
