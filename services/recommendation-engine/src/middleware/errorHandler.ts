import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (err: Error | AppError) => {
  if (err instanceof AppError) {
    return {
      status: 'error',
      statusCode: err.statusCode,
      message: err.message
    };
  }

  // Handle unknown errors
  return {
    status: 'error',
    statusCode: 500,
    message: 'Internal server error'
  };
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction // Prefix with underscore to indicate it's intentionally unused
) => {
  logger.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const errorResponse = handleError(err);

  return res.status(errorResponse.statusCode).json(errorResponse);
};
