-- Extended Normalized Schema for SecureWatch SIEM
-- Supports 50+ security use cases with comprehensive field mapping
-- Built on top of existing logs_schema.sql

-- Add additional columns to the main logs table for comprehensive security use cases
ALTER TABLE logs ADD COLUMN IF NOT EXISTS 
    -- Threat Intelligence Fields
    threat_indicator VARCHAR(255),           -- IOCs, domains, IPs, hashes
    threat_category VARCHAR(100),            -- malware, phishing, apt, etc.
    threat_confidence NUMERIC(3,2),          -- Confidence score 0.00-1.00
    threat_source VARCHAR(100),              -- TI feed source
    threat_ttl TIMESTAMPTZ,                  -- Time-to-live for TI data
    
    -- Identity & Access Management (IAM)
    principal_type VARCHAR(50),              -- user, service_account, system
    principal_id VARCHAR(255),               -- Unique principal identifier
    credential_type VARCHAR(100),            -- password, certificate, token, biometric
    session_id VARCHAR(255),                 -- Login session identifier
    authentication_protocol VARCHAR(50),     -- SAML, OAuth, Kerberos, LDAP
    privilege_escalation BOOLEAN DEFAULT false,
    access_level VARCHAR(50),                -- admin, user, guest, service
    group_membership TEXT[],                 -- User groups/roles array
    
    -- Device & Asset Management
    device_id VARCHAR(255),                  -- Unique device identifier
    device_type VARCHAR(100),                -- laptop, server, mobile, iot
    device_os VARCHAR(100),                  -- Operating system
    device_os_version VARCHAR(100),          -- OS version
    device_manufacturer VARCHAR(100),        -- Device manufacturer
    device_model VARCHAR(100),               -- Device model
    device_compliance BOOLEAN,               -- Compliance status
    device_risk_score NUMERIC(3,2),          -- Risk score 0.00-1.00
    asset_criticality VARCHAR(50),           -- critical, high, medium, low
    asset_owner VARCHAR(255),                -- Asset owner/department
    
    -- Network Security Fields
    network_zone VARCHAR(100),               -- dmz, internal, external, guest
    network_segment VARCHAR(100),            -- VLAN or subnet identifier
    traffic_direction VARCHAR(20),           -- inbound, outbound, lateral
    connection_state VARCHAR(50),            -- established, syn, fin, rst
    bytes_sent BIGINT,                       -- Bytes transmitted
    bytes_received BIGINT,                   -- Bytes received
    packets_sent BIGINT,                     -- Packets transmitted
    packets_received BIGINT,                 -- Packets received
    dns_query VARCHAR(255),                  -- DNS query made
    dns_response_code INTEGER,               -- DNS response code
    http_method VARCHAR(20),                 -- GET, POST, PUT, DELETE
    http_status_code INTEGER,                -- HTTP response code
    http_user_agent TEXT,                    -- User agent string
    http_referer TEXT,                       -- HTTP referer
    url_full TEXT,                           -- Complete URL
    url_domain VARCHAR(255),                 -- Domain from URL
    url_path TEXT,                           -- Path from URL
    
    -- Endpoint Security
    process_command_line TEXT,               -- Full command line
    process_parent_id INTEGER,               -- Parent process ID
    process_parent_name VARCHAR(255),        -- Parent process name
    process_integrity_level VARCHAR(50),     -- Process integrity level
    process_elevated BOOLEAN DEFAULT false,  -- Running with elevated privileges
    file_operation VARCHAR(50),              -- create, modify, delete, execute, access
    file_size BIGINT,                        -- File size in bytes
    file_permissions VARCHAR(50),            -- File permissions
    file_owner VARCHAR(255),                 -- File owner
    file_created_time TIMESTAMPTZ,           -- File creation timestamp
    file_modified_time TIMESTAMPTZ,          -- File modification timestamp
    file_accessed_time TIMESTAMPTZ,          -- File access timestamp
    registry_key TEXT,                       -- Windows registry key
    registry_value_name VARCHAR(255),        -- Registry value name
    registry_value_data TEXT,                -- Registry value data
    
    -- Email Security
    email_sender VARCHAR(255),               -- Email sender address
    email_recipient VARCHAR(255)[],          -- Email recipients array
    email_subject TEXT,                      -- Email subject
    email_message_id VARCHAR(255),           -- Message ID
    email_attachment_count INTEGER,          -- Number of attachments
    email_attachment_names TEXT[],           -- Attachment names array
    email_attachment_hashes VARCHAR(128)[],  -- Attachment hash array
    email_spam_score NUMERIC(3,2),           -- Spam confidence score
    email_phishing_score NUMERIC(3,2),       -- Phishing confidence score
    
    -- Web Security
    web_category VARCHAR(100),               -- URL category
    web_reputation VARCHAR(50),              -- good, suspicious, malicious
    web_risk_score NUMERIC(3,2),             -- Web risk score
    web_proxy_action VARCHAR(50),            -- allow, block, warn
    ssl_certificate_hash VARCHAR(128),       -- SSL certificate hash
    ssl_certificate_issuer VARCHAR(255),     -- SSL certificate issuer
    ssl_certificate_subject VARCHAR(255),    -- SSL certificate subject
    ssl_validation_status VARCHAR(50),       -- valid, invalid, expired, self_signed
    
    -- Cloud Security
    cloud_provider VARCHAR(50),              -- aws, azure, gcp, other
    cloud_region VARCHAR(100),               -- Cloud region
    cloud_account_id VARCHAR(255),           -- Cloud account identifier
    cloud_service VARCHAR(100),              -- Specific cloud service
    cloud_resource_id VARCHAR(255),          -- Cloud resource identifier
    cloud_resource_type VARCHAR(100),        -- EC2, S3, Lambda, etc.
    cloud_api_call VARCHAR(255),             -- API call made
    cloud_user_identity TEXT,                -- Cloud user identity (JSON)
    cloud_source_ip_type VARCHAR(50),        -- internal, external, aws, azure
    
    -- Application Security
    app_name VARCHAR(255),                   -- Application name
    app_version VARCHAR(100),                -- Application version
    app_vendor VARCHAR(255),                 -- Application vendor
    app_category VARCHAR(100),               -- Application category
    vulnerability_id VARCHAR(100),           -- CVE or other vuln ID
    vulnerability_severity VARCHAR(20),      -- critical, high, medium, low
    vulnerability_score NUMERIC(4,1),        -- CVSS score
    exploit_detected BOOLEAN DEFAULT false,  -- Exploit attempt detected
    
    -- Data Loss Prevention (DLP)
    data_classification VARCHAR(50),         -- public, internal, confidential, secret
    data_type VARCHAR(100),                  -- pii, phi, credit_card, ssn
    dlp_rule_name VARCHAR(255),              -- DLP rule that triggered
    dlp_action VARCHAR(50),                  -- block, allow, quarantine, alert
    sensitive_data_detected BOOLEAN DEFAULT false,
    
    -- Compliance & Audit
    compliance_framework VARCHAR(100),       -- SOX, HIPAA, PCI-DSS, GDPR
    audit_event_type VARCHAR(100),           -- login, logout, access, modify
    policy_name VARCHAR(255),                -- Security policy name
    policy_violation BOOLEAN DEFAULT false,  -- Policy violation detected
    retention_required BOOLEAN DEFAULT false, -- Compliance retention required
    
    -- Incident Response
    incident_id VARCHAR(255),                -- Related incident ID
    case_id VARCHAR(255),                    -- Investigation case ID
    evidence_collected BOOLEAN DEFAULT false, -- Evidence collected flag
    forensic_image_path TEXT,                -- Path to forensic image
    chain_of_custody_id VARCHAR(255),        -- Chain of custody ID
    
    -- Machine Learning & Analytics
    anomaly_score NUMERIC(3,2),              -- ML anomaly score
    baseline_deviation NUMERIC(10,2),        -- Deviation from baseline
    risk_score NUMERIC(3,2),                 -- Overall risk score
    confidence_score NUMERIC(3,2),           -- Detection confidence
    model_version VARCHAR(50),               -- ML model version used
    feature_vector JSONB,                    -- ML features (JSON)
    
    -- Behavioral Analytics (UEBA)
    user_risk_score NUMERIC(3,2),            -- User risk score
    entity_risk_score NUMERIC(3,2),          -- Entity risk score
    behavior_anomaly BOOLEAN DEFAULT false,  -- Behavioral anomaly detected
    peer_group VARCHAR(255),                 -- User peer group
    time_anomaly BOOLEAN DEFAULT false,      -- Unusual time activity
    location_anomaly BOOLEAN DEFAULT false,  -- Unusual location activity
    
    -- Geolocation & Context
    geo_country VARCHAR(100),                -- Country
    geo_region VARCHAR(100),                 -- State/Province
    geo_city VARCHAR(100),                   -- City
    geo_latitude NUMERIC(10,8),              -- Latitude
    geo_longitude NUMERIC(11,8),             -- Longitude
    geo_isp VARCHAR(255),                    -- Internet Service Provider
    geo_organization VARCHAR(255),           -- Organization
    geo_timezone VARCHAR(100),               -- Timezone
    
    -- Advanced Threat Detection
    attack_technique VARCHAR(100),           -- MITRE ATT&CK technique
    attack_tactic VARCHAR(100),              -- MITRE ATT&CK tactic
    kill_chain_phase VARCHAR(100),           -- Cyber Kill Chain phase
    campaign_id VARCHAR(255),                -- Threat campaign ID
    threat_actor VARCHAR(255),               -- Known threat actor
    malware_family VARCHAR(255),             -- Malware family
    c2_communication BOOLEAN DEFAULT false,  -- C2 communication detected
    lateral_movement BOOLEAN DEFAULT false,  -- Lateral movement detected
    data_exfiltration BOOLEAN DEFAULT false, -- Data exfiltration detected
    
    -- Performance & Quality
    processing_time_ms INTEGER,             -- Processing time in milliseconds
    enrichment_count INTEGER DEFAULT 0,     -- Number of enrichments applied
    correlation_count INTEGER DEFAULT 0,    -- Number of correlations
    false_positive_score NUMERIC(3,2),      -- False positive likelihood
    alert_fatigue_score NUMERIC(3,2),       -- Alert fatigue score
    
    -- Integration & Workflow
    source_integration VARCHAR(100),        -- Integration that provided data
    workflow_id VARCHAR(255),               -- Workflow instance ID
    automation_applied BOOLEAN DEFAULT false, -- Automation was applied
    analyst_assigned VARCHAR(255),          -- Assigned analyst
    investigation_status VARCHAR(50),       -- open, in_progress, closed
    remediation_action TEXT,                -- Remediation taken
    
    -- Custom Fields for Organization-Specific Use Cases
    custom_field_1 TEXT,                    -- Org-specific field 1
    custom_field_2 TEXT,                    -- Org-specific field 2
    custom_field_3 TEXT,                    -- Org-specific field 3
    custom_field_4 NUMERIC,                 -- Org-specific numeric field
    custom_field_5 BOOLEAN,                 -- Org-specific boolean field
    custom_tags TEXT[]                      -- Custom tags array
