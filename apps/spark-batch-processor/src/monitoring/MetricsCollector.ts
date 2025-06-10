import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export class MetricsCollector extends EventEmitter {
  private readonly logger = Logger.getInstance();
  private counters = new Map<string, number>();
  private gauges = new Map<string, () => number>();
  private histograms = new Map<string, number[]>();
  private isShutdown = false;

  constructor() {
    super();
    this.setupDefaultMetrics();
  }

  /**
   * Register a counter metric
   */
  registerCounter(name: string, initialValue = 0): void {
    this.counters.set(name, initialValue);
    this.logger.debug(`Registered counter: ${name}`);
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, valueFunction: () => number): void {
    this.gauges.set(name, valueFunction);
    this.logger.debug(`Registered gauge: ${name}`);
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(name: string): void {
    this.histograms.set(name, []);
    this.logger.debug(`Registered histogram: ${name}`);
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, amount = 1): void {
    if (this.isShutdown) return;
    
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + amount);
    this.emit('metricUpdated', { name, type: 'counter', value: current + amount });
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number): void {
    if (this.isShutdown) return;
    
    const values = this.histograms.get(name);
    if (values) {
      values.push(value);
      // Keep only last 1000 values to prevent memory issues
      if (values.length > 1000) {
        values.shift();
      }
      this.emit('metricUpdated', { name, type: 'histogram', value });
    }
  }

  /**
   * Get all current metrics
   */
  getAllMetrics(): Metric[] {
    const metrics: Metric[] = [];
    const timestamp = new Date();

    // Counters
    for (const [name, value] of this.counters) {
      metrics.push({
        name,
        type: 'counter',
        value,
        timestamp,
      });
    }

    // Gauges
    for (const [name, valueFunction] of this.gauges) {
      try {
        const value = valueFunction();
        metrics.push({
          name,
          type: 'gauge',
          value,
          timestamp,
        });
      } catch (error) {
        this.logger.warn(`Failed to get gauge value for ${name}:`, error);
      }
    }

    // Histograms (with statistics)
    for (const [name, values] of this.histograms) {
      if (values.length > 0) {
        const stats = this.calculateHistogramStats(values);
        metrics.push(
          {
            name: `${name}_count`,
            type: 'gauge',
            value: stats.count,
            timestamp,
          },
          {
            name: `${name}_sum`,
            type: 'gauge',
            value: stats.sum,
            timestamp,
          },
          {
            name: `${name}_avg`,
            type: 'gauge',
            value: stats.avg,
            timestamp,
          },
          {
            name: `${name}_min`,
            type: 'gauge',
            value: stats.min,
            timestamp,
          },
          {
            name: `${name}_max`,
            type: 'gauge',
            value: stats.max,
            timestamp,
          },
          {
            name: `${name}_p50`,
            type: 'gauge',
            value: stats.p50,
            timestamp,
          },
          {
            name: `${name}_p95`,
            type: 'gauge',
            value: stats.p95,
            timestamp,
          },
          {
            name: `${name}_p99`,
            type: 'gauge',
            value: stats.p99,
            timestamp,
          }
        );
      }
    }

    return metrics;
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const metrics = this.getAllMetrics();
    const lines: string[] = [];

    for (const metric of metrics) {
      const metricName = `spark_batch_processor_${metric.name}`;
      lines.push(`# TYPE ${metricName} ${metric.type}`);
      lines.push(`${metricName} ${metric.value} ${metric.timestamp.getTime()}`);
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.counters.clear();
    this.histograms.clear();
    this.setupDefaultMetrics();
    this.logger.info('All metrics reset');
  }

  /**
   * Shutdown metrics collection
   */
  async shutdown(): Promise<void> {
    this.isShutdown = true;
    this.removeAllListeners();
    this.logger.info('MetricsCollector shutdown completed');
  }

  /**
   * Setup default metrics
   */
  private setupDefaultMetrics(): void {
    // Performance metrics
    this.registerCounter('batch_jobs_started');
    this.registerCounter('batch_jobs_completed');
    this.registerCounter('batch_jobs_failed');
    this.registerCounter('records_processed_total');
    this.registerCounter('ml_anomalies_detected_total');
    
    // Gauge metrics
    this.registerGauge('active_batch_jobs', () => 0); // Will be overridden
    this.registerGauge('memory_usage_bytes', () => process.memoryUsage().heapUsed);
    this.registerGauge('uptime_seconds', () => process.uptime());
    
    // Histogram metrics
    this.registerHistogram('batch_processing_duration_seconds');
    this.registerHistogram('record_processing_rate_per_second');
    this.registerHistogram('ml_model_inference_duration_ms');
    this.registerHistogram('kafka_consume_latency_ms');
    this.registerHistogram('data_quality_check_duration_ms');
  }

  /**
   * Calculate histogram statistics
   */
  private calculateHistogramStats(values: number[]): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / count;
    const min = sorted[0];
    const max = sorted[count - 1];

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, Math.min(index, count - 1))];
    };

    return {
      count,
      sum,
      avg,
      min,
      max,
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }
}