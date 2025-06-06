/**
 * Dashboard Analytics Routes - Merged from analytics-api
 * Fast endpoints using pre-computed continuous aggregates
 */

import express from 'express';
import { Pool } from 'pg';
import winston from 'winston';
import NodeCache from 'node-cache';

export class DashboardRoutes {
  private router: express.Router;
  private dbPool: Pool;
  private logger: winston.Logger;
  private cache: NodeCache;

  constructor(dbPool: Pool, logger: winston.Logger) {
    this.router = express.Router();
    this.dbPool = dbPool;
    this.logger = logger;
    
    // Short-term cache for dashboard data (30 seconds)
    this.cache = new NodeCache({ stdTTL: 30, checkperiod: 10 });
    
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Real-time security overview (last hour)
    this.router.get('/realtime-overview', this.getRealtimeOverview.bind(this));
    
    // Hourly metrics for trend analysis
    this.router.get('/hourly-trends', this.getHourlyTrends.bind(this));
    
    // Top security events (most frequent)
    this.router.get('/top-events', this.getTopEvents.bind(this));
    
    // Source health status
    this.router.get('/source-health', this.getSourceHealth.bind(this));
    
    // Daily security summary
    this.router.get('/daily-summary', this.getDailySummary.bind(this));
    
    // Alert performance metrics
    this.router.get('/alert-performance', this.getAlertPerformance.bind(this));
    
    // Cache statistics
    this.router.get('/cache-stats', this.getCacheStats.bind(this));
  }

  private async getRealtimeOverview(req: express.Request, res: express.Response): Promise<void> {
    const cacheKey = `realtime-overview-${req.query.org_id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      res.json({ status: 'success', data: cached, cached: true });
      return;
    }

    try {
      const { org_id } = req.query;
      
      const query = `
        SELECT 
          time_bucket,
          sum(event_count) as total_events,
          sum(error_count) as total_errors,
          sum(warning_count) as total_warnings,
          sum(critical_count) as total_critical,
          sum(unique_sources) as active_sources,
          sum(unique_source_ips) as unique_ips,
          sum(successful_logins) as successful_logins,
          sum(failed_logins) as failed_logins
        FROM realtime_security_events
        WHERE time_bucket >= NOW() - INTERVAL '1 hour'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
        GROUP BY time_bucket
        ORDER BY time_bucket DESC
        LIMIT 12;
      `;

      const result = await this.dbPool.query(query, [org_id || null]);
      
      // Calculate totals and trends
      const data = result.rows;
      const latest = data[0] || {};
      const previous = data[1] || {};
      
      const overview = {
        current_period: latest,
        trend: {
          events_change: this.calculatePercentChange(latest.total_events, previous.total_events),
          errors_change: this.calculatePercentChange(latest.total_errors, previous.total_errors),
          sources_change: this.calculatePercentChange(latest.active_sources, previous.active_sources),
        },
        time_series: data.reverse(), // Chronological order for charts
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, overview);
      
      res.json({
        status: 'success',
        data: overview,
        cached: false,
      });

    } catch (error) {
      this.logger.error('Failed to get realtime overview:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve realtime overview',
      });
    }
  }

  private async getHourlyTrends(req: express.Request, res: express.Response): Promise<void> {
    const cacheKey = `hourly-trends-${req.query.org_id}-${req.query.hours}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      res.json({ status: 'success', data: cached, cached: true });
      return;
    }

