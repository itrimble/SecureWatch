import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface QueryMetrics {
  queryId: string;
  queryType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  rowsReturned?: number;
  bytesProcessed?: number;
  cacheHit: boolean;
  error?: string;
  userId?: string;
  queryHash?: string;
}

interface PerformanceThresholds {
  slowQueryMs: number;
  largeResultRows: number;
  highMemoryMB: number;
  highCpuPercent: number;
}

interface AggregatedMetrics {
  totalQueries: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  slowQueries: number;
  failedQueries: number;
  cacheHitRate: number;
  topSlowQueries: QueryMetrics[];
  queryTypeDistribution: Record<string, number>;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, QueryMetrics> = new Map();
  private completedMetrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 10000;
  private readonly maxSlowQueries = 100;
  private slowQueries: QueryMetrics[] = [];
  
  private thresholds: PerformanceThresholds = {
    slowQueryMs: 5000,
    largeResultRows: 100000,
    highMemoryMB: 1024,
    highCpuPercent: 80
  };

  private intervalId?: NodeJS.Timeout;

  constructor() {
    super();
    this.startPeriodicReporting();
  }

  /**
   * Start tracking a query
   */
  startQuery(queryId: string, queryType: string, userId?: string, queryHash?: string): void {
    const metrics: QueryMetrics = {
      queryId,
      queryType,
      startTime: Date.now(),
      cacheHit: false,
      userId,
      queryHash
    };

    this.metrics.set(queryId, metrics);
    
    logger.info('Query started', {
      queryId,
      queryType,
      userId
    });
  }

  /**
   * Mark query as completed
   */
  endQuery(
    queryId: string, 
    options: {
      rowsReturned?: number;
      bytesProcessed?: number;
      cacheHit?: boolean;
      error?: string;
    } = {}
  ): void {
    const metrics = this.metrics.get(queryId);
    if (!metrics) {
      logger.warn('Attempted to end unknown query', { queryId });
      return;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.rowsReturned = options.rowsReturned;
    metrics.bytesProcessed = options.bytesProcessed;
    metrics.cacheHit = options.cacheHit || false;
    metrics.error = options.error;

    // Check for slow queries
    if (metrics.duration > this.thresholds.slowQueryMs) {
      this.recordSlowQuery(metrics);
      this.emit('slowQuery', metrics);
    }

    // Check for large results
    if (metrics.rowsReturned && metrics.rowsReturned > this.thresholds.largeResultRows) {
      this.emit('largeResult', metrics);
    }

    // Move to completed metrics
    this.completedMetrics.push(metrics);
    this.metrics.delete(queryId);

    // Maintain history size
    if (this.completedMetrics.length > this.maxMetricsHistory) {
      this.completedMetrics.shift();
    }

    logger.info('Query completed', {
      queryId,
      duration: metrics.duration,
      rowsReturned: metrics.rowsReturned,
      cacheHit: metrics.cacheHit,
      error: metrics.error
    });
  }

  /**
   * Mark query as retrieved from cache
   */
  recordCacheHit(queryId: string): void {
    const metrics = this.metrics.get(queryId);
    if (metrics) {
      metrics.cacheHit = true;
    }
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(timeWindowMs: number = 3600000): AggregatedMetrics {
    const now = Date.now();
    const windowStart = now - timeWindowMs;
    
    const recentMetrics = this.completedMetrics.filter(
      m => m.endTime && m.endTime >= windowStart
    );

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowQueries: 0,
        failedQueries: 0,
        cacheHitRate: 0,
        topSlowQueries: [],
        queryTypeDistribution: {}
      };
    }

    // Calculate durations
    const durations = recentMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Calculate other metrics
    const totalQueries = recentMetrics.length;
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowQueries = recentMetrics.filter(m => m.duration! > this.thresholds.slowQueryMs).length;
    const failedQueries = recentMetrics.filter(m => m.error).length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;

    // Query type distribution
    const queryTypeDistribution: Record<string, number> = {};
    recentMetrics.forEach(m => {
      queryTypeDistribution[m.queryType] = (queryTypeDistribution[m.queryType] || 0) + 1;
    });

    // Get top slow queries
    const topSlowQueries = [...this.slowQueries]
      .sort((a, b) => b.duration! - a.duration!)
      .slice(0, 10);

    return {
      totalQueries,
      averageDuration,
      p50Duration: durations[p50Index] || 0,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      slowQueries,
      failedQueries,
      cacheHitRate,
      topSlowQueries,
      queryTypeDistribution
    };
  }

