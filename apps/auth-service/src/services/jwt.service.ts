import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { authConfig } from '../config/auth.config';
import { TokenPayload, RefreshTokenPayload } from '../types/auth.types';
import { RedisService } from './redis.service';
import logger from '../utils/logger';
import crypto from 'crypto';

export class JWTService {
  private static readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:token:';
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh:token:';
  private static readonly TEMP_TOKEN_PREFIX = 'temp:token:';
  private static readonly PASSWORD_RESET_PREFIX = 'password:reset:';
  private static readonly EMAIL_VERIFY_PREFIX = 'email:verify:';

  /**
   * Generate access token with comprehensive payload
   */
  static async generateAccessToken(payload: TokenPayload): Promise<string> {
    try {
      const jti = crypto.randomUUID(); // Unique token identifier
      const tokenPayload = {
        ...payload,
        jti,
        iat: Math.floor(Date.now() / 1000),
        type: 'access',
      };

      const options: SignOptions = {
        expiresIn: authConfig.jwt.accessTokenExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithm: 'HS256', // Using HMAC for better performance
      };

      const token = jwt.sign(tokenPayload, authConfig.jwt.accessTokenSecret, options);

      // Store token metadata for tracking
      await RedisService.setex(
        `token:meta:${jti}`,
        15 * 60, // 15 minutes
        JSON.stringify({
          userId: payload.userId,
          organizationId: payload.organizationId,
          createdAt: new Date().toISOString(),
          type: 'access',
        })
      );

      logger.debug('Access token generated', {
        userId: payload.userId,
        organizationId: payload.organizationId,
        jti,
        expiresIn: authConfig.jwt.accessTokenExpiry,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token with rotation support
   */
  static async generateRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    try {
      const jti = crypto.randomUUID(); // Unique token identifier
      const tokenPayload = {
        ...payload,
        jti,
        iat: Math.floor(Date.now() / 1000),
        type: 'refresh',
      };

      const options: SignOptions = {
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithm: 'HS256',
      };

      const token = jwt.sign(tokenPayload, authConfig.jwt.refreshTokenSecret, options);

      // Store refresh token in Redis with metadata
      const key = `${this.REFRESH_TOKEN_PREFIX}${payload.userId}:${jti}`;
      await RedisService.setex(
        key,
        7 * 24 * 60 * 60, // 7 days in seconds
        JSON.stringify({
          token,
          userId: payload.userId,
          organizationId: payload.organizationId,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          deviceInfo: payload.deviceInfo,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
        })
      );

      logger.debug('Refresh token generated', {
        userId: payload.userId,
        organizationId: payload.organizationId,
        jti,
        expiresIn: authConfig.jwt.refreshTokenExpiry,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate temporary token for MFA verification
   */
  static async generateTempToken(userId: string, purpose: string = 'mfa'): Promise<string> {
    try {
      const jti = crypto.randomUUID();
      const payload = {
        userId,
        purpose,
        jti,
        iat: Math.floor(Date.now() / 1000),
        type: 'temp',
      };

      const options: SignOptions = {
        expiresIn: '10m', // 10 minutes for temp tokens
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithm: 'HS256',
      };

      const token = jwt.sign(payload, authConfig.jwt.accessTokenSecret, options);

      // Store temp token in Redis
      await RedisService.setex(
        `${this.TEMP_TOKEN_PREFIX}${jti}`,
        10 * 60, // 10 minutes
        JSON.stringify({
          userId,
          purpose,
          createdAt: new Date().toISOString(),
        })
      );

      logger.debug('Temporary token generated', {
        userId,
        purpose,
        jti,
        expiresIn: '10m',
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate temporary token:', error);
      throw new Error('Failed to generate temporary token');
    }
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(userId: string): Promise<string> {
    try {
      const jti = crypto.randomUUID();
      const payload = {
        userId,
        purpose: 'password_reset',
        jti,
        iat: Math.floor(Date.now() / 1000),
        type: 'password_reset',
      };

      const options: SignOptions = {
        expiresIn: authConfig.security.passwordResetExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithm: 'HS256',
      };

      const token = jwt.sign(payload, authConfig.jwt.accessTokenSecret, options);

      // Store reset token in Redis
      await RedisService.setex(
        `${this.PASSWORD_RESET_PREFIX}${jti}`,
        60 * 60, // 1 hour
        JSON.stringify({
          userId,
          createdAt: new Date().toISOString(),
        })
      );

      logger.debug('Password reset token generated', {
        userId,
        jti,
        expiresIn: authConfig.security.passwordResetExpiry,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate password reset token:', error);
      throw new Error('Failed to generate password reset token');
    }
  }

  /**
   * Generate email verification token
   */
  static async generateEmailVerificationToken(userId: string): Promise<string> {
    try {
      const jti = crypto.randomUUID();
      const payload = {
        userId,
        purpose: 'email_verification',
        jti,
        iat: Math.floor(Date.now() / 1000),
        type: 'email_verification',
      };

      const options: SignOptions = {
        expiresIn: authConfig.security.emailVerificationExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithm: 'HS256',
      };

      const token = jwt.sign(payload, authConfig.jwt.accessTokenSecret, options);

      // Store verification token in Redis
      await RedisService.setex(
        `${this.EMAIL_VERIFY_PREFIX}${jti}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify({
          userId,
          createdAt: new Date().toISOString(),
        })
      );

      logger.debug('Email verification token generated', {
        userId,
        jti,
        expiresIn: authConfig.security.emailVerificationExpiry,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate email verification token:', error);
      throw new Error('Failed to generate email verification token');
    }
  }

  /**
   * Verify access token with comprehensive validation
   */
  static async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const options: VerifyOptions = {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithms: ['HS256'],
      };

      const decoded = jwt.verify(
        token,
        authConfig.jwt.accessTokenSecret,
        options
      ) as TokenPayload;

      // Verify token metadata still exists
      if (decoded.jti) {
        const metadata = await RedisService.get(`token:meta:${decoded.jti}`);
        if (!metadata) {
          throw new Error('Token metadata not found');
        }
      }

      logger.debug('Access token verified', {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        jti: decoded.jti,
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired', { token: token.substring(0, 20) + '...' });
        throw new Error('Access token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token', { error: error.message });
        throw new Error('Invalid access token');
      }
      logger.error('Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify refresh token with rotation detection
   */
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const options: VerifyOptions = {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithms: ['HS256'],
      };

      const decoded = jwt.verify(
        token,
        authConfig.jwt.refreshTokenSecret,
        options
      ) as RefreshTokenPayload;

      // Check if refresh token exists in Redis
      const key = `${this.REFRESH_TOKEN_PREFIX}${decoded.userId}:${decoded.jti}`;
      const storedData = await RedisService.get(key);
      
      if (!storedData) {
        // Token might have been rotated or expired
        logger.warn('Refresh token not found in store', {
          userId: decoded.userId,
          jti: decoded.jti,
        });
        throw new Error('Refresh token not found or expired');
      }

      const parsedData = JSON.parse(storedData);
      if (parsedData.token !== token) {
        // Possible token reuse attack
        logger.error('Refresh token mismatch detected', {
          userId: decoded.userId,
          jti: decoded.jti,
        });
        
        // Revoke all tokens for this user
        await this.revokeAllUserTokens(decoded.userId);
        throw new Error('Invalid refresh token - all sessions revoked');
      }

      // Update last used timestamp
      parsedData.lastUsed = new Date().toISOString();
      await RedisService.setex(key, 7 * 24 * 60 * 60, JSON.stringify(parsedData));

      logger.debug('Refresh token verified', {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        jti: decoded.jti,
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired', { token: token.substring(0, 20) + '...' });
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token', { error: error.message });
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Verify temporary token
   */
  static async verifyTempToken(token: string): Promise<{ userId: string; purpose: string; jti: string }> {
    try {
      const options: VerifyOptions = {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithms: ['HS256'],
      };

      const decoded = jwt.verify(
        token,
        authConfig.jwt.accessTokenSecret,
        options
      ) as any;

      // Verify temp token exists in Redis
      const storedData = await RedisService.get(`${this.TEMP_TOKEN_PREFIX}${decoded.jti}`);
      if (!storedData) {
        throw new Error('Temporary token not found or expired');
      }

      return {
        userId: decoded.userId,
        purpose: decoded.purpose,
        jti: decoded.jti,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Temporary token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid temporary token');
      }
      throw error;
    }
  }

  /**
   * Verify password reset token
   */
  static async verifyPasswordResetToken(token: string): Promise<{ userId: string; jti: string }> {
    try {
      const options: VerifyOptions = {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithms: ['HS256'],
      };

      const decoded = jwt.verify(
        token,
        authConfig.jwt.accessTokenSecret,
        options
      ) as any;

      // Verify reset token exists in Redis
      const storedData = await RedisService.get(`${this.PASSWORD_RESET_PREFIX}${decoded.jti}`);
      if (!storedData) {
        throw new Error('Password reset token not found or expired');
      }

      return {
        userId: decoded.userId,
        jti: decoded.jti,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Password reset token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid password reset token');
      }
      throw error;
    }
  }

  /**
   * Verify email verification token
   */
  static async verifyEmailVerificationToken(token: string): Promise<{ userId: string; jti: string }> {
    try {
      const options: VerifyOptions = {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        algorithms: ['HS256'],
      };

      const decoded = jwt.verify(
        token,
        authConfig.jwt.accessTokenSecret,
        options
      ) as any;

      // Verify verification token exists in Redis
      const storedData = await RedisService.get(`${this.EMAIL_VERIFY_PREFIX}${decoded.jti}`);
      if (!storedData) {
        throw new Error('Email verification token not found or expired');
      }

      return {
        userId: decoded.userId,
        jti: decoded.jti,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Email verification token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid email verification token');
      }
      throw error;
    }
  }

  /**
   * Revoke access token (add to blacklist)
   */
  static async revokeAccessToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return;
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await RedisService.setex(
          `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
          ttl,
          JSON.stringify({
            revokedAt: new Date().toISOString(),
            userId: decoded.userId,
            reason: 'manual_revocation',
          })
        );

        // Also remove token metadata
        if (decoded.jti) {
          await RedisService.delete(`token:meta:${decoded.jti}`);
        }

        logger.info('Access token revoked', {
          userId: decoded.userId,
          jti: decoded.jti,
          ttl,
        });
      }
    } catch (error) {
      logger.error('Error revoking access token:', error);
    }
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.userId || !decoded.jti) {
        return;
      }

      const key = `${this.REFRESH_TOKEN_PREFIX}${decoded.userId}:${decoded.jti}`;
      await RedisService.delete(key);

      logger.info('Refresh token revoked', {
        userId: decoded.userId,
        jti: decoded.jti,
      });
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
    }
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Get all refresh tokens for the user
      const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
      const keys = await RedisService.keys(pattern);
      
      if (keys.length > 0) {
        await RedisService.delete(...keys);
      }

      // Also remove temp tokens
      const tempPattern = `${this.TEMP_TOKEN_PREFIX}*`;
      const tempKeys = await RedisService.keys(tempPattern);
      
      for (const key of tempKeys) {
        const data = await RedisService.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.userId === userId) {
            await RedisService.delete(key);
          }
        }
      }

      logger.info('All tokens revoked for user', { userId, tokensRevoked: keys.length });
    } catch (error) {
      logger.error('Error revoking all user tokens:', error);
      throw new Error('Failed to revoke user tokens');
    }
  }

  /**
   * Check if token is blacklisted
   */
  private static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await RedisService.get(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
      return result !== null;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false; // Fail open for availability
    }
  }

  /**
   * Get user active sessions
   */
  static async getUserActiveSessions(userId: string): Promise<any[]> {
    try {
      const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
      const keys = await RedisService.keys(pattern);
      
      const sessions = [];
      for (const key of keys) {
        const data = await RedisService.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          sessions.push({
            sessionId: key.split(':').pop(),
            createdAt: parsed.createdAt,
            lastUsed: parsed.lastUsed,
            deviceInfo: parsed.deviceInfo,
            ipAddress: parsed.ipAddress,
            userAgent: parsed.userAgent,
          });
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting user active sessions:', error);
      return [];
    }
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    try {
      const key = `${this.REFRESH_TOKEN_PREFIX}${userId}:${sessionId}`;
      await RedisService.delete(key);

      logger.info('Session revoked', { userId, sessionId });
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      // This is handled automatically by Redis TTL, but we can add cleanup logic here
      logger.debug('Token cleanup completed');
    } catch (error) {
      logger.error('Error during token cleanup:', error);
    }
  }

  /**
   * Get token statistics
   */
  static async getTokenStatistics(): Promise<{
    activeRefreshTokens: number;
    blacklistedTokens: number;
    tempTokens: number;
  }> {
    try {
      const refreshTokens = await RedisService.keys(`${this.REFRESH_TOKEN_PREFIX}*`);
      const blacklistedTokens = await RedisService.keys(`${this.TOKEN_BLACKLIST_PREFIX}*`);
      const tempTokens = await RedisService.keys(`${this.TEMP_TOKEN_PREFIX}*`);

      return {
        activeRefreshTokens: refreshTokens.length,
        blacklistedTokens: blacklistedTokens.length,
        tempTokens: tempTokens.length,
      };
    } catch (error) {
      logger.error('Error getting token statistics:', error);
      return {
        activeRefreshTokens: 0,
        blacklistedTokens: 0,
        tempTokens: 0,
      };
    }
  }
}