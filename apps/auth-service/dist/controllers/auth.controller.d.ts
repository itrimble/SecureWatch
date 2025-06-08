import { Request, Response } from 'express';
export declare class AuthController {
    /**
     * User login
     */
    static login(req: Request, res: Response): Promise<void>;
    /**
     * MFA verification
     */
    static verifyMFA(req: Request, res: Response): Promise<void>;
    /**
     * User registration
     */
    static register(req: Request, res: Response): Promise<void>;
    /**
     * Logout
     */
    static logout(req: Request, res: Response): Promise<void>;
    /**
     * Refresh access token
     */
    static refreshToken(req: Request, res: Response): Promise<void>;
    /**
     * Request password reset
     */
    static requestPasswordReset(req: Request, res: Response): Promise<void>;
    /**
     * Reset password with token
     */
    static resetPassword(req: Request, res: Response): Promise<void>;
    /**
     * Verify email address
     */
    static verifyEmail(req: Request, res: Response): Promise<void>;
    /**
     * Get current user info
     */
    static getCurrentUser(req: Request & {
        user?: any;
    }, res: Response): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map