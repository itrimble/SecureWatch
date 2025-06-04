# SecureWatch SIEM - Entity Relationship Diagram

## Overview

SecureWatch features a comprehensive **Extended Normalized Schema** with **100+ security fields** designed to support **50+ enterprise security use cases**. The system is designed for enterprise-scale deployment with comprehensive security, performance optimization, and observability features.

## Core Entity Structure

### Primary Entities

#### 1. **Logs Table (Extended Schema)**
The core entity storing all security events with comprehensive normalization:

**Core Fields (50+ fields)**
- Primary identifiers: `id`, `timestamp`, `organization_id`
- Source tracking: `source_identifier`, `source_type`, `hostname`
- Event classification: `event_id`, `event_category`, `event_subcategory`
- Basic metadata: `log_level`, `message`, `process_name`, `user_name`

**Extended Security Fields (100+ fields)**
- **Threat Intelligence (10 fields)**: `threat_indicator`, `threat_confidence`, `threat_category`, `threat_source`, `threat_ttl`
- **Identity & Access (15 fields)**: `principal_id`, `credential_type`, `privilege_escalation`, `session_id`, `authentication_protocol`, `access_level`, `group_membership[]`
- **Device & Asset (12 fields)**: `device_id`, `device_type`, `device_compliance`, `asset_criticality`, `device_risk_score`
- **Network Security (20 fields)**: `network_zone`, `traffic_direction`, `dns_query`, `http_method`, `ssl_validation_status`
- **Endpoint Security (15 fields)**: `process_command_line`, `file_operation`, `registry_key`, `file_hash`, `process_elevated`
- **Email Security (10 fields)**: `email_sender`, `email_phishing_score`, `email_attachment_hashes[]`
- **Web Security (8 fields)**: `url_domain`, `web_reputation`, `web_risk_score`, `ssl_certificate_hash`
- **Cloud Security (10 fields)**: `cloud_provider`, `cloud_api_call`, `cloud_resource_id`, `cloud_account_id`
- **Application Security (8 fields)**: `vulnerability_id`, `exploit_detected`, `app_version`, `vulnerability_severity`
- **Data Loss Prevention (5 fields)**: `data_classification`, `sensitive_data_detected`, `dlp_action`
- **Compliance & Audit (8 fields)**: `compliance_framework`, `policy_violation`, `audit_event_type`, `retention_required`
- **Incident Response (5 fields)**: `incident_id`, `evidence_collected`, `chain_of_custody_id`
- **Machine Learning (8 fields)**: `anomaly_score`, `confidence_score`, `model_version`, `feature_vector`
- **Behavioral Analytics (8 fields)**: `user_risk_score`, `behavior_anomaly`, `peer_group`, `time_anomaly`
- **Geolocation (8 fields)**: `geo_country`, `geo_latitude`, `geo_longitude`, `geo_isp`
- **Advanced Threats (12 fields)**: `attack_technique`, `kill_chain_phase`, `c2_communication`, `lateral_movement`

#### 2. **Threat Intelligence Table**
Dedicated threat intelligence storage:
- `indicator`, `indicator_type`, `threat_type`, `confidence`, `severity`
- `source`, `first_seen`, `last_seen`, `active`, `metadata`

#### 3. **Organizations Table**
Multi-tenancy support:
- `id`, `name`, `domain`, `subscription_tier`, `settings`

#### 4. **Users & Authentication**
User management and access control:
- `users`: User profiles and preferences
- `user_sessions`: Active session tracking
- `api_keys`: API access management

#### 5. **Alert Management**
- `alert_rules`: Configurable alert conditions
- `alerts`: Alert instances and tracking
- `notifications`: Alert delivery management

### Specialized Views

The extended schema includes **5 specialized views** for optimized security operations:

#### 1. **authentication_events**
Focused on login analysis and access control:
```sql
SELECT id, timestamp, auth_user, auth_result, source_ip, 
       device_id, session_id, privilege_escalation, user_risk_score
FROM logs WHERE event_category IN ('authentication', 'login', 'logout')
```

#### 2. **network_security_events**
Network traffic and threat correlation:
```sql
SELECT id, timestamp, source_ip, destination_ip, network_zone,
       threat_indicator, dns_query, http_method
FROM logs WHERE source_ip IS NOT NULL OR destination_ip IS NOT NULL
```

#### 3. **file_system_events**
File operations and endpoint security:
```sql
SELECT id, timestamp, file_path, file_operation, file_hash,
       process_command_line, vulnerability_id, dlp_action
FROM logs WHERE file_path IS NOT NULL OR file_operation IS NOT NULL
```

#### 4. **threat_detection_events**
Advanced threat hunting and correlation:
```sql
SELECT id, timestamp, threat_indicator, attack_technique,
       anomaly_score, c2_communication, lateral_movement
FROM logs WHERE threat_indicator IS NOT NULL OR anomaly_score > 0.7
```

#### 5. **compliance_events**
Regulatory compliance and audit tracking:
```sql
SELECT id, timestamp, compliance_framework, policy_violation,
       data_classification, sensitive_data_detected
FROM logs WHERE compliance_framework IS NOT NULL OR policy_violation = true
```

### Performance Optimizations

#### Strategic Indexing (30+ Indexes)
- **Primary indexes**: timestamp, organization_id, source tracking
- **Security indexes**: threat indicators, attack techniques, anomaly scores
- **Compliance indexes**: frameworks, data classification, policy violations
- **Composite indexes**: Common query patterns and correlation searches
- **Array indexes**: Group memberships, email recipients, custom tags

#### Materialized Views
- **hourly_log_counts**: Time-based aggregations
- **threat_correlation_hourly**: Real-time threat intelligence correlation
- **daily_log_counts**: Long-term metrics and trending

#### Time-Series Optimization
- **Hypertable partitioning**: 1-day chunks for optimal performance
- **Compression policies**: Automatic compression after 7 days
- **Retention policies**: Configurable data lifecycle management

## Change Log & Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | June 2025 | Initial ERD documentation with basic schema | System |
| 1.1.0 | June 2025 | Added authentication and authorization schema | System |
| 1.2.0 | June 2025 | Enhanced with log ingestion and processing flows | System |
| 1.3.0 | June 2025 | Added alert management and notification systems | System |
| 1.4.0 | June 2025 | Integrated RBAC and multi-tenancy support | System |
| 1.5.0 | June 2025 | Added API key management and audit logging | System |
| 1.6.0 | June 2025 | Complete visual diagrams and architecture maps | System |
| 1.7.0 | January 2025 | **Extended Normalized Schema (100+ security fields)** | System |

## Related Documentation

- [Visual ERD Diagrams](./ERD_VISUAL_DIAGRAMS.md) - Interactive Mermaid diagrams
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Infrastructure setup
- [KQL API Guide](./KQL_API_GUIDE.md) - Query language documentation
- [Visualization User Guide](./VISUALIZATION_USER_GUIDE.md) - Dashboard usage
- [Main README](../README.md) - Project overview and setup

---

**Document Version:** 1.7.0  
**Authors:** SecureWatch Development Team  
**Next Review:** July 2025