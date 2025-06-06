import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { HECToken } from '../types/hec.types';
declare global {
    namespace Express {
        interface Request {
            hecToken?: HECToken;
            clientIp?: string;
        }
    }
}
export declare class AuthMiddleware {
    private tokenService;
    constructor(tokenService: TokenService);
    private getClientIp;
    authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    logRequest: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=auth.middleware.d.ts.map