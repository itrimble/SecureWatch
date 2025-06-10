import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { StorageManager } from '../services/storage-manager';
import { PipelineMonitor } from '../services/pipeline-monitor';
import { CapacityPlanner } from '../services/capacity-planner';
import { LifecycleOrchestrator } from '../services/lifecycle-orchestrator';
import { StorageTier } from '../types';

export function createRetentionRoutes(
  pgPool: Pool,
  redis: Redis,
  logger: Logger
): Router {
  const router = Router();

  const storageManager = new StorageManager(pgPool, logger);
  const pipelineMonitor = new PipelineMonitor(pgPool, redis, logger);
  const capacityPlanner = new CapacityPlanner(pgPool, logger);
  const lifecycleOrchestrator = new LifecycleOrchestrator(
    pgPool,
    redis,
    logger
  );

  // Get storage statistics
  router.get('/storage/stats', async (req: Request, res: Response) => {
    try {
      const stats = await storageManager.getStorageStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get storage stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve storage statistics',
      });
    }
  });

  // Get pipeline metrics
  router.get('/pipeline/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await pipelineMonitor.getMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Failed to get pipeline metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pipeline metrics',
      });
    }
  });

  // Get Prometheus metrics
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = pipelineMonitor.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      logger.error('Failed to get Prometheus metrics', error);
      res.status(500).send('Failed to retrieve metrics');
    }
  });

  // Get capacity projections
  router.get('/capacity/projections', async (req: Request, res: Response) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 90;
      const projections = await capacityPlanner.projectCapacity(daysAhead);

      res.json({
        success: true,
        data: projections,
      });
    } catch (error) {
      logger.error('Failed to get capacity projections', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate capacity projections',
      });
    }
  });

  // Trigger manual tier migration
  router.post('/migrate', async (req: Request, res: Response) => {
    try {
      const { fromTier, toTier } = req.body;

      if (!fromTier || !toTier) {
        return res.status(400).json({
          success: false,
          error: 'fromTier and toTier are required',
        });
      }

      // Validate tiers
      if (
        !Object.values(StorageTier).includes(fromTier) ||
        !Object.values(StorageTier).includes(toTier)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid tier specified',
        });
      }

      // Start migration in background
      storageManager.migrateData(fromTier, toTier).catch((error) => {
        logger.error('Background migration failed', error);
      });

      res.json({
        success: true,
        message: 'Migration started in background',
      });
    } catch (error) {
      logger.error('Failed to start migration', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start migration',
      });
    }
  });

  // Get active transitions
  router.get('/transitions/active', async (req: Request, res: Response) => {
    try {
      const transitions = await lifecycleOrchestrator.getActiveTransitions();
      res.json({
        success: true,
        data: transitions,
      });
    } catch (error) {
      logger.error('Failed to get active transitions', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active transitions',
      });
    }
  });

  // Get transition history
  router.get('/transitions/history', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = await lifecycleOrchestrator.getTransitionHistory(limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get transition history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve transition history',
      });
    }
  });

  // Trigger manual data pruning
  router.post('/prune', async (req: Request, res: Response) => {
    try {
      const deletedCount = await storageManager.pruneExpiredData();

      res.json({
        success: true,
        data: {
          deletedRecords: deletedCount,
        },
      });
    } catch (error) {
      logger.error('Failed to prune data', error);
      res.status(500).json({
        success: false,
        error: 'Failed to prune expired data',
      });
    }
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health = await redis.hgetall('retention:health');

      res.json({
        success: true,
        data: {
          status: health.status || 'unknown',
          lastCheck: health.lastCheck,
          storage: health.storage ? JSON.parse(health.storage) : null,
          pipeline: health.pipeline ? JSON.parse(health.pipeline) : null,
          error: health.error,
        },
      });
    } catch (error) {
      logger.error('Failed to get health status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health status',
      });
    }
  });

  // Optimize storage
  router.post('/optimize', async (req: Request, res: Response) => {
    try {
      await capacityPlanner.optimizeStorage();

      res.json({
        success: true,
        message: 'Storage optimization triggered',
      });
    } catch (error) {
      logger.error('Failed to optimize storage', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger storage optimization',
      });
    }
  });

  return router;
}
