import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('validation.middleware');

export const validateRequest = () => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Basic validation - ensure required fields are present
      if (!req.body.userId) {
        throw new AppError('User ID is required', 400);
      }

      next();
    } catch (error) {
      logger.error('Validation error:', error);
      next(error);
    }
  };
};
