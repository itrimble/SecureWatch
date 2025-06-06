-- Sample enrichment rules and lookup data for SecureWatch
-- This provides examples of how to use the lookup system

-- Apply the lookup schema first
\i lookup_schema.sql

-- Insert sample enrichment rules
INSERT INTO enrichment_rules (
    name, 
    description, 
    source_field, 
    lookup_table, 
    lookup_key_field, 
    output_fields, 
    conditions, 
    is_active, 
    priority, 
    created_by
) VALUES 
(
    'IP Geolocation Enrichment',
    'Enrich IP addresses with geolocation data',
    'src_ip',
    'ip_geolocation',
    'ip_address',
    '[
        {"sourceField": "country", "outputField": "geo_country", "defaultValue": "Unknown"},
        {"sourceField": "city", "outputField": "geo_city", "defaultValue": "Unknown"},
        {"sourceField": "latitude", "outputField": "geo_lat", "transform": "trim"},
        {"sourceField": "longitude", "outputField": "geo_lon", "transform": "trim"}
    ]'::jsonb,
    '[]'::jsonb,
    true,
    100,
    'system'
),
(
    'User Department Lookup',
    'Enrich user events with department information',
    'user_name',
    'user_directory',
    'username',
    '[
        {"sourceField": "department", "outputField": "user_department", "defaultValue": "Unknown"},
        {"sourceField": "title", "outputField": "user_title", "defaultValue": "Unknown"},
        {"sourceField": "manager", "outputField": "user_manager", "defaultValue": "Unknown"},
        {"sourceField": "risk_score", "outputField": "user_risk_score", "defaultValue": 0}
    ]'::jsonb,
    '[
        {"field": "event_type", "operator": "contains", "value": "authentication"},
        {"field": "event_type", "operator": "contains", "value": "access"}
    ]'::jsonb,
    true,
    200,
    'system'
),
(
    'Asset Criticality Enrichment',
    'Add asset criticality and ownership information',
    'hostname',
    'asset_inventory',
    'hostname',
    '[
        {"sourceField": "criticality", "outputField": "asset_criticality", "defaultValue": "Low"},
        {"sourceField": "owner", "outputField": "asset_owner", "defaultValue": "Unknown"},
        {"sourceField": "environment", "outputField": "asset_environment", "defaultValue": "Unknown"},
        {"sourceField": "cost_center", "outputField": "asset_cost_center", "defaultValue": "Unknown"}
    ]'::jsonb,
    '[]'::jsonb,
    true,
    150,
    'system'
),
(
    'Threat Intelligence Lookup',
    'Enrich IP addresses with threat intelligence',
    'src_ip',
    'threat_intel_ips',
    'ip_address',
    '[
        {"sourceField": "threat_type", "outputField": "threat_category", "defaultValue": "Unknown"},
        {"sourceField": "confidence", "outputField": "threat_confidence", "defaultValue": 0},
        {"sourceField": "first_seen", "outputField": "threat_first_seen", "defaultValue": null},
        {"sourceField": "last_seen", "outputField": "threat_last_seen", "defaultValue": null},
        {"sourceField": "source", "outputField": "threat_source", "defaultValue": "Internal"}
    ]'::jsonb,
    '[
        {"field": "event_type", "operator": "regex", "value": "(network|firewall|intrusion)"}
    ]'::jsonb,
    true,
    50,
    'system'
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    source_field = EXCLUDED.source_field,
    lookup_table = EXCLUDED.lookup_table,
    lookup_key_field = EXCLUDED.lookup_key_field,
    output_fields = EXCLUDED.output_fields,
    conditions = EXCLUDED.conditions,
    priority = EXCLUDED.priority,
    updated_at = NOW();

-- Create sample lookup tables and data

-- 1. IP Geolocation lookup table
CREATE TABLE IF NOT EXISTS lookup_ip_geolocation (
    ip_address INET PRIMARY KEY,
    country VARCHAR(100),
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50),
    isp VARCHAR(200)
);

