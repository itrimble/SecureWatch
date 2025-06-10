import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let isOperational = error.isOperational || false;

  // Log error details
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    statusCode,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.userId,
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    isOperational = true;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    isOperational = true;
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
    isOperational = true;
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource Not Found';
    isOperational = true;
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
    isOperational = true;
  } else if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    message = 'Too Many Requests';
    isOperational = true;
  }

  // Database errors
  if (error.message.includes('duplicate key value')) {
    statusCode = 409;
    message = 'Resource already exists';
    isOperational = true;
  } else if (error.message.includes('foreign key constraint')) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
    isOperational = true;
  } else if (error.message.includes('not-null constraint')) {
    statusCode = 400;
    message = 'Required field missing';
    isOperational = true;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  } else if (error.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not active';
    isOperational = true;
  }

  // Prepare error response
  const errorResponse: any = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.message;
  }

  // Add error ID for tracking
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  errorResponse.errorId = errorId;

  // Log error with ID for correlation
  logger.error(`Error ${errorId}:`, {
    message: error.message,
    stack: error.stack,
    statusCode,
    isOperational,
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const message = `Route ${req.method} ${req.url} not found`;
  
  logger.warn('Route not found:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(404).json({
    error: 'Not Found',
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  });
};

/**
 * Create operational error
 */
export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

/**
 * Async error wrapper to catch async errors in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};