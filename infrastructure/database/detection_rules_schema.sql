-- Detection Rules Schema for Community-Sourced Rules
-- Stores converted rules from Sigma, Elastic, OSSEC, Suricata, Splunk, Chronicle
-- This complements existing custom rules, doesn't replace them

-- Create detection_rules table for community rules
CREATE TABLE IF NOT EXISTS detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(255) UNIQUE NOT NULL, -- Original rule ID or generated
    title VARCHAR(500) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    date TIMESTAMP,
    modified TIMESTAMP,
    
    -- Rule classification
    category VARCHAR(100),
    product VARCHAR(100),
    service VARCHAR(100),
    
    -- Severity and risk assessment
    level VARCHAR(20) CHECK (level IN ('low', 'medium', 'high', 'critical')),
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    
    -- MITRE ATT&CK mapping
    mitre_attack_techniques TEXT[], -- Array of technique IDs like T1059.001
    mitre_attack_tactics TEXT[],    -- Array of tactic IDs like TA0002
    
    -- Rule logic (converted to our native format)
    detection_query TEXT NOT NULL,  -- KQL-like query in our native format
    condition TEXT NOT NULL,        -- Logical condition
    timeframe INTERVAL,             -- Time window for aggregation
    aggregation_field VARCHAR(255), -- Field to aggregate on
    aggregation_operation VARCHAR(20) CHECK (aggregation_operation IN ('count', 'sum', 'avg', 'min', 'max')),
    aggregation_threshold INTEGER,  -- Threshold for triggering
    
    -- Source information
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('sigma', 'elastic', 'ossec', 'suricata', 'splunk', 'chronicle', 'custom')),
    source_url TEXT,                -- URL to original rule
    source_version VARCHAR(50),     -- Version of source repository
    original_rule JSONB NOT NULL,   -- Original rule in its native format
    
    -- Rule metadata
    tags TEXT[],                    -- Array of tags
    references TEXT[],              -- Array of reference URLs
    false_positives TEXT[],         -- Known false positive scenarios
    
    -- Management flags
    enabled BOOLEAN DEFAULT true,
    custom_modified BOOLEAN DEFAULT false, -- User has customized this rule
    last_tested TIMESTAMP,
    test_status VARCHAR(20) CHECK (test_status IN ('passed', 'failed', 'pending')),
    
    -- Performance metrics
    match_count BIGINT DEFAULT 0,
    last_match TIMESTAMP,
    average_execution_time NUMERIC(10,3), -- in milliseconds
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Full-text search
    search_vector tsvector
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_detection_rules_rule_id ON detection_rules(rule_id);
CREATE INDEX IF NOT EXISTS idx_detection_rules_enabled ON detection_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_detection_rules_source_type ON detection_rules(source_type);
CREATE INDEX IF NOT EXISTS idx_detection_rules_level ON detection_rules(level);
CREATE INDEX IF NOT EXISTS idx_detection_rules_category ON detection_rules(category);
CREATE INDEX IF NOT EXISTS idx_detection_rules_product ON detection_rules(product);
CREATE INDEX IF NOT EXISTS idx_detection_rules_mitre_techniques ON detection_rules USING GIN(mitre_attack_techniques);
CREATE INDEX IF NOT EXISTS idx_detection_rules_mitre_tactics ON detection_rules USING GIN(mitre_attack_tactics);
CREATE INDEX IF NOT EXISTS idx_detection_rules_tags ON detection_rules USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_detection_rules_search ON detection_rules USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_detection_rules_created_at ON detection_rules(created_at);
CREATE INDEX IF NOT EXISTS idx_detection_rules_last_match ON detection_rules(last_match);

-- Update search vector automatically
CREATE OR REPLACE FUNCTION update_detection_rules_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detection_rules_search_vector
    BEFORE INSERT OR UPDATE ON detection_rules
    FOR EACH ROW EXECUTE FUNCTION update_detection_rules_search_vector();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_detection_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detection_rules_updated_at
    BEFORE UPDATE ON detection_rules
    FOR EACH ROW EXECUTE FUNCTION update_detection_rules_updated_at();

-- Table for tracking rule import batches
CREATE TABLE IF NOT EXISTS rule_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(20) NOT NULL,
    source_url TEXT,
    source_version VARCHAR(50),
    total_rules INTEGER NOT NULL,
    successful_imports INTEGER NOT NULL,
    failed_imports INTEGER NOT NULL,
    skipped_rules INTEGER NOT NULL,
    import_duration INTERVAL,
    error_summary JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rule_import_batches_source_type ON rule_import_batches(source_type);
