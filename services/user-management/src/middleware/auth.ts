import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';
import { AppError } from './errorHandler';

const logger = createLogger('auth-middleware');

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        [key: string]: any;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      throw new AppError(401, 'No authentication token provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Invalid token format');
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not set');
      throw new AppError(500, 'Internal server error');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
      req.user = decoded;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'Token has expired');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new AppError(401, 'Invalid token');
      } else {
        logger.error('JWT verification error:', jwtError);
        throw new AppError(401, 'Authentication failed');
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Authentication error:', error);
      next(new AppError(500, 'Internal server error'));
    }
  }
};