  /**
   * Get currently running queries
   */
  getActiveQueries(): QueryMetrics[] {
    const now = Date.now();
    return Array.from(this.metrics.values()).map(m => ({
      ...m,
      duration: now - m.startTime
    }));
  }

  /**
   * Get system resource metrics
   */
  async getSystemMetrics(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      activeQueries: this.metrics.size
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Performance thresholds updated', this.thresholds);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }

    const metrics = this.getAggregatedMetrics();
    const systemMetrics = this.getSystemMetrics();

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      aggregated: metrics,
      system: systemMetrics,
      thresholds: this.thresholds,
      activeQueries: this.getActiveQueries()
    }, null, 2);
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.completedMetrics = [];
    this.slowQueries = [];
    logger.info('Performance metrics history cleared');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // Private methods

  private recordSlowQuery(metrics: QueryMetrics): void {
    this.slowQueries.push(metrics);
    
    // Keep only recent slow queries
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries = this.slowQueries
        .sort((a, b) => b.endTime! - a.endTime!)
        .slice(0, this.maxSlowQueries);
    }

    logger.warn('Slow query detected', {
      queryId: metrics.queryId,
      duration: metrics.duration,
      queryType: metrics.queryType,
      rowsReturned: metrics.rowsReturned
    });
  }

  private startPeriodicReporting(): void {
    // Report metrics every 60 seconds
    this.intervalId = setInterval(() => {
      const metrics = this.getAggregatedMetrics(60000); // Last minute
      
      logger.info('Performance metrics report', {
        totalQueries: metrics.totalQueries,
        averageDuration: Math.round(metrics.averageDuration),
        p95Duration: Math.round(metrics.p95Duration),
        slowQueries: metrics.slowQueries,
        cacheHitRate: metrics.cacheHitRate.toFixed(2) + '%'
      });
    }, 60000);
  }

  private exportPrometheusMetrics(): string {
    const metrics = this.getAggregatedMetrics();
    const lines: string[] = [];

    // Query metrics
    lines.push(`# HELP query_total Total number of queries executed`);
    lines.push(`# TYPE query_total counter`);
    lines.push(`query_total ${metrics.totalQueries}`);

    lines.push(`# HELP query_duration_seconds Query execution duration`);
    lines.push(`# TYPE query_duration_seconds summary`);
    lines.push(`query_duration_seconds{quantile="0.5"} ${metrics.p50Duration / 1000}`);
    lines.push(`query_duration_seconds{quantile="0.95"} ${metrics.p95Duration / 1000}`);
    lines.push(`query_duration_seconds{quantile="0.99"} ${metrics.p99Duration / 1000}`);

    lines.push(`# HELP query_cache_hit_rate Cache hit rate percentage`);
    lines.push(`# TYPE query_cache_hit_rate gauge`);
    lines.push(`query_cache_hit_rate ${metrics.cacheHitRate}`);

    // Query type distribution
    lines.push(`# HELP query_by_type Number of queries by type`);
    lines.push(`# TYPE query_by_type counter`);
    Object.entries(metrics.queryTypeDistribution).forEach(([type, count]) => {
      lines.push(`query_by_type{type="${type}"} ${count}`);
    });

    return lines.join('\n');
  }
}