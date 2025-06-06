/**
 * SecureWatch Health Management Framework
 * 
 * This framework provides comprehensive health checking for microservices,
 * including dependency validation, resource monitoring, and graceful degradation.
 * 
 * @author SecureWatch Team
 * @version 1.0.0
 */

import { Express, Request, Response } from 'express';
import { createClient } from 'redis';
import { Pool } from 'pg';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  timestamp: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  dependencies: HealthCheckResult[];
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      percentage: number;
    };
  };
}

export type HealthCheck = () => Promise<HealthCheckResult>;

export class HealthManager {
  private checks: Map<string, HealthCheck> = new Map();
  private dependencies: Map<string, HealthCheck> = new Map();
  private startTime: number;
  private serviceName: string;
  private serviceVersion: string;

  constructor(serviceName: string, serviceVersion: string = '1.0.0') {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.startTime = Date.now();
  }

  /**
   * Register a health check for an internal component
   */
  registerCheck(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  /**
   * Register a health check for an external dependency
   */
  registerDependency(name: string, check: HealthCheck): void {
    this.dependencies.set(name, check);
  }

  /**
   * Execute all health checks and return comprehensive status
   */
  async getHealthReport(): Promise<SystemHealthReport> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    // Execute all checks in parallel
    const [checkResults, dependencyResults] = await Promise.all([
      this.executeChecks(this.checks),
      this.executeChecks(this.dependencies)
    ]);

    // Get system resources
    const resources = await this.getSystemResources();

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checkResults, dependencyResults);

