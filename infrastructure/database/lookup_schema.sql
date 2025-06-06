-- Lookup Tables Schema for SecureWatch SIEM
-- This schema supports CSV lookup tables similar to Splunk's functionality

-- Main lookup tables metadata
CREATE TABLE IF NOT EXISTS lookup_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    filename VARCHAR(500) NOT NULL,
    key_field VARCHAR(255) NOT NULL,
    fields JSONB NOT NULL,
    record_count INTEGER DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    tags JSONB DEFAULT '[]'::jsonb,
    query_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrichment rules for automatic field lookups
CREATE TABLE IF NOT EXISTS enrichment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_field VARCHAR(255) NOT NULL,
    lookup_table VARCHAR(255) NOT NULL REFERENCES lookup_tables(name),
    lookup_key_field VARCHAR(255) NOT NULL,
    output_fields JSONB NOT NULL,
    conditions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- API lookup configurations for external services
CREATE TABLE IF NOT EXISTS api_lookup_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    base_url VARCHAR(1000) NOT NULL,
    api_key TEXT,
    headers JSONB DEFAULT '{}'::jsonb,
    query_params JSONB DEFAULT '{}'::jsonb,
    rate_limit_requests INTEGER DEFAULT 100,
    rate_limit_window INTEGER DEFAULT 3600,
    timeout_ms INTEGER DEFAULT 5000,
    cache_ttl INTEGER DEFAULT 300,
    retry_attempts INTEGER DEFAULT 3,
    retry_backoff INTEGER DEFAULT 1000,
    field_mapping JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- Lookup query log for analytics and debugging
CREATE TABLE IF NOT EXISTS lookup_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255),
    key_field VARCHAR(255),
    key_value TEXT,
    result_found BOOLEAN,
    query_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    external_lookup BOOLEAN DEFAULT false,
    api_config_id UUID REFERENCES api_lookup_configs(id),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lookup_tables_name ON lookup_tables(name);
CREATE INDEX IF NOT EXISTS idx_lookup_tables_active ON lookup_tables(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lookup_tables_created_by ON lookup_tables(created_by);
CREATE INDEX IF NOT EXISTS idx_lookup_tables_last_used ON lookup_tables(last_used DESC);

CREATE INDEX IF NOT EXISTS idx_enrichment_rules_active ON enrichment_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_enrichment_rules_priority ON enrichment_rules(priority);
CREATE INDEX IF NOT EXISTS idx_enrichment_rules_source_field ON enrichment_rules(source_field);

CREATE INDEX IF NOT EXISTS idx_api_lookup_configs_active ON api_lookup_configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_lookup_configs_name ON api_lookup_configs(name);

CREATE INDEX IF NOT EXISTS idx_lookup_query_log_table_name ON lookup_query_log(table_name);
CREATE INDEX IF NOT EXISTS idx_lookup_query_log_created_at ON lookup_query_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookup_query_log_cache_hit ON lookup_query_log(cache_hit);

-- Time-series partitioning for query log (optional, for high-volume environments)
-- This can be enabled later if lookup query volume becomes high
-- SELECT create_hypertable('lookup_query_log', 'created_at', if_not_exists => TRUE);

-- Insert some sample API lookup configurations
INSERT INTO api_lookup_configs (
    name, 
    description, 
    base_url, 
    query_params, 
    field_mapping,
    created_by
) VALUES 
(
    'VirusTotal_IP',
    'VirusTotal IP reputation lookup',
    'https://www.virustotal.com/vtapi/v2/ip-address/report',
    '{"apikey": "{api_key}", "ip": "{value}"}'::jsonb,
    '{"input": "ip", "output": {"reputation": "response_code", "country": "country", "as_owner": "as_owner"}}'::jsonb,
    'system'
),
(
    'AbuseIPDB',
    'AbuseIPDB IP reputation and geolocation',
    'https://api.abuseipdb.com/api/v2/check',
    '{"ipAddress": "{value}", "maxAgeInDays": "90"}'::jsonb,
    '{"input": "ip", "output": {"abuse_confidence": "abuseConfidencePercentage", "country_code": "countryCode", "usage_type": "usageType"}}'::jsonb,
    'system'
),
(
    'IPStack_Geolocation',
    'IPStack IP geolocation service',
    'http://api.ipstack.com/{value}',
    '{"access_key": "{api_key}"}'::jsonb,
    '{"input": "ip", "output": {"country": "country_name", "region": "region_name", "city": "city", "latitude": "latitude", "longitude": "longitude"}}'::jsonb,
    'system'
)
ON CONFLICT (name) DO NOTHING;

-- Create a view for active lookup tables with statistics
CREATE OR REPLACE VIEW lookup_tables_summary AS
SELECT 
    lt.*,
    COALESCE(ql.recent_queries, 0) as recent_queries_24h,
    COALESCE(ql.avg_query_time, 0) as avg_query_time_24h,
    COALESCE(ql.cache_hit_rate, 0) as cache_hit_rate_24h
FROM lookup_tables lt
LEFT JOIN (
    SELECT 
        table_name,
        COUNT(*) as recent_queries,
        AVG(query_time_ms) as avg_query_time,
        (COUNT(*) FILTER (WHERE cache_hit = true)::float / COUNT(*) * 100) as cache_hit_rate
    FROM lookup_query_log 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY table_name
) ql ON lt.name = ql.table_name
WHERE lt.is_active = true
ORDER BY lt.last_used DESC;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update timestamps
CREATE TRIGGER update_lookup_tables_updated_at 
    BEFORE UPDATE ON lookup_tables 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrichment_rules_updated_at 
    BEFORE UPDATE ON enrichment_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_lookup_configs_updated_at 
    BEFORE UPDATE ON api_lookup_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to cleanup old query logs (run daily)
CREATE OR REPLACE FUNCTION cleanup_lookup_query_log()
RETURNS void AS $$
BEGIN
    DELETE FROM lookup_query_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO securewatch;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO securewatch;

COMMENT ON TABLE lookup_tables IS 'Metadata for CSV lookup tables uploaded by users';
COMMENT ON TABLE enrichment_rules IS 'Rules for automatic field enrichment during search';
COMMENT ON TABLE api_lookup_configs IS 'Configuration for external API-based lookups';
COMMENT ON TABLE lookup_query_log IS 'Log of all lookup queries for analytics and debugging';
COMMENT ON VIEW lookup_tables_summary IS 'Summary view of lookup tables with recent usage statistics';