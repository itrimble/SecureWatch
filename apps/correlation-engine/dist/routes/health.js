// @ts-nocheck
import { Router } from 'express';
import { correlationEngine } from '../engine/correlation-engine';
import { logger } from '../utils/logger';
export const healthRouter = Router();
healthRouter.get('/', async (req, res) => {
    try {
        const stats = await correlationEngine.getEngineStats();
        res.json({
            status: 'healthy',
            service: 'correlation-engine',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            stats: {
                activeRules: stats.activeRules,
                eventBufferSize: stats.eventBufferSize,
                queueSize: stats.queueSize,
                bufferKeys: stats.bufferKeys
            }
        });
    }
    catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            service: 'correlation-engine',
            error: error.message
        });
    }
});
healthRouter.get('/detailed', async (req, res) => {
    try {
        const stats = await correlationEngine.getEngineStats();
        res.json({
            status: 'healthy',
            service: 'correlation-engine',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            stats
        });
    }
    catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            service: 'correlation-engine',
            error: error.message
        });
    }
});
//# sourceMappingURL=health.js.map