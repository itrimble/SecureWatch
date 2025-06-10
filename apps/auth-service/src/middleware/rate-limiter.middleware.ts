import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { RedisService } from '../services/redis.service';
import { authConfig } from '../config/auth.config';
import logger from '../utils/logger';

/**
 * Custom rate limit store using Redis
 */
class RedisRateLimitStore {
  private prefix: string;
  private windowMs: number;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; timeToExpire?: number }> {
    const redisKey = `${this.prefix}:${key}`;
    
    try {
      const current = await RedisService.incr(redisKey);
      
      if (current === 1) {
        // First request in window, set expiration
        await RedisService.expire(redisKey, Math.ceil(this.windowMs / 1000));
      }

      const ttl = await RedisService.ttl(redisKey);
      
      return {
        totalHits: current,
        timeToExpire: ttl > 0 ? ttl * 1000 : undefined,
      };
    } catch (error) {
      logger.error('Redis rate limit store error:', error);
      // Fallback to allow request if Redis fails
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `${this.prefix}:${key}`;
    
    try {
      const current = await RedisService.get(redisKey);
      if (current && parseInt(current) > 0) {
        await RedisService.incr(redisKey); // Decrement by incrementing negative
      }
    } catch (error) {
      logger.error('Redis rate limit decrement error:', error);
    }
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `${this.prefix}:${key}`;
    
    try {
      await RedisService.delete(redisKey);
    } catch (error) {
      logger.error('Redis rate limit reset error:', error);
    }
  }
}

/**
 * Rate limiting configurations
 */
const rateLimitConfigs = {
  login: {
    windowMs: authConfig.security.rateLimiting.login.windowMs,
    max: authConfig.security.rateLimiting.login.max,
    message: {
      error: 'Too Many Login Attempts',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil(authConfig.security.rateLimiting.login.windowMs / 1000),
    },
  },
  register: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 registration attempts per window
    message: {
      error: 'Too Many Registration Attempts',
      message: 'Too many registration attempts. Please try again later.',
      retryAfter: 15 * 60,
    },
  },
  passwordReset: {
    windowMs: authConfig.security.rateLimiting.passwordReset.windowMs,
    max: authConfig.security.rateLimiting.passwordReset.max,
    message: {
      error: 'Too Many Password Reset Requests',
      message: 'Too many password reset requests. Please try again later.',
      retryAfter: Math.ceil(authConfig.security.rateLimiting.passwordReset.windowMs / 1000),
    },
  },
  mfa: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 MFA attempts per window
    message: {
      error: 'Too Many MFA Attempts',
      message: 'Too many MFA verification attempts. Please try again later.',
      retryAfter: 5 * 60,
    },
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too Many API Requests',
      message: 'Too many API requests. Please try again later.',
      retryAfter: 15 * 60,
    },
  },
};

/**
 * Create rate limiter middleware
 */
export const rateLimiter = (type: keyof typeof rateLimitConfigs) => {
  const config = rateLimitConfigs[type];
  
  if (!config) {
    throw new Error(`Unknown rate limit type: ${type}`);
  }

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Custom key generator
    keyGenerator: (req: Request): string => {
      // Use IP address as primary identifier
      let key = req.ip || req.socket.remoteAddress || 'unknown';
      
      // For login attempts, also consider email
      if (type === 'login' && req.body?.email) {
        key += `:email:${req.body.email}`;
      }
      
      // For authenticated requests, use user ID
      if ((req as any).user?.userId) {
        key += `:user:${(req as any).user.userId}`;
      }
      
      return key;
    },

    // Custom store using Redis
    store: new RedisRateLimitStore(`rate_limit:${type}`, config.windowMs) as any,

    // Skip successful requests for certain types
    skipSuccessfulRequests: type === 'login' || type === 'mfa',

    // Skip failed requests for API calls
    skipFailedRequests: type === 'api',

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      const resetTime = new Date(Date.now() + config.windowMs);
      
      // Log rate limit violation
      logger.warn('Rate limit exceeded:', {
        type,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url,
        method: req.method,
        resetTime: resetTime.toISOString(),
        userId: (req as any).user?.userId,
      });

      res.status(429).json({
        ...config.message,
        timestamp: new Date().toISOString(),
        resetTime: resetTime.toISOString(),
      });
    },

    // On limit reached callback
    onLimitReached: (req: Request, res: Response) => {
      logger.warn('Rate limit reached:', {
        type,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url,
        method: req.method,
        userId: (req as any).user?.userId,
      });
    },
  });
};

/**
 * Global rate limiter for all requests
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  store: new RedisRateLimitStore('rate_limit:global', 15 * 60 * 1000) as any,

  handler: (req: Request, res: Response) => {
    logger.warn('Global rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Burst protection for sensitive endpoints
 */
export const burstProtection = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: 'Request Rate Too High',
    message: 'Requests are being made too quickly. Please slow down.',
  },
  
  store: new RedisRateLimitStore('rate_limit:burst', 60 * 1000) as any,

  handler: (req: Request, res: Response) => {
    logger.warn('Burst protection triggered:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
    });

    res.status(429).json({
      error: 'Request Rate Too High',
      message: 'Requests are being made too quickly. Please slow down.',
      timestamp: new Date().toISOString(),
    });
  },
});