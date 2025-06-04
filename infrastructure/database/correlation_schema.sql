-- SecureWatch SIEM - Correlation & Rules Engine Schema
-- Version: 1.0.0
-- Created: June 2025
-- Purpose: Database schema for correlation rules engine

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORRELATION RULES ENGINE TABLES
-- =====================================================

-- Correlation Rules Definition
CREATE TABLE IF NOT EXISTS correlation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'simple', 'complex', 'ml-based', 'threshold', 'sequence'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    enabled BOOLEAN DEFAULT true,
    rule_logic JSONB NOT NULL, -- Stores rule conditions and logic
    time_window_minutes INTEGER, -- Time window for correlation
    event_count_threshold INTEGER, -- Minimum events to trigger
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Rule Conditions
CREATE TABLE IF NOT EXISTS rule_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES correlation_rules(id) ON DELETE CASCADE,
    condition_type VARCHAR(50) NOT NULL, -- 'field_match', 'regex', 'threshold', 'time_sequence'
    field_name VARCHAR(255),
    operator VARCHAR(20), -- 'equals', 'contains', 'greater_than', 'less_than', 'regex_match'
    value TEXT,
    condition_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Correlation Patterns
CREATE TABLE IF NOT EXISTS correlation_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pattern_type VARCHAR(50) NOT NULL, -- 'attack_chain', 'anomaly', 'behavioral', 'statistical'
    detection_logic JSONB NOT NULL,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.75,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Correlation Incidents
CREATE TABLE IF NOT EXISTS correlation_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES correlation_rules(id),
    pattern_id UUID REFERENCES correlation_patterns(id),
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
    title VARCHAR(500) NOT NULL,
    description TEXT,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    event_count INTEGER DEFAULT 1,
    affected_assets TEXT[],
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Correlated Events
CREATE TABLE IF NOT EXISTS correlated_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES correlation_incidents(id) ON DELETE CASCADE,
    event_id UUID NOT NULL, -- Reference to log_entries.id
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(100),
    event_source VARCHAR(255),
    relevance_score DECIMAL(3,2) DEFAULT 1.0,
    correlation_metadata JSONB DEFAULT '{}'::jsonb
);

-- Rule Templates
CREATE TABLE IF NOT EXISTS rule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'authentication', 'network', 'malware', 'data_exfiltration'
    description TEXT,
    template_logic JSONB NOT NULL,
    required_fields TEXT[],
    optional_fields TEXT[],
    default_severity VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT true
);

-- Correlation Actions
CREATE TABLE IF NOT EXISTS correlation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES correlation_rules(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'alert', 'email', 'webhook', 'script', 'block'
    action_config JSONB NOT NULL,
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Correlation History
CREATE TABLE IF NOT EXISTS correlation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES correlation_rules(id),
    incident_id UUID REFERENCES correlation_incidents(id),
    action_id UUID REFERENCES correlation_actions(id),
    action_type VARCHAR(50) NOT NULL,
    action_status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending'
    action_result JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER
);

-- Rule Performance Metrics
CREATE TABLE IF NOT EXISTS rule_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES correlation_rules(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    total_evaluations BIGINT DEFAULT 0,
    true_positives INTEGER DEFAULT 0,
    false_positives INTEGER DEFAULT 0,
    average_execution_time_ms DECIMAL(10,2),
    memory_usage_mb DECIMAL(10,2),
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rule_id, evaluation_date)
);

-- Attack Chain Tracking
CREATE TABLE IF NOT EXISTS attack_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_name VARCHAR(255) NOT NULL,
    mitre_tactics TEXT[],
    mitre_techniques TEXT[],
    stage_count INTEGER NOT NULL,
    current_stage INTEGER DEFAULT 1,
    first_detection TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'contained', 'completed'
    risk_score INTEGER DEFAULT 0,
    affected_entities JSONB DEFAULT '[]'::jsonb
);

-- Behavioral Baselines
CREATE TABLE IF NOT EXISTS behavioral_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'host', 'application', 'network'
    entity_id VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    baseline_value JSONB NOT NULL,
    standard_deviation DECIMAL(10,4),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sample_count INTEGER DEFAULT 0,
    confidence_level DECIMAL(3,2) DEFAULT 0.0,
    UNIQUE(entity_type, entity_id, metric_name)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_correlation_rules_enabled ON correlation_rules(enabled);
