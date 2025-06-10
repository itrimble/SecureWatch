import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authConfig } from '../config/auth.config';
import { DatabaseService } from './database.service';
import { JWTService } from './jwt.service';
import logger from '../utils/logger';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  organizationId?: string;
  isActive: boolean;
  isVerified: boolean;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles?: any[];
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  organizationId?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Permission {
  id: string;
  name: string;
}

export class UserService {
  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await DatabaseService.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const result = await DatabaseService.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      return null;
    }
  }

  /**
   * Create new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      const result = await DatabaseService.query(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name, display_name,
          organization_id, is_active, is_verified, mfa_enabled,
          failed_login_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          id,
          userData.email,
          userData.passwordHash,
          userData.firstName,
          userData.lastName,
          userData.displayName || `${userData.firstName} ${userData.lastName}`.trim(),
          userData.organizationId,
          userData.isActive || false,
          userData.isVerified || false,
          false, // mfa_enabled
          0, // failed_login_attempts
          now,
          now
        ]
      );

      const user = this.mapDbRowToUser(result.rows[0]);
      logger.info('User created successfully', { userId: user.id, email: user.email });
      
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Verify user password
   */
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.passwordHash) {
        return false;
      }

      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: string, passwordHash: string): Promise<void> {
    try {
      await DatabaseService.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );

      logger.info('Password updated for user', { userId });
    } catch (error) {
      logger.error('Error updating password:', error);
      throw new Error('Failed to update password');
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId: string, ipAddress?: string): Promise<void> {
    try {
      await DatabaseService.query(
        'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
        [userId]
      );

      logger.debug('Last login updated', { userId, ipAddress });
    } catch (error) {
      logger.error('Error updating last login:', error);
    }
  }

  /**
   * Verify user email
   */
  static async verifyEmail(userId: string): Promise<void> {
    try {
      await DatabaseService.query(
        'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      logger.info('Email verified for user', { userId });
    } catch (error) {
      logger.error('Error verifying email:', error);
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(userId: string): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const token = await JWTService.generateEmailVerificationToken(userId);
      
      // TODO: Integrate with email service
      logger.info('Email verification token generated', { 
        userId, 
        email: user.email,
        // Don't log the actual token for security
      });

      // For now, just log that verification would be sent
      // In production, this would integrate with your email service
    } catch (error) {
      logger.error('Error sending email verification:', error);
      throw new Error('Failed to send email verification');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(userId: string, resetToken: string): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Integrate with email service
      logger.info('Password reset token generated', { 
        userId, 
        email: user.email,
        // Don't log the actual token for security
      });

      // For now, just log that reset email would be sent
      // In production, this would integrate with your email service
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Get user roles
   */
  static async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const result = await DatabaseService.query(
        `SELECT r.* FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        permissions: row.permissions ? JSON.parse(row.permissions) : [],
      }));
    } catch (error) {
      logger.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const result = await DatabaseService.query(
        `SELECT DISTINCT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
      }));
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Find user by OAuth profile
   */
  static async findByOAuthProfile(profile: any): Promise<User | null> {
    try {
      const result = await DatabaseService.query(
        'SELECT u.* FROM users u JOIN oauth_accounts oa ON u.id = oa.user_id WHERE oa.provider = $1 AND oa.provider_id = $2',
        [profile.provider, profile.providerId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by OAuth profile:', error);
      return null;
    }
  }

  /**
   * Create user from OAuth profile
   */
  static async createFromOAuth(profile: any): Promise<User> {
    try {
      const userData: CreateUserData = {
        email: profile.email,
        passwordHash: '', // No password for OAuth users
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        isActive: true,
        isVerified: profile.emailVerified || true, // Trust OAuth providers
      };

      const user = await this.create(userData);

      // Link OAuth profile
      await this.linkOAuthProfile(user.id, profile);

      return user;
    } catch (error) {
      logger.error('Error creating user from OAuth:', error);
      throw new Error('Failed to create user from OAuth');
    }
  }

  /**
   * Link OAuth profile to existing user
   */
  static async linkOAuthProfile(userId: string, profile: any): Promise<void> {
    try {
      await DatabaseService.query(
        `INSERT INTO oauth_accounts (
          user_id, provider, provider_id, email, profile_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (provider, provider_id) DO UPDATE SET
          user_id = $1, email = $4, profile_data = $5, updated_at = NOW()`,
        [
          userId,
          profile.provider,
          profile.providerId,
          profile.email,
          JSON.stringify(profile.rawProfile),
        ]
      );

      logger.info('OAuth profile linked to user', { userId, provider: profile.provider });
    } catch (error) {
      logger.error('Error linking OAuth profile:', error);
      throw new Error('Failed to link OAuth profile');
    }
  }

  /**
   * Update OAuth tokens
   */
  static async updateOAuthTokens(userId: string, provider: string, tokens: any): Promise<void> {
    try {
      await DatabaseService.query(
        `UPDATE oauth_accounts SET 
          access_token = $1, refresh_token = $2, updated_at = NOW()
         WHERE user_id = $3 AND provider = $4`,
        [tokens.accessToken, tokens.refreshToken, userId, provider]
      );

      logger.debug('OAuth tokens updated', { userId, provider });
    } catch (error) {
      logger.error('Error updating OAuth tokens:', error);
    }
  }

  /**
   * Sync Azure AD groups for user
   */
  static async syncAzureADGroups(userId: string, groups: string[]): Promise<void> {
    try {
      // TODO: Implement Azure AD group sync logic
      // This would typically involve mapping Azure AD groups to internal roles
      logger.info('Azure AD groups would be synced', { userId, groupCount: groups.length });
    } catch (error) {
      logger.error('Error syncing Azure AD groups:', error);
    }
  }

  /**
   * Sync Okta groups for user
   */
  static async syncOktaGroups(userId: string, groups: string[]): Promise<void> {
    try {
      // TODO: Implement Okta group sync logic
      // This would typically involve mapping Okta groups to internal roles
      logger.info('Okta groups would be synced', { userId, groupCount: groups.length });
    } catch (error) {
      logger.error('Error syncing Okta groups:', error);
    }
  }

  /**
   * Map database row to User object
   */
  private static mapDbRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      organizationId: row.organization_id,
      isActive: row.is_active,
      isVerified: row.is_verified,
      mfaEnabled: row.mfa_enabled,
      failedLoginAttempts: row.failed_login_attempts || 0,
      lockedUntil: row.locked_until,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}