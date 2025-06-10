import * as cron from 'node-cron';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { StorageManager } from './storage-manager';
import { PipelineMonitor } from './pipeline-monitor';
import { CapacityPlanner } from './capacity-planner';
import { StorageTier, LifecycleTransition } from '../types';
import { DEFAULT_RETENTION_POLICIES } from '../config/retention-policies';

export class LifecycleOrchestrator {
  private storageManager: StorageManager;
  private pipelineMonitor: PipelineMonitor;
  private capacityPlanner: CapacityPlanner;
  private pgPool: Pool;
  private redis: Redis;
  private logger: Logger;
  private activeTransitions: Map<string, LifecycleTransition> = new Map();

  constructor(pgPool: Pool, redis: Redis, logger: Logger) {
    this.pgPool = pgPool;
    this.redis = redis;
    this.logger = logger;

    this.storageManager = new StorageManager(pgPool, logger);
    this.pipelineMonitor = new PipelineMonitor(pgPool, redis, logger);
    this.capacityPlanner = new CapacityPlanner(pgPool, logger);

    this.initializeScheduledJobs();
  }

  private initializeScheduledJobs() {
    // Hourly tier migration check
    cron.schedule('0 * * * *', () => {
      this.logger.info('Running hourly tier migration check');
      this.checkAndMigrateTiers();
    });

    // Daily data pruning
    cron.schedule('0 2 * * *', () => {
      this.logger.info('Running daily data pruning');
      this.pruneExpiredData();
    });

    // Daily capacity planning
    cron.schedule('0 3 * * *', () => {
      this.logger.info('Running daily capacity planning');
      this.runCapacityPlanning();
    });

    // Every 6 hours: storage optimization
    cron.schedule('0 */6 * * *', () => {
      this.logger.info('Running storage optimization');
      this.optimizeStorage();
    });

    // Every 5 minutes: health check
    cron.schedule('*/5 * * * *', () => {
      this.performHealthCheck();
    });
  }

  private async checkAndMigrateTiers() {
    try {
      // Check each tier for data ready to migrate
      const transitions = [
        { from: StorageTier.HOT, to: StorageTier.WARM },
        { from: StorageTier.WARM, to: StorageTier.COLD },
        { from: StorageTier.COLD, to: StorageTier.FROZEN },
      ];

      for (const { from, to } of transitions) {
        const eligibleData = await this.getEligibleDataForMigration(from, to);

        if (eligibleData.sizeBytes > 0) {
          await this.executeMigration(from, to, eligibleData);
        }
      }
    } catch (error) {
      this.logger.error('Tier migration check failed', error);
    }
  }

  private async getEligibleDataForMigration(
    fromTier: StorageTier,
    toTier: StorageTier
  ): Promise<{ recordCount: number; sizeBytes: number; chunks: string[] }> {
    const toPolicy = DEFAULT_RETENTION_POLICIES[toTier];

    const query = `
      SELECT 
        COUNT(*) as record_count,
        SUM(total_size_bytes) as size_bytes,
        ARRAY_AGG(chunk_name) as chunks
      FROM timescaledb_information.chunks
      WHERE hypertable_name = 'log_events_${fromTier}'
      AND range_end < NOW() - INTERVAL '${toPolicy.minAge} days'
    `;

    const result = await this.pgPool.query(query);
    const row = result.rows[0];

    return {
      recordCount: parseInt(row.record_count || '0'),
      sizeBytes: parseInt(row.size_bytes || '0'),
      chunks: row.chunks || [],
    };
  }

  private async executeMigration(
    fromTier: StorageTier,
    toTier: StorageTier,
    data: { recordCount: number; sizeBytes: number; chunks: string[] }
  ): Promise<void> {
    const transitionId = `${fromTier}-${toTier}-${Date.now()}`;
    const transition: LifecycleTransition = {
      id: transitionId,
      fromTier,
      toTier,
      recordCount: data.recordCount,
      sizeBytes: data.sizeBytes,
      startTime: new Date(),
      status: 'pending',
    };

    this.activeTransitions.set(transitionId, transition);

    try {
      // Update status
      transition.status = 'in_progress';
      await this.updateTransitionStatus(transition);

      // Check system load before migration
      const canProceed = await this.checkSystemLoad();
      if (!canProceed) {
        this.logger.warn('System load too high, postponing migration', {
          transitionId,
          fromTier,
          toTier,
        });
        transition.status = 'pending';
        return;
      }

      // Execute migration
      await this.storageManager.migrateData(fromTier, toTier);

      // Update status
      transition.status = 'completed';
      transition.endTime = new Date();

      this.logger.info('Migration completed successfully', {
        transitionId,
        duration: transition.endTime.getTime() - transition.startTime.getTime(),
        recordCount: data.recordCount,
        sizeBytes: data.sizeBytes,
      });
    } catch (error) {
      transition.status = 'failed';
      transition.error =
        error instanceof Error ? error.message : 'Unknown error';
      transition.endTime = new Date();

      this.logger.error('Migration failed', {
        transitionId,
        error,
      });
    } finally {
      await this.updateTransitionStatus(transition);
      this.activeTransitions.delete(transitionId);
    }
  }

