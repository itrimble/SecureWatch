import { logger } from '../utils/logger.js';
export function validateRequest(schema) {
    return (req, res, next) => {
        try {
            const validation = schema.safeParse(req.body);
            if (!validation.success) {
                logger.warn('Request validation failed:', validation.error.errors);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request data',
                    details: validation.error.errors
                });
            }
            req.body = validation.data;
            next();
        }
        catch (error) {
            logger.error('Validation middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Validation error'
            });
        }
    };
}
//# sourceMappingURL=validation.js.map