-- Insert sample geolocation data
INSERT INTO lookup_ip_geolocation (ip_address, country, country_code, region, city, latitude, longitude, timezone, isp) VALUES
('8.8.8.8', 'United States', 'US', 'California', 'Mountain View', 37.3860517, -122.0838511, 'America/Los_Angeles', 'Google LLC'),
('1.1.1.1', 'Australia', 'AU', 'New South Wales', 'Sydney', -33.8688197, 151.2092955, 'Australia/Sydney', 'Cloudflare, Inc.'),
('208.67.222.222', 'United States', 'US', 'California', 'San Francisco', 37.7749295, -122.4194155, 'America/Los_Angeles', 'OpenDNS, LLC'),
('192.168.1.1', 'Private', 'XX', 'Private Network', 'Local', 0.0, 0.0, 'UTC', 'Private Network'),
('10.0.0.1', 'Private', 'XX', 'Private Network', 'Local', 0.0, 0.0, 'UTC', 'Private Network'),
('185.199.108.153', 'United States', 'US', 'California', 'San Francisco', 37.7749295, -122.4194155, 'America/Los_Angeles', 'GitHub, Inc.'),
('151.101.193.140', 'United States', 'US', 'California', 'San Francisco', 37.7749295, -122.4194155, 'America/Los_Angeles', 'Fastly'),
('172.217.164.142', 'United States', 'US', 'California', 'Mountain View', 37.3860517, -122.0838511, 'America/Los_Angeles', 'Google LLC')
ON CONFLICT (ip_address) DO UPDATE SET
    country = EXCLUDED.country,
    country_code = EXCLUDED.country_code,
    region = EXCLUDED.region,
    city = EXCLUDED.city,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    timezone = EXCLUDED.timezone,
    isp = EXCLUDED.isp;

-- 2. User Directory lookup table
CREATE TABLE IF NOT EXISTS lookup_user_directory (
    username VARCHAR(100) PRIMARY KEY,
    full_name VARCHAR(200),
    email VARCHAR(200),
    department VARCHAR(100),
    title VARCHAR(150),
    manager VARCHAR(100),
    location VARCHAR(100),
    employee_id VARCHAR(50),
    risk_score INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    account_status VARCHAR(20) DEFAULT 'active'
);

-- Insert sample user data
INSERT INTO lookup_user_directory (username, full_name, email, department, title, manager, location, employee_id, risk_score, last_login, account_status) VALUES
('john.doe', 'John Doe', 'john.doe@company.com', 'IT Security', 'Security Analyst', 'jane.smith', 'New York', 'EMP001', 25, NOW() - INTERVAL '2 hours', 'active'),
('jane.smith', 'Jane Smith', 'jane.smith@company.com', 'IT Security', 'CISO', 'ceo', 'New York', 'EMP002', 15, NOW() - INTERVAL '1 hour', 'active'),
('bob.wilson', 'Bob Wilson', 'bob.wilson@company.com', 'Finance', 'CFO', 'ceo', 'Chicago', 'EMP003', 30, NOW() - INTERVAL '3 hours', 'active'),
('alice.johnson', 'Alice Johnson', 'alice.johnson@company.com', 'Engineering', 'Senior Developer', 'mike.brown', 'San Francisco', 'EMP004', 20, NOW() - INTERVAL '30 minutes', 'active'),
('mike.brown', 'Mike Brown', 'mike.brown@company.com', 'Engineering', 'Engineering Manager', 'cto', 'San Francisco', 'EMP005', 10, NOW() - INTERVAL '45 minutes', 'active'),
('sarah.davis', 'Sarah Davis', 'sarah.davis@company.com', 'HR', 'HR Manager', 'bob.wilson', 'Chicago', 'EMP006', 35, NOW() - INTERVAL '4 hours', 'active'),
('admin', 'System Administrator', 'admin@company.com', 'IT Operations', 'System Admin', 'jane.smith', 'Data Center', 'EMP007', 80, NOW() - INTERVAL '15 minutes', 'active'),
('contractor.ext', 'External Contractor', 'contractor@external.com', 'External', 'Contractor', 'john.doe', 'Remote', 'EXT001', 95, NOW() - INTERVAL '6 hours', 'active')
ON CONFLICT (username) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    department = EXCLUDED.department,
    title = EXCLUDED.title,
    manager = EXCLUDED.manager,
    location = EXCLUDED.location,
    employee_id = EXCLUDED.employee_id,
    risk_score = EXCLUDED.risk_score,
    last_login = EXCLUDED.last_login,
    account_status = EXCLUDED.account_status;

-- 3. Asset Inventory lookup table
CREATE TABLE IF NOT EXISTS lookup_asset_inventory (
    hostname VARCHAR(200) PRIMARY KEY,
    ip_address INET,
    asset_tag VARCHAR(50),
    criticality VARCHAR(20) DEFAULT 'Medium',
    owner VARCHAR(100),
    environment VARCHAR(50),
    operating_system VARCHAR(100),
    cost_center VARCHAR(50),
    location VARCHAR(100),
    purchase_date DATE,
    warranty_expiry DATE,
    last_scanned TIMESTAMP DEFAULT NOW()
);

