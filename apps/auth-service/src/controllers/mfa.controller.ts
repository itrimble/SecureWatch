import { Request, Response } from 'express';
import { MFAService } from '../services/mfa.service';
import { AuditService } from '../services/audit.service';
import { UserService } from '../services/user.service';
import { isValidMFACode } from '../utils/validation';
import logger from '../utils/logger';

export class MFAController {
  /**
   * Setup MFA (TOTP) for user
   */
  static async setupMFA(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { method = 'totp' } = req.body;

      if (method !== 'totp') {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Only TOTP method is currently supported' 
        });
        return;
      }

      // Get user email for QR code generation
      const user = await UserService.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
        return;
      }

      const setupResponse = await MFAService.generateTOTPSecret(
        req.user.userId,
        user.email
      );

      // Log MFA setup initiation
      await AuditService.logAuthEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'mfa_setup_initiated',
        eventStatus: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          method: 'totp',
        },
      });

      res.status(200).json({
        setup: {
          method: setupResponse.method,
          qrCode: setupResponse.qrCode,
          secret: setupResponse.secret, // Only send for setup verification
          backupCodes: setupResponse.backupCodes,
        },
        message: 'MFA setup initiated. Please verify with your authenticator app.',
      });
    } catch (error) {
      logger.error('MFA setup failed:', error);
      
      res.status(400).json({ 
        error: 'MFA Setup Failed',
        message: error instanceof Error ? error.message : 'Failed to setup MFA' 
      });
    }
  }

  /**
   * Verify MFA setup by validating TOTP code
   */
  static async verifyMFASetup(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { code, method = 'totp' } = req.body;

      if (!code) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Verification code is required' 
        });
        return;
      }

      if (!isValidMFACode(code, method)) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Invalid verification code format' 
        });
        return;
      }

      const isValid = await MFAService.verifyTOTPSetup(req.user.userId, code);

      if (isValid) {
        // Log successful MFA setup
        await AuditService.logAuthEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'mfa_setup_completed',
          eventStatus: 'success',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            method: 'totp',
          },
        });

        res.status(200).json({
          message: 'MFA setup completed successfully',
          enabled: true,
        });
      } else {
        // Log failed MFA setup verification
        await AuditService.logAuthEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'mfa_setup_verification_failed',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            method: 'totp',
          },
        });

        res.status(400).json({ 
          error: 'Verification Failed',
          message: 'Invalid verification code' 
        });
      }
    } catch (error) {
      logger.error('MFA setup verification failed:', error);
      
      res.status(400).json({ 
        error: 'Verification Failed',
        message: error instanceof Error ? error.message : 'Failed to verify MFA setup' 
      });
    }
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Password confirmation is required to disable MFA' 
        });
        return;
      }

      // Verify user password before disabling MFA
      const user = await UserService.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
        return;
      }

      const isValidPassword = await UserService.verifyPassword(user.id, password);
      if (!isValidPassword) {
        res.status(401).json({ 
          error: 'Authentication Failed',
          message: 'Invalid password' 
        });
        return;
      }

      await MFAService.disableMFA(req.user.userId);

      // Log MFA disabled
      await AuditService.logAuthEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'mfa_disabled',
        eventStatus: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        message: 'MFA disabled successfully',
        enabled: false,
      });
    } catch (error) {
      logger.error('MFA disable failed:', error);
      
      res.status(500).json({ 
        error: 'MFA Disable Failed',
        message: 'Failed to disable MFA' 
      });
    }
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'Password confirmation is required to regenerate backup codes' 
        });
        return;
      }

      // Verify user password before regenerating codes
      const user = await UserService.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
        return;
      }

      const isValidPassword = await UserService.verifyPassword(user.id, password);
      if (!isValidPassword) {
        res.status(401).json({ 
          error: 'Authentication Failed',
          message: 'Invalid password' 
        });
        return;
      }

      const newBackupCodes = await MFAService.regenerateBackupCodes(req.user.userId);

      // Log backup codes regenerated
      await AuditService.logAuthEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'mfa_backup_codes_regenerated',
        eventStatus: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({
        backupCodes: newBackupCodes,
        message: 'Backup codes regenerated successfully',
      });
    } catch (error) {
      logger.error('Backup codes regeneration failed:', error);
      
      res.status(500).json({ 
        error: 'Regeneration Failed',
        message: error instanceof Error ? error.message : 'Failed to regenerate backup codes' 
      });
    }
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const status = await MFAService.getMFAStatus(req.user.userId);

      res.status(200).json({
        mfa: status,
      });
    } catch (error) {
      logger.error('Failed to get MFA status:', error);
      
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to get MFA status' 
      });
    }
  }

  /**
   * Setup WebAuthn/Hardware Key (placeholder)
   */
  static async setupWebAuthn(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      // Get user email for WebAuthn setup
      const user = await UserService.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
        return;
      }

      try {
        const setupResponse = await MFAService.setupWebAuthn(req.user.userId, user.email);
        
        res.status(200).json({
          setup: setupResponse,
          message: 'WebAuthn setup initiated',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not yet implemented')) {
          res.status(501).json({ 
            error: 'Not Implemented',
            message: 'WebAuthn/Hardware Key support is coming soon' 
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('WebAuthn setup failed:', error);
      
      res.status(500).json({ 
        error: 'WebAuthn Setup Failed',
        message: 'Failed to setup WebAuthn' 
      });
    }
  }

  /**
   * Verify WebAuthn assertion (placeholder)
   */
  static async verifyWebAuthn(req: Request & { user?: any }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { assertion } = req.body;

      if (!assertion) {
        res.status(400).json({ 
          error: 'Validation Error',
          message: 'WebAuthn assertion is required' 
        });
        return;
      }

      try {
        const isValid = await MFAService.verifyWebAuthn(req.user.userId, assertion);
        
        if (isValid) {
          res.status(200).json({
            verified: true,
            message: 'WebAuthn verification successful',
          });
        } else {
          res.status(400).json({ 
            error: 'Verification Failed',
            message: 'Invalid WebAuthn assertion' 
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not yet implemented')) {
          res.status(501).json({ 
            error: 'Not Implemented',
            message: 'WebAuthn/Hardware Key support is coming soon' 
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('WebAuthn verification failed:', error);
      
      res.status(500).json({ 
        error: 'WebAuthn Verification Failed',
        message: 'Failed to verify WebAuthn assertion' 
      });
    }
  }

  /**
   * Get available MFA methods
   */
  static async getAvailableMethods(req: Request, res: Response): Promise<void> {
    try {
      const methods = [
        {
          id: 'totp',
          name: 'Authenticator App',
          description: 'Use an authenticator app like Google Authenticator or Authy',
          supported: true,
        },
        {
          id: 'webauthn',
          name: 'Hardware Security Key',
          description: 'Use a hardware security key (FIDO2/WebAuthn)',
          supported: false, // Not yet implemented
        },
        {
          id: 'sms',
          name: 'SMS',
          description: 'Receive verification codes via SMS',
          supported: false, // Not implemented for security reasons
        },
      ];

      res.status(200).json({
        methods: methods.filter(m => m.supported),
        allMethods: methods,
      });
    } catch (error) {
      logger.error('Failed to get available MFA methods:', error);
      
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to get available MFA methods' 
      });
    }
  }
}