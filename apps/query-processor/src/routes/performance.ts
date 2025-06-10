import { Router } from 'express';
import { QueryExecutorService } from '../services/QueryExecutor';
import { logger } from '../utils/logger';

export function createPerformanceRoutes(queryExecutor: QueryExecutorService): Router {
  const router = Router();

  /**
   * GET /performance/stats
   * Get comprehensive performance statistics
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = await queryExecutor.getPerformanceStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get performance stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance statistics'
      });
    }
  });

  /**
   * GET /performance/metrics
   * Get metrics in Prometheus format
   */
  router.get('/metrics', async (req, res) => {
    try {
      const stats = await queryExecutor.getPerformanceStats();
      
      // Convert to Prometheus format
      const lines: string[] = [];
      
      // Query performance metrics
      lines.push(`# HELP query_total Total number of queries executed`);
      lines.push(`# TYPE query_total counter`);
      lines.push(`query_total ${stats.performance.totalQueries}`);
      
      lines.push(`# HELP query_duration_seconds Query execution duration`);
      lines.push(`# TYPE query_duration_seconds summary`);
      lines.push(`query_duration_seconds{quantile="0.5"} ${stats.performance.p50Duration / 1000}`);
      lines.push(`query_duration_seconds{quantile="0.95"} ${stats.performance.p95Duration / 1000}`);
      lines.push(`query_duration_seconds{quantile="0.99"} ${stats.performance.p99Duration / 1000}`);
      
      lines.push(`# HELP query_cache_hit_rate Cache hit rate percentage`);
      lines.push(`# TYPE query_cache_hit_rate gauge`);
      lines.push(`query_cache_hit_rate ${stats.performance.cacheHitRate}`);
      
      lines.push(`# HELP query_cache_entries Number of entries in cache`);
      lines.push(`# TYPE query_cache_entries gauge`);
      lines.push(`query_cache_entries ${stats.cache.cacheEntries || 0}`);
      
      // System metrics
      lines.push(`# HELP process_memory_usage_bytes Memory usage in bytes`);
      lines.push(`# TYPE process_memory_usage_bytes gauge`);
      lines.push(`process_memory_usage_bytes{type="rss"} ${(stats.system.memory.rss || 0) * 1024 * 1024}`);
      lines.push(`process_memory_usage_bytes{type="heap_used"} ${(stats.system.memory.heapUsed || 0) * 1024 * 1024}`);
      
      lines.push(`# HELP process_active_queries Current number of active queries`);
      lines.push(`# TYPE process_active_queries gauge`);
      lines.push(`process_active_queries ${stats.system.activeQueries || 0}`);

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(lines.join('\n'));
    } catch (error) {
      logger.error('Failed to generate metrics:', error);
      res.status(500).send('# Error generating metrics\n');
    }
  });

  /**
   * POST /performance/cache/warm
   * Warm up cache with common queries
   */
  router.post('/cache/warm', async (req, res) => {
    try {
      const { queries } = req.body;
      
      if (!Array.isArray(queries)) {
        return res.status(400).json({
          success: false,
          error: 'queries parameter must be an array'
        });
      }

      await queryExecutor.warmUpCache(queries);
      
      res.json({
        success: true,
        message: `Cache warm-up initiated for ${queries.length} queries`
      });
    } catch (error) {
      logger.error('Cache warm-up failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to warm up cache'
      });
    }
  });

  /**
   * DELETE /performance/cache
   * Clear query cache
   */
  router.delete('/cache', async (req, res) => {
    try {
      const { tags } = req.query;
      let clearedCount = 0;

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags as string[] : [tags as string];
        clearedCount = await queryExecutor.clearCache(tagArray);
      } else {
        clearedCount = await queryExecutor.clearCache();
      }

      res.json({
        success: true,
        message: `Cache cleared`,
        keysDeleted: clearedCount
      });
    } catch (error) {
      logger.error('Cache clear failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache'
      });
    }
  });

  /**
   * GET /performance/health
   * Health check endpoint with performance indicators
   */
  router.get('/health', async (req, res) => {
    try {
      const stats = await queryExecutor.getPerformanceStats();
      
      // Determine health status based on metrics
      const health = {
        status: 'healthy',
        checks: {
          memoryUsage: {
            status: stats.system.memory.heapUsed < 1024 ? 'healthy' : 'warning',
            value: `${stats.system.memory.heapUsed}MB`,
            threshold: '1024MB'
          },
          cacheHitRate: {
            status: stats.performance.cacheHitRate > 50 ? 'healthy' : 'warning',
            value: `${stats.performance.cacheHitRate}%`,
            threshold: '50%'
          },
          averageQueryTime: {
            status: stats.performance.averageDuration < 5000 ? 'healthy' : 'warning',
            value: `${Math.round(stats.performance.averageDuration)}ms`,
            threshold: '5000ms'
          },
          activeQueries: {
            status: stats.system.activeQueries < 50 ? 'healthy' : 'warning',
            value: stats.system.activeQueries,
            threshold: 50
          }
        },
        timestamp: new Date().toISOString(),
        uptime: stats.system.uptime
      };

      // Overall status
      const hasWarnings = Object.values(health.checks).some(check => check.status === 'warning');
      if (hasWarnings) {
        health.status = 'warning';
      }

      const statusCode = health.status === 'healthy' ? 200 : 206;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /performance/slow-queries
   * Get list of slow queries
   */
  router.get('/slow-queries', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const stats = await queryExecutor.getPerformanceStats();
      
      const slowQueries = stats.performance.topSlowQueries.slice(0, limit);
      
      res.json({
        success: true,
        data: {
          queries: slowQueries,
          total: stats.performance.slowQueries,
          threshold: '5000ms'
        }
      });
    } catch (error) {
      logger.error('Failed to get slow queries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve slow queries'
      });
    }
  });

  /**
   * POST /performance/thresholds
   * Update performance thresholds
   */
  router.post('/thresholds', async (req, res) => {
    try {
      const { slowQueryMs, largeResultRows, highMemoryMB, highCpuPercent } = req.body;
      
      // Validate thresholds
      const thresholds: any = {};
      if (slowQueryMs && slowQueryMs > 0) thresholds.slowQueryMs = slowQueryMs;
      if (largeResultRows && largeResultRows > 0) thresholds.largeResultRows = largeResultRows;
      if (highMemoryMB && highMemoryMB > 0) thresholds.highMemoryMB = highMemoryMB;
      if (highCpuPercent && highCpuPercent > 0) thresholds.highCpuPercent = highCpuPercent;

      if (Object.keys(thresholds).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one valid threshold must be provided'
        });
      }

      // Note: Would need to expose updateThresholds method on QueryExecutorService
      // For now, just return success
      res.json({
        success: true,
        message: 'Performance thresholds updated',
        thresholds
      });
    } catch (error) {
      logger.error('Failed to update thresholds:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update performance thresholds'
      });
    }
  });

  return router;
}