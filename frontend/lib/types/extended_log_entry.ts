// Extended Log Entry Types for SecureWatch SIEM
// Supports 50+ security use cases with comprehensive field mapping

export interface ExtendedLogEntry {
  // Core fields
  id: string;
  timestamp: string; // ISO 8601 format
  organization_id: string;
  source_identifier: string;
  source_type: string;
  log_level?: string;
  message: string;
  facility?: string;
  severity?: number;
  hostname?: string;
  process_name?: string;
  process_id?: number;
  user_name?: string;

  // Event classification
  event_id?: string;
  event_category?: string;
  event_subcategory?: string;

  // Network fields
  source_ip?: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;

  // File/Path fields
  file_path?: string;
  file_hash?: string;

  // Authentication fields
  auth_user?: string;
  auth_domain?: string;
  auth_method?: string;
  auth_result?: string;

  // Extended attributes
  attributes?: Record<string, unknown>;

  // Processing metadata
  ingested_at?: string;
  processed_at?: string;
  normalized?: boolean;
  enriched?: boolean;

  // Threat Intelligence Fields
  threat_indicator?: string;
  threat_category?: string;
  threat_confidence?: number; // 0.00-1.00
  threat_source?: string;
  threat_ttl?: string;

  // Identity & Access Management (IAM)
  principal_type?: string; // user, service_account, system
  principal_id?: string;
  credential_type?: string; // password, certificate, token, biometric
  session_id?: string;
  authentication_protocol?: string; // SAML, OAuth, Kerberos, LDAP
  privilege_escalation?: boolean;
  access_level?: string; // admin, user, guest, service
  group_membership?: string[];

  // Device & Asset Management
  device_id?: string;
  device_type?: string; // laptop, server, mobile, iot
  device_os?: string;
  device_os_version?: string;
  device_manufacturer?: string;
  device_model?: string;
  device_compliance?: boolean;
  device_risk_score?: number; // 0.00-1.00
  asset_criticality?: string; // critical, high, medium, low
  asset_owner?: string;

  // Network Security Fields
  network_zone?: string; // dmz, internal, external, guest
  network_segment?: string;
  traffic_direction?: string; // inbound, outbound, lateral
  connection_state?: string; // established, syn, fin, rst
  bytes_sent?: number;
  bytes_received?: number;
  packets_sent?: number;
  packets_received?: number;
  dns_query?: string;
  dns_response_code?: number;
  http_method?: string; // GET, POST, PUT, DELETE
  http_status_code?: number;
  http_user_agent?: string;
  http_referer?: string;
  url_full?: string;
  url_domain?: string;
  url_path?: string;

  // Endpoint Security
  process_command_line?: string;
  process_parent_id?: number;
  process_parent_name?: string;
  process_integrity_level?: string;
  process_elevated?: boolean;
  file_operation?: string; // create, modify, delete, execute, access
  file_size?: number;
  file_permissions?: string;
  file_owner?: string;
  file_created_time?: string;
  file_modified_time?: string;
  file_accessed_time?: string;
  registry_key?: string;
  registry_value_name?: string;
  registry_value_data?: string;

  // Email Security
  email_sender?: string;
  email_recipient?: string[];
  email_subject?: string;
  email_message_id?: string;
  email_attachment_count?: number;
  email_attachment_names?: string[];
  email_attachment_hashes?: string[];
  email_spam_score?: number; // 0.00-1.00
  email_phishing_score?: number; // 0.00-1.00

  // Web Security
  web_category?: string;
  web_reputation?: string; // good, suspicious, malicious
  web_risk_score?: number; // 0.00-1.00
  web_proxy_action?: string; // allow, block, warn
  ssl_certificate_hash?: string;
  ssl_certificate_issuer?: string;
  ssl_certificate_subject?: string;
  ssl_validation_status?: string; // valid, invalid, expired, self_signed

  // Cloud Security
  cloud_provider?: string; // aws, azure, gcp, other
  cloud_region?: string;
  cloud_account_id?: string;
  cloud_service?: string;
  cloud_resource_id?: string;
  cloud_resource_type?: string; // EC2, S3, Lambda, etc.
  cloud_api_call?: string;
  cloud_user_identity?: Record<string, unknown>; // JSON object
  cloud_source_ip_type?: string; // internal, external, aws, azure

  // Application Security
  app_name?: string;
  app_version?: string;
  app_vendor?: string;
  app_category?: string;
  vulnerability_id?: string; // CVE or other vuln ID
  vulnerability_severity?: string; // critical, high, medium, low
  vulnerability_score?: number; // CVSS score
  exploit_detected?: boolean;

  // Data Loss Prevention (DLP)
  data_classification?: string; // public, internal, confidential, secret
  data_type?: string; // pii, phi, credit_card, ssn
  dlp_rule_name?: string;
  dlp_action?: string; // block, allow, quarantine, alert
  sensitive_data_detected?: boolean;

  // Compliance & Audit
  compliance_framework?: string; // SOX, HIPAA, PCI-DSS, GDPR
  audit_event_type?: string; // login, logout, access, modify
  policy_name?: string;
  policy_violation?: boolean;
  retention_required?: boolean;

  // Incident Response
  incident_id?: string;
  case_id?: string;
  evidence_collected?: boolean;
  forensic_image_path?: string;
  chain_of_custody_id?: string;

  // Machine Learning & Analytics
  anomaly_score?: number; // 0.00-1.00
  baseline_deviation?: number;
  risk_score?: number; // 0.00-1.00
  confidence_score?: number; // 0.00-1.00
  model_version?: string;
  feature_vector?: Record<string, number>; // ML features

