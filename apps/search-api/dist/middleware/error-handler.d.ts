import { Request, Response, NextFunction } from 'express';
interface ErrorWithStatus extends Error {
    status?: number;
    statusCode?: number;
}
export declare const errorHandler: (error: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=error-handler.d.ts.map