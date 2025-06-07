import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare class ValidationMiddleware {
    private maxEventSize;
    private maxBatchSize;
    private maxEventsPerBatch;
    constructor(maxEventSize?: number, maxBatchSize?: number, maxEventsPerBatch?: number);
    private hecEventSchema;
    private get hecBatchSchema();
    getQueryValidation(): ValidationChain[];
    checkRequestSize: (req: Request, res: Response, next: NextFunction) => void;
    validateSingleEvent: (req: Request, res: Response, next: NextFunction) => void;
    validateBatchEvents: (req: Request, res: Response, next: NextFunction) => void;
    private validateBatchContent;
    validateRawEvent: (req: Request, res: Response, next: NextFunction) => void;
    getConfig(): {
        maxEventSize: number;
        maxBatchSize: number;
        maxEventsPerBatch: number;
    };
}
//# sourceMappingURL=validation.middleware.d.ts.map