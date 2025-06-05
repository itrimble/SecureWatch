import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare function validateRequest(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validation.d.ts.map