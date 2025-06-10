import bcrypt from 'bcrypt';
import { JWTService } from './jwt.service';
import { UserService } from './user.service';
import { MFAService } from './mfa.service';
import { AuditService } from './audit.service';
import { RedisService } from './redis.service';
import { authConfig } from '../config/auth.config';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthContext,
  AuthResult,
  TokenPair 
} from '../types/auth.types';
import logger from '../utils/logger';

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(
    email: string, 
    password: string, 
    context: AuthContext
  ): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await UserService.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check account lockout
      const lockKey = `lockout:${user.id}`;
      const lockoutData = await RedisService.get(lockKey);
      if (lockoutData) {
        const lockout = JSON.parse(lockoutData);
        if (lockout.attempts >= authConfig.security.maxLoginAttempts) {
          throw new Error('Account temporarily locked due to too many failed attempts');
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Track failed attempts
        await this.trackFailedAttempt(user.id);
        throw new Error('Invalid credentials');
      }

      // Clear failed attempts on successful login
      await RedisService.delete(lockKey);

      // Check if user is verified
      if (!user.isVerified) {
        throw new Error('Please verify your email address before logging in');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account has been deactivated');
      }

      // Check if MFA is enabled
      const mfaEnabled = await MFAService.userHasMFA(user.id);
      if (mfaEnabled) {
        // Generate temporary token for MFA verification
        const tempToken = await JWTService.generateTempToken(user.id);
        const mfaMethods = await MFAService.getUserMFAMethods(user.id);

        await AuditService.logAuthEvent({
          userId: user.id,
          organizationId: user.organizationId,
          eventType: 'login_mfa_required',
          eventStatus: 'success',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            email: user.email,
            mfaMethods,
          },
        });

        return {
          requiresMFA: true,
          mfaMethods,
          tempToken,
        };
      }

      // Generate access and refresh tokens
      const tokens = await this.generateTokensForUser(user, context);

      // Update last login timestamp
      await UserService.updateLastLogin(user.id, context.ipAddress);

      // Log successful login
      await AuditService.logAuthEvent({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'login',
        eventStatus: 'success',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          email: user.email,
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          organizationId: user.organizationId,
        },
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Verify MFA code and complete authentication
   */
  static async verifyMFA(
    tempToken: string,
    mfaCode: string,
    mfaMethod: string,
    context: AuthContext
  ): Promise<AuthResult> {
    try {
      // Verify temporary token
      const tokenData = await JWTService.verifyTempToken(tempToken);
      const user = await UserService.findById(tokenData.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify MFA code
      const isValidMFA = await MFAService.verifyCode(user.id, mfaCode, mfaMethod);
      if (!isValidMFA) {
        throw new Error('Invalid MFA code');
      }

      // Generate access and refresh tokens
      const tokens = await this.generateTokensForUser(user, context);

      // Update last login timestamp
      await UserService.updateLastLogin(user.id, context.ipAddress);

      // Log successful MFA verification
      await AuditService.logAuthEvent({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'mfa_verification',
        eventStatus: 'success',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          email: user.email,
          mfaMethod,
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          organizationId: user.organizationId,
        },
      };
    } catch (error) {
      logger.error('MFA verification failed:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  static async register(
    registerData: RegisterRequest,
    context: AuthContext
  ): Promise<{ userId: string }> {
    try {
      // Check if user already exists
      const existingUser = await UserService.findByEmail(registerData.email);
      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(registerData.password, authConfig.bcrypt.saltRounds);

      // Create user
      const user = await UserService.create({
        email: registerData.email,
        passwordHash,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        displayName: registerData.displayName,
        organizationId: registerData.organizationId,
      });

      // Send email verification
      await UserService.sendEmailVerification(user.id);

      // Log successful registration
      await AuditService.logAuthEvent({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'registration',
        eventStatus: 'success',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          email: user.email,
        },
      });

      return { userId: user.id };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Generate tokens for authenticated user
   */
  static async generateTokensForUser(user: any, context?: AuthContext): Promise<TokenPair & { expiresIn: number }> {
    // Get user roles and permissions
    const roles = await UserService.getUserRoles(user.id);
    const permissions = await UserService.getUserPermissions(user.id);

    const accessPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: roles.map(r => r.name),
      permissions: permissions.map(p => p.name),
    };

    const refreshPayload: RefreshTokenPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      deviceInfo: context?.deviceInfo,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    const accessToken = await JWTService.generateAccessToken(accessPayload);
    const refreshToken = await JWTService.generateRefreshToken(refreshPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair & { expiresIn: number }> {
    try {
      // Verify refresh token using JWT service
      const tokenData = await JWTService.verifyRefreshToken(refreshToken);

      // Get updated user data
      const user = await UserService.findById(tokenData.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens with rotation
      const context: AuthContext = {
        ipAddress: tokenData.ipAddress,
        userAgent: tokenData.userAgent,
        deviceInfo: tokenData.deviceInfo,
      };
      
      const tokens = await this.generateTokensForUser(user, context);

      // Revoke old refresh token (handled by JWT service during verification)
      await JWTService.revokeRefreshToken(refreshToken);

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      // Verify and decode access token to get user info
      const tokenData = await JWTService.verifyAccessToken(accessToken);

      // Revoke access token
      await JWTService.revokeAccessToken(accessToken);

      // Revoke refresh token if provided
      if (refreshToken) {
        await JWTService.revokeRefreshToken(refreshToken);
      }

      // Log logout
      await AuditService.logAuthEvent({
        userId: tokenData.userId,
        organizationId: tokenData.organizationId,
        eventType: 'logout',
        eventStatus: 'success',
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      // Don't throw error for logout
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string, context: AuthContext): Promise<void> {
    try {
      const user = await UserService.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return;
      }

      // Generate reset token
      const resetToken = await JWTService.generatePasswordResetToken(user.id);

      // Store reset token with expiration
      await RedisService.setex(
        `password_reset:${user.id}`,
        60 * 60, // 1 hour
        resetToken
      );

      // Send password reset email
      await UserService.sendPasswordResetEmail(user.id, resetToken);

      // Log password reset request
      await AuditService.logAuthEvent({
        userId: user.id,
        organizationId: user.organizationId,
        eventType: 'password_reset_request',
        eventStatus: 'success',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          email: user.email,
        },
      });
    } catch (error) {
      logger.error('Password reset request failed:', error);
      // Don't throw error to prevent email enumeration
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    token: string, 
    newPassword: string, 
    context: AuthContext
  ): Promise<void> {
    try {
      // Verify reset token
      const tokenData = await JWTService.verifyPasswordResetToken(token);
      
      // Check if token exists in Redis
      const storedToken = await RedisService.get(`password_reset:${tokenData.userId}`);
      if (!storedToken || storedToken !== token) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, authConfig.bcrypt.saltRounds);

      // Update user password
      await UserService.updatePassword(tokenData.userId, passwordHash);

      // Remove reset token
      await RedisService.delete(`password_reset:${tokenData.userId}`);

      // Invalidate all existing sessions
      await this.invalidateAllUserSessions(tokenData.userId);

      // Log password reset
      await AuditService.logAuthEvent({
        userId: tokenData.userId,
        eventType: 'password_reset',
        eventStatus: 'success',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      // Verify email verification token
      const tokenData = await JWTService.verifyEmailVerificationToken(token);
      
      // Update user verification status
      await UserService.verifyEmail(tokenData.userId);

      // Log email verification
      await AuditService.logAuthEvent({
        userId: tokenData.userId,
        eventType: 'email_verification',
        eventStatus: 'success',
      });
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Track failed login attempt
   */
  private static async trackFailedAttempt(userId: string): Promise<void> {
    const lockKey = `lockout:${userId}`;
    const lockoutData = await RedisService.get(lockKey);
    
    let attempts = 1;
    if (lockoutData) {
      const lockout = JSON.parse(lockoutData);
      attempts = lockout.attempts + 1;
    }

    if (attempts >= authConfig.security.maxLoginAttempts) {
      // Lock account
      await RedisService.setex(
        lockKey,
        30 * 60, // 30 minutes
        JSON.stringify({
          attempts,
          lockedAt: new Date().toISOString(),
        })
      );
    } else {
      // Track attempts
      await RedisService.setex(
        lockKey,
        15 * 60, // 15 minutes
        JSON.stringify({
          attempts,
          lastAttempt: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Invalidate all user sessions
   */
  private static async invalidateAllUserSessions(userId: string): Promise<void> {
    // Use JWT service to revoke all tokens for user
    await JWTService.revokeAllUserTokens(userId);
  }
}