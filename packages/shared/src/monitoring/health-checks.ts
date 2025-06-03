/**
 * SecureWatch Health Check System
 * Comprehensive health monitoring for all services
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { Kafka } from 'kafkajs';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import * as os from 'os';
import * as fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Health Check Status
export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN'
}

// Health Check Component
export interface HealthComponent {
  name: string;
  status: HealthStatus;
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
}

// Health Check Result
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  components: HealthComponent[];
  metrics?: SystemMetrics;
}

// System Metrics
export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network?: {
    connections: number;
    bandwidth?: {
      in: number;
      out: number;
    };
  };
}

// Health Check Configuration
export interface HealthCheckConfig {
  serviceName: string;
  serviceVersion: string;
  includeMetrics?: boolean;
  checks?: {
    database?: boolean;
    redis?: boolean;
    kafka?: boolean;
    elasticsearch?: boolean;
    custom?: Array<() => Promise<HealthComponent>>;
  };
  thresholds?: {
    responseTime?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };
}

// Health Check Service
export class HealthCheckService {
  private config: HealthCheckConfig;
  private startTime: Date;
  private dbPool?: Pool;
  private redisClient?: any;
  private kafkaClient?: Kafka;
  private esClient?: ElasticsearchClient;

  constructor(config: HealthCheckConfig) {
    this.config = {
      includeMetrics: true,
      checks: {
        database: true,
        redis: true,
        kafka: true,
        elasticsearch: true,
      },
      thresholds: {
        responseTime: 5000, // 5 seconds
        cpuUsage: 80, // 80%
        memoryUsage: 90, // 90%
        diskUsage: 90, // 90%
      },
      ...config,
    };
    this.startTime = new Date();
  }

  /**
   * Set database connection for health checks
   */
  setDatabasePool(pool: Pool): void {
    this.dbPool = pool;
  }

  /**
   * Set Redis client for health checks
   */
  setRedisClient(client: any): void {
    this.redisClient = client;
  }

  /**
   * Set Kafka client for health checks
   */
  setKafkaClient(client: Kafka): void {
    this.kafkaClient = client;
  }

  /**
   * Set Elasticsearch client for health checks
   */
  setElasticsearchClient(client: ElasticsearchClient): void {
    this.esClient = client;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const components: HealthComponent[] = [];
    let overallStatus = HealthStatus.UP;

    // Check database
    if (this.config.checks?.database && this.dbPool) {
      const dbHealth = await this.checkDatabase();
      components.push(dbHealth);
      if (dbHealth.status !== HealthStatus.UP) {
        overallStatus = this.downgradeStatus(overallStatus, dbHealth.status);
      }
    }

    // Check Redis
    if (this.config.checks?.redis && this.redisClient) {
      const redisHealth = await this.checkRedis();
      components.push(redisHealth);
      if (redisHealth.status !== HealthStatus.UP) {
        overallStatus = this.downgradeStatus(overallStatus, redisHealth.status);
      }
    }

    // Check Kafka
    if (this.config.checks?.kafka && this.kafkaClient) {
      const kafkaHealth = await this.checkKafka();
      components.push(kafkaHealth);
      if (kafkaHealth.status !== HealthStatus.UP) {
        overallStatus = this.downgradeStatus(overallStatus, kafkaHealth.status);
      }
    }

    // Check Elasticsearch
    if (this.config.checks?.elasticsearch && this.esClient) {
      const esHealth = await this.checkElasticsearch();
      components.push(esHealth);
      if (esHealth.status !== HealthStatus.UP) {
        overallStatus = this.downgradeStatus(overallStatus, esHealth.status);
      }
    }

    // Run custom checks
    if (this.config.checks?.custom) {
      for (const customCheck of this.config.checks.custom) {
        try {
          const result = await customCheck();
          components.push(result);
          if (result.status !== HealthStatus.UP) {
            overallStatus = this.downgradeStatus(overallStatus, result.status);
          }
        } catch (error) {
          components.push({
            name: 'custom',
            status: HealthStatus.DOWN,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          overallStatus = HealthStatus.DOWN;
        }
      }
    }

    // Get system metrics
    let metrics: SystemMetrics | undefined;
    if (this.config.includeMetrics) {
      metrics = await this.getSystemMetrics();
      
      // Check thresholds
      if (metrics.cpu.usage > (this.config.thresholds?.cpuUsage || 80)) {
        overallStatus = this.downgradeStatus(overallStatus, HealthStatus.DEGRADED);
        components.push({
          name: 'cpu',
          status: HealthStatus.DEGRADED,
          details: { usage: metrics.cpu.usage, threshold: this.config.thresholds?.cpuUsage },
        });
      }

      if (metrics.memory.percentage > (this.config.thresholds?.memoryUsage || 90)) {
        overallStatus = this.downgradeStatus(overallStatus, HealthStatus.DEGRADED);
        components.push({
          name: 'memory',
          status: HealthStatus.DEGRADED,
          details: { usage: metrics.memory.percentage, threshold: this.config.thresholds?.memoryUsage },
        });
      }

      if (metrics.disk.percentage > (this.config.thresholds?.diskUsage || 90)) {
        overallStatus = this.downgradeStatus(overallStatus, HealthStatus.DEGRADED);
        components.push({
          name: 'disk',
          status: HealthStatus.DEGRADED,
          details: { usage: metrics.disk.percentage, threshold: this.config.thresholds?.diskUsage },
        });
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      uptime: Date.now() - this.startTime.getTime(),
      components,
      metrics,
    };
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthComponent> {
    const start = Date.now();
    try {
      if (!this.dbPool) {
        throw new Error('Database pool not configured');
      }

      const client = await this.dbPool.connect();
      try {
        const result = await client.query('SELECT 1');
        const responseTime = Date.now() - start;

        return {
          name: 'database',
          status: responseTime < (this.config.thresholds?.responseTime || 5000) 
            ? HealthStatus.UP 
            : HealthStatus.DEGRADED,
          responseTime,
          details: {
            connected: true,
            poolSize: this.dbPool.totalCount,
            idleConnections: this.dbPool.idleCount,
            waitingClients: this.dbPool.waitingCount,
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<HealthComponent> {
    const start = Date.now();
    try {
      if (!this.redisClient) {
        throw new Error('Redis client not configured');
      }

      await this.redisClient.ping();
      const info = await this.redisClient.info();
      const responseTime = Date.now() - start;

      // Parse Redis info
      const infoLines = info.split('\r\n');
      const infoObj: Record<string, string> = {};
      for (const line of infoLines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoObj[key] = value;
        }
      }

      return {
        name: 'redis',
        status: responseTime < (this.config.thresholds?.responseTime || 5000) 
          ? HealthStatus.UP 
          : HealthStatus.DEGRADED,
        responseTime,
        details: {
          connected: true,
          version: infoObj.redis_version,
          usedMemory: infoObj.used_memory_human,
          connectedClients: parseInt(infoObj.connected_clients || '0'),
          uptime: parseInt(infoObj.uptime_in_seconds || '0'),
        },
      };
    } catch (error) {
      return {
        name: 'redis',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Kafka health
   */
  private async checkKafka(): Promise<HealthComponent> {
    const start = Date.now();
    try {
      if (!this.kafkaClient) {
        throw new Error('Kafka client not configured');
      }

      const admin = this.kafkaClient.admin();
      await admin.connect();
      
      try {
        const clusterInfo = await admin.describeCluster();
        const topics = await admin.listTopics();
        const responseTime = Date.now() - start;

        return {
          name: 'kafka',
          status: responseTime < (this.config.thresholds?.responseTime || 5000) 
            ? HealthStatus.UP 
            : HealthStatus.DEGRADED,
          responseTime,
          details: {
            connected: true,
            clusterId: clusterInfo.clusterId,
            brokers: clusterInfo.brokers.length,
            controller: clusterInfo.controller,
            topics: topics.length,
          },
        };
      } finally {
        await admin.disconnect();
      }
    } catch (error) {
      return {
        name: 'kafka',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Elasticsearch health
   */
  private async checkElasticsearch(): Promise<HealthComponent> {
    const start = Date.now();
    try {
      if (!this.esClient) {
        throw new Error('Elasticsearch client not configured');
      }

      const health = await this.esClient.cluster.health();
      const stats = await this.esClient.cluster.stats();
      const responseTime = Date.now() - start;

      const status = health.status === 'green' 
        ? HealthStatus.UP 
        : health.status === 'yellow' 
          ? HealthStatus.DEGRADED 
          : HealthStatus.DOWN;

      return {
        name: 'elasticsearch',
        status,
        responseTime,
        details: {
          clusterName: health.cluster_name,
          clusterStatus: health.status,
          numberOfNodes: health.number_of_nodes,
          numberOfDataNodes: health.number_of_data_nodes,
          activePrimaryShards: health.active_primary_shards,
          activeShards: health.active_shards,
          relocatingShards: health.relocating_shards,
          initializingShards: health.initializing_shards,
          unassignedShards: health.unassigned_shards,
          indices: stats.indices.count,
          documents: stats.indices.docs.count,
          storageSize: stats.indices.store.size_in_bytes,
        },
      };
    } catch (error) {
      return {
        name: 'elasticsearch',
        status: HealthStatus.DOWN,
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCPUUsage();
    const memoryInfo = this.getMemoryInfo();
    const diskInfo = await this.getDiskInfo();
    const networkInfo = await this.getNetworkInfo();

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
      },
      memory: memoryInfo,
      disk: diskInfo,
      network: networkInfo,
    };
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => 
      acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0
    );

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor(100 * idle / total);

    return usage;
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): SystemMetrics['memory'] {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentage: Math.round((usedMem / totalMem) * 100),
    };
  }

  /**
   * Get disk information
   */
  private async getDiskInfo(): Promise<SystemMetrics['disk']> {
    try {
      const { stdout } = await execAsync('df -k / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      const free = parseInt(parts[3]) * 1024;
      const percentage = parseInt(parts[4]);

      return { total, used, free, percentage };
    } catch (error) {
      return { total: 0, used: 0, free: 0, percentage: 0 };
    }
  }

  /**
   * Get network information
   */
  private async getNetworkInfo(): Promise<SystemMetrics['network']> {
    try {
      const { stdout } = await execAsync('netstat -an | wc -l');
      const connections = parseInt(stdout.trim()) || 0;

      return { connections };
    } catch (error) {
      return { connections: 0 };
    }
  }

  /**
   * Downgrade health status
   */
  private downgradeStatus(current: HealthStatus, new_: HealthStatus): HealthStatus {
    const priority = {
      [HealthStatus.DOWN]: 0,
      [HealthStatus.DEGRADED]: 1,
      [HealthStatus.UNKNOWN]: 2,
      [HealthStatus.UP]: 3,
    };

    return priority[new_] < priority[current] ? new_ : current;
  }
}

// Express middleware for health checks
export function healthCheckMiddleware(service: HealthCheckService) {
  return async (req: Request, res: Response) => {
    try {
      const result = await service.performHealthCheck();
      const statusCode = result.status === HealthStatus.UP ? 200 : 503;
      
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: HealthStatus.DOWN,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

// Liveness probe middleware (simple check)
export function livenessProbeMiddleware() {
  return (req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
  };
}

// Readiness probe middleware
export function readinessProbeMiddleware(service: HealthCheckService) {
  return async (req: Request, res: Response) => {
    try {
      const result = await service.performHealthCheck();
      
      if (result.status === HealthStatus.UP || result.status === HealthStatus.DEGRADED) {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready' });
    }
  };
}

// Export health check factory
export function createHealthCheck(config: HealthCheckConfig): HealthCheckService {
  return new HealthCheckService(config);
}