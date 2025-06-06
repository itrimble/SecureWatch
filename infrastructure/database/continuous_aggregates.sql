-- Advanced Continuous Aggregates for SecureWatch SIEM Performance
-- Creates pre-computed summary tables for blazing fast dashboard queries

-- Enable TimescaleDB continuous aggregate features
SET timescaledb.enable_cagg_watermark_constrain = on;

-- 1. Real-time Security Events Summary (5-minute intervals)
-- Used for: Real-time dashboard widgets, security monitoring
CREATE MATERIALIZED VIEW realtime_security_events
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', timestamp) AS time_bucket,
    organization_id,
    source_type,
    log_level,
    event_category,
    count(*) as event_count,
    count(DISTINCT source_identifier) as unique_sources,
    count(DISTINCT CASE WHEN log_level = 'ERROR' THEN id END) as error_count,
    count(DISTINCT CASE WHEN log_level = 'WARNING' THEN id END) as warning_count,
    count(DISTINCT CASE WHEN log_level = 'CRITICAL' THEN id END) as critical_count,
    -- Network activity summary
    count(DISTINCT source_ip) as unique_source_ips,
    count(DISTINCT destination_ip) as unique_dest_ips,
    count(DISTINCT CASE WHEN source_port IS NOT NULL THEN CONCAT(source_ip, ':', source_port) END) as unique_connections,
    -- Authentication summary
    count(DISTINCT CASE WHEN auth_result = 'success' THEN auth_user END) as successful_logins,
    count(DISTINCT CASE WHEN auth_result = 'failure' THEN auth_user END) as failed_logins,
    -- Process activity
    count(DISTINCT process_name) as unique_processes,
    count(DISTINCT user_name) as unique_users
FROM logs
GROUP BY time_bucket, organization_id, source_type, log_level, event_category;

-- Refresh policy: Update every 2 minutes, keep 1 hour lag
SELECT add_continuous_aggregate_policy('realtime_security_events',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '2 minutes');

-- 2. Hourly Security Metrics (detailed breakdown)
-- Used for: Hourly trend analysis, capacity planning
CREATE MATERIALIZED VIEW hourly_security_metrics
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS time_bucket,
    organization_id,
    source_type,
    source_identifier,
    log_level,
    event_category,
    hostname,
    count(*) as total_events,
    
    -- Event distribution
    count(DISTINCT event_id) as unique_event_types,
    count(CASE WHEN log_level = 'ERROR' THEN 1 END) as error_events,
    count(CASE WHEN log_level = 'WARNING' THEN 1 END) as warning_events,
    count(CASE WHEN log_level = 'INFO' THEN 1 END) as info_events,
    count(CASE WHEN log_level = 'DEBUG' THEN 1 END) as debug_events,
    
    -- Network activity (detailed)
    count(DISTINCT source_ip) as unique_source_ips,
    count(DISTINCT destination_ip) as unique_dest_ips,
    count(DISTINCT protocol) as unique_protocols,
    avg(CASE WHEN source_port IS NOT NULL THEN source_port END) as avg_source_port,
    avg(CASE WHEN destination_port IS NOT NULL THEN destination_port END) as avg_dest_port,
    
    -- Authentication analysis
    count(CASE WHEN auth_result = 'success' THEN 1 END) as auth_successes,
    count(CASE WHEN auth_result = 'failure' THEN 1 END) as auth_failures,
    count(DISTINCT auth_user) as unique_auth_users,
    count(DISTINCT auth_domain) as unique_auth_domains,
    
    -- File system activity
    count(DISTINCT file_path) as unique_file_paths,
    count(DISTINCT file_hash) as unique_file_hashes,
    
    -- Process activity
    count(DISTINCT process_name) as unique_processes,
    count(DISTINCT process_id) as unique_process_ids,
    count(DISTINCT user_name) as unique_users,
    
    -- Data volume metrics
    sum(length(message)) as total_message_bytes,
    avg(length(message)) as avg_message_length,
    
    -- Processing metrics
    count(CASE WHEN normalized = true THEN 1 END) as normalized_events,
    count(CASE WHEN enriched = true THEN 1 END) as enriched_events
    
FROM logs
GROUP BY time_bucket, organization_id, source_type, source_identifier, 
         log_level, event_category, hostname;

-- Refresh policy: Update every 30 minutes
SELECT add_continuous_aggregate_policy('hourly_security_metrics',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '30 minutes');

