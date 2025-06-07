import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.isOperational = err.isOperational || false;

  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Send error response based on environment
  if (process.env.NODE_ENV === 'production') {
    // Production error response (don't leak error details)
    sendProdErrorResponse(err, res);
  } else {
    // Development error response (include full error details)
    sendDevErrorResponse(err, res);
  }
};

/**
 * Send error response in production mode
 */
function sendProdErrorResponse(err: AppError, res: Response) {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode!).json({
      status: 'error',
      message: err.message,
      code: err.code,
      ...(err.details && { details: err.details }),
    });
  } else {
    // Programming or other unknown error: don't leak error details
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Send error response in development mode
 */
function sendDevErrorResponse(err: AppError, res: Response) {
  res.status(err.statusCode!).json({
    status: 'error',
    error: err,
    message: err.message,
    stack: err.stack,
    code: err.code,
    ...(err.details && { details: err.details }),
  });
}

/**
 * Custom error classes
 */
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;
  code = 'VALIDATION_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  isOperational = true;
  code = 'UNAUTHORIZED';

  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;
  isOperational = true;
  code = 'FORBIDDEN';

  constructor(message: string = 'Forbidden access') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  isOperational = true;
  code = 'CONFLICT';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends Error implements AppError {
  statusCode = 429;
  isOperational = true;
  code = 'TOO_MANY_REQUESTS';

  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  isOperational = true;
  code = 'DATABASE_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error implements AppError {
  statusCode = 503;
  isOperational = true;
  code = 'EXTERNAL_SERVICE_ERROR';

  constructor(message: string, public service?: string, public details?: any) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Helper function to create and throw operational errors
 */
export const throwError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): never => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.code = code;
  error.details = details;
  throw error;
};

/**
 * Async error handler wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle specific database constraint errors
 */
export const handleDatabaseError = (error: any): AppError => {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.errno === 19) {
    return new ConflictError('A record with this data already exists', {
      field: error.message,
    });
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGN_KEY') {
    return new ValidationError('Referenced record does not exist', {
      constraint: 'foreign_key',
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return new DatabaseError('Database connection failed', {
      originalError: error.message,
    });
  }

  // Return generic database error for unknown cases
  return new DatabaseError('Database operation failed', {
    originalError: error.message,
    code: error.code,
  });
};

/**
 * Handle validation errors from Joi or similar libraries
 */
export const handleValidationError = (error: any): ValidationError => {
  const details = error.details?.map((detail: any) => ({
    field: detail.path?.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));

  return new ValidationError('Request validation failed', details);
};