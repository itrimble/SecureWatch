import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log error details
  logger.error('Request error', {
    error: {
      message: error.message,
      stack: error.stack,
      status
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    },
    user: (req as any).user?.sub,
    organizationId: req.headers['x-organization-id']
  });

  // Send error response
  res.status(status).json({
    error: status < 500 ? message : 'Internal Server Error',
    message: status < 500 ? message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
};