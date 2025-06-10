import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RequestLog {
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  organizationId?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Extract request information
  const requestInfo: RequestLog = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    timestamp,
  };

  // Log request start
  logger.info('Request received:', requestInfo);

  // Override res.end to capture response information
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any): any {
    const duration = Date.now() - startTime;
    
    const responseInfo: RequestLog = {
      ...requestInfo,
      duration,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined,
    };

    // Add user information if available
    const user = (req as any).user;
    if (user) {
      responseInfo.userId = user.userId;
      responseInfo.organizationId = user.organizationId;
    }

    // Log response
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error:', responseInfo);
    } else {
      logger.info('Request completed:', responseInfo);
    }

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected:', {
        ...responseInfo,
        slowRequest: true,
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Security headers logging middleware
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Log security-relevant headers
  const securityHeaders = {
    authorization: req.headers.authorization ? 'present' : 'absent',
    xForwardedFor: req.headers['x-forwarded-for'],
    xRealIp: req.headers['x-real-ip'],
    origin: req.headers.origin,
    referer: req.headers.referer,
  };

  // Log potential security issues
  if (req.headers.authorization && !req.headers.authorization.startsWith('Bearer ')) {
    logger.warn('Non-Bearer authorization header detected:', {
      authorization: req.headers.authorization.substring(0, 20) + '...',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Log suspicious user agents
  const userAgent = req.headers['user-agent'];
  if (userAgent && (
    userAgent.includes('bot') ||
    userAgent.includes('crawler') ||
    userAgent.includes('spider') ||
    userAgent.length > 500
  )) {
    logger.warn('Suspicious user agent detected:', {
      userAgent: userAgent.substring(0, 200),
      ip: req.ip,
      url: req.url,
    });
  }

  next();
};

/**
 * Audit logging for authentication events
 */
export const auditLogger = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store audit information in request for later use
    (req as any).auditInfo = {
      eventType,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      method: req.method,
      url: req.url,
    };

    next();
  };
};

/**
 * Performance monitoring middleware
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    const performanceData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    // Log performance metrics
    if (duration > 2000) {
      logger.error('Very slow request detected:', performanceData);
    } else if (duration > 1000) {
      logger.warn('Slow request detected:', performanceData);
    } else if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Request performance:', performanceData);
    }
  });

  next();
};