CREATE INDEX idx_correlation_rules_type ON correlation_rules(type);
CREATE INDEX idx_correlation_rules_severity ON correlation_rules(severity);
CREATE INDEX idx_correlation_rules_tags ON correlation_rules USING GIN(tags);

CREATE INDEX idx_rule_conditions_rule_id ON rule_conditions(rule_id);
CREATE INDEX idx_rule_conditions_field_name ON rule_conditions(field_name);

CREATE INDEX idx_correlation_incidents_status ON correlation_incidents(status);
CREATE INDEX idx_correlation_incidents_severity ON correlation_incidents(severity);
CREATE INDEX idx_correlation_incidents_first_seen ON correlation_incidents(first_seen);
CREATE INDEX idx_correlation_incidents_assigned_to ON correlation_incidents(assigned_to);

CREATE INDEX idx_correlated_events_incident_id ON correlated_events(incident_id);
CREATE INDEX idx_correlated_events_event_id ON correlated_events(event_id);
CREATE INDEX idx_correlated_events_timestamp ON correlated_events(event_timestamp);

CREATE INDEX idx_correlation_history_rule_id ON correlation_history(rule_id);
CREATE INDEX idx_correlation_history_incident_id ON correlation_history(incident_id);
CREATE INDEX idx_correlation_history_executed_at ON correlation_history(executed_at);

CREATE INDEX idx_rule_performance_rule_date ON rule_performance_metrics(rule_id, evaluation_date);
CREATE INDEX idx_attack_chains_status ON attack_chains(status);
CREATE INDEX idx_behavioral_baselines_entity ON behavioral_baselines(entity_type, entity_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_correlation_rules_updated_at BEFORE UPDATE
    ON correlation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_correlation_incidents_updated_at BEFORE UPDATE
    ON correlation_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- Active Rules Summary View
CREATE OR REPLACE VIEW v_active_rules_summary AS
SELECT 
    cr.id,
    cr.name,
    cr.type,
    cr.severity,
    cr.enabled,
    COUNT(DISTINCT ci.id) as total_incidents,
    COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'open') as open_incidents,
    MAX(ci.created_at) as last_triggered,
    rpm.true_positives,
    rpm.false_positives,
    rpm.average_execution_time_ms
FROM correlation_rules cr
LEFT JOIN correlation_incidents ci ON cr.id = ci.rule_id
LEFT JOIN rule_performance_metrics rpm ON cr.id = rpm.rule_id 
    AND rpm.evaluation_date = CURRENT_DATE
WHERE cr.enabled = true
GROUP BY cr.id, cr.name, cr.type, cr.severity, cr.enabled, 
         rpm.true_positives, rpm.false_positives, rpm.average_execution_time_ms;

-- Incident Timeline View
CREATE OR REPLACE VIEW v_incident_timeline AS
SELECT 
    ci.id as incident_id,
    ci.title,
    ci.severity,
    ci.status,
    ci.first_seen,
    ci.last_seen,
    ci.event_count,
    cr.name as rule_name,
    cp.name as pattern_name,
    EXTRACT(EPOCH FROM (ci.last_seen - ci.first_seen)) as duration_seconds
FROM correlation_incidents ci
LEFT JOIN correlation_rules cr ON ci.rule_id = cr.id
LEFT JOIN correlation_patterns cp ON ci.pattern_id = cp.id
ORDER BY ci.first_seen DESC;

-- =====================================================
-- SAMPLE DATA - PREDEFINED CORRELATION RULES
-- =====================================================

-- Insert default rule templates
INSERT INTO rule_templates (name, category, description, template_logic, required_fields, default_severity) VALUES
('Brute Force Attack', 'authentication', 'Detects multiple failed login attempts', 
 '{"conditions": [{"field": "event_id", "operator": "equals", "value": "4625"}], "threshold": 5, "time_window": 5}'::jsonb,
 ARRAY['event_id', 'username', 'source_ip'], 'high'),
 
