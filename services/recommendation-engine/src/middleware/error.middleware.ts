import { Request, Response, NextFunction } from 'express';
import { AppError, handleError } from './errorHandler';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  // Handle multer errors
  if (error.name === 'MulterError') {
    return res.status(400).json({
      status: 'error',
      message: 'File upload error'
    });
  }

  // Handle mongoose validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error'
    });
  }

  // Handle other errors using the error handler
  const errorResponse = handleError(error);
  return res.status(errorResponse.statusCode).json(errorResponse);
};