-- Insert sample asset data
INSERT INTO lookup_asset_inventory (hostname, ip_address, asset_tag, criticality, owner, environment, operating_system, cost_center, location, purchase_date, warranty_expiry) VALUES
('web-server-01', '10.1.1.10', 'WEB001', 'High', 'alice.johnson', 'Production', 'Ubuntu 20.04 LTS', 'IT-001', 'Data Center 1', '2023-01-15', '2026-01-15'),
('db-server-01', '10.1.1.20', 'DB001', 'Critical', 'mike.brown', 'Production', 'CentOS 8', 'IT-001', 'Data Center 1', '2023-02-01', '2026-02-01'),
('app-server-01', '10.1.1.30', 'APP001', 'High', 'alice.johnson', 'Production', 'RHEL 8', 'IT-001', 'Data Center 1', '2023-01-20', '2026-01-20'),
('dev-workstation-01', '10.2.1.10', 'DEV001', 'Medium', 'alice.johnson', 'Development', 'Windows 11', 'ENG-001', 'San Francisco Office', '2023-03-01', '2026-03-01'),
('security-scanner', '10.1.1.50', 'SEC001', 'High', 'john.doe', 'Security', 'Kali Linux', 'SEC-001', 'SOC', '2023-04-01', '2026-04-01'),
('backup-server', '10.1.1.60', 'BCK001', 'Medium', 'admin', 'Production', 'FreeBSD 13', 'IT-001', 'Data Center 2', '2023-05-01', '2026-05-01'),
('Ians-Mac-Mini-M4', '192.168.1.100', 'MAC001', 'Medium', 'admin', 'Development', 'macOS Sequoia', 'IT-001', 'Home Office', '2024-11-01', '2027-11-01'),
('jump-host', '10.1.1.70', 'JMP001', 'High', 'admin', 'Production', 'Ubuntu 22.04 LTS', 'SEC-001', 'DMZ', '2023-06-01', '2026-06-01')
ON CONFLICT (hostname) DO UPDATE SET
    ip_address = EXCLUDED.ip_address,
    asset_tag = EXCLUDED.asset_tag,
    criticality = EXCLUDED.criticality,
    owner = EXCLUDED.owner,
    environment = EXCLUDED.environment,
    operating_system = EXCLUDED.operating_system,
    cost_center = EXCLUDED.cost_center,
    location = EXCLUDED.location,
    purchase_date = EXCLUDED.purchase_date,
    warranty_expiry = EXCLUDED.warranty_expiry,
    last_scanned = NOW();

-- 4. Threat Intelligence lookup table
CREATE TABLE IF NOT EXISTS lookup_threat_intel_ips (
    ip_address INET PRIMARY KEY,
    threat_type VARCHAR(100),
    confidence INTEGER DEFAULT 0,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    source VARCHAR(100),
    description TEXT,
    severity VARCHAR(20) DEFAULT 'Medium',
    tags VARCHAR(500)
);