-- 3. Daily Security Summary (high-level overview)
-- Used for: Executive dashboards, compliance reporting
CREATE MATERIALIZED VIEW daily_security_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS date_bucket,
    organization_id,
    source_type,
    
    -- Volume metrics
    count(*) as total_events,
    count(DISTINCT source_identifier) as active_sources,
    count(DISTINCT hostname) as active_hosts,
    count(DISTINCT user_name) as active_users,
    
    -- Security posture
    count(CASE WHEN log_level = 'CRITICAL' THEN 1 END) as critical_events,
    count(CASE WHEN log_level = 'ERROR' THEN 1 END) as error_events,
    count(CASE WHEN log_level = 'WARNING' THEN 1 END) as warning_events,
    
    -- Authentication security
    count(CASE WHEN auth_result = 'failure' THEN 1 END) as failed_auth_attempts,
    count(CASE WHEN auth_result = 'success' THEN 1 END) as successful_auth_attempts,
    ROUND(
        (count(CASE WHEN auth_result = 'failure' THEN 1 END)::numeric / 
         NULLIF(count(CASE WHEN auth_result IS NOT NULL THEN 1 END), 0)) * 100, 2
    ) as auth_failure_rate,
    
    -- Network security
    count(DISTINCT source_ip) as unique_source_ips,
    count(DISTINCT destination_ip) as unique_destination_ips,
    count(CASE WHEN source_ip IS NOT NULL AND source_ip != destination_ip THEN 1 END) as network_connections,
    
    -- Top event categories (stored as JSONB for flexibility)
    jsonb_object_agg(
        event_category, 
        count(*) ORDER BY count(*) DESC
    ) FILTER (WHERE event_category IS NOT NULL) as event_category_breakdown,
    
    -- Data processing health
    ROUND(
        (count(CASE WHEN normalized = true THEN 1 END)::numeric / count(*)) * 100, 2
    ) as normalization_rate,
    ROUND(
        (count(CASE WHEN enriched = true THEN 1 END)::numeric / count(*)) * 100, 2
    ) as enrichment_rate,
    
    -- Performance metrics
    avg(EXTRACT(EPOCH FROM (processed_at - ingested_at))) as avg_processing_time_seconds
    
FROM logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 year'  -- Limit to recent data
GROUP BY date_bucket, organization_id, source_type;

