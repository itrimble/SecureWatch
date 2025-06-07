/**
 * Widget Analytics Routes - Merged from analytics-api
 * Ultra-fast endpoints for individual dashboard widgets
 */
import express from 'express';
import NodeCache from 'node-cache';
export class WidgetRoutes {
    router;
    dbPool;
    logger;
    cache;
    constructor(dbPool, logger) {
        this.router = express.Router();
        this.dbPool = dbPool;
        this.logger = logger;
        // Widget-specific cache with different TTL values
        this.cache = new NodeCache({ stdTTL: 15, checkperiod: 5 });
        this.setupRoutes();
    }
    setupRoutes() {
        // Widget endpoints
        this.router.get('/total-events', this.getTotalEvents.bind(this));
        this.router.get('/critical-alerts', this.getCriticalAlerts.bind(this));
        this.router.get('/active-sources', this.getActiveSources.bind(this));
        this.router.get('/security-incidents', this.getSecurityIncidents.bind(this));
        this.router.get('/network-activity', this.getNetworkActivity.bind(this));
        this.router.get('/events-timeline', this.getEventsTimeline.bind(this));
        this.router.get('/top-sources', this.getTopSources.bind(this));
        this.router.get('/system-performance', this.getSystemPerformance.bind(this));
        this.router.get('/recent-alerts', this.getRecentAlerts.bind(this));
    }
    async getTotalEvents(req, res) {
        const cacheKey = `total-events-${req.query.org_id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id } = req.query;
            const query = `
        SELECT 
          sum(total_events) as current_hour_events,
          sum(total_events) as today_events,
          avg(total_events) as avg_hourly_events
        FROM current_hour_summary
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid);
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = result.rows[0] || { current_hour_events: 0, today_events: 0, avg_hourly_events: 0 };
            this.cache.set(cacheKey, data, 30); // Cache for 30 seconds
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get total events widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve total events',
            });
        }
    }
    async getCriticalAlerts(req, res) {
        const cacheKey = `critical-alerts-${req.query.org_id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id } = req.query;
            const query = `
        SELECT 
          sum(total_critical) as current_hour_critical,
          sum(total_errors) as current_hour_errors,
          sum(total_warnings) as current_hour_warnings
        FROM current_hour_summary
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid);
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = result.rows[0] || { current_hour_critical: 0, current_hour_errors: 0, current_hour_warnings: 0 };
            this.cache.set(cacheKey, data, 15); // Cache for 15 seconds (more frequent updates for critical alerts)
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get critical alerts widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve critical alerts',
            });
        }
    }
    async getActiveSources(req, res) {
        const cacheKey = `active-sources-${req.query.org_id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id } = req.query;
            const query = `
        SELECT 
          sum(active_sources) as total_active_sources,
          count(*) as total_configured_sources,
          count(CASE WHEN health_status = 'HEALTHY' THEN 1 END) as healthy_sources,
          count(CASE WHEN health_status = 'DEGRADED' THEN 1 END) as degraded_sources,
          count(CASE WHEN health_status = 'OFFLINE' THEN 1 END) as offline_sources
        FROM source_health_overview
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid);
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = result.rows[0] || {
                total_active_sources: 0,
                total_configured_sources: 0,
                healthy_sources: 0,
                degraded_sources: 0,
                offline_sources: 0,
            };
            this.cache.set(cacheKey, data, 60); // Cache for 1 minute
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get active sources widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve active sources',
            });
        }
    }
    async getSecurityIncidents(req, res) {
        const cacheKey = `security-incidents-${req.query.org_id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id } = req.query;
            const query = `
        SELECT 
          sum(total_events) FILTER (WHERE log_level = 'CRITICAL') as critical_incidents,
          sum(total_events) FILTER (WHERE log_level = 'ERROR') as error_incidents,
          sum(auth_failures) as failed_auth_attempts,
          count(DISTINCT source_identifier) as affected_sources
        FROM hourly_security_metrics
        WHERE time_bucket >= NOW() - INTERVAL '24 hours'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid);
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = result.rows[0] || {
                critical_incidents: 0,
                error_incidents: 0,
                failed_auth_attempts: 0,
                affected_sources: 0,
            };
            this.cache.set(cacheKey, data, 120); // Cache for 2 minutes
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get security incidents widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve security incidents',
            });
        }
    }
    async getNetworkActivity(req, res) {
        const cacheKey = `network-activity-${req.query.org_id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id } = req.query;
            const query = `
        SELECT 
          sum(unique_ips) as unique_source_ips,
          sum(successful_logins) as successful_logins,
          sum(failed_logins) as failed_logins,
          CASE 
            WHEN sum(successful_logins + failed_logins) > 0 
            THEN ROUND(sum(failed_logins)::numeric / sum(successful_logins + failed_logins) * 100, 2)
            ELSE 0 
          END as auth_failure_rate
        FROM current_hour_summary
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid);
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = result.rows[0] || {
                unique_source_ips: 0,
                successful_logins: 0,
                failed_logins: 0,
                auth_failure_rate: 0,
            };
            this.cache.set(cacheKey, data, 45); // Cache for 45 seconds
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get network activity widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve network activity',
            });
        }
    }
    async getEventsTimeline(req, res) {
        const cacheKey = `events-timeline-${req.query.org_id}-${req.query.hours}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id, hours = '6' } = req.query;
            const query = `
        SELECT 
          time_bucket,
          sum(event_count) as events,
          sum(error_count) as errors,
          sum(warning_count) as warnings
        FROM realtime_security_events
        WHERE time_bucket >= NOW() - INTERVAL '${parseInt(hours, 10)} hours'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
        GROUP BY time_bucket
        ORDER BY time_bucket;
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = {
                timeline: result.rows,
                period_hours: parseInt(hours, 10),
                data_points: result.rows.length,
            };
            this.cache.set(cacheKey, data, 30); // Cache for 30 seconds
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get events timeline widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve events timeline',
            });
        }
    }
    async getTopSources(req, res) {
        const cacheKey = `top-sources-${req.query.org_id}-${req.query.limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id, limit = '10' } = req.query;
            const query = `
        SELECT 
          source_type,
          sum(total_events) as total_events,
          count(DISTINCT source_identifier) as unique_sources,
          max(time_bucket) as last_activity
        FROM hourly_security_metrics
        WHERE time_bucket >= NOW() - INTERVAL '24 hours'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
        GROUP BY source_type
        ORDER BY total_events DESC
        LIMIT $2;
      `;
            const result = await this.dbPool.query(query, [org_id || null, parseInt(limit, 10)]);
            const data = {
                sources: result.rows,
                total_source_types: result.rows.length,
            };
            this.cache.set(cacheKey, data, 300); // Cache for 5 minutes
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get top sources widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve top sources',
            });
        }
    }
    async getSystemPerformance(req, res) {
        const cacheKey = `system-performance-${req.query.org_id}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id } = req.query;
            // Get processing metrics from daily summary
            const query = `
        SELECT 
          avg(avg_normalization_rate) as avg_normalization_rate,
          avg(avg_enrichment_rate) as avg_enrichment_rate,
          avg(avg_processing_time) as avg_processing_time_seconds
        FROM today_summary
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid);
      `;
            const result = await this.dbPool.query(query, [org_id || null]);
            const data = result.rows[0] || {
                avg_normalization_rate: 0,
                avg_enrichment_rate: 0,
                avg_processing_time_seconds: 0,
            };
            // Add system metrics
            const systemData = {
                ...data,
                uptime_hours: Math.floor(process.uptime() / 3600),
                memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                cache_hit_rate: this.getCacheHitRate(),
            };
            this.cache.set(cacheKey, systemData, 180); // Cache for 3 minutes
            res.json({
                status: 'success',
                data: systemData,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get system performance widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve system performance',
            });
        }
    }
    async getRecentAlerts(req, res) {
        const cacheKey = `recent-alerts-${req.query.org_id}-${req.query.limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            res.json({ status: 'success', data: cached, cached: true });
            return;
        }
        try {
            const { org_id, limit = '10' } = req.query;
            const query = `
        SELECT 
          rule_name,
          rule_severity,
          sum(alerts_triggered) as alerts_count,
          max(time_bucket) as last_triggered,
          avg(false_positive_rate) as avg_false_positive_rate
        FROM alert_performance_metrics
        WHERE time_bucket >= NOW() - INTERVAL '6 hours'
          AND ($1::uuid IS NULL OR organization_id = $1::uuid)
          AND alerts_triggered > 0
        GROUP BY rule_name, rule_severity
        ORDER BY max(time_bucket) DESC
        LIMIT $2;
      `;
            const result = await this.dbPool.query(query, [org_id || null, parseInt(limit, 10)]);
            const data = {
                alerts: result.rows,
                total_recent_alerts: result.rows.length,
            };
            this.cache.set(cacheKey, data, 60); // Cache for 1 minute
            res.json({
                status: 'success',
                data,
                cached: false,
            });
        }
        catch (error) {
            this.logger.error('Failed to get recent alerts widget:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve recent alerts',
            });
        }
    }
    getCacheHitRate() {
        const stats = this.cache.getStats();
        if (stats.hits + stats.misses === 0)
            return 0;
        return Number(((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1));
    }
    getRouter() {
        return this.router;
    }
}
//# sourceMappingURL=widgets.routes.js.map