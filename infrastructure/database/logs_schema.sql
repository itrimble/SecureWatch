-- Log Storage Schema for SecureWatch SIEM
-- TimescaleDB hypertable for time-series log data

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Main logs table (TimescaleDB hypertable)
CREATE TABLE logs (
    id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source_identifier VARCHAR(255) NOT NULL, -- e.g., 'macos-agent-001', 'windows-dc-01'
    source_type VARCHAR(100) NOT NULL,       -- e.g., 'macos-system', 'windows-event', 'syslog'
    log_level VARCHAR(20),                   -- e.g., 'ERROR', 'WARNING', 'INFO', 'DEBUG'
    message TEXT NOT NULL,                   -- Raw log message
    facility VARCHAR(50),                    -- Syslog facility
    severity INTEGER,                        -- Syslog severity
    hostname VARCHAR(255),                   -- Source hostname
    process_name VARCHAR(255),               -- Process that generated the log
    process_id INTEGER,                      -- Process ID
    user_name VARCHAR(255),                  -- User context
    
    -- Structured data fields
    event_id VARCHAR(50),                    -- Windows Event ID or similar
    event_category VARCHAR(100),             -- Category classification
    event_subcategory VARCHAR(100),          -- Subcategory classification
    
    -- Network fields
    source_ip INET,
    destination_ip INET,
    source_port INTEGER,
    destination_port INTEGER,
    protocol VARCHAR(20),
    
    -- File/Path fields
    file_path TEXT,
    file_hash VARCHAR(128),
    
    -- Authentication fields
    auth_user VARCHAR(255),
    auth_domain VARCHAR(255),
    auth_method VARCHAR(100),
    auth_result VARCHAR(50),
    
    -- Extended attributes (flexible JSON)
    attributes JSONB DEFAULT '{}',
    
    -- Processing metadata
    ingested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    normalized BOOLEAN DEFAULT false,
    enriched BOOLEAN DEFAULT false,
    
    -- Full-text search
    search_vector tsvector,
    
    PRIMARY KEY (timestamp, id)
);

-- Convert to hypertable (partition by time)
SELECT create_hypertable('logs', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Create indexes for common queries
CREATE INDEX idx_logs_timestamp ON logs (timestamp DESC);
CREATE INDEX idx_logs_org_time ON logs (organization_id, timestamp DESC);
CREATE INDEX idx_logs_source ON logs (source_identifier, timestamp DESC);
CREATE INDEX idx_logs_source_type ON logs (source_type, timestamp DESC);
CREATE INDEX idx_logs_level ON logs (log_level, timestamp DESC);
CREATE INDEX idx_logs_hostname ON logs (hostname, timestamp DESC);
CREATE INDEX idx_logs_process ON logs (process_name, timestamp DESC);
CREATE INDEX idx_logs_event_id ON logs (event_id, timestamp DESC);
CREATE INDEX idx_logs_user ON logs (user_name, timestamp DESC);
CREATE INDEX idx_logs_source_ip ON logs (source_ip, timestamp DESC);
CREATE INDEX idx_logs_dest_ip ON logs (destination_ip, timestamp DESC);

-- GIN index for JSONB attributes
CREATE INDEX idx_logs_attributes ON logs USING GIN (attributes);

-- Full-text search index
CREATE INDEX idx_logs_search ON logs USING GIN (search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_log_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.message, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.source_identifier, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.hostname, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.process_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.user_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.event_category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
CREATE TRIGGER trigger_update_log_search_vector
    BEFORE INSERT OR UPDATE ON logs
    FOR EACH ROW EXECUTE FUNCTION update_log_search_vector();

-- Log aggregation table for metrics
CREATE TABLE log_metrics (
    bucket TIMESTAMPTZ NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source_type VARCHAR(100),
    log_level VARCHAR(20),
    event_category VARCHAR(100),
    count BIGINT DEFAULT 0,
    PRIMARY KEY (bucket, organization_id, source_type, log_level, event_category)
);

-- Convert metrics to hypertable
SELECT create_hypertable('log_metrics', 'bucket', chunk_time_interval => INTERVAL '1 day');

-- Alert rules table
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query TEXT NOT NULL,                     -- KQL or SQL query
    condition_operator VARCHAR(20) NOT NULL, -- e.g., '>', '<', '>=', '<=', '=='
    condition_value NUMERIC NOT NULL,
    time_window INTERVAL DEFAULT '5 minutes',
    severity VARCHAR(20) DEFAULT 'medium',   -- low, medium, high, critical
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Alert instances table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',       -- open, acknowledged, resolved, false_positive
    message TEXT NOT NULL,
    query_result JSONB,                      -- Result data that triggered the alert
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Convert alerts to hypertable
SELECT create_hypertable('alerts', 'triggered_at', chunk_time_interval => INTERVAL '1 week');

-- Indexes for alerts
CREATE INDEX idx_alerts_rule ON alerts (rule_id, triggered_at DESC);
CREATE INDEX idx_alerts_org ON alerts (organization_id, triggered_at DESC);
CREATE INDEX idx_alerts_status ON alerts (status, triggered_at DESC);
CREATE INDEX idx_alerts_severity ON alerts (severity, triggered_at DESC);

-- Log retention policies
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source_type VARCHAR(100),
    log_level VARCHAR(20),
    retention_days INTEGER NOT NULL,
    compression_after_days INTEGER DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Function for log retention cleanup
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
DECLARE
    policy RECORD;
    cutoff_date TIMESTAMPTZ;
BEGIN
    FOR policy IN 
        SELECT * FROM retention_policies 
        WHERE retention_days > 0
    LOOP
        cutoff_date := CURRENT_TIMESTAMP - (policy.retention_days || ' days')::INTERVAL;
        
        DELETE FROM logs 
        WHERE timestamp < cutoff_date
          AND (policy.source_type IS NULL OR source_type = policy.source_type)
          AND (policy.log_level IS NULL OR log_level = policy.log_level)
          AND organization_id = policy.organization_id;
          
        RAISE NOTICE 'Cleaned up logs older than % for org % (source_type: %, log_level: %)', 
                     cutoff_date, policy.organization_id, policy.source_type, policy.log_level;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Continuous aggregate for hourly log counts
CREATE MATERIALIZED VIEW hourly_log_counts
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    organization_id,
    source_type,
    log_level,
    count(*) as log_count
FROM logs
GROUP BY bucket, organization_id, source_type, log_level;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('hourly_log_counts',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Daily rollup for long-term metrics
CREATE MATERIALIZED VIEW daily_log_counts
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS bucket,
    organization_id,
    source_type,
    log_level,
    count(*) as log_count,
    count(DISTINCT source_identifier) as unique_sources
FROM logs
GROUP BY bucket, organization_id, source_type, log_level;

-- Refresh policy for daily aggregate
SELECT add_continuous_aggregate_policy('daily_log_counts',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Insert default organization for development
INSERT INTO organizations (id, name, domain, subscription_tier) 
VALUES (
    'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid,
    'Development Organization',
    'localhost',
    'enterprise'
) ON CONFLICT DO NOTHING;

-- Insert default retention policy
INSERT INTO retention_policies (organization_id, retention_days, compression_after_days)
VALUES (
    'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid,
    90,  -- Keep logs for 90 days
    7    -- Compress after 7 days
) ON CONFLICT DO NOTHING;