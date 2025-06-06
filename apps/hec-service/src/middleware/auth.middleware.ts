import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { HECToken } from '../types/hec.types';
import logger from '../utils/logger';

// Extend Express Request type to include token
declare global {
  namespace Express {
    interface Request {
      hecToken?: HECToken;
      clientIp?: string;
    }
  }
}

export class AuthMiddleware {
  private tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    
    return (
      cfConnectingIp ||
      realIp ||
      (forwarded && forwarded.split(',')[0]) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any).socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Middleware to authenticate HEC requests using Bearer tokens
   */
  authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract client IP
      req.clientIp = this.getClientIp(req);

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        logger.warn('Missing Authorization header', { 
          ip: req.clientIp,
          userAgent: req.headers['user-agent'],
          path: req.path
        });
        res.status(401).json({
          text: 'Unauthorized: Missing Authorization header',
          code: 401
        });
        return;
      }

      // Check if it's a Bearer token
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (!tokenMatch) {
        logger.warn('Invalid Authorization format', { 
          ip: req.clientIp,
          authHeader: authHeader.substring(0, 20) + '...',
          path: req.path
        });
        res.status(401).json({
          text: 'Unauthorized: Invalid Authorization format. Use "Bearer <token>"',
          code: 401
        });
        return;
      }

      const tokenString = tokenMatch[1];

      // Validate token
      const token = await this.tokenService.validateToken(tokenString);
      if (!token) {
        logger.warn('Invalid or expired token', { 
          ip: req.clientIp,
          token: tokenString.substring(0, 8) + '...',
          path: req.path
        });
        res.status(401).json({
          text: 'Unauthorized: Invalid or expired token',
          code: 401
        });
        return;
      }

      // Check token permissions for source/index if specified in token
      if (token.allowedSources || token.allowedIndexes) {
        const source = req.body?.source || req.query.source;
        const index = req.body?.index || req.query.index;

        if (token.allowedSources && source && !token.allowedSources.includes(source)) {
          logger.warn('Token not allowed for source', {
            tokenId: token.id,
            requestedSource: source,
            allowedSources: token.allowedSources,
            ip: req.clientIp
          });
          res.status(403).json({
            text: `Forbidden: Token not allowed for source "${source}"`,
            code: 403
          });
          return;
        }

        if (token.allowedIndexes && index && !token.allowedIndexes.includes(index)) {
          logger.warn('Token not allowed for index', {
            tokenId: token.id,
            requestedIndex: index,
            allowedIndexes: token.allowedIndexes,
            ip: req.clientIp
          });
          res.status(403).json({
            text: `Forbidden: Token not allowed for index "${index}"`,
            code: 403
          });
          return;
        }
      }

      // Attach token to request for use in route handlers
      req.hecToken = token;

      logger.debug('Token authenticated successfully', {
        tokenId: token.id,
        tokenName: token.name,
        ip: req.clientIp,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.clientIp,
        path: req.path
      });
      res.status(500).json({
        text: 'Internal Server Error during authentication',
        code: 500
      });
    }
  };

  /**
   * Middleware to check rate limits for authenticated tokens
   */
  checkRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.hecToken) {
        res.status(401).json({
          text: 'Unauthorized: Token required for rate limiting',
          code: 401
        });
        return;
      }

      // Estimate number of events in request
      let estimatedEvents = 1;
      if (req.body) {
        if (Array.isArray(req.body)) {
          estimatedEvents = req.body.length;
        } else if (req.body.events && Array.isArray(req.body.events)) {
          estimatedEvents = req.body.events.length;
        }
      }

      // Check rate limit
      const isAllowed = await this.tokenService.checkRateLimit(req.hecToken, estimatedEvents);
      if (!isAllowed) {
        logger.warn('Rate limit exceeded', {
          tokenId: req.hecToken.id,
          estimatedEvents,
          maxEventsPerSecond: req.hecToken.maxEventsPerSecond,
          ip: req.clientIp
        });
        res.status(429).json({
          text: 'Rate limit exceeded',
          code: 429
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit check error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenId: req.hecToken?.id,
        ip: req.clientIp
      });
      res.status(500).json({
        text: 'Internal Server Error during rate limit check',
        code: 500
      });
    }
  };

  /**
   * Middleware to log request details for monitoring
   */
  logRequest = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Log request
    logger.info('HEC request received', {
      method: req.method,
      path: req.path,
      ip: req.clientIp,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
      tokenId: req.hecToken?.id,
      tokenName: req.hecToken?.name
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('HEC request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.clientIp,
        tokenId: req.hecToken?.id,
        contentLength: res.get('content-length')
      });
    });

    next();
  };
}