import { Pool } from 'pg';
import Redis from 'ioredis';
import { Registry, Counter, Gauge, Histogram, register } from 'prom-client';
import { Logger } from 'winston';
import { PipelineMetrics, AlertRule } from '../types';
import { ALERT_THRESHOLDS } from '../config/retention-policies';

export class PipelineMonitor {
  private pgPool: Pool;
  private redis: Redis;
  private logger: Logger;
  private registry: Registry;

  // Prometheus metrics
  private throughputGauge: Gauge;
  private latencyHistogram: Histogram;
  private errorCounter: Counter;
  private backpressureGauge: Gauge;
  private queueDepthGauge: Gauge;

  // Alert state tracking
  private alertStates: Map<
    string,
    {
      triggered: boolean;
      triggeredAt?: Date;
      value: number;
    }
  > = new Map();

  constructor(pgPool: Pool, redis: Redis, logger: Logger) {
    this.pgPool = pgPool;
    this.redis = redis;
    this.logger = logger;
    this.registry = new Registry();

    this.initializeMetrics();
    this.startMonitoring();
  }

  private initializeMetrics() {
    // Throughput metric
    this.throughputGauge = new Gauge({
      name: 'pipeline_throughput_events_per_second',
      help: 'Current pipeline throughput in events per second',
      labelNames: ['pipeline', 'stage'],
      registers: [this.registry],
    });

    // Latency histogram
    this.latencyHistogram = new Histogram({
      name: 'pipeline_latency_milliseconds',
      help: 'Pipeline processing latency',
      labelNames: ['pipeline', 'stage'],
      buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry],
    });

    // Error counter
    this.errorCounter = new Counter({
      name: 'pipeline_errors_total',
      help: 'Total pipeline errors',
      labelNames: ['pipeline', 'stage', 'error_type'],
      registers: [this.registry],
    });

    // Backpressure gauge
    this.backpressureGauge = new Gauge({
      name: 'pipeline_backpressure_level',
      help: 'Current backpressure level (0-1)',
      labelNames: ['pipeline'],
      registers: [this.registry],
    });