CREATE INDEX IF NOT EXISTS idx_rule_import_batches_created_at ON rule_import_batches(created_at);

-- Table for rule execution history and performance
CREATE TABLE IF NOT EXISTS rule_execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(255) NOT NULL REFERENCES detection_rules(rule_id),
    execution_time NUMERIC(10,3) NOT NULL, -- milliseconds
    matches_found INTEGER DEFAULT 0,
    events_processed INTEGER DEFAULT 0,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

-- Partition by month for performance
SELECT create_hypertable('rule_execution_history', 'executed_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_rule_execution_history_rule_id ON rule_execution_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_history_executed_at ON rule_execution_history(executed_at);

-- Table for rule testing results
CREATE TABLE IF NOT EXISTS rule_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(255) NOT NULL REFERENCES detection_rules(rule_id),
    test_type VARCHAR(50) NOT NULL, -- 'validation', 'performance', 'accuracy'
    test_passed BOOLEAN NOT NULL,
    execution_time NUMERIC(10,3),
    matches_found INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    error_message TEXT,
    test_data JSONB, -- Sample data used for testing
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rule_test_results_rule_id ON rule_test_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_test_results_test_type ON rule_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_rule_test_results_tested_at ON rule_test_results(tested_at);

-- Views for common queries

-- Active rules by source type
CREATE VIEW active_rules_by_source AS
SELECT 
    source_type,
    COUNT(*) as total_rules,
    COUNT(CASE WHEN enabled THEN 1 END) as enabled_rules,
    COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_rules,
    COUNT(CASE WHEN level = 'high' THEN 1 END) as high_rules,
    AVG(severity) as average_severity,
    MAX(imported_at) as last_import
FROM detection_rules
GROUP BY source_type;

-- Rule performance summary
CREATE VIEW rule_performance_summary AS
SELECT 
    dr.rule_id,
    dr.title,
    dr.source_type,
    dr.level,
    dr.enabled,
    dr.match_count,
    dr.last_match,
    dr.average_execution_time,
    COUNT(reh.id) as total_executions,
    AVG(reh.execution_time) as avg_execution_time,
    SUM(reh.matches_found) as total_matches,
    MAX(reh.executed_at) as last_execution
FROM detection_rules dr
LEFT JOIN rule_execution_history reh ON dr.rule_id = reh.rule_id
GROUP BY dr.rule_id, dr.title, dr.source_type, dr.level, dr.enabled, 
         dr.match_count, dr.last_match, dr.average_execution_time;

-- MITRE ATT&CK coverage
CREATE VIEW mitre_attack_coverage AS
SELECT 
    unnest(mitre_attack_techniques) as technique_id,
    COUNT(*) as rule_count,
    COUNT(CASE WHEN enabled THEN 1 END) as enabled_rule_count,
    string_agg(DISTINCT source_type, ', ') as source_types,
    AVG(severity) as average_severity
FROM detection_rules
WHERE mitre_attack_techniques IS NOT NULL
GROUP BY unnest(mitre_attack_techniques)
ORDER BY rule_count DESC;

-- Recent rule activities
CREATE VIEW recent_rule_activities AS
SELECT 
    'import' as activity_type,
    NULL as rule_id,
    source_type as detail,
    successful_imports as count,
    created_at as activity_time
FROM rule_import_batches
WHERE created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'match' as activity_type,
    rule_id,
    title as detail,
    1 as count,
    last_match as activity_time
FROM detection_rules
WHERE last_match >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'test' as activity_type,
    rule_id,
    test_type as detail,
    1 as count,
    tested_at as activity_time
FROM rule_test_results
WHERE tested_at >= NOW() - INTERVAL '7 days'

ORDER BY activity_time DESC;

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON detection_rules TO securewatch_app;
-- GRANT SELECT, INSERT ON rule_import_batches TO securewatch_app;
-- GRANT SELECT, INSERT ON rule_execution_history TO securewatch_app;
-- GRANT SELECT, INSERT ON rule_test_results TO securewatch_app;
-- GRANT SELECT ON active_rules_by_source TO securewatch_app;
-- GRANT SELECT ON rule_performance_summary TO securewatch_app;
-- GRANT SELECT ON mitre_attack_coverage TO securewatch_app;
-- GRANT SELECT ON recent_rule_activities TO securewatch_app;