;

-- Create additional indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_logs_threat_indicator ON logs (threat_indicator, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_threat_category ON logs (threat_category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_principal_id ON logs (principal_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_device_id ON logs (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_device_type ON logs (device_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_network_zone ON logs (network_zone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_process_command ON logs USING GIN (to_tsvector('english', process_command_line));
CREATE INDEX IF NOT EXISTS idx_logs_file_operation ON logs (file_operation, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_file_hash ON logs (file_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_email_sender ON logs (email_sender, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_cloud_provider ON logs (cloud_provider, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_cloud_service ON logs (cloud_service, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_app_name ON logs (app_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_vulnerability_id ON logs (vulnerability_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_data_classification ON logs (data_classification, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_compliance_framework ON logs (compliance_framework, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_incident_id ON logs (incident_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_attack_technique ON logs (attack_technique, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_geo_country ON logs (geo_country, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_anomaly_score ON logs (anomaly_score DESC, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_risk_score ON logs (risk_score DESC, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_risk_score ON logs (user_risk_score DESC, timestamp DESC);

-- GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_logs_group_membership ON logs USING GIN (group_membership);
CREATE INDEX IF NOT EXISTS idx_logs_email_recipients ON logs USING GIN (email_recipient);
CREATE INDEX IF NOT EXISTS idx_logs_custom_tags ON logs USING GIN (custom_tags);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_logs_security_events ON logs (threat_category, attack_technique, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_activity ON logs (principal_id, auth_result, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_network_traffic ON logs (source_ip, destination_ip, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_file_activity ON logs (file_operation, file_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_anomaly_detection ON logs (anomaly_score, behavior_anomaly, timestamp DESC);

-- Update the search vector function to include new fields
CREATE OR REPLACE FUNCTION update_log_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.message, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.source_identifier, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.hostname, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.process_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.user_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.event_category, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.threat_indicator, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.principal_id, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.device_id, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.app_name, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.process_command_line, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.file_path, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.url_domain, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.email_sender, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.attack_technique, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.vulnerability_id, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced threat intelligence table
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator VARCHAR(255) NOT NULL,
    indicator_type VARCHAR(50) NOT NULL,     -- ip, domain, hash, url, email
    threat_type VARCHAR(100) NOT NULL,       -- malware, phishing, c2, apt
    confidence NUMERIC(3,2) NOT NULL,        -- 0.00-1.00
    severity VARCHAR(20) NOT NULL,           -- low, medium, high, critical
    source VARCHAR(100) NOT NULL,            -- TI feed source
    description TEXT,
    tags TEXT[],
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ti_indicator ON threat_intelligence (indicator);
CREATE INDEX IF NOT EXISTS idx_ti_type ON threat_intelligence (indicator_type, threat_type);
CREATE INDEX IF NOT EXISTS idx_ti_active ON threat_intelligence (active, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_ti_tags ON threat_intelligence USING GIN (tags);

-- Use case specific views for common queries
-- View 1: Authentication Events
CREATE OR REPLACE VIEW authentication_events AS
SELECT 
    id, timestamp, organization_id, source_identifier,
    auth_user, auth_domain, auth_method, auth_result,
    source_ip, geo_country, geo_city,
    device_id, device_type, device_compliance,
    session_id, privilege_escalation, user_risk_score,
    anomaly_score, behavior_anomaly, time_anomaly, location_anomaly
FROM logs 
WHERE event_category IN ('authentication', 'login', 'logout') 
   OR auth_user IS NOT NULL;

-- View 2: Network Security Events
CREATE OR REPLACE VIEW network_security_events AS
SELECT 
    id, timestamp, organization_id, source_identifier,
    source_ip, destination_ip, source_port, destination_port, protocol,
    network_zone, network_segment, traffic_direction,
    bytes_sent, bytes_received, packets_sent, packets_received,
    dns_query, http_method, http_status_code, url_domain,
    threat_indicator, threat_category, threat_confidence
FROM logs 
WHERE source_ip IS NOT NULL 
   OR destination_ip IS NOT NULL 
   OR dns_query IS NOT NULL;

-- View 3: File System Events
CREATE OR REPLACE VIEW file_system_events AS
SELECT 
    id, timestamp, organization_id, source_identifier,
    file_path, file_hash, file_operation, file_size, file_permissions,
    process_name, process_id, process_command_line,
    user_name, principal_id, device_id,
    threat_indicator, vulnerability_id, dlp_action
FROM logs 
WHERE file_path IS NOT NULL 
   OR file_hash IS NOT NULL 
   OR file_operation IS NOT NULL;

-- View 4: Threat Detection Events
CREATE OR REPLACE VIEW threat_detection_events AS
SELECT 
    id, timestamp, organization_id, source_identifier,
    threat_indicator, threat_category, threat_confidence,
    attack_technique, attack_tactic, kill_chain_phase,
    malware_family, threat_actor, campaign_id,
    anomaly_score, risk_score, confidence_score,
    c2_communication, lateral_movement, data_exfiltration
FROM logs 
WHERE threat_indicator IS NOT NULL 
   OR attack_technique IS NOT NULL 
   OR anomaly_score > 0.7;

-- View 5: Compliance Events
CREATE OR REPLACE VIEW compliance_events AS
SELECT 
    id, timestamp, organization_id, source_identifier,
    compliance_framework, audit_event_type, policy_name, policy_violation,
    data_classification, data_type, sensitive_data_detected,
    user_name, principal_id, file_path, app_name,
    retention_required, evidence_collected
FROM logs 
WHERE compliance_framework IS NOT NULL 
   OR policy_violation = true 
   OR sensitive_data_detected = true;

-- Materialized view for threat intelligence correlation
CREATE MATERIALIZED VIEW IF NOT EXISTS threat_correlation_hourly AS
SELECT 
    time_bucket('1 hour', l.timestamp) AS bucket,
    l.organization_id,
    t.threat_type,
    t.severity,
    count(*) as detection_count,
    avg(t.confidence) as avg_confidence,
    array_agg(DISTINCT l.source_identifier) as affected_sources
FROM logs l
JOIN threat_intelligence t ON (
    l.threat_indicator = t.indicator 
    OR l.source_ip::text = t.indicator 
    OR l.destination_ip::text = t.indicator
    OR l.url_domain = t.indicator
)
WHERE l.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY bucket, l.organization_id, t.threat_type, t.severity;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_threat_correlation_bucket ON threat_correlation_hourly (bucket DESC);

-- Function to refresh threat correlation view
CREATE OR REPLACE FUNCTION refresh_threat_correlation()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW threat_correlation_hourly;
END;
$$ LANGUAGE plpgsql;

-- Enhanced alert rules for extended schema
INSERT INTO alert_rules (organization_id, name, description, query, condition_operator, condition_value, severity) VALUES
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'High Risk User Activity', 'Alert on users with high risk scores', 'user_risk_score', '>=', 0.8, 'high'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Anomalous Behavior Detected', 'Alert on behavioral anomalies', 'behavior_anomaly', '==', 1, 'medium'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Threat Intelligence Match', 'Alert on threat indicator matches', 'threat_confidence', '>=', 0.7, 'critical'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Privilege Escalation Detected', 'Alert on privilege escalation attempts', 'privilege_escalation', '==', 1, 'high'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'C2 Communication Detected', 'Alert on command and control communication', 'c2_communication', '==', 1, 'critical'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Data Exfiltration Detected', 'Alert on potential data exfiltration', 'data_exfiltration', '==', 1, 'critical'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Policy Violation', 'Alert on security policy violations', 'policy_violation', '==', 1, 'medium'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Sensitive Data Detection', 'Alert on sensitive data exposure', 'sensitive_data_detected', '==', 1, 'high'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Critical Vulnerability Exploit', 'Alert on exploitation of critical vulnerabilities', 'vulnerability_severity', '==', 'critical', 'critical'),
('c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3'::uuid, 'Lateral Movement Detection', 'Alert on lateral movement activities', 'lateral_movement', '==', 1, 'high')
ON CONFLICT DO NOTHING;

-- Create function to migrate existing logs to extended schema (fill defaults)
CREATE OR REPLACE FUNCTION migrate_existing_logs_to_extended_schema()
RETURNS void AS $$
BEGIN
    -- Update existing logs with default values for risk scoring
    UPDATE logs SET 
        risk_score = CASE 
            WHEN log_level = 'ERROR' THEN 0.7
            WHEN log_level = 'WARNING' THEN 0.4
            WHEN log_level = 'INFO' THEN 0.1
            ELSE 0.1
        END,
        confidence_score = 0.5,
        anomaly_score = 0.0
    WHERE risk_score IS NULL;
    
    -- Set device type based on source identifier patterns
    UPDATE logs SET 
        device_type = CASE 
            WHEN source_identifier LIKE '%server%' THEN 'server'
            WHEN source_identifier LIKE '%workstation%' THEN 'workstation'
            WHEN source_identifier LIKE '%laptop%' THEN 'laptop'
            WHEN source_identifier LIKE '%mobile%' THEN 'mobile'
            ELSE 'unknown'
        END
    WHERE device_type IS NULL;
    
    RAISE NOTICE 'Migration to extended schema completed for existing logs';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for use case specific queries
CREATE INDEX IF NOT EXISTS idx_logs_use_case_auth ON logs (auth_result, principal_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_use_case_network ON logs (traffic_direction, network_zone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_use_case_file ON logs (file_operation, data_classification, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_use_case_threat ON logs (threat_category, attack_technique, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_logs_use_case_compliance ON logs (compliance_framework, policy_violation, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_use_case_incident ON logs (incident_id, investigation_status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_use_case_anomaly ON logs (behavior_anomaly, user_risk_score DESC, timestamp DESC);

-- Comments for documentation
COMMENT ON TABLE logs IS 'Extended normalized log table supporting 50+ security use cases';
COMMENT ON COLUMN logs.threat_indicator IS 'Threat intelligence indicator (IP, domain, hash, etc.)';
COMMENT ON COLUMN logs.principal_id IS 'Unique identifier for the principal (user, service account, etc.)';
COMMENT ON COLUMN logs.device_id IS 'Unique device identifier for asset tracking';
COMMENT ON COLUMN logs.attack_technique IS 'MITRE ATT&CK technique identifier';
COMMENT ON COLUMN logs.anomaly_score IS 'Machine learning anomaly score (0.00-1.00)';
COMMENT ON COLUMN logs.risk_score IS 'Overall risk score for the event (0.00-1.00)';
COMMENT ON COLUMN logs.user_risk_score IS 'User-specific risk score (0.00-1.00)';