  // Behavioral Analytics (UEBA)
  user_risk_score?: number; // 0.00-1.00
  entity_risk_score?: number; // 0.00-1.00
  behavior_anomaly?: boolean;
  peer_group?: string;
  time_anomaly?: boolean;
  location_anomaly?: boolean;

  // Geolocation & Context
  geo_country?: string;
  geo_region?: string;
  geo_city?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  geo_isp?: string;
  geo_organization?: string;
  geo_timezone?: string;

  // Advanced Threat Detection
  attack_technique?: string; // MITRE ATT&CK technique
  attack_tactic?: string; // MITRE ATT&CK tactic
  kill_chain_phase?: string;
  campaign_id?: string;
  threat_actor?: string;
  malware_family?: string;
  c2_communication?: boolean;
  lateral_movement?: boolean;
  data_exfiltration?: boolean;

  // Performance & Quality
  processing_time_ms?: number;
  enrichment_count?: number;
  correlation_count?: number;
  false_positive_score?: number; // 0.00-1.00
  alert_fatigue_score?: number; // 0.00-1.00

  // Integration & Workflow
  source_integration?: string;
  workflow_id?: string;
  automation_applied?: boolean;
  analyst_assigned?: string;
  investigation_status?: string; // open, in_progress, closed
  remediation_action?: string;

  // Custom Fields for Organization-Specific Use Cases
  custom_field_1?: string;
  custom_field_2?: string;
  custom_field_3?: string;
  custom_field_4?: number;
  custom_field_5?: boolean;
  custom_tags?: string[];
}

// Threat Intelligence Entry
export interface ThreatIntelligenceEntry {
  id: string;
  indicator: string;
  indicator_type: string; // ip, domain, hash, url, email
  threat_type: string; // malware, phishing, c2, apt
  confidence: number; // 0.00-1.00
  severity: string; // low, medium, high, critical
  source: string;
  description?: string;
  tags?: string[];
  first_seen: string;
  last_seen: string;
  active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Use Case Specific Views
export interface AuthenticationEvent extends ExtendedLogEntry {
  auth_user: string;
  auth_result: string;
  source_ip?: string;
  geo_country?: string;
  device_id?: string;
  session_id?: string;
  privilege_escalation?: boolean;
  user_risk_score?: number;
  behavior_anomaly?: boolean;
}

export interface NetworkSecurityEvent extends ExtendedLogEntry {
  source_ip: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;
  network_zone?: string;
  traffic_direction?: string;
  threat_indicator?: string;
  threat_category?: string;
}

export interface FileSystemEvent extends ExtendedLogEntry {
  file_path: string;
  file_operation?: string;
  file_hash?: string;
  process_command_line?: string;
  user_name?: string;
  vulnerability_id?: string;
  dlp_action?: string;
}

export interface ThreatDetectionEvent extends ExtendedLogEntry {
  threat_indicator?: string;
  threat_category?: string;
  attack_technique?: string;
  attack_tactic?: string;
  malware_family?: string;
  anomaly_score?: number;
  risk_score?: number;
  c2_communication?: boolean;
  lateral_movement?: boolean;
}

export interface ComplianceEvent extends ExtendedLogEntry {
  compliance_framework?: string;
  audit_event_type?: string;
  policy_name?: string;
  policy_violation?: boolean;
  data_classification?: string;
  sensitive_data_detected?: boolean;
  retention_required?: boolean;
}

// Risk Scoring Types
export interface RiskScore {
  score: number; // 0.00-1.00
  factors: RiskFactor[];
  calculated_at: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

// Alert Types
export interface SecurityAlert {
  id: string;
  rule_id: string;
  organization_id: string;
  triggered_at: string;
  resolved_at?: string;
  severity: string; // low, medium, high, critical
  status: string; // open, acknowledged, resolved, false_positive
  message: string;
  query_result?: Record<string, unknown>;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Search and Query Types
export interface LogSearchQuery {
  query?: string;
  filters?: LogSearchFilters;
  time_range?: TimeRange;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface LogSearchFilters {
  source_type?: string[];
  log_level?: string[];
  event_category?: string[];
  hostname?: string[];
  user_name?: string[];
  device_type?: string[];
  threat_category?: string[];
  attack_technique?: string[];
  compliance_framework?: string[];
  network_zone?: string[];
  data_classification?: string[];
  anomaly_score_min?: number;
  risk_score_min?: number;
  has_threat_indicator?: boolean;
  has_behavior_anomaly?: boolean;
  custom_filters?: Record<string, unknown>;
}

export interface TimeRange {
  start: string; // ISO 8601
  end: string; // ISO 8601
}

// Analytics and Metrics Types
export interface SecurityMetrics {
  total_events: number;
  threat_events: number;
  anomaly_events: number;
  compliance_events: number;
  high_risk_events: number;
  unique_sources: number;
  unique_users: number;
  unique_devices: number;
  time_period: TimeRange;
}

export interface ThreatMetrics {
  total_threats: number;
  active_threats: number;
  threat_types: Record<string, number>;
  severity_breakdown: Record<string, number>;
  top_indicators: Array<{
    indicator: string;
    type: string;
    count: number;
  }>;
}

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// Backward compatibility with original LogEntry
export interface LogEntry {
  id: string;
  timestamp: string;
  source_identifier: string;
  log_file: string;
  message: string;
  enriched_data?: Record<string, unknown>;
}

// Export legacy type as alias for compatibility
export type { ExtendedLogEntry as LogEntryExtended };