    return {
      status: overallStatus,
      service: this.serviceName,
      version: this.serviceVersion,
      timestamp,
      uptime,
      checks: checkResults,
      dependencies: dependencyResults,
      resources
    };
  }

  /**
   * Execute a collection of health checks
   */
  private async executeChecks(checks: Map<string, HealthCheck>): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [name, check] of checks) {
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          check(),
          this.createTimeoutPromise(name, 5000) // 5 second timeout
        ]);
        
        results.push({
          ...result,
          responseTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * Create a timeout promise for health checks
   */
  private createTimeoutPromise(checkName: string, timeoutMs: number): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check '${checkName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Get system resource usage
   */
  private async getSystemResources(): Promise<SystemHealthReport['resources']> {
    const memUsage = process.memoryUsage();
    
    // Simple CPU usage estimation (not perfect but useful for basic monitoring)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage approximation

    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        percentage: Math.min(cpuPercent, 100) // Cap at 100%
      }
    };
  }

  /**
   * Determine overall system status based on individual check results
   */
  private determineOverallStatus(
    checks: HealthCheckResult[], 
    dependencies: HealthCheckResult[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const allResults = [...checks, ...dependencies];
    
    const unhealthyCount = allResults.filter(r => r.status === 'unhealthy').length;
    const degradedCount = allResults.filter(r => r.status === 'degraded').length;

    // If any core service checks are unhealthy, system is unhealthy
    const coreUnhealthy = checks.some(r => r.status === 'unhealthy');
    if (coreUnhealthy) return 'unhealthy';

    // If more than 50% of dependencies are unhealthy, system is unhealthy
    if (dependencies.length > 0 && (unhealthyCount / dependencies.length) > 0.5) {
      return 'unhealthy';
    }

    // If any checks are degraded or some dependencies are unhealthy, system is degraded
    if (degradedCount > 0 || unhealthyCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Setup Express health endpoints
   */
  setupHealthEndpoints(app: Express): void {
    // Detailed health endpoint
    app.get('/health', async (req: Request, res: Response) => {
      try {
        const report = await this.getHealthReport();
        const statusCode = this.getHttpStatusCode(report.status);
        res.status(statusCode).json(report);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          service: this.serviceName,
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Simple readiness probe
    app.get('/health/ready', async (req: Request, res: Response) => {
      try {
        const report = await this.getHealthReport();
        if (report.status === 'unhealthy') {
          res.status(503).json({ ready: false, status: report.status });
        } else {
          res.status(200).json({ ready: true, status: report.status });
        }
      } catch (error) {
        res.status(503).json({ ready: false, error: 'Health check failed' });
      }
    });

    // Simple liveness probe
    app.get('/health/live', (req: Request, res: Response) => {
      res.status(200).json({ 
        alive: true, 
        service: this.serviceName,
        uptime: Date.now() - this.startTime 
      });
    });
  }

  /**
   * Convert health status to appropriate HTTP status code
   */
  private getHttpStatusCode(status: string): number {
    switch (status) {
      case 'healthy': return 200;
      case 'degraded': return 200; // Still operational
      case 'unhealthy': return 503;
      default: return 500;
    }
  }

  // =============================================================================
  // COMMON HEALTH CHECK IMPLEMENTATIONS
  // =============================================================================

  /**
   * Create a PostgreSQL health check
   */
  static createPostgreSQLCheck(pool: Pool): HealthCheck {
    return async (): Promise<HealthCheckResult> => {
      try {
        const start = Date.now();
        const result = await pool.query('SELECT 1 as health_check');
        const responseTime = Date.now() - start;

        return {
          name: 'postgresql',
          status: 'healthy',
          message: 'Database connection successful',
          timestamp: new Date().toISOString(),
          metadata: {
            responseTime,
            totalConnections: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingConnections: pool.waitingCount
          }
        };
      } catch (error) {
        return {
          name: 'postgresql',
          status: 'unhealthy',
          message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  /**
   * Create a Redis health check
   */
  static createRedisCheck(redisClient: any): HealthCheck {
    return async (): Promise<HealthCheckResult> => {
      try {
        const start = Date.now();
        await redisClient.ping();
        const responseTime = Date.now() - start;

        return {
          name: 'redis',
          status: 'healthy',
          message: 'Redis connection successful',
          timestamp: new Date().toISOString(),
          metadata: {
            responseTime,
            status: redisClient.status
          }
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'unhealthy',
          message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  /**
   * Create an HTTP service health check
   */
  static createHttpServiceCheck(serviceName: string, url: string, timeout: number = 5000): HealthCheck {
    return async (): Promise<HealthCheckResult> => {
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          method: 'GET'
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - start;

        if (response.ok) {
          return {
            name: serviceName,
            status: 'healthy',
            message: `Service ${serviceName} is responding`,
            timestamp: new Date().toISOString(),
            metadata: {
              responseTime,
              statusCode: response.status,
              url
            }
          };
        } else {
          return {
            name: serviceName,
            status: 'degraded',
            message: `Service ${serviceName} returned ${response.status}`,
            timestamp: new Date().toISOString(),
            metadata: {
              responseTime,
              statusCode: response.status,
              url
            }
          };
        }
      } catch (error) {
        return {
          name: serviceName,
          status: 'unhealthy',
          message: `Service ${serviceName} is not reachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          metadata: { url }
        };
      }
    };
  }

  /**
   * Create a memory usage health check
   */
  static createMemoryCheck(thresholdPercent: number = 90): HealthCheck {
    return async (): Promise<HealthCheckResult> => {
      const memUsage = process.memoryUsage();
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Memory usage: ${usagePercent.toFixed(1)}%`;

      if (usagePercent > thresholdPercent) {
        status = 'unhealthy';
        message = `High memory usage: ${usagePercent.toFixed(1)}% (threshold: ${thresholdPercent}%)`;
      } else if (usagePercent > thresholdPercent * 0.8) {
        status = 'degraded';
        message = `Elevated memory usage: ${usagePercent.toFixed(1)}%`;
      }

      return {
        name: 'memory',
        status,
        message,
        timestamp: new Date().toISOString(),
        metadata: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          usagePercent: usagePercent,
          rss: memUsage.rss,
          external: memUsage.external
        }
      };
    };
  }
}

// =============================================================================
// EXAMPLE IMPLEMENTATION FOR CORRELATION ENGINE
// =============================================================================

/*
// Example implementation in apps/correlation-engine/src/index.ts

import express from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { HealthManager } from '../../../health_framework';

const app = express();
const port = process.env.PORT || 4005;

// Initialize database connections
const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Initialize health manager
const healthManager = new HealthManager('correlation-engine', '1.0.0');

// Register internal health checks
healthManager.registerCheck('correlation-rules', async () => {
  try {
    const result = await dbPool.query('SELECT COUNT(*) FROM correlation_rules WHERE active = true');
    const activeRules = parseInt(result.rows[0].count);
    
    return {
      name: 'correlation-rules',
      status: activeRules > 0 ? 'healthy' : 'degraded',
      message: `${activeRules} active correlation rules`,
      timestamp: new Date().toISOString(),
      metadata: { activeRules }
    };
  } catch (error) {
    throw new Error(`Failed to check correlation rules: ${error}`);
  }
});

healthManager.registerCheck('incident-processing', async () => {
  try {
    const result = await dbPool.query(`
      SELECT COUNT(*) FROM incidents 
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    const recentIncidents = parseInt(result.rows[0].count);
    
    return {
      name: 'incident-processing',
      status: 'healthy',
      message: `${recentIncidents} incidents in last 5 minutes`,
      timestamp: new Date().toISOString(),
      metadata: { recentIncidents }
    };
  } catch (error) {
    throw new Error(`Failed to check incident processing: ${error}`);
  }
});

// Register dependency checks
healthManager.registerDependency('database', HealthManager.createPostgreSQLCheck(dbPool));
healthManager.registerDependency('redis', HealthManager.createRedisCheck(redisClient));
healthManager.registerDependency('log-ingestion', 
  HealthManager.createHttpServiceCheck('log-ingestion', 'http://log-ingestion:4002/health')
);
healthManager.registerDependency('search-api', 
  HealthManager.createHttpServiceCheck('search-api', 'http://search-api:4004/health')
);

// Register memory monitoring
healthManager.registerCheck('memory', HealthManager.createMemoryCheck(85));

// Setup health endpoints
healthManager.setupHealthEndpoints(app);

// Your correlation engine routes here...
app.get('/api/rules', (req, res) => {
  // Your correlation rules logic
});

app.get('/api/incidents', (req, res) => {
  // Your incidents logic  
});

// Start server
app.listen(port, () => {
  console.log(`🔄 Correlation Engine running on port ${port}`);
  console.log(`📊 Health endpoint available at http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down correlation engine gracefully...');
  await dbPool.end();
  await redisClient.quit();
  process.exit(0);
});

export { healthManager };
*/