('Suspicious Process Creation', 'malware', 'Detects potentially malicious process creation',
 '{"conditions": [{"field": "event_id", "operator": "equals", "value": "4688"}, {"field": "process_name", "operator": "regex", "value": "(powershell|cmd|wscript|cscript)\\.exe"}]}'::jsonb,
 ARRAY['event_id', 'process_name', 'parent_process'], 'medium'),
 
('Data Exfiltration Pattern', 'data_exfiltration', 'Detects large data transfers to external IPs',
 '{"conditions": [{"field": "bytes_sent", "operator": "greater_than", "value": "10485760"}], "time_window": 60}'::jsonb,
 ARRAY['destination_ip', 'bytes_sent', 'protocol'], 'critical');

-- Insert sample correlation patterns
INSERT INTO correlation_patterns (name, description, pattern_type, detection_logic) VALUES
('Lateral Movement Detection', 'Identifies potential lateral movement activities', 'attack_chain',
 '{"stages": ["authentication", "privilege_escalation", "remote_execution"], "time_window": 120}'::jsonb),
 
('Anomalous User Behavior', 'Detects deviations from normal user behavior patterns', 'behavioral',
 '{"metrics": ["login_time", "access_locations", "resource_usage"], "deviation_threshold": 2.5}'::jsonb);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate incident risk score
CREATE OR REPLACE FUNCTION calculate_incident_risk_score(
    p_severity VARCHAR(20),
    p_event_count INTEGER,
    p_affected_assets_count INTEGER,
    p_duration_minutes INTEGER
) RETURNS INTEGER AS $$
DECLARE
    severity_score INTEGER;
    event_score INTEGER;
    asset_score INTEGER;
    duration_score INTEGER;
BEGIN
    -- Severity scoring
    severity_score := CASE p_severity
        WHEN 'critical' THEN 100
        WHEN 'high' THEN 75
        WHEN 'medium' THEN 50
        WHEN 'low' THEN 25
        ELSE 10
    END;
    
    -- Event count scoring (logarithmic scale)
    event_score := LEAST(CEILING(LN(p_event_count + 1) * 10), 100);
    
    -- Affected assets scoring
    asset_score := LEAST(p_affected_assets_count * 10, 100);
    
    -- Duration scoring (longer duration = higher risk)
    duration_score := LEAST(CEILING(p_duration_minutes / 10), 100);
    
    -- Calculate weighted average
    RETURN CEILING((severity_score * 0.4 + event_score * 0.3 + 
                    asset_score * 0.2 + duration_score * 0.1));
END;
$$ LANGUAGE plpgsql;

-- Function to get correlation rule effectiveness
CREATE OR REPLACE FUNCTION get_rule_effectiveness(p_rule_id UUID)
RETURNS TABLE(
    effectiveness_score DECIMAL,
    accuracy DECIMAL,
    false_positive_rate DECIMAL,
    avg_detection_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN (rpm.true_positives + rpm.false_positives) > 0 
            THEN ROUND((rpm.true_positives::DECIMAL / (rpm.true_positives + rpm.false_positives)) * 100, 2)
            ELSE 0
        END as effectiveness_score,
        CASE 
            WHEN (rpm.true_positives + rpm.false_positives) > 0 
            THEN ROUND((rpm.true_positives::DECIMAL / (rpm.true_positives + rpm.false_positives)) * 100, 2)
            ELSE 0
        END as accuracy,
        CASE 
            WHEN rpm.total_evaluations > 0 
            THEN ROUND((rpm.false_positives::DECIMAL / rpm.total_evaluations) * 100, 2)
            ELSE 0
        END as false_positive_rate,
        AVG(ci.first_seen - ce.event_timestamp) as avg_detection_time
    FROM rule_performance_metrics rpm
    LEFT JOIN correlation_incidents ci ON ci.rule_id = rpm.rule_id
    LEFT JOIN correlated_events ce ON ce.incident_id = ci.id
    WHERE rpm.rule_id = p_rule_id
        AND rpm.evaluation_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY rpm.true_positives, rpm.false_positives, rpm.total_evaluations;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO securewatch;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO securewatch;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO securewatch;