-- Insert sample threat intelligence data
INSERT INTO lookup_threat_intel_ips (ip_address, threat_type, confidence, first_seen, last_seen, source, description, severity, tags) VALUES
('203.0.113.1', 'C2 Server', 95, NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days', 'Threat Feed A', 'Known command and control server for XYZ malware family', 'Critical', 'malware,c2,botnet'),
('198.51.100.50', 'Scanning', 75, NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day', 'Internal Detection', 'Observed conducting port scans against internal networks', 'High', 'scanning,reconnaissance'),
('192.0.2.100', 'Phishing', 85, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 hours', 'Threat Feed B', 'Hosting phishing content targeting financial institutions', 'High', 'phishing,financial'),
('203.0.113.200', 'Malware Drop', 90, NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', 'Threat Feed A', 'Serving malicious payloads and exploits', 'Critical', 'malware,exploit,payload'),
('198.51.100.150', 'Brute Force', 70, NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 hour', 'Internal Detection', 'Multiple failed authentication attempts detected', 'Medium', 'brute-force,authentication'),
('192.0.2.250', 'TOR Exit Node', 60, NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day', 'TOR Network', 'Known TOR exit node - potential anonymization', 'Medium', 'tor,anonymization'),
('203.0.113.75', 'DDoS Botnet', 80, NOW() - INTERVAL '25 days', NOW() - INTERVAL '6 hours', 'Threat Feed C', 'Part of DDoS botnet targeting infrastructure', 'High', 'ddos,botnet,infrastructure')
ON CONFLICT (ip_address) DO UPDATE SET
    threat_type = EXCLUDED.threat_type,
    confidence = EXCLUDED.confidence,
    first_seen = EXCLUDED.first_seen,
    last_seen = EXCLUDED.last_seen,
    source = EXCLUDED.source,
    description = EXCLUDED.description,
    severity = EXCLUDED.severity,
    tags = EXCLUDED.tags;

-- Register the lookup tables in the metadata table
INSERT INTO lookup_tables (
    name, 
    description, 
    filename, 
    key_field, 
    fields, 
    record_count, 
    file_size, 
    created_by, 
    is_active, 
    tags
) VALUES 
(
    'ip_geolocation',
    'IP address geolocation database for enriching network events',
    'ip_geolocation.csv',
    'ip_address',
    '[
        {"name": "ip_address", "type": "ip", "isKey": true, "sampleValues": ["8.8.8.8", "1.1.1.1"]},
        {"name": "country", "type": "string", "isKey": false, "sampleValues": ["United States", "Australia"]},
        {"name": "city", "type": "string", "isKey": false, "sampleValues": ["Mountain View", "Sydney"]},
        {"name": "latitude", "type": "number", "isKey": false, "sampleValues": ["37.3860517", "-33.8688197"]},
        {"name": "longitude", "type": "number", "isKey": false, "sampleValues": ["-122.0838511", "151.2092955"]}
    ]'::jsonb,
    (SELECT COUNT(*) FROM lookup_ip_geolocation),
    32768,
    'system',
    true,
    '["geolocation", "network", "enrichment"]'::jsonb
),
(
    'user_directory',
    'Corporate user directory for enriching authentication events',
    'user_directory.csv',
    'username',
    '[
        {"name": "username", "type": "string", "isKey": true, "sampleValues": ["john.doe", "jane.smith"]},
        {"name": "department", "type": "string", "isKey": false, "sampleValues": ["IT Security", "Finance"]},
        {"name": "title", "type": "string", "isKey": false, "sampleValues": ["Security Analyst", "CISO"]},
        {"name": "risk_score", "type": "number", "isKey": false, "sampleValues": ["25", "15"]}
    ]'::jsonb,
    (SELECT COUNT(*) FROM lookup_user_directory),
    16384,
    'system',
    true,
    '["users", "hr", "authentication", "ueba"]'::jsonb
),
(
    'asset_inventory',
    'Asset inventory database for enriching host-based events',
    'asset_inventory.csv',
    'hostname',
    '[
        {"name": "hostname", "type": "string", "isKey": true, "sampleValues": ["web-server-01", "db-server-01"]},
        {"name": "criticality", "type": "string", "isKey": false, "sampleValues": ["High", "Critical"]},
        {"name": "owner", "type": "string", "isKey": false, "sampleValues": ["alice.johnson", "mike.brown"]},
        {"name": "environment", "type": "string", "isKey": false, "sampleValues": ["Production", "Development"]}
    ]'::jsonb,
    (SELECT COUNT(*) FROM lookup_asset_inventory),
    24576,
    'system',
    true,
    '["assets", "inventory", "compliance", "cmdb"]'::jsonb
),
(
    'threat_intel_ips',
    'Threat intelligence IP addresses for security enrichment',
    'threat_intel_ips.csv',
    'ip_address',
    '[
        {"name": "ip_address", "type": "ip", "isKey": true, "sampleValues": ["203.0.113.1", "198.51.100.50"]},
        {"name": "threat_type", "type": "string", "isKey": false, "sampleValues": ["C2 Server", "Scanning"]},
        {"name": "confidence", "type": "number", "isKey": false, "sampleValues": ["95", "75"]},
        {"name": "severity", "type": "string", "isKey": false, "sampleValues": ["Critical", "High"]}
    ]'::jsonb,
    (SELECT COUNT(*) FROM lookup_threat_intel_ips),
    40960,
    'system',
    true,
    '["threat-intelligence", "security", "ioc", "malware"]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    fields = EXCLUDED.fields,
    record_count = EXCLUDED.record_count,
    updated_at = NOW();

-- Create indexes for better lookup performance
CREATE INDEX IF NOT EXISTS idx_lookup_ip_geolocation_ip ON lookup_ip_geolocation (ip_address);
CREATE INDEX IF NOT EXISTS idx_lookup_user_directory_username ON lookup_user_directory (username);
CREATE INDEX IF NOT EXISTS idx_lookup_user_directory_department ON lookup_user_directory (department);
CREATE INDEX IF NOT EXISTS idx_lookup_asset_inventory_hostname ON lookup_asset_inventory (hostname);
CREATE INDEX IF NOT EXISTS idx_lookup_asset_inventory_criticality ON lookup_asset_inventory (criticality);
CREATE INDEX IF NOT EXISTS idx_lookup_threat_intel_ips_ip ON lookup_threat_intel_ips (ip_address);
CREATE INDEX IF NOT EXISTS idx_lookup_threat_intel_ips_severity ON lookup_threat_intel_ips (severity);

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO securewatch;

COMMENT ON TABLE lookup_ip_geolocation IS 'Sample IP geolocation data for network event enrichment';
COMMENT ON TABLE lookup_user_directory IS 'Sample user directory for authentication event enrichment';
COMMENT ON TABLE lookup_asset_inventory IS 'Sample asset inventory for host-based event enrichment';
COMMENT ON TABLE lookup_threat_intel_ips IS 'Sample threat intelligence IPs for security event enrichment';