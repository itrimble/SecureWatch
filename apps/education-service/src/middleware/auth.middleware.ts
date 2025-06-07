import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = process.env.JWT_ACCESS_SECRET || 'your-education-service-secret';
    
    if (!jwtSecret) {
      logger.error('JWT_ACCESS_SECRET environment variable not set');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication configuration error',
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Extract user information from token
    const user: AuthenticatedUser = {
      id: decoded.sub || decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'student',
      permissions: decoded.permissions || [],
    };

    // Attach user to request object
    req.user = user;

    logger.debug('User authenticated successfully', {
      userId: user.id,
      role: user.role,
      endpoint: req.originalUrl,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      endpoint: req.originalUrl,
      ip: req.ip,
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Your session has expired. Please log in again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'The provided token is invalid.',
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (requiredRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions for this action',
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (requiredPermissions: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = req.user.permissions || [];

    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission) || 
      userPermissions.includes('*') // Admin wildcard permission
    );

    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userPermissions,
        requiredPermissions: permissions,
        endpoint: req.originalUrl,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions for this action',
      });
    }

    next();
  };
};

/**
 * Optional auth middleware - attaches user if token is present but doesn't require it
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_ACCESS_SECRET || 'your-education-service-secret';
    
    if (!jwtSecret) {
      logger.error('JWT_ACCESS_SECRET environment variable not set');
      return next(); // Continue without auth rather than error
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    const user: AuthenticatedUser = {
      id: decoded.sub || decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'student',
      permissions: decoded.permissions || [],
    };

    req.user = user;
    
    logger.debug('Optional authentication successful', {
      userId: user.id,
      role: user.role,
    });

    next();
  } catch (error) {
    // Log but don't fail the request
    logger.debug('Optional authentication failed, continuing without auth', {
      error: error.message,
    });
    next();
  }
};

/**
 * Middleware to check if user is instructor or admin
 */
export const requireInstructor = requireRole(['instructor', 'admin']);

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Common education service permissions
 */
export const EDUCATION_PERMISSIONS = {
  // Learning content management
  CREATE_CONTENT: 'education:create-content',
  EDIT_CONTENT: 'education:edit-content',
  DELETE_CONTENT: 'education:delete-content',
  PUBLISH_CONTENT: 'education:publish-content',

  // User management
  VIEW_USERS: 'education:view-users',
  MANAGE_USERS: 'education:manage-users',
  VIEW_PROGRESS: 'education:view-progress',

  // Assessment management
  CREATE_ASSESSMENTS: 'education:create-assessments',
  GRADE_ASSESSMENTS: 'education:grade-assessments',
  VIEW_RESULTS: 'education:view-results',

  // Lab management
  MANAGE_LABS: 'education:manage-labs',
  ACCESS_LABS: 'education:access-labs',

  // Certification management
  ISSUE_CERTIFICATES: 'education:issue-certificates',
  MANAGE_CERTIFICATES: 'education:manage-certificates',

  // System administration
  SYSTEM_CONFIG: 'education:system-config',
  VIEW_ANALYTICS: 'education:view-analytics',
} as const;