import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { authConfig } from '../config/auth.config';
import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
import { MFAMethod, MFASetupResponse } from '../types/auth.types';
import logger from '../utils/logger';

export class MFAService {
  private static readonly PENDING_MFA_PREFIX = 'mfa:pending:';
  private static readonly MFA_CHALLENGE_PREFIX = 'mfa:challenge:';
  private static readonly MFA_RATE_LIMIT_PREFIX = 'mfa:rate_limit:';

  /**
   * Generate TOTP secret for user
   */
  static async generateTOTPSecret(userId: string, userEmail: string): Promise<MFASetupResponse> {
    try {
      // Check if user already has MFA enabled
      const existingMFA = await this.userHasMFA(userId);
      if (existingMFA) {
        throw new Error('MFA is already enabled for this user');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${authConfig.mfa.issuer} (${userEmail})`,
        issuer: authConfig.mfa.issuer,
        length: 32,
      });

      if (!secret.base32) {
        throw new Error('Failed to generate TOTP secret');
      }

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store temporarily (user must verify before it's saved permanently)
      await this.storePendingMFASetup(userId, {
        secret: secret.base32,
        backupCodes,
        method: 'totp',
      });

      logger.info('TOTP secret generated for user', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes,
        method: 'totp',
      };
    } catch (error) {
      logger.error('Failed to generate TOTP secret:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code during setup
   */
  static async verifyTOTPSetup(userId: string, code: string): Promise<boolean> {
    try {
      const pendingSetup = await this.getPendingMFASetup(userId);
      if (!pendingSetup) {
        throw new Error('No pending MFA setup found');
      }

      if (pendingSetup.method !== 'totp') {
        throw new Error('Invalid MFA method for TOTP verification');
      }

      const isValid = speakeasy.totp.verify({
        secret: pendingSetup.secret,
        encoding: 'base32',
        token: code,
        window: authConfig.mfa.window,
      });

      if (isValid) {
        // Save MFA method to database
        await this.saveMFAMethod({
          userId,
          methodType: 'totp',
          secret: this.encryptSecret(pendingSetup.secret),
          recoveryCodes: pendingSetup.backupCodes.map(code => this.hashBackupCode(code)),
          isVerified: true,
          isPrimary: true,
        });

        // Clear pending setup
        await this.clearPendingMFASetup(userId);

        logger.info('TOTP setup verified and saved', { userId });
      } else {
        logger.warn('Invalid TOTP code during setup', { userId });
      }

      return isValid;
    } catch (error) {
      logger.error('TOTP setup verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify MFA code during login (supports TOTP and backup codes)
   */
  static async verifyCode(userId: string, code: string, method: string = 'totp'): Promise<boolean> {
    try {
      // Check rate limiting
      const rateLimitKey = `${this.MFA_RATE_LIMIT_PREFIX}${userId}`;
      const attempts = await RedisService.get(rateLimitKey);
      const maxAttempts = 5;

      if (attempts && parseInt(attempts) >= maxAttempts) {
        throw new Error('Too many MFA verification attempts. Please try again later.');
      }

      let isValid = false;

      if (method === 'totp') {
        isValid = await this.verifyTOTPCode(userId, code);
      } else if (method === 'backup') {
        isValid = await this.verifyBackupCode(userId, code);
      } else {
        throw new Error(`Unsupported MFA method: ${method}`);
      }

      if (isValid) {
        // Clear rate limiting on successful verification
        await RedisService.delete(rateLimitKey);
        logger.info('MFA verification successful', { userId, method });
      } else {
        // Track failed attempts
        const currentAttempts = attempts ? parseInt(attempts) + 1 : 1;
        await RedisService.setex(rateLimitKey, 300, currentAttempts.toString()); // 5 minutes
        logger.warn('MFA verification failed', { userId, method, attempts: currentAttempts });
      }

      return isValid;
    } catch (error) {
      logger.error('MFA verification error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code during login
   */
  static async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    try {
      const mfaMethod = await this.getUserPrimaryMFAMethod(userId);
      if (!mfaMethod || mfaMethod.methodType !== 'totp') {
        throw new Error('TOTP not configured for user');
      }

      const secret = this.decryptSecret(mfaMethod.secret!);
      
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: authConfig.mfa.window,
      });

      if (isValid) {
        // Update last used timestamp
        await this.updateMFAMethodLastUsed(mfaMethod.id);
      }

      return isValid;
    } catch (error) {
      logger.error('TOTP verification failed:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const mfaMethod = await this.getUserPrimaryMFAMethod(userId);
      if (!mfaMethod || !mfaMethod.recoveryCodes) {
        throw new Error('No backup codes found');
      }

      const hashedCode = this.hashBackupCode(code);
      const codeIndex = mfaMethod.recoveryCodes.findIndex(
        storedCode => storedCode === hashedCode
      );

      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      mfaMethod.recoveryCodes.splice(codeIndex, 1);
      await this.updateMFABackupCodes(mfaMethod.id, mfaMethod.recoveryCodes);

      logger.info('Backup code used successfully', { userId, remainingCodes: mfaMethod.recoveryCodes.length });

      return true;
    } catch (error) {
      logger.error('Backup code verification failed:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const mfaMethod = await this.getUserPrimaryMFAMethod(userId);
      if (!mfaMethod) {
        throw new Error('MFA not configured for user');
      }

      const backupCodes = this.generateBackupCodes();
      const hashedCodes = backupCodes.map(code => this.hashBackupCode(code));

      await this.updateMFABackupCodes(mfaMethod.id, hashedCodes);

      logger.info('Backup codes regenerated', { userId, newCodeCount: backupCodes.length });

      return backupCodes;
    } catch (error) {
      logger.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId: string): Promise<void> {
    try {
      await this.deleteUserMFAMethods(userId);
      await this.clearPendingMFASetup(userId);

      logger.info('MFA disabled for user', { userId });
    } catch (error) {
      logger.error('Failed to disable MFA:', error);
      throw error;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  static async userHasMFA(userId: string): Promise<boolean> {
    try {
      const methods = await this.getUserMFAMethods(userId);
      return methods.length > 0 && methods.some(m => m.isVerified);
    } catch (error) {
      logger.error('Error checking user MFA status:', error);
      return false;
    }
  }

  /**
   * Get available MFA methods for user
   */
  static async getUserMFAMethods(userId: string): Promise<string[]> {
    try {
      const methods = await this.getUserMFAMethodsFromDB(userId);
      return methods
        .filter(m => m.isVerified)
        .map(m => m.methodType);
    } catch (error) {
      logger.error('Error getting user MFA methods:', error);
      return [];
    }
  }

  /**
   * Setup WebAuthn/Hardware Key (placeholder for future implementation)
   */
  static async setupWebAuthn(userId: string, userEmail: string): Promise<any> {
    // TODO: Implement WebAuthn/FIDO2 support
    logger.info('WebAuthn setup requested', { userId });
    throw new Error('WebAuthn support not yet implemented');
  }

  /**
   * Verify WebAuthn assertion (placeholder for future implementation)
   */
  static async verifyWebAuthn(userId: string, assertion: any): Promise<boolean> {
    // TODO: Implement WebAuthn verification
    logger.info('WebAuthn verification requested', { userId });
    throw new Error('WebAuthn support not yet implemented');
  }

  /**
   * Get MFA setup status for user
   */
  static async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    methods: string[];
    backupCodesCount: number;
    lastUsed?: Date;
  }> {
    try {
      const methods = await this.getUserMFAMethodsFromDB(userId);
      const primaryMethod = methods.find(m => m.isPrimary && m.isVerified);

      return {
        enabled: methods.length > 0 && methods.some(m => m.isVerified),
        methods: methods.filter(m => m.isVerified).map(m => m.methodType),
        backupCodesCount: primaryMethod?.recoveryCodes?.length || 0,
        lastUsed: primaryMethod?.lastUsed,
      };
    } catch (error) {
      logger.error('Error getting MFA status:', error);
      return {
        enabled: false,
        methods: [],
        backupCodesCount: 0,
      };
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(count: number = authConfig.mfa.backupCodesCount): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  private static hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code.replace('-', '').toLowerCase()) // Normalize code format
      .digest('hex');
  }

  /**
   * Encrypt secret for storage
   */
  private static encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    const encryptionKey = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET;
    
    if (!encryptionKey) {
      throw new Error('MFA_ENCRYPTION_KEY or JWT_ACCESS_SECRET environment variable is required');
    }
    
    // Create a 32-byte key from the environment variable
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secret from storage
   */
  private static decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const encryptionKey = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET;
    
    if (!encryptionKey) {
      throw new Error('MFA_ENCRYPTION_KEY or JWT_ACCESS_SECRET environment variable is required');
    }
    
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    
    const parts = encryptedSecret.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted secret format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Store pending MFA setup in Redis
   */
  private static async storePendingMFASetup(
    userId: string,
    data: { secret: string; backupCodes: string[]; method: string }
  ): Promise<void> {
    const key = `${this.PENDING_MFA_PREFIX}${userId}`;
    const setupData = {
      secret: this.encryptSecret(data.secret),
      backupCodes: data.backupCodes, // Store plain text temporarily for setup
      method: data.method,
      createdAt: new Date().toISOString()
    };
    
    // Store for 10 minutes
    await RedisService.setex(key, 600, JSON.stringify(setupData));
  }

  /**
   * Get pending MFA setup from Redis
   */
  private static async getPendingMFASetup(
    userId: string
  ): Promise<{ secret: string; backupCodes: string[]; method: string } | null> {
    const key = `${this.PENDING_MFA_PREFIX}${userId}`;
    const data = await RedisService.get(key);
    
    if (!data) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(data);
      return {
        secret: this.decryptSecret(parsed.secret),
        backupCodes: parsed.backupCodes,
        method: parsed.method
      };
    } catch (error) {
      logger.error('Error parsing pending MFA data:', error);
      return null;
    }
  }

  /**
   * Clear pending MFA setup from Redis
   */
  private static async clearPendingMFASetup(userId: string): Promise<void> {
    const key = `${this.PENDING_MFA_PREFIX}${userId}`;
    await RedisService.delete(key);
  }

  // Database interaction methods (these would typically interface with your database service)
  
  /**
   * Save MFA method to database
   */
  private static async saveMFAMethod(data: {
    userId: string;
    methodType: string;
    secret?: string;
    recoveryCodes?: string[];
    isVerified: boolean;
    isPrimary: boolean;
  }): Promise<void> {
    // This would interface with your database service
    // For now, using a placeholder implementation
    logger.info('MFA method saved to database', { userId: data.userId, methodType: data.methodType });
  }

  /**
   * Get user's primary MFA method
   */
  private static async getUserPrimaryMFAMethod(userId: string): Promise<any> {
    // This would interface with your database service
    // For now, returning a placeholder
    logger.debug('Getting primary MFA method for user', { userId });
    return null;
  }

  /**
   * Get all MFA methods for user
   */
  private static async getUserMFAMethodsFromDB(userId: string): Promise<any[]> {
    // This would interface with your database service
    // For now, returning empty array
    logger.debug('Getting all MFA methods for user', { userId });
    return [];
  }

  /**
   * Update MFA method last used timestamp
   */
  private static async updateMFAMethodLastUsed(methodId: string): Promise<void> {
    // This would interface with your database service
    logger.debug('Updating MFA method last used', { methodId });
  }

  /**
   * Update backup codes for MFA method
   */
  private static async updateMFABackupCodes(methodId: string, codes: string[]): Promise<void> {
    // This would interface with your database service
    logger.debug('Updating backup codes', { methodId, codeCount: codes.length });
  }

  /**
   * Delete all MFA methods for user
   */
  private static async deleteUserMFAMethods(userId: string): Promise<void> {
    // This would interface with your database service
    logger.debug('Deleting all MFA methods for user', { userId });
  }
}