    // Queue depth gauge
    this.queueDepthGauge = new Gauge({
      name: 'pipeline_queue_depth',
      help: 'Current queue depth',
      labelNames: ['pipeline', 'queue'],
      registers: [this.registry],
    });
  }

  private startMonitoring() {
    // Collect metrics every 10 seconds
    setInterval(() => this.collectMetrics(), 10000);

    // Check alerts every 30 seconds
    setInterval(() => this.checkAlerts(), 30000);
  }

  private async collectMetrics() {
    try {
      // Collect Kafka metrics
      await this.collectKafkaMetrics();

      // Collect processing metrics
      await this.collectProcessingMetrics();

      // Collect system metrics
      await this.collectSystemMetrics();

      // Collect custom application metrics
      await this.collectApplicationMetrics();
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
    }
  }

  private async collectKafkaMetrics() {
    // Get Kafka consumer lag from Redis (set by consumers)
    const lag = await this.redis.get('kafka:consumer:lag');
    if (lag) {
      this.backpressureGauge.set(
        { pipeline: 'kafka' },
        parseInt(lag) / 1000000
      ); // Normalize to 0-1
    }

    // Get throughput from Redis
    const throughput = await this.redis.get('kafka:throughput:current');
    if (throughput) {
      this.throughputGauge.set(
        { pipeline: 'kafka', stage: 'ingestion' },
        parseInt(throughput)
      );
    }
  }

  private async collectProcessingMetrics() {
    // Query processing metrics from TimescaleDB
    const query = `
      SELECT 
        pipeline_stage,
        COUNT(*) / 60 as throughput,
        AVG(processing_time_ms) as avg_latency,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_latency,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms) as p99_latency,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
      FROM pipeline_metrics
      WHERE timestamp > NOW() - INTERVAL '1 minute'
      GROUP BY pipeline_stage
    `;

    const result = await this.pgPool.query(query);

    for (const row of result.rows) {
      // Update throughput
      this.throughputGauge.set(
        { pipeline: 'processing', stage: row.pipeline_stage },
        row.throughput
      );

      // Update latency
      this.latencyHistogram.observe(
        { pipeline: 'processing', stage: row.pipeline_stage },
        row.avg_latency
      );

      // Update errors
      if (row.error_count > 0) {
        this.errorCounter.inc(
          {
            pipeline: 'processing',
            stage: row.pipeline_stage,
            error_type: 'generic',
          },
          row.error_count
        );
      }
    }
  }

  private async collectSystemMetrics() {
    // Get buffer metrics from Redis
    const bufferMetrics = await this.redis.hgetall('buffer:metrics');

    if (bufferMetrics.memoryUsed && bufferMetrics.memoryTotal) {
      const usage =
        parseInt(bufferMetrics.memoryUsed) /
        parseInt(bufferMetrics.memoryTotal);
      this.backpressureGauge.set({ pipeline: 'buffer' }, usage);
    }

    if (bufferMetrics.queueDepth) {
      this.queueDepthGauge.set(
        { pipeline: 'buffer', queue: 'memory' },
        parseInt(bufferMetrics.queueDepth)
      );
    }

    if (bufferMetrics.diskQueueDepth) {
      this.queueDepthGauge.set(
        { pipeline: 'buffer', queue: 'disk' },
        parseInt(bufferMetrics.diskQueueDepth)
      );
    }
  }

  private async collectApplicationMetrics() {
    // Collect from various microservices
    const services = [
      'log-ingestion',
      'correlation-engine',
      'query-processor',
      'auth-service',
    ];

    for (const service of services) {
      const metrics = await this.redis.hgetall(`${service}:metrics`);

      if (metrics.throughput) {
        this.throughputGauge.set(
          { pipeline: service, stage: 'processing' },
          parseInt(metrics.throughput)
        );
      }

      if (metrics.errorRate) {
        const errorRate = parseFloat(metrics.errorRate);
        if (errorRate > 0) {
          this.errorCounter.inc(
            { pipeline: service, stage: 'processing', error_type: 'rate' },
            errorRate * 100 // Convert to count
          );
        }
      }
    }
  }

  async getMetrics(): Promise<PipelineMetrics> {
    // Get current metric values
    const throughputCurrent =
      (await this.redis.get('kafka:throughput:current')) || '0';
    const throughputAvg = (await this.redis.get('kafka:throughput:avg')) || '0';
    const throughputPeak =
      (await this.redis.get('kafka:throughput:peak')) || '0';

    // Get latency metrics from recent data
    const latencyResult = await this.pgPool.query(`
      SELECT 
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time_ms) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms) as p99
      FROM pipeline_metrics
      WHERE timestamp > NOW() - INTERVAL '5 minutes'
    `);

    const latency = latencyResult.rows[0] || { p50: 0, p95: 0, p99: 0 };

    // Get error metrics
    const errorResult = await this.pgPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) * 100.0 / NULLIF(COUNT(*) + COUNT(CASE WHEN status = 'success' THEN 1 END), 0) as rate,
        error_type,
        COUNT(*) as count
      FROM pipeline_metrics
      WHERE timestamp > NOW() - INTERVAL '5 minutes'
      AND status = 'error'
      GROUP BY error_type
    `);

    const errors = {
      rate: errorResult.rows[0]?.rate || 0,
      total: parseInt(errorResult.rows[0]?.total || '0'),
      types: errorResult.rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.error_type]: parseInt(row.count),
        }),
        {}
      ),
    };

    // Get backpressure metrics
    const bufferMetrics = await this.redis.hgetall('buffer:metrics');
    const backpressure = {
      level: parseFloat(bufferMetrics.backpressureLevel || '0'),
      queueDepth: parseInt(bufferMetrics.queueDepth || '0'),
      spilloverEvents: parseInt(bufferMetrics.spilloverEvents || '0'),
    };

    return {
      throughput: {
        current: parseInt(throughputCurrent),
        average: parseInt(throughputAvg),
        peak: parseInt(throughputPeak),
      },
      latency: {
        p50: parseFloat(latency.p50),
        p95: parseFloat(latency.p95),
        p99: parseFloat(latency.p99),
      },
      errors,
      backpressure,
    };
  }

  private async checkAlerts() {
    const metrics = await this.getMetrics();

    // Check throughput degradation
    if (metrics.throughput.average > 0) {
      const degradation =
        metrics.throughput.current / metrics.throughput.average;
      this.checkThreshold(
        'throughput_degradation',
        degradation,
        ALERT_THRESHOLDS.throughputDegradation.threshold,
        '<',
        ALERT_THRESHOLDS.throughputDegradation.duration
      );
    }

    // Check error rate
    this.checkThreshold(
      'error_rate',
      metrics.errors.rate / 100,
      ALERT_THRESHOLDS.errorRate.threshold,
      '>',
      ALERT_THRESHOLDS.errorRate.duration
    );

    // Check backpressure
    this.checkThreshold(
      'backpressure',
      metrics.backpressure.level,
      ALERT_THRESHOLDS.backpressure.threshold,
      '>',
      ALERT_THRESHOLDS.backpressure.duration
    );

    // Check latency
    this.checkThreshold(
      'latency_p99',
      metrics.latency.p99,
      ALERT_THRESHOLDS.latencyP99.threshold,
      '>',
      ALERT_THRESHOLDS.latencyP99.duration
    );
  }

  private checkThreshold(
    alertName: string,
    value: number,
    threshold: number,
    operator: '>' | '<' | '=' | '>=' | '<=',
    duration: number
  ) {
    const triggered = this.evaluateCondition(value, operator, threshold);
    const state = this.alertStates.get(alertName) || {
      triggered: false,
      value: 0,
    };

    if (triggered && !state.triggered) {
      // Alert triggered
      state.triggered = true;
      state.triggeredAt = new Date();
      state.value = value;

      this.logger.warn(`Alert triggered: ${alertName}`, {
        value,
        threshold,
        operator,
      });

      // Send alert (webhook, email, etc.)
      this.sendAlert(alertName, value, threshold);
    } else if (!triggered && state.triggered) {
      // Alert cleared
      const duration = Date.now() - (state.triggeredAt?.getTime() || 0);

      this.logger.info(`Alert cleared: ${alertName}`, {
        duration: duration / 1000,
        previousValue: state.value,
        currentValue: value,
      });

      state.triggered = false;
      state.triggeredAt = undefined;
    }

    state.value = value;
    this.alertStates.set(alertName, state);
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '=':
        return value === threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      default:
        return false;
    }
  }

  private async sendAlert(alertName: string, value: number, threshold: number) {
    // Implement alert sending logic (webhook, email, Slack, etc.)
    const webhook = process.env.ALERT_WEBHOOK_URL;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: alertName,
            value,
            threshold,
            timestamp: new Date().toISOString(),
            severity: this.getAlertSeverity(alertName),
          }),
        });
      } catch (error) {
        this.logger.error('Failed to send alert', error);
      }
    }
  }

  private getAlertSeverity(alertName: string): string {
    const severityMap: Record<string, string> = {
      throughput_degradation: 'warning',
      error_rate: 'critical',
      backpressure: 'warning',
      latency_p99: 'warning',
    };
    return severityMap[alertName] || 'info';
  }

  getPrometheusMetrics(): string {
    return this.registry.metrics();
  }
}
