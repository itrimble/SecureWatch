import { MFASetupResponse } from '../types/auth.types';
export declare class MFAService {
    /**
     * Generate TOTP secret for user
     */
    static generateTOTPSecret(userId: string, userEmail: string): Promise<MFASetupResponse>;
    /**
     * Verify TOTP code during setup
     */
    static verifyTOTPSetup(userId: string, code: string): Promise<boolean>;
    /**
     * Verify TOTP code during login
     */
    static verifyTOTPCode(userId: string, code: string): Promise<boolean>;
    /**
     * Verify backup code
     */
    static verifyBackupCode(userId: string, code: string): Promise<boolean>;
    /**
     * Generate new backup codes
     */
    static regenerateBackupCodes(userId: string): Promise<string[]>;
    /**
     * Disable MFA for user
     */
    static disableMFA(userId: string): Promise<void>;
    /**
     * Check if user has MFA enabled
     */
    static userHasMFA(userId: string): Promise<boolean>;
    /**
     * Get available MFA methods for user
     */
    static getUserMFAMethods(userId: string): Promise<string[]>;
    /**
     * Generate backup codes
     */
    private static generateBackupCodes;
    /**
     * Hash backup code for storage
     */
    private static hashBackupCode;
    /**
     * Encrypt secret for storage
     */
    private static encryptSecret;
    /**
     * Decrypt secret from storage
     */
    private static decryptSecret;
    /**
     * Store pending MFA setup in Redis
     */
    private static storePendingMFASetup;
    /**
     * Get pending MFA setup from Redis
     */
    private static getPendingMFASetup;
    /**
     * Clear pending MFA setup from Redis
     */
    private static clearPendingMFASetup;
}
//# sourceMappingURL=mfa.service.d.ts.map