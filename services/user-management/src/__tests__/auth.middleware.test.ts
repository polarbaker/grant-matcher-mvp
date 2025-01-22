import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.middleware';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should return 401 if no token is provided', () => {
    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Access token is required',
    });
  });

  it('should return 401 if token is invalid', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid_token',
    };

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid token',
    });
  });

  it('should call next() if token is valid', () => {
    const userId = '123';
    const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret');

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticateToken(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.userId).toBe(userId);
  });
});
