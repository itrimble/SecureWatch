import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { authConfig } from '../config/auth.config';
import { DatabaseService } from './database.service';
import { MFAMethod, MFASetupResponse } from '../types/auth.types';
import { redis } from '../utils/redis';

export class MFAService {
  /**
   * Generate TOTP secret for user
   */
  static async generateTOTPSecret(userId: string, userEmail: string): Promise<MFASetupResponse> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${authConfig.mfa.issuer} (${userEmail})`,
      issuer: authConfig.mfa.issuer,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store temporarily (user must verify before it's saved permanently)
    await this.storePendingMFASetup(userId, {
      secret: secret.base32,
      backupCodes,
    });

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code during setup
   */
  static async verifyTOTPSetup(
    userId: string,
    code: string
  ): Promise<boolean> {
    const pendingSetup = await this.getPendingMFASetup(userId);
    if (!pendingSetup) {
      throw new Error('No pending MFA setup found');
    }

    const isValid = speakeasy.totp.verify({
      secret: pendingSetup.secret,
      encoding: 'base32',
      token: code,
      window: authConfig.mfa.window,
    });

    if (isValid) {
      // Save MFA method to database
      await DatabaseService.createMFAMethod({
        userId,
        methodType: 'totp',
        secret: this.encryptSecret(pendingSetup.secret),
        recoveryCodes: pendingSetup.backupCodes.map(code => this.hashBackupCode(code)),
        isVerified: true,
        isPrimary: true,
      });

      // Clear pending setup
      await this.clearPendingMFASetup(userId);
    }

    return isValid;
  }

  /**
   * Verify TOTP code during login
   */
  static async verifyTOTPCode(
    userId: string,
    code: string
  ): Promise<boolean> {
    const mfaMethod = await DatabaseService.getUserPrimaryMFAMethod(userId);
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
      await DatabaseService.updateMFAMethodLastUsed(mfaMethod.id);
    }

    return isValid;
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<boolean> {
    const mfaMethod = await DatabaseService.getUserPrimaryMFAMethod(userId);
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
    await DatabaseService.updateMFABackupCodes(
      mfaMethod.id,
      mfaMethod.recoveryCodes
    );

    return true;
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const mfaMethod = await DatabaseService.getUserPrimaryMFAMethod(userId);
    if (!mfaMethod) {
      throw new Error('MFA not configured for user');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedCodes = backupCodes.map(code => this.hashBackupCode(code));

    await DatabaseService.updateMFABackupCodes(mfaMethod.id, hashedCodes);

    return backupCodes;
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId: string): Promise<void> {
    await DatabaseService.deleteUserMFAMethods(userId);
    await this.clearPendingMFASetup(userId);
  }

  /**
   * Check if user has MFA enabled
   */
  static async userHasMFA(userId: string): Promise<boolean> {
    const methods = await DatabaseService.getUserMFAMethods(userId);
    return methods.length > 0 && methods.some(m => m.isVerified);
  }

  /**
   * Get available MFA methods for user
   */
  static async getUserMFAMethods(userId: string): Promise<string[]> {
    const methods = await DatabaseService.getUserMFAMethods(userId);
    return methods
      .filter(m => m.isVerified)
      .map(m => m.methodType);
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
      .update(code)
      .digest('hex');
  }

  /**
   * Encrypt secret for storage
   */
  private static encryptSecret(secret: string): string {
    const algorithm = 'aes-256-gcm';
    if (!process.env.MFA_ENCRYPTION_KEY) {
      throw new Error('MFA_ENCRYPTION_KEY environment variable is required');
    }
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY);
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
    if (!process.env.MFA_ENCRYPTION_KEY) {
      throw new Error('MFA_ENCRYPTION_KEY environment variable is required');
    }
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY);
    
    const parts = encryptedSecret.split(':');
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
    data: { secret: string; backupCodes: string[] }
  ): Promise<void> {
    const key = `mfa:pending:${userId}`;
    const encrypted = {
      secret: this.encryptSecret(data.secret),
      backupCodes: data.backupCodes.map(code => this.hashBackupCode(code)),
      createdAt: new Date().toISOString()
    };
    
    // Store for 10 minutes
    await redis.setex(key, 600, JSON.stringify(encrypted));
  }

  /**
   * Get pending MFA setup from Redis
   */
  private static async getPendingMFASetup(
    userId: string
  ): Promise<{ secret: string; backupCodes: string[] } | null> {
    const key = `mfa:pending:${userId}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(data);
      return {
        secret: this.decryptSecret(parsed.secret),
        backupCodes: parsed.backupCodes
      };
    } catch (error) {
      console.error('Error parsing pending MFA data:', error);
      return null;
    }
  }

  /**
   * Clear pending MFA setup from Redis
   */
  private static async clearPendingMFASetup(userId: string): Promise<void> {
    const key = `mfa:pending:${userId}`;
    await redis.del(key);
  }
}