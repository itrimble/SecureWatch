-- Data Retention Policies for SecureWatch SIEM
-- TimescaleDB continuous aggregates and retention policies

-- Create log events hypertable
CREATE TABLE IF NOT EXISTS log_events (
    id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    organization_id UUID NOT NULL,
    source VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT,
    host_name VARCHAR(255),
    host_ip INET,
    user_name VARCHAR(255),
    event_data JSONB,
    metadata JSONB,
    enrichments JSONB,
    risk_score INTEGER,
    retention_tier VARCHAR(20) DEFAULT 'hot',
    compressed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable partitioned by timestamp
SELECT create_hypertable('log_events', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for common queries
CREATE INDEX idx_log_events_org_time ON log_events (organization_id, timestamp DESC);
CREATE INDEX idx_log_events_source_time ON log_events (source, timestamp DESC);
CREATE INDEX idx_log_events_severity_time ON log_events (severity, timestamp DESC);
CREATE INDEX idx_log_events_category_time ON log_events (category, timestamp DESC);
CREATE INDEX idx_log_events_host_time ON log_events (host_name, timestamp DESC);
CREATE INDEX idx_log_events_user_time ON log_events (user_name, timestamp DESC);
CREATE INDEX idx_log_events_risk_score ON log_events (risk_score) WHERE risk_score > 50;
CREATE INDEX idx_log_events_gin ON log_events USING gin (event_data);

-- Create continuous aggregates for different time intervals

-- Hourly aggregates
CREATE MATERIALIZED VIEW log_events_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    organization_id,
    source,
    severity,
    category,
    COUNT(*) as event_count,
    AVG(risk_score) as avg_risk_score,
    MAX(risk_score) as max_risk_score,
    COUNT(DISTINCT host_name) as unique_hosts,
    COUNT(DISTINCT user_name) as unique_users
FROM log_events
GROUP BY hour, organization_id, source, severity, category
WITH NO DATA;

-- Daily aggregates
CREATE MATERIALIZED VIEW log_events_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS day,
    organization_id,
    source,
    severity,
    category,
    COUNT(*) as event_count,
    AVG(risk_score) as avg_risk_score,
    MAX(risk_score) as max_risk_score,
    COUNT(DISTINCT host_name) as unique_hosts,
    COUNT(DISTINCT user_name) as unique_users,
    jsonb_object_agg(
        CASE 
            WHEN severity = 'critical' THEN 'critical_count'
            WHEN severity = 'high' THEN 'high_count'
            WHEN severity = 'medium' THEN 'medium_count'
            WHEN severity = 'low' THEN 'low_count'
            ELSE 'info_count'
        END,
        event_count
    ) as severity_breakdown
FROM log_events
GROUP BY day, organization_id, source, severity, category
WITH NO DATA;

-- Create retention policies for different tiers

-- Hot tier: Keep raw data for 7 days
SELECT add_retention_policy('log_events',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Compression policy: Compress chunks older than 1 day
SELECT add_compression_policy('log_events',
    INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Continuous aggregate refresh policies
SELECT add_continuous_aggregate_policy('log_events_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

SELECT add_continuous_aggregate_policy('log_events_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create archive tables for long-term storage

-- Warm tier: 8-30 days (compressed, indexed)
CREATE TABLE IF NOT EXISTS log_events_warm (
    LIKE log_events INCLUDING ALL
);

SELECT create_hypertable('log_events_warm', 'timestamp',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Cold tier: 31-90 days (heavily compressed, minimal indexes)
CREATE TABLE IF NOT EXISTS log_events_cold (
    id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    organization_id UUID NOT NULL,
    source VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT,
    event_data JSONB,
    risk_score INTEGER,
    PRIMARY KEY (id, timestamp)
);

SELECT create_hypertable('log_events_cold', 'timestamp',
    chunk_time_interval => INTERVAL '30 days',
    if_not_exists => TRUE
);

-- Only essential indexes for cold tier
CREATE INDEX idx_log_events_cold_org_time ON log_events_cold (organization_id, timestamp DESC);

-- Frozen tier: 90+ days (maximum compression, minimal access)
CREATE TABLE IF NOT EXISTS log_events_frozen (
    month DATE NOT NULL,
    organization_id UUID NOT NULL,
    aggregated_data JSONB NOT NULL,
    event_count BIGINT NOT NULL,
    compressed_logs BYTEA,
    PRIMARY KEY (month, organization_id)
);

-- Create functions for tier migration

-- Function to move data from hot to warm tier
CREATE OR REPLACE FUNCTION migrate_to_warm_tier(older_than INTERVAL)
RETURNS void AS $$
BEGIN
    -- Move data older than specified interval
    INSERT INTO log_events_warm
    SELECT * FROM log_events
    WHERE timestamp < NOW() - older_than
    AND retention_tier = 'hot'
    ON CONFLICT (id, timestamp) DO NOTHING;
    
    -- Update retention tier
    UPDATE log_events
    SET retention_tier = 'warm'
    WHERE timestamp < NOW() - older_than
    AND retention_tier = 'hot';
    
    -- Delete from hot tier (handled by retention policy)
END;
$$ LANGUAGE plpgsql;

-- Function to move data from warm to cold tier
CREATE OR REPLACE FUNCTION migrate_to_cold_tier(older_than INTERVAL)
RETURNS void AS $$
BEGIN
    -- Move data with reduced fields
    INSERT INTO log_events_cold
    SELECT 
        id, timestamp, organization_id, source, severity,
        category, message, event_data, risk_score
    FROM log_events_warm
    WHERE timestamp < NOW() - older_than
    ON CONFLICT (id, timestamp) DO NOTHING;
    
    -- Delete from warm tier
    DELETE FROM log_events_warm
    WHERE timestamp < NOW() - older_than;
END;
$$ LANGUAGE plpgsql;

-- Function to archive to frozen tier
CREATE OR REPLACE FUNCTION archive_to_frozen_tier(archive_month DATE)
RETURNS void AS $$
DECLARE
    org_record RECORD;
BEGIN
    -- Aggregate and compress data by organization
    FOR org_record IN 
        SELECT DISTINCT organization_id 
        FROM log_events_cold 
        WHERE timestamp >= archive_month 
        AND timestamp < archive_month + INTERVAL '1 month'
    LOOP
        INSERT INTO log_events_frozen (month, organization_id, aggregated_data, event_count, compressed_logs)
        SELECT
            archive_month,
            org_record.organization_id,
            jsonb_build_object(
                'total_events', COUNT(*),
                'severity_breakdown', jsonb_object_agg(severity, count(*)),
                'category_breakdown', jsonb_object_agg(category, count(*)),
                'source_breakdown', jsonb_object_agg(source, count(*)),
                'avg_risk_score', AVG(risk_score),
                'max_risk_score', MAX(risk_score),
                'unique_hosts', COUNT(DISTINCT (event_data->>'host_name')),
                'unique_users', COUNT(DISTINCT (event_data->>'user_name'))
            ),
            COUNT(*),
            -- Compress logs using pg_compress
            compress(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'timestamp', timestamp,
                    'severity', severity,
                    'message', message,
                    'risk_score', risk_score
                )
            )::text::bytea)
        FROM log_events_cold
        WHERE organization_id = org_record.organization_id
        AND timestamp >= archive_month
        AND timestamp < archive_month + INTERVAL '1 month'
        ON CONFLICT (month, organization_id) DO UPDATE
        SET 
            aggregated_data = EXCLUDED.aggregated_data,
            event_count = EXCLUDED.event_count,
            compressed_logs = EXCLUDED.compressed_logs;
    END LOOP;
    
    -- Delete from cold tier
    DELETE FROM log_events_cold
    WHERE timestamp >= archive_month
    AND timestamp < archive_month + INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled jobs for tier migration
SELECT cron.schedule('migrate-to-warm', '0 2 * * *', 
    $$SELECT migrate_to_warm_tier(INTERVAL '7 days');$$
);

SELECT cron.schedule('migrate-to-cold', '0 3 * * *',
    $$SELECT migrate_to_cold_tier(INTERVAL '30 days');$$
);

SELECT cron.schedule('archive-to-frozen', '0 4 1 * *',
    $$SELECT archive_to_frozen_tier((NOW() - INTERVAL '90 days')::date);$$
);

-- Create views for unified access across tiers

CREATE OR REPLACE VIEW log_events_all AS
SELECT *, 'hot' as tier FROM log_events
UNION ALL
SELECT *, 'warm' as tier FROM log_events_warm
UNION ALL
SELECT 
    id, timestamp, organization_id, source, severity,
    category, message, NULL as host_name, NULL as host_ip,
    NULL as user_name, event_data, NULL as metadata,
    NULL as enrichments, risk_score, 'cold' as retention_tier,
    TRUE as compressed, 'cold' as tier
FROM log_events_cold;

-- Performance optimization settings
ALTER TABLE log_events SET (
    autovacuum_enabled = true,
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);

-- Create function to estimate storage usage
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE (
    tier VARCHAR,
    total_size TEXT,
    total_rows BIGINT,
    oldest_record TIMESTAMPTZ,
    newest_record TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'hot'::VARCHAR as tier,
           pg_size_pretty(pg_total_relation_size('log_events')) as total_size,
           COUNT(*) as total_rows,
           MIN(timestamp) as oldest_record,
           MAX(timestamp) as newest_record
    FROM log_events
    UNION ALL
    SELECT 'warm'::VARCHAR,
           pg_size_pretty(pg_total_relation_size('log_events_warm')),
           COUNT(*),
           MIN(timestamp),
           MAX(timestamp)
    FROM log_events_warm
    UNION ALL
    SELECT 'cold'::VARCHAR,
           pg_size_pretty(pg_total_relation_size('log_events_cold')),
           COUNT(*),
           MIN(timestamp),
           MAX(timestamp)
    FROM log_events_cold
    UNION ALL
    SELECT 'frozen'::VARCHAR,
           pg_size_pretty(pg_total_relation_size('log_events_frozen')),
           SUM(event_count),
           MIN(month),
           MAX(month + INTERVAL '1 month' - INTERVAL '1 day')
    FROM log_events_frozen;
END;
$$ LANGUAGE plpgsql;