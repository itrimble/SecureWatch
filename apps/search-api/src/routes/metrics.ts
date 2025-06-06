// @ts-nocheck
import { Router } from 'express';
import { KQLEngine } from '@securewatch/kql-engine';
import Redis from 'ioredis';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/metrics/performance:
 *   get:
 *     summary: Get performance metrics
 *     description: Retrieve performance metrics for the search API
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cache:
 *                   type: object
 *                 memory:
 *                   type: object
 *                 uptime:
 *                   type: number
 *                 cpu:
 *                   type: object
 */
router.get('/performance', async (req, res) => {
  try {
    const kqlEngine: KQLEngine = (req as any).kqlEngine;
    const redis: Redis = (req as any).redis;

    const cacheStats = kqlEngine.getCacheStats();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get Redis info
    let redisInfo = null;
    try {
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      redisInfo = {
        memoryUsed: memoryMatch ? memoryMatch[1] : 'unknown',
        connected: true
      };
    } catch (error) {
      redisInfo = { connected: false };
    }

    res.json({
      cache: cacheStats,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      uptime: process.uptime(),
      cpu: {
        user: cpuUsage.user / 1000, // Convert to milliseconds
        system: cpuUsage.system / 1000
      },
      redis: redisInfo,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get performance metrics', error);
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/metrics/health:
 *   get:
 *     summary: Get health status
 *     description: Check the health of all system components
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 components:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    components: {} as Record<string, any>,
    timestamp: new Date().toISOString()
  };

  try {
    const redis: Redis = (req as any).redis;

    // Check Redis
    try {
      await redis.ping();
      health.components.redis = { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      health.components.redis = { status: 'unhealthy', error: 'Connection failed' };
      health.status = 'degraded';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    health.components.memory = {
      status: heapUsedPercent > 90 ? 'unhealthy' : heapUsedPercent > 75 ? 'degraded' : 'healthy',
      heapUsedPercent: Math.round(heapUsedPercent * 100) / 100,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    };

    if (health.components.memory.status === 'unhealthy') {
      health.status = 'unhealthy';
    } else if (health.components.memory.status === 'degraded' && health.status === 'healthy') {
      health.status = 'degraded';
    }

    // Check uptime
    const uptime = process.uptime();
    health.components.uptime = {
      status: 'healthy',
      seconds: uptime,
      humanReadable: formatUptime(uptime)
    };

    // Overall status based on components
    const componentStatuses = Object.values(health.components).map(c => c.status);
    if (componentStatuses.includes('unhealthy')) {
      health.status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/metrics/cache/clear:
 *   post:
 *     summary: Clear query cache
 *     description: Clear all cached query results
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const kqlEngine: KQLEngine = (req as any).kqlEngine;
    
    kqlEngine.clearCache();
    
    logger.info('Cache cleared', {
      userId: (req as any).user?.sub,
      organizationId: req.headers['x-organization-id']
    });

    res.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to clear cache', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

export { router as metricsRoutes };