    try {
      const { org_id, hours = '24' } = req.query;
      
      const query = `
        SELECT 
          time_bucket,
          source_type,
          sum(total_events) as events,
          sum(error_events) as errors,
          sum(warning_events) as warnings,
          sum(unique_source_ips) as unique_ips,
          sum(auth_successes) as auth_successes,
          sum(auth_failures) as auth_failures,
          avg(avg_message_length) as avg_message_size
        FROM hourly_security_metrics
        WHERE time_bucket >= NOW() - INTERVAL '${parseInt(hours as string, 10)} hours'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
        GROUP BY time_bucket, source_type
        ORDER BY time_bucket DESC, source_type;
      `;

      const result = await this.dbPool.query(query, [org_id || null]);
      
      // Group by source type for easier frontend consumption
      const groupedData = result.rows.reduce((acc, row) => {
        if (!acc[row.source_type]) {
          acc[row.source_type] = [];
        }
        acc[row.source_type].push(row);
        return acc;
      }, {} as Record<string, any[]>);

      const trends = {
        by_source_type: groupedData,
        total_hours: parseInt(hours as string, 10),
        data_points: result.rows.length,
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, trends, 120); // Cache for 2 minutes
      
      res.json({
        status: 'success',
        data: trends,
        cached: false,
      });

    } catch (error) {
      this.logger.error('Failed to get hourly trends:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve hourly trends',
      });
    }
  }

  private async getTopEvents(req: express.Request, res: express.Response): Promise<void> {
    const cacheKey = `top-events-${req.query.org_id}-${req.query.period}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      res.json({ status: 'success', data: cached, cached: true });
      return;
    }

    try {
      const { org_id, period = '24h', limit = '20' } = req.query;
      
      const intervalMap = {
        '1h': '1 hour',
        '6h': '6 hours',
        '24h': '24 hours',
        '7d': '7 days',
      };
      
      const interval = intervalMap[period as keyof typeof intervalMap] || '24 hours';
      
      const query = `
        SELECT 
          event_category,
          source_type,
          log_level,
          sum(total_events) as event_count,
          count(DISTINCT source_identifier) as unique_sources,
          avg(total_events) as avg_events_per_hour,
          max(time_bucket) as last_seen
        FROM hourly_security_metrics
        WHERE time_bucket >= NOW() - INTERVAL '${interval}'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
          AND event_category IS NOT NULL
        GROUP BY event_category, source_type, log_level
        ORDER BY event_count DESC
        LIMIT $2;
      `;

      const result = await this.dbPool.query(query, [org_id || null, parseInt(limit as string, 10)]);
      
      const topEvents = {
        events: result.rows,
        period,
        total_unique_events: result.rows.length,
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, topEvents, 300); // Cache for 5 minutes
      
      res.json({
        status: 'success',
        data: topEvents,
        cached: false,
      });

    } catch (error) {
      this.logger.error('Failed to get top events:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve top events',
      });
    }
  }

  private async getSourceHealth(req: express.Request, res: express.Response): Promise<void> {
    const cacheKey = `source-health-${req.query.org_id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      res.json({ status: 'success', data: cached, cached: true });
      return;
    }

    try {
      const { org_id } = req.query;
      
      const query = `
        SELECT * FROM source_health_overview
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid)
        ORDER BY 
          CASE health_status 
            WHEN 'OFFLINE' THEN 1 
            WHEN 'DEGRADED' THEN 2 
            ELSE 3 
          END,
          source_identifier;
      `;

      const result = await this.dbPool.query(query, [org_id || null]);
      
      // Categorize sources by health status
      const healthStatus = result.rows.reduce((acc, source) => {
        const status = source.health_status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(source);
        return acc;
      }, {} as Record<string, any[]>);

      const summary = {
        total_sources: result.rows.length,
        healthy_sources: (healthStatus.HEALTHY || []).length,
        degraded_sources: (healthStatus.DEGRADED || []).length,
        offline_sources: (healthStatus.OFFLINE || []).length,
      };

      const sourceHealth = {
        summary,
        by_status: healthStatus,
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, sourceHealth, 60); // Cache for 1 minute
      
      res.json({
        status: 'success',
        data: sourceHealth,
        cached: false,
      });

    } catch (error) {
      this.logger.error('Failed to get source health:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve source health',
      });
    }
  }

  private async getDailySummary(req: express.Request, res: express.Response): Promise<void> {
    const cacheKey = `daily-summary-${req.query.org_id}-${req.query.days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      res.json({ status: 'success', data: cached, cached: true });
      return;
    }

    try {
      const { org_id, days = '7' } = req.query;
      
      const query = `
        SELECT 
          date_bucket::date as date,
          sum(total_events) as total_events,
          sum(critical_events) as critical_events,
          sum(error_events) as error_events,
          sum(warning_events) as warning_events,
          sum(failed_auth_attempts) as failed_auth_attempts,
          sum(successful_auth_attempts) as successful_auth_attempts,
          sum(active_sources) as active_sources,
          sum(active_hosts) as active_hosts,
          avg(auth_failure_rate) as avg_auth_failure_rate,
          avg(normalization_rate) as avg_normalization_rate,
          avg(enrichment_rate) as avg_enrichment_rate
        FROM daily_security_summary
        WHERE date_bucket >= CURRENT_DATE - INTERVAL '${parseInt(days as string, 10)} days'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
        GROUP BY date_bucket::date
        ORDER BY date DESC;
      `;

      const result = await this.dbPool.query(query, [org_id || null]);
      
      const dailySummary = {
        days: result.rows,
        period_days: parseInt(days as string, 10),
        total_days: result.rows.length,
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, dailySummary, 600); // Cache for 10 minutes
      
      res.json({
        status: 'success',
        data: dailySummary,
        cached: false,
      });

    } catch (error) {
      this.logger.error('Failed to get daily summary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve daily summary',
      });
    }
  }

  private async getAlertPerformance(req: express.Request, res: express.Response): Promise<void> {
    const cacheKey = `alert-performance-${req.query.org_id}-${req.query.hours}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      res.json({ status: 'success', data: cached, cached: true });
      return;
    }

    try {
      const { org_id, hours = '24' } = req.query;
      
      const query = `
        SELECT 
          time_bucket,
          rule_name,
          rule_severity,
          sum(alerts_triggered) as total_alerts,
          sum(alerts_resolved) as total_resolved,
          sum(false_positives) as total_false_positives,
          sum(open_alerts) as total_open,
          avg(avg_acknowledgment_time) as avg_ack_time,
          avg(avg_resolution_time) as avg_resolution_time,
          avg(false_positive_rate) as avg_false_positive_rate
        FROM alert_performance_metrics
        WHERE time_bucket >= NOW() - INTERVAL '${parseInt(hours as string, 10)} hours'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
        GROUP BY time_bucket, rule_name, rule_severity
        ORDER BY time_bucket DESC, total_alerts DESC;
      `;

      const result = await this.dbPool.query(query, [org_id || null]);
      
      // Calculate overall statistics
      const totalAlerts = result.rows.reduce((sum, row) => sum + parseInt(row.total_alerts, 10), 0);
      const totalResolved = result.rows.reduce((sum, row) => sum + parseInt(row.total_resolved, 10), 0);
      const totalFalsePositives = result.rows.reduce((sum, row) => sum + parseInt(row.total_false_positives, 10), 0);
      
      const alertPerformance = {
        summary: {
          total_alerts: totalAlerts,
          total_resolved: totalResolved,
          total_false_positives: totalFalsePositives,
          resolution_rate: totalAlerts > 0 ? (totalResolved / totalAlerts * 100).toFixed(2) : '0',
          false_positive_rate: totalAlerts > 0 ? (totalFalsePositives / totalAlerts * 100).toFixed(2) : '0',
        },
        by_rule: result.rows,
        period_hours: parseInt(hours as string, 10),
        last_updated: new Date().toISOString(),
      };

      this.cache.set(cacheKey, alertPerformance, 180); // Cache for 3 minutes
      
      res.json({
        status: 'success',
        data: alertPerformance,
        cached: false,
      });

    } catch (error) {
      this.logger.error('Failed to get alert performance:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve alert performance',
      });
    }
  }

  private getCacheStats(req: express.Request, res: express.Response): void {
    const stats = this.cache.getStats();
    
    res.json({
      status: 'success',
      cache_stats: {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hit_rate: stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) : '0',
        memory_usage: process.memoryUsage(),
      },
    });
  }

  private calculatePercentChange(current: number, previous: number): number {
    if (!previous || previous === 0) return 0;
    return Number(((current - previous) / previous * 100).toFixed(2));
  }

  public getRouter(): express.Router {
    return this.router;
  }
}