-- Refresh policy: Update daily
SELECT add_continuous_aggregate_policy('daily_security_summary',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- 4. Alert Performance Metrics (15-minute intervals)
-- Used for: Alert fatigue analysis, rule effectiveness
CREATE MATERIALIZED VIEW alert_performance_metrics
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('15 minutes', triggered_at) AS time_bucket,
    r.organization_id,
    r.name as rule_name,
    r.severity as rule_severity,
    
    -- Alert volume metrics
    count(*) as alerts_triggered,
    count(CASE WHEN a.status = 'resolved' THEN 1 END) as alerts_resolved,
    count(CASE WHEN a.status = 'false_positive' THEN 1 END) as false_positives,
    count(CASE WHEN a.status = 'open' THEN 1 END) as open_alerts,
    
    -- Response time metrics
    avg(EXTRACT(EPOCH FROM (acknowledged_at - triggered_at))) as avg_acknowledgment_time,
    avg(EXTRACT(EPOCH FROM (resolved_at - triggered_at))) as avg_resolution_time,
    
    -- False positive rate
    ROUND(
        (count(CASE WHEN a.status = 'false_positive' THEN 1 END)::numeric / count(*)) * 100, 2
    ) as false_positive_rate
    
FROM alerts a
JOIN alert_rules r ON a.rule_id = r.id
GROUP BY time_bucket, r.organization_id, r.name, r.severity;

-- Refresh policy: Update every 10 minutes
SELECT add_continuous_aggregate_policy('alert_performance_metrics',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes');

-- 5. Source Health Monitoring (5-minute intervals)
-- Used for: Infrastructure monitoring, agent health
CREATE MATERIALIZED VIEW source_health_metrics
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', timestamp) AS time_bucket,
    organization_id,
    source_identifier,
    source_type,
    hostname,
    
    -- Volume and health indicators
    count(*) as event_count,
    count(DISTINCT event_category) as event_diversity,
    
    -- Data quality metrics
    count(CASE WHEN message IS NULL OR trim(message) = '' THEN 1 END) as empty_messages,
    count(CASE WHEN normalized = false THEN 1 END) as unnormalized_events,
    count(CASE WHEN enriched = false THEN 1 END) as unenriched_events,
    
    -- Timing metrics (processing lag)
    avg(EXTRACT(EPOCH FROM (ingested_at - timestamp))) as avg_ingestion_lag_seconds,
    max(EXTRACT(EPOCH FROM (ingested_at - timestamp))) as max_ingestion_lag_seconds,
    
    -- Data size metrics
    sum(length(message)) as total_data_bytes,
    avg(length(message)) as avg_message_size,
    
    -- Last seen timestamp for gap detection
    max(timestamp) as last_event_time
    
FROM logs
GROUP BY time_bucket, organization_id, source_identifier, source_type, hostname;

-- Refresh policy: Update every 3 minutes for near real-time monitoring
SELECT add_continuous_aggregate_policy('source_health_metrics',
    start_offset => INTERVAL '30 minutes',
    end_offset => INTERVAL '3 minutes',
    schedule_interval => INTERVAL '3 minutes');

-- 6. Weekly Security Trends (for long-term analysis)
-- Used for: Trend analysis, capacity planning, security posture evolution
CREATE MATERIALIZED VIEW weekly_security_trends
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 week', timestamp) AS week_bucket,
    organization_id,
    
    -- Overall volume trends
    count(*) as total_events,
    count(DISTINCT source_identifier) as active_sources,
    count(DISTINCT DATE(timestamp)) as active_days,
    
    -- Security incident trends
    count(CASE WHEN log_level IN ('ERROR', 'CRITICAL') THEN 1 END) as security_incidents,
    count(CASE WHEN auth_result = 'failure' THEN 1 END) as auth_failures,
    
    -- Growth rates (compared to previous week)
    LAG(count(*), 1) OVER (
        PARTITION BY organization_id 
        ORDER BY time_bucket('1 week', timestamp)
    ) as prev_week_events,
    
    -- Data diversity and coverage
    count(DISTINCT source_type) as source_type_diversity,
    count(DISTINCT event_category) as event_category_diversity,
    
    -- Performance indicators
    avg(EXTRACT(EPOCH FROM (processed_at - ingested_at))) as avg_processing_time,
    ROUND(avg(length(message))) as avg_event_size
    
FROM logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '2 years'  -- Keep 2 years of weekly data
GROUP BY week_bucket, organization_id;

-- Refresh policy: Update weekly
SELECT add_continuous_aggregate_policy('weekly_security_trends',
    start_offset => INTERVAL '1 week',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Create indexes on continuous aggregates for faster queries
CREATE INDEX idx_realtime_events_bucket ON realtime_security_events (time_bucket DESC);
CREATE INDEX idx_realtime_events_org_bucket ON realtime_security_events (organization_id, time_bucket DESC);

CREATE INDEX idx_hourly_metrics_bucket ON hourly_security_metrics (time_bucket DESC);
CREATE INDEX idx_hourly_metrics_org_source ON hourly_security_metrics (organization_id, source_type, time_bucket DESC);

CREATE INDEX idx_daily_summary_bucket ON daily_security_summary (date_bucket DESC);
CREATE INDEX idx_daily_summary_org ON daily_security_summary (organization_id, date_bucket DESC);

CREATE INDEX idx_alert_metrics_bucket ON alert_performance_metrics (time_bucket DESC);
CREATE INDEX idx_alert_metrics_org ON alert_performance_metrics (organization_id, time_bucket DESC);

CREATE INDEX idx_source_health_bucket ON source_health_metrics (time_bucket DESC);
CREATE INDEX idx_source_health_source ON source_health_metrics (source_identifier, time_bucket DESC);

CREATE INDEX idx_weekly_trends_bucket ON weekly_security_trends (week_bucket DESC);
CREATE INDEX idx_weekly_trends_org ON weekly_security_trends (organization_id, week_bucket DESC);

-- Create helper views for common dashboard queries
-- Fast dashboard widget queries that use pre-computed aggregates

-- Current hour summary (for real-time widgets)
CREATE VIEW current_hour_summary AS
SELECT 
    organization_id,
    sum(event_count) as total_events,
    sum(error_count) as total_errors,
    sum(warning_count) as total_warnings,
    sum(critical_count) as total_critical,
    sum(unique_sources) as active_sources,
    sum(unique_source_ips) as unique_ips,
    sum(successful_logins) as successful_logins,
    sum(failed_logins) as failed_logins
FROM realtime_security_events
WHERE time_bucket >= date_trunc('hour', CURRENT_TIMESTAMP)
GROUP BY organization_id;

-- Today's summary (for daily widgets)
CREATE VIEW today_summary AS
SELECT 
    organization_id,
    sum(total_events) as total_events,
    sum(critical_events) as critical_events,
    sum(error_events) as error_events,
    sum(warning_events) as warning_events,
    sum(failed_auth_attempts) as failed_auth_attempts,
    sum(active_sources) as active_sources,
    sum(active_hosts) as active_hosts,
    avg(normalization_rate) as avg_normalization_rate,
    avg(enrichment_rate) as avg_enrichment_rate
FROM daily_security_summary
WHERE date_bucket = CURRENT_DATE
GROUP BY organization_id;

-- Last 24 hours trend (for trend widgets)
CREATE VIEW last_24h_trend AS
SELECT 
    time_bucket,
    organization_id,
    sum(event_count) as events,
    sum(error_count) as errors,
    sum(unique_sources) as sources
FROM realtime_security_events
WHERE time_bucket >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY time_bucket, organization_id
ORDER BY time_bucket;

-- Source health overview (for infrastructure monitoring)
CREATE VIEW source_health_overview AS
SELECT 
    source_identifier,
    source_type,
    organization_id,
    max(last_event_time) as last_seen,
    avg(event_count) as avg_events_per_5min,
    avg(avg_ingestion_lag_seconds) as avg_lag_seconds,
    CASE 
        WHEN max(last_event_time) < CURRENT_TIMESTAMP - INTERVAL '10 minutes' THEN 'OFFLINE'
        WHEN avg(avg_ingestion_lag_seconds) > 300 THEN 'DEGRADED'
        ELSE 'HEALTHY'
    END as health_status
FROM source_health_metrics
WHERE time_bucket >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY source_identifier, source_type, organization_id;

-- COMMENT: These continuous aggregates will dramatically improve dashboard performance
-- by pre-computing common metrics and time-series data. The refresh policies ensure
-- data is kept current while balancing computational overhead.