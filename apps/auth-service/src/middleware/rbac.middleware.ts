import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { PermissionService } from '../services/permission.service';
import { AuditService } from '../services/audit.service';
import { DatabaseService } from '../services/database.service';
import { securityAuditLogger, SecurityEventType } from '../utils/audit-logger';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    permissions: string[];
    roles: string[];
    sessionId: string;
  };
}

/**
 * Extract JWT token from request header
 */
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No authentication token provided' 
      });
      return;
    }

    const decoded = await JWTService.verifyAccessToken(token);
    
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      permissions: decoded.permissions,
      roles: decoded.roles,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    await AuditService.logAuthEvent({
      eventType: 'token_validation_failed',
      eventStatus: 'failure',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        path: req.path,
        method: req.method,
      },
    });

    res.status(401).json({ 
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token' 
    });
  }
};

/**
 * Authorization middleware - checks required permissions
 */
export const authorize = (requiredPermissions: string | string[]) => {
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      // Check if user has all required permissions
      const hasAllPermissions = await PermissionService.checkPermissions(
        req.user.userId,
        req.user.organizationId,
        permissions
      );

      if (!hasAllPermissions) {
        await AuditService.logAuthEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'authorization_failed',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            path: req.path,
            method: req.method,
            requiredPermissions: permissions,
            userPermissions: req.user.permissions,
          },
        });

        res.status(403).json({ 
          error: 'Forbidden',
          message: 'Insufficient permissions',
          required: permissions 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to check permissions' 
      });
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) 
    ? requiredRoles 
    : [requiredRoles];

  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      // Check if user has at least one of the required roles
      const hasRole = roles.some(role => req.user!.roles.includes(role));

      if (!hasRole) {
        await AuditService.logAuthEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'role_check_failed',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            path: req.path,
            method: req.method,
            requiredRoles: roles,
            userRoles: req.user.roles,
          },
        });

        res.status(403).json({ 
          error: 'Forbidden',
          message: 'Insufficient role privileges',
          required: roles 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to check roles' 
      });
    }
  };
};

/**
 * Combined permission and role check
 */
export const authorizeWithRoles = (
  requiredPermissions: string | string[],
  requiredRoles: string | string[]
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // First check roles
    await requireRole(requiredRoles)(req, res, async () => {
      // If roles pass, check permissions
      await authorize(requiredPermissions)(req, res, next);
    });
  };
};

/**
 * Organization access middleware - ensures user belongs to the organization
 */
export const requireOrgAccess = (extractOrgId?: (req: Request) => string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const targetOrgId = extractOrgId 
        ? extractOrgId(req) 
        : req.params.organizationId || req.body.organizationId;

      if (!targetOrgId) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'Organization ID not provided' 
        });
        return;
      }

      // Super admins can access any organization
      if (req.user.roles.includes('super_admin')) {
        next();
        return;
      }

      // Check if user belongs to the organization
      if (req.user.organizationId !== targetOrgId) {
        await AuditService.logAuthEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'org_access_denied',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            path: req.path,
            method: req.method,
            targetOrgId,
            userOrgId: req.user.organizationId,
          },
        });

        res.status(403).json({ 
          error: 'Forbidden',
          message: 'Access denied to this organization' 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Organization access check error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to check organization access' 
      });
    }
  };
};

/**
 * API key authentication middleware
 */
export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      // Fall back to JWT authentication
      return authenticate(req, res, next);
    }

    // Validate API key against database
    const apiKeyData = await DatabaseService.validateApiKey(apiKey);
    
    if (!apiKeyData || !apiKeyData.isActive) {
      // Log to legacy audit service for backwards compatibility
      await AuditService.logAuthEvent({
        eventType: 'api_key_validation_failed',
        eventStatus: 'failure',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          path: req.path,
          method: req.method,
          apiKeyPrefix: apiKey.substring(0, 8) + '...',
        },
      });

      // Log to comprehensive security audit logger
      await securityAuditLogger.logAuthEvent({
        eventType: SecurityEventType.API_KEY_INVALID,
        eventStatus: 'failure',
        authMethod: 'api_key',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
        metadata: {
          path: req.path,
          method: req.method,
          apiKeyPrefix: apiKey.substring(0, 8) + '...',
          reason: !apiKeyData ? 'API key not found' : 'API key inactive'
        }
      });

      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or inactive API key' 
      });
      return;
    }

    // Check if API key has expired
    if (apiKeyData.expiresAt && new Date() > apiKeyData.expiresAt) {
      // Log to legacy audit service
      await AuditService.logAuthEvent({
        eventType: 'api_key_expired',
        eventStatus: 'failure',
        userId: apiKeyData.userId,
        organizationId: apiKeyData.organizationId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          path: req.path,
          method: req.method,
          apiKeyId: apiKeyData.id,
        },
      });

      // Log to comprehensive security audit logger
      await securityAuditLogger.logAuthEvent({
        eventType: SecurityEventType.API_KEY_EXPIRED,
        eventStatus: 'failure',
        userId: apiKeyData.userId,
        organizationId: apiKeyData.organizationId,
        authMethod: 'api_key',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
        metadata: {
          path: req.path,
          method: req.method,
          apiKeyId: apiKeyData.id,
          expiresAt: apiKeyData.expiresAt.toISOString()
        }
      });

      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'API key has expired' 
      });
      return;
    }

    // Set user context from API key
    req.user = {
      userId: apiKeyData.userId,
      organizationId: apiKeyData.organizationId,
      permissions: apiKeyData.permissions || [],
      roles: apiKeyData.roles || [],
      sessionId: `api-key-${apiKeyData.id}`,
    };

    // Update last used timestamp
    await DatabaseService.updateApiKeyLastUsed(apiKeyData.id, req.ip);

    // Log successful API key usage
    await AuditService.logAuthEvent({
      eventType: 'api_key_authenticated',
      eventStatus: 'success',
      userId: apiKeyData.userId,
      organizationId: apiKeyData.organizationId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        path: req.path,
        method: req.method,
        apiKeyId: apiKeyData.id,
        apiKeyName: apiKeyData.name,
      },
    });

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to authenticate API key' 
    });
  }
};

export default {
  authenticate,
  authorize,
  requireRole,
  authorizeWithRoles,
  requireOrgAccess,
  authenticateApiKey,
};