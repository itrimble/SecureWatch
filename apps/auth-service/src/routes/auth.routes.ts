import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { MFAController } from '../controllers/mfa.controller';
import { AuthService } from '../services/auth.service';
import { authenticate, authorize } from '../middleware/rbac.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// Authentication routes
router.post('/login', 
  rateLimiter('login'),
  AuthController.login
);

router.post('/register', 
  rateLimiter('register'),
  AuthController.register
);

router.post('/logout', 
  authenticate,
  AuthController.logout
);

router.post('/refresh', 
  AuthController.refreshToken
);

router.post('/mfa/verify', 
  rateLimiter('mfa'),
  AuthController.verifyMFA
);

// Password reset routes
router.post('/password/reset', 
  rateLimiter('passwordReset'),
  AuthController.requestPasswordReset
);

router.post('/password/reset/confirm', 
  rateLimiter('passwordReset'),
  AuthController.resetPassword
);

// Email verification
router.get('/verify/:token', 
  AuthController.verifyEmail
);

// Current user
router.get('/me', 
  authenticate,
  AuthController.getCurrentUser
);

// OAuth routes
router.get('/oauth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/oauth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  async (req, res) => {
    // Handle successful OAuth login
    const user = req.user as any;
    const tokens = await AuthService.generateTokensForUser(user);
    
    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

router.get('/oauth/microsoft',
  passport.authenticate('microsoft', { 
    scope: ['user.read', 'email', 'profile'] 
  })
);

router.get('/oauth/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/auth/login' }),
  async (req, res) => {
    // Handle successful OAuth login
    const user = req.user as any;
    const tokens = await AuthService.generateTokensForUser(user);
    
    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

router.get('/oauth/okta',
  passport.authenticate('okta', { 
    scope: 'openid profile email' 
  })
);

router.get('/oauth/okta/callback',
  passport.authenticate('okta', { failureRedirect: '/auth/login' }),
  async (req, res) => {
    // Handle successful OAuth login
    const user = req.user as any;
    const tokens = await AuthService.generateTokensForUser(user);
    
    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

// MFA setup routes
router.post('/mfa/setup', 
  authenticate,
  MFAController.setupMFA
);

router.post('/mfa/setup/verify', 
  authenticate,
  MFAController.verifyMFASetup
);

router.delete('/mfa/disable', 
  authenticate,
  MFAController.disableMFA
);

router.post('/mfa/backup-codes', 
  authenticate,
  MFAController.regenerateBackupCodes
);

// Session management
router.get('/sessions', 
  authenticate,
  AuthController.getUserSessions
);

router.delete('/sessions/:sessionId', 
  authenticate,
  AuthController.revokeSession
);

router.delete('/sessions', 
  authenticate,
  AuthController.revokeAllSessions
);

export default router;