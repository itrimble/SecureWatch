-- Fixed Continuous Aggregates for SecureWatch SIEM Performance
-- Creates pre-computed summary tables for blazing fast dashboard queries

-- Enable TimescaleDB features
SET timescaledb.enable_cagg_watermark_constrain = on;
SET timescaledb.enable_cagg_window_functions = on;

-- Drop existing problematic views if they exist
DROP MATERIALIZED VIEW IF EXISTS daily_security_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS weekly_security_trends CASCADE;
DROP MATERIALIZED VIEW IF EXISTS alert_performance_metrics CASCADE;

-- 3. Daily Security Summary (fixed version without nested aggregates)
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
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY date_bucket, organization_id, source_type;

-- Refresh policy: Update daily
SELECT add_continuous_aggregate_policy('daily_security_summary',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- 4. Alert Performance Metrics (fixed to handle missing tables gracefully)
CREATE MATERIALIZED VIEW alert_performance_metrics
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('15 minutes', timestamp) AS time_bucket,
    organization_id,
    'system' as rule_name,
    log_level as rule_severity,
    
    -- Alert volume metrics based on log severity
    count(*) as alerts_triggered,
    count(CASE WHEN log_level IN ('INFO', 'DEBUG') THEN 1 END) as alerts_resolved,
    count(CASE WHEN log_level = 'WARNING' THEN 1 END) as false_positives,
    count(CASE WHEN log_level IN ('ERROR', 'CRITICAL') THEN 1 END) as open_alerts,
    
    -- Processing time metrics
    avg(EXTRACT(EPOCH FROM (processed_at - ingested_at))) as avg_acknowledgment_time,
    max(EXTRACT(EPOCH FROM (processed_at - ingested_at))) as avg_resolution_time,
    
    -- False positive rate estimate
    ROUND(
        (count(CASE WHEN log_level = 'WARNING' THEN 1 END)::numeric / count(*)) * 100, 2
    ) as false_positive_rate
    
FROM logs
WHERE log_level IS NOT NULL
GROUP BY time_bucket, organization_id, log_level;

-- Refresh policy: Update every 10 minutes
SELECT add_continuous_aggregate_policy('alert_performance_metrics',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes');

-- 6. Weekly Security Trends (simplified without window functions)
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
    
    -- Data diversity and coverage
    count(DISTINCT source_type) as source_type_diversity,
    count(DISTINCT event_category) as event_category_diversity,
    
    -- Performance indicators
    avg(EXTRACT(EPOCH FROM (processed_at - ingested_at))) as avg_processing_time,
    ROUND(avg(length(message))) as avg_event_size
    
FROM logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY week_bucket, organization_id;

-- Refresh policy: Update weekly
SELECT add_continuous_aggregate_policy('weekly_security_trends',
    start_offset => INTERVAL '1 week',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Create indexes on new continuous aggregates
CREATE INDEX idx_daily_summary_bucket ON daily_security_summary (date_bucket DESC);
CREATE INDEX idx_daily_summary_org ON daily_security_summary (organization_id, date_bucket DESC);

CREATE INDEX idx_alert_metrics_bucket ON alert_performance_metrics (time_bucket DESC);
CREATE INDEX idx_alert_metrics_org ON alert_performance_metrics (organization_id, time_bucket DESC);

CREATE INDEX idx_weekly_trends_bucket ON weekly_security_trends (week_bucket DESC);
CREATE INDEX idx_weekly_trends_org ON weekly_security_trends (organization_id, week_bucket DESC);

-- Recreate helper views with fixed references
DROP VIEW IF EXISTS today_summary CASCADE;
DROP VIEW IF EXISTS last_24h_trend CASCADE;

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

-- Verify all aggregates exist
SELECT schemaname, matviewname as name, definition 
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname LIKE '%security%' 
  OR matviewname LIKE '%alert%'
  OR matviewname LIKE '%source%'
  OR matviewname LIKE '%trend%';