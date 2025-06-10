import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { MFAService } from '../services/mfa.service';
import { AuditService } from '../services/audit.service';
import { JWTService } from '../services/jwt.service';
import { 
  LoginRequest, 
  RegisterRequest, 
  PasswordResetRequest, 
  PasswordResetConfirm 
} from '../types/auth.types';
import { validateLoginRequest, validateRegisterRequest } from '../utils/validation';

export class AuthController {
  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      
      // Validate request
      const validation = validateLoginRequest(loginData);
      if (!validation.valid) {
        res.status(400).json({ 
          error: 'Validation Error',
          errors: validation.errors 
        });
        return;
      }

      // Attempt login
      const result = await AuthService.login(
        loginData.email,
        loginData.password,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          deviceInfo: loginData.deviceInfo,
        }
      );

      // Check if MFA is required
      if (result.requiresMFA) {
        res.status(200).json({
          requiresMFA: true,
          mfaMethods: result.mfaMethods,
          tempToken: result.tempToken, // Temporary token for MFA verification
        });
        return;
      }

      // Set secure HTTP-only cookies for tokens
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        user: result.user,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      await AuditService.logAuthEvent({
        eventType: 'login',
        eventStatus: 'failure',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        errorMessage: error instanceof Error ? error.message : 'Login failed',
        metadata: {
          email: req.body.email,
        },
      });

      res.status(401).json({ 
        error: 'Authentication Failed',
        message: error instanceof Error ? error.message : 'Invalid credentials' 
      });
    }
  }

  /**
   * MFA verification
   */
  static async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, mfaCode, mfaMethod } = req.body;

      if (!tempToken || !mfaCode) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Temporary token and MFA code are required' 
        });
        return;
      }

      const result = await AuthService.verifyMFA(
        tempToken,
        mfaCode,
        mfaMethod || 'totp',
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      // Set secure HTTP-only cookies for tokens
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        user: result.user,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      res.status(401).json({ 
        error: 'MFA Verification Failed',
        message: error instanceof Error ? error.message : 'Invalid MFA code' 
      });
    }
  }

  /**
   * User registration
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;
      
      // Validate request
      const validation = validateRegisterRequest(registerData);
      if (!validation.valid) {
        res.status(400).json({ 
          error: 'Validation Error',
          errors: validation.errors 
        });
        return;
      }

      // Create user
      const result = await AuthService.register(registerData, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: result.userId,
      });
    } catch (error) {
      res.status(400).json({ 
        error: 'Registration Failed',
        message: error instanceof Error ? error.message : 'Failed to create account' 
      });
    }
  }

  /**
   * Logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
      const refreshToken = req.cookies.refresh_token;

      if (accessToken) {
        await AuthService.logout(accessToken, refreshToken);
      }

      // Clear cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      // Still clear cookies even if logout fails
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      
      res.status(200).json({ message: 'Logged out' });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Refresh token not provided' 
        });
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      // Update access token cookie
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Update refresh token cookie if rotated
      if (result.refreshToken !== refreshToken) {
        res.cookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      res.status(200).json({
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      res.status(401).json({ 
        error: 'Token Refresh Failed',
        message: error instanceof Error ? error.message : 'Invalid refresh token' 
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email }: PasswordResetRequest = req.body;

      if (!email) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Email is required' 
        });
        return;
      }

      await AuthService.requestPasswordReset(email, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Always return success to prevent email enumeration
      res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      // Still return success to prevent email enumeration
      res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword }: PasswordResetConfirm = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Token and new password are required' 
        });
        return;
      }

      await AuthService.resetPassword(token, newPassword, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      res.status(400).json({ 
        error: 'Password Reset Failed',
        message: error instanceof Error ? error.message : 'Invalid or expired token' 
      });
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Verification token is required' 
        });
        return;
      }

      await AuthService.verifyEmail(token);

      res.status(200).json({
        message: 'Email verified successfully. You can now login.',
      });
    } catch (error) {
      res.status(400).json({ 
        error: 'Email Verification Failed',
        message: error instanceof Error ? error.message : 'Invalid or expired token' 
      });
    }
  }

  /**
   * Get current user info
   */
  static async getCurrentUser(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const user = await UserService.findById(req.user.userId);
      
      if (!user) {
        res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          roles: req.user.roles,
          permissions: req.user.permissions,
          organizationId: user.organizationId,
          isVerified: user.isVerified,
          mfaEnabled: await MFAService.userHasMFA(user.id),
        },
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch user information' 
      });
    }
  }

  /**
   * Get user active sessions
   */
  static async getUserSessions(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const sessions = await JWTService.getUserActiveSessions(req.user.userId);

      res.status(200).json({
        sessions,
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch user sessions' 
      });
    }
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Session ID is required' 
        });
        return;
      }

      await JWTService.revokeSession(req.user.userId, sessionId);

      res.status(200).json({
        message: 'Session revoked successfully',
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to revoke session' 
      });
    }
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllSessions(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      await JWTService.revokeAllUserTokens(req.user.userId);

      res.status(200).json({
        message: 'All sessions revoked successfully',
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to revoke all sessions' 
      });
    }
  }
}