  private async checkSystemLoad(): Promise<boolean> {
    const metrics = await this.pipelineMonitor.getMetrics();

    // Don't migrate if:
    // - Backpressure is high
    // - Error rate is elevated
    // - CPU usage is high

    if (metrics.backpressure.level > 0.8) {
      return false;
    }

    if (metrics.errors.rate > 5) {
      // 5% error rate
      return false;
    }

    // Check CPU usage
    const cpuUsage = await this.redis.get('system:cpu:usage');
    if (cpuUsage && parseFloat(cpuUsage) > 0.8) {
      return false;
    }

    return true;
  }

  private async updateTransitionStatus(transition: LifecycleTransition) {
    await this.redis.hset(
      'lifecycle:transitions',
      transition.id,
      JSON.stringify({
        ...transition,
        lastUpdated: new Date(),
      })
    );
  }

  private async pruneExpiredData() {
    try {
      const deletedCount = await this.storageManager.pruneExpiredData();

      this.logger.info('Data pruning completed', {
        deletedRecords: deletedCount,
      });

      // Update metrics
      await this.redis.hincrby(
        'retention:metrics',
        'total_pruned',
        deletedCount
      );
    } catch (error) {
      this.logger.error('Data pruning failed', error);
    }
  }

  private async runCapacityPlanning() {
    try {
      const projections = await this.capacityPlanner.projectCapacity(90);

      // Store projections in Redis for dashboard access
      await this.redis.set(
        'capacity:projections',
        JSON.stringify(projections),
        'EX',
        86400 // 24 hours
      );

      // Check for critical conditions
      for (const projection of projections) {
        if (projection.daysUntilFull > 0 && projection.daysUntilFull < 7) {
          this.logger.error('Critical storage condition', {
            tier: projection.tier,
            daysUntilFull: projection.daysUntilFull,
            currentUsageGB: projection.currentUsageGB,
          });

          // Send critical alert
          await this.sendCriticalAlert('storage_full', {
            tier: projection.tier,
            daysUntilFull: projection.daysUntilFull,
          });
        }
      }
    } catch (error) {
      this.logger.error('Capacity planning failed', error);
    }
  }

  private async optimizeStorage() {
    try {
      await this.capacityPlanner.optimizeStorage();

      // Run compression optimization
      await this.optimizeCompression();

      // Clean up old transitions
      await this.cleanupOldTransitions();
    } catch (error) {
      this.logger.error('Storage optimization failed', error);
    }
  }

  private async optimizeCompression() {
    // Check if we should adjust compression based on CPU usage
    const cpuUsage = await this.redis.get('system:cpu:usage');
    if (!cpuUsage) return;

    const cpu = parseFloat(cpuUsage);

    // Reduce compression if CPU is high
    if (cpu > 0.8) {
      this.logger.warn('High CPU usage, reducing compression levels');
      // Implement compression adjustment logic
    }
  }

  private async cleanupOldTransitions() {
    const transitions = await this.redis.hgetall('lifecycle:transitions');
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [id, data] of Object.entries(transitions)) {
      const transition = JSON.parse(data);
      const age = now - new Date(transition.startTime).getTime();

      if (age > maxAge) {
        await this.redis.hdel('lifecycle:transitions', id);
      }
    }
  }

  private async performHealthCheck() {
    try {
      // Get storage stats
      const storageStats = await this.storageManager.getStorageStats();

      // Get pipeline metrics
      const pipelineMetrics = await this.pipelineMonitor.getMetrics();

      // Update health status in Redis
      await this.redis.hset('retention:health', 'status', 'healthy');
      await this.redis.hset(
        'retention:health',
        'lastCheck',
        new Date().toISOString()
      );
      await this.redis.hset(
        'retention:health',
        'storage',
        JSON.stringify(storageStats)
      );
      await this.redis.hset(
        'retention:health',
        'pipeline',
        JSON.stringify(pipelineMetrics)
      );

      // Check for issues
      if (pipelineMetrics.errors.rate > 10) {
        await this.redis.hset('retention:health', 'status', 'degraded');
      }
    } catch (error) {
      this.logger.error('Health check failed', error);
      await this.redis.hset('retention:health', 'status', 'unhealthy');
      await this.redis.hset(
        'retention:health',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async sendCriticalAlert(type: string, data: any) {
    // Implement critical alert logic
    const webhook = process.env.CRITICAL_ALERT_WEBHOOK;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString(),
            severity: 'critical',
          }),
        });
      } catch (error) {
        this.logger.error('Failed to send critical alert', error);
      }
    }
  }

  async getActiveTransitions(): Promise<LifecycleTransition[]> {
    return Array.from(this.activeTransitions.values());
  }

  async getTransitionHistory(
    limit: number = 100
  ): Promise<LifecycleTransition[]> {
    const transitions = await this.redis.hgetall('lifecycle:transitions');

    return Object.values(transitions)
      .map((data) => JSON.parse(data))
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      .slice(0, limit);
  }
}
