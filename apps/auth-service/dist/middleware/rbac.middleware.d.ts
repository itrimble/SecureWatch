import { Request, Response, NextFunction } from 'express';
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
 * Authentication middleware - verifies JWT token
 */
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Authorization middleware - checks required permissions
 */
export declare const authorize: (requiredPermissions: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Role-based authorization middleware
 */
export declare const requireRole: (requiredRoles: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Combined permission and role check
 */
export declare const authorizeWithRoles: (requiredPermissions: string | string[], requiredRoles: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Organization access middleware - ensures user belongs to the organization
 */
export declare const requireOrgAccess: (extractOrgId?: (req: Request) => string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * API key authentication middleware
 */
export declare const authenticateApiKey: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    authorize: (requiredPermissions: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    requireRole: (requiredRoles: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    authorizeWithRoles: (requiredPermissions: string | string[], requiredRoles: string | string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    requireOrgAccess: (extractOrgId?: (req: Request) => string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
    authenticateApiKey: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=rbac.middleware.d.ts.map