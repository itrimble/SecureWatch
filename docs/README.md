# SecureWatch SIEM Documentation

## 📚 Documentation Overview

This directory contains comprehensive documentation for the SecureWatch SIEM platform, covering all aspects from architecture design to deployment guides and testing strategies.

## 📋 Documentation Index

### 🏗️ Architecture & Design
- **[ENTITY_RELATIONSHIP_DIAGRAM.md](ENTITY_RELATIONSHIP_DIAGRAM.md)** - Database schema and relationships
- **[ERD_VISUAL_DIAGRAMS.md](ERD_VISUAL_DIAGRAMS.md)** - Visual database architecture diagrams
- **[CORRELATION_RULES_ENGINE_ERD.md](CORRELATION_RULES_ENGINE_ERD.md)** - Correlation engine architecture

### 🛡️ EVTX Analysis & Attack Detection
- **[EVTX_PARSER_ENHANCED.md](EVTX_PARSER_ENHANCED.md)** - ⭐ **Enhanced EVTX Parser v2.0** comprehensive guide with MITRE ATT&CK detection
- **[EVTX_ATTACK_SAMPLES_TESTING.md](EVTX_ATTACK_SAMPLES_TESTING.md)** - ⭐ **Testing results** against EVTX-ATTACK-SAMPLES dataset (329 files)
- **[EVTX_PARSING_STRATEGY.md](EVTX_PARSING_STRATEGY.md)** - Overall EVTX parsing strategy and implementation
- **[windows-event-field-mappings.md](windows-event-field-mappings.md)** - Windows Event ID field mappings

### 🔍 Analytics & Visualization
- **[KQL_API_GUIDE.md](KQL_API_GUIDE.md)** - KQL search engine and query language guide
- **[PERFORMANCE_API_GUIDE.md](PERFORMANCE_API_GUIDE.md)** - ⭐ **Performance APIs** comprehensive guide for async jobs and fast dashboards
- **[VISUALIZATION_USER_GUIDE.md](VISUALIZATION_USER_GUIDE.md)** - Interactive visualizations and dashboard usage
- **[LOOKUP_TABLES_USER_GUIDE.md](LOOKUP_TABLES_USER_GUIDE.md)** - ⭐ **Lookup Tables** comprehensive guide for CSV uploads and data enrichment

### 🚀 Deployment & Operations
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment and configuration
- **[OPENSEARCH_INTEGRATION_GUIDE.md](OPENSEARCH_INTEGRATION_GUIDE.md)** - ⭐ **OpenSearch Integration** comprehensive migration and setup guide
- **[claude-siem-integration-guide.md](claude-siem-integration-guide.md)** - Integration guide for Claude AI capabilities

### 📋 Product Requirements & Specifications
- **[PRD_SecureWatch_Unified.md](PRD_SecureWatch_Unified.md)** - Unified product requirements document
- **[PRD_SecureWatch.md](PRD_SecureWatch.md)** - Core SecureWatch SIEM requirements
- **[PRD_EventLogger.md](PRD_EventLogger.md)** - Event logging component specifications
- **[README_SecureWatch.md](README_SecureWatch.md)** - SecureWatch platform overview
- **[README_EventLogger.md](README_EventLogger.md)** - Event logger component overview

### 🧪 Testing & Quality Assurance
- **[testing-framework.md](testing-framework.md)** - Comprehensive testing framework and strategies
- **[bug-tracker.md](bug-tracker.md)** - Bug tracking system and workflow

### 🛡️ Security & Compliance
- **[SECUREWATCH_BUG_ANALYSIS.md](SECUREWATCH_BUG_ANALYSIS.md)** - ⭐ **Security Analysis** comprehensive vulnerability assessment and remediation
- **[SECURITY_CONFIGURATION_GUIDE.md](SECURITY_CONFIGURATION_GUIDE.md)** - ⭐ **Security Configuration** essential setup for production deployment
- **Security Hardening Guide** - Advanced production security practices (Coming Soon)
- **Compliance Framework** - SOX, HIPAA, PCI-DSS, GDPR compliance mapping (Coming Soon)

### 🛠️ Support & Troubleshooting
- **[SUPPORT_BUNDLE_API_GUIDE.md](SUPPORT_BUNDLE_API_GUIDE.md)** - ⭐ **Support Bundle API** comprehensive technical documentation
- **[TROUBLESHOOTING_EXPORT_USER_GUIDE.md](TROUBLESHOOTING_EXPORT_USER_GUIDE.md)** - ⭐ **User Guide** for troubleshooting log export feature

## 🔥 Latest Updates & Key Features

### 🏗️ Architecture Consolidation v2.1.0 (June 7, 2025) 🚀
**MAJOR CONSOLIDATION COMPLETED - 95,000+ LINES OF DUPLICATE CODE REMOVED**

✅ **Service Architecture Optimized:**
- Consolidated from 12+ services to 8 core services
- Merged analytics-api functionality into analytics-engine (Port 4009)
- Eliminated duplicate frontend implementations
- Standardized all packages to @securewatch/* naming convention
- Updated all services to version 1.9.0

✅ **Build System Fixes:**
- Resolved all TypeScript build errors across packages
- Fixed React hydration mismatches in frontend
- Eliminated duplicate export conflicts
- Improved build performance and reliability

✅ **Enterprise Features Preserved:**
- Maintained all 25+ security modules
- Retained 50+ enterprise use cases
- Enhanced performance with TanStack Virtual
- Professional dark theme and branding

✅ **Infrastructure Improvements:**
- Added comprehensive Makefile with 30+ commands
- Enhanced CLI dashboard with service control
- Improved Docker configurations with resource limits
- Updated documentation to reflect current architecture

**📋 Current Service Count:** 8 core services (down from 12+)
**🔍 Architecture Details:** See [MONOREPO_SETUP.md](MONOREPO_SETUP.md)

### Performance & Scalability Optimizations (June 2025) 🆕
Enterprise-grade performance enhancements for handling large-scale SIEM operations:

#### ⚡ EventsTable Virtualization
- **TanStack Virtual Integration**: Handles 100K+ rows with smooth scrolling
- **Row Virtualization**: Only renders visible rows for optimal memory usage (ROW_HEIGHT: 80px)
- **Performance Metrics**: Overscan 10 rows, efficient memory usage with viewport-based rendering
- **Search & Filter Optimization**: Fast client-side filtering with virtual scrolling
- **Implementation**: `/frontend/components/explorer/EventsTable.tsx` - Complete virtualization overhaul

#### 🏗️ TimescaleDB Continuous Aggregates
- **Pre-computed Metrics**: Real-time dashboards with sub-second response times
- **Automated Rollups**: 6 continuous aggregates covering 5-minute to daily intervals
- **Memory Efficiency**: Reduced query load with materialized views
- **Performance Boost**: 10x faster dashboard queries for time-series data
- **Implementation**: `/infrastructure/database/continuous_aggregates.sql` - 6 materialized views
  - `realtime_security_events` (5-minute buckets)
  - `hourly_security_metrics` (1-hour buckets)
  - `daily_security_summary` (daily buckets)
  - `source_health_metrics` (source monitoring)
  - `alert_performance_metrics` (alert analytics)
  - `compliance_event_summary` (compliance tracking)

#### 🔄 Async Job Processing System
- **Query-Processor Service**: Dedicated microservice for long-running queries (Port 4008)
- **Job Queue Management**: Redis-backed Bull queue with priority scheduling
- **WebSocket Notifications**: Real-time job status updates and progress tracking
- **Concurrent Processing**: Configurable worker pools for parallel query execution
- **Query Support**: SQL, KQL, and OpenSearch queries with validation
- **Implementation**: `/apps/query-processor/` - Complete microservice with job management

#### 📊 Specialized Analytics-API Service
- **Fast Dashboard Endpoints**: Optimized endpoints for dashboard widgets (Port 4009)
- **Intelligent Caching**: NodeCache with different TTL per endpoint (15s-10min)
- **Continuous Aggregate Queries**: Direct access to pre-computed metrics
- **Rate Limiting**: Built-in protection (100 requests/minute per IP)
- **Performance Monitoring**: Real-time cache hit rates and system metrics
- **Implementation**: `/apps/analytics-engine/` - Consolidated microservice with specialized endpoints
  - Dashboard endpoints: `/api/dashboard/*` (realtime-overview, hourly-trends, etc.)
  - Widget endpoints: `/api/widgets/*` (total-events, critical-alerts, etc.)

#### 🔔 WebSocket Notifications System
- **Real-time Updates**: Live dashboard updates without polling
- **Multi-client Support**: Broadcast updates to multiple connected clients
- **Connection Management**: Automatic reconnection and heartbeat monitoring
- **Event Streaming**: Real-time log ingestion status and alerts
- **Integration**: Built into query-processor service with Socket.IO

### Splunk-Compatible Data Ingestion System 🆕
Complete enterprise-grade data ingestion capabilities with Splunk-style functionality:

#### 🚀 HTTP Event Collector (HEC) Service
- **Splunk-Compatible API**: Full HEC endpoint compatibility with token authentication
- **Multi-Format Support**: JSON events, raw data, batch processing, and streaming ingestion
- **Enterprise Security**: Token-based authentication, rate limiting, and access control
- **High-Performance**: Kafka integration, async processing, and horizontal scaling
- **Docker Integration**: Containerized deployment with health monitoring

#### 📡 Universal Syslog Ingestion
- **Standard Syslog Ports**: Full support for UDP 514, TCP 514, TCP 601 (RFC 5425), and TLS 6514
- **Multi-Protocol Transport**: Simultaneous UDP, TCP, and secure TLS syslog reception
- **RFC Compliance**: Support for both RFC 3164 and RFC 5424 syslog formats
- **JSON Payload Support**: Structured data extraction from syslog messages
- **Connection Management**: Robust connection handling with automatic reconnection

#### 📁 File Upload & Processing API
- **Drag-and-Drop Interface**: Modern file upload component with progress tracking
- **Multi-Format Support**: CSV, XML, JSON, EVTX, and plain text file processing
- **Real-time Processing**: Live status updates and processing progress monitoring
- **Batch Processing**: Efficient handling of large files with queue management
- **Error Recovery**: Comprehensive error handling and retry mechanisms

#### 🔄 Enhanced Agent with Persistent Queuing
- **Guaranteed Delivery**: SQLite-backed persistent queue with retry logic
- **Dual-Loop Architecture**: Separate buffer-to-queue and queue-to-transport loops
- **Compression Support**: Automatic payload compression for large events
- **Exponential Backoff**: Intelligent retry scheduling with configurable delays
- **Queue Management**: Statistics, cleanup, and administrative controls

### Enterprise Log Format Support 🆕
Comprehensive support for enterprise log formats with specialized adapters:
- **[LOG_FORMATS_GUIDE.md](LOG_FORMATS_GUIDE.md)** - ⭐ **Log Formats Guide** for CSV, XML, JSON, Syslog with JSON payloads, and Key-Value formats

### Lookup Tables & Data Enrichment System 🆕
Enterprise-grade lookup table system with Splunk-style functionality and modern enhancements:

#### 🎯 Data Enrichment Features
- **CSV Upload & Management**: Upload CSV files as lookup tables with automatic field detection
- **Real-time Search Enrichment**: Automatic field enrichment during KQL queries
- **External API Integration**: Built-in support for VirusTotal, AbuseIPDB, IPStack and custom APIs
- **Performance Optimization**: Redis caching, batch processing, and optimized database queries
- **Usage Analytics**: Comprehensive statistics, performance metrics, and query logging

#### 📊 Pre-loaded Sample Data
- **IP Geolocation Database**: 8+ sample entries for network event enrichment
- **User Directory**: Corporate user data with departments, titles, and risk scores
- **Asset Inventory**: Server and workstation data with criticality levels
- **Threat Intelligence**: Malicious IP database with confidence scoring

#### 🚀 Technical Capabilities
- **Automatic Field Detection**: Smart type inference (IP, email, URL, date, number, boolean)
- **Enrichment Rules Engine**: Configurable rules with conditions and transformations
- **Batch Processing**: Handle large CSV files (up to 50MB) with 1000-record batches
- **API Rate Limiting**: Built-in rate limiting and retry logic for external services
- **Cache Management**: Intelligent caching with TTL and manual cache clearing

#### 💼 Enterprise Use Cases
- **Threat Intelligence Correlation**: Enrich network events with IOC data
- **User Behavior Analytics**: Add department and risk scores to authentication events
- **Asset Context**: Enhance host events with criticality and ownership information
- **Geolocation Analysis**: Map IP addresses to countries, cities, and coordinates

### Troubleshooting Log Bundle Export 🆕
Enterprise-grade log export system for SecureWatch support and troubleshooting:

#### 🎯 Support & Troubleshooting Features
- **Comprehensive Log Export**: Stream internal platform logs from all microservices
- **Time Range Filtering**: Export logs from specific time periods when issues occurred
- **Service Filtering**: Select specific microservices (correlation-engine, search-api, etc.)
- **Log Level Control**: Filter by error, warning, info, or debug levels
- **Automatic Compression**: ZIP bundles with logs, metadata, and documentation
- **Health Monitoring**: Real-time service status checks and export validation

#### 📊 Enterprise Capabilities
- **OpenSearch Integration**: Efficient scroll API for large dataset retrieval
- **Streaming Downloads**: Memory-efficient file streaming with automatic cleanup
- **Metadata Generation**: Comprehensive export details and service statistics
- **Progress Tracking**: Real-time export progress with phase indicators
- **Error Recovery**: Robust error handling with fallback mechanisms

#### 🚀 Usage Examples
- **Web Interface**: Settings → Platform Status → Troubleshooting Export
- **API Endpoint**: `POST /api/support/export-logs` with time range and filters
- **Bundle Contents**: Structured logs, export metadata, and documentation README

### Enhanced EVTX Parser v2.0 (June 2025)
The **Enhanced EVTX Parser** represents a major advancement in Windows event log analysis:

#### 🎯 MITRE ATT&CK Detection
- **Automatic Technique Identification**: Direct extraction from Sysmon RuleName fields
- **50+ Supported Techniques**: Comprehensive coverage across all 14 MITRE tactics
- **Confidence Scoring**: ML-inspired assessment (0.0-1.0 scale)
- **Attack Chain Detection**: Multi-stage attack pattern recognition

#### 📊 Comprehensive Testing Results
- **329 EVTX-ATTACK-SAMPLES**: Full dataset validation
- **95.4% Success Rate**: Reliable parsing across diverse samples
- **3,847 Attack Events**: Detected from 42,156 total events
- **90%+ Detection Accuracy**: For explicit Sysmon-tagged techniques

#### 🚀 Performance Metrics
- **1000+ Events/Second**: High-throughput processing capability
- **Sub-Second Response**: Real-time analysis for typical volumes
- **17KB per Event**: Memory-efficient processing
- **<5% False Positives**: High accuracy with context-aware filtering

### Attack Pattern Recognition
The parser includes sophisticated pattern recognition for:

| Category | Techniques | Examples |
|----------|------------|----------|
| **Credential Access** | T1003, T1110, T1558 | Mimikatz, credential dumping, Kerberos attacks |
| **Defense Evasion** | T1548, T1112, T1134 | UAC bypass, registry modification, token manipulation |
| **Execution** | T1059, T1204, T1218 | PowerShell, scripts, signed binary proxy execution |
| **Lateral Movement** | T1021, T1570, T1534 | Remote services, lateral tool transfer |
| **Persistence** | T1547, T1543, T1053 | Autostart execution, services, scheduled tasks |

### Risk Scoring Algorithm
Intelligent risk assessment based on:
- **Event Criticality**: Base score by Event ID importance
- **Attack Indicators**: Confidence-weighted scoring
- **Environmental Context**: Benign process filtering
- **Severity Classification**: Critical (90+), High (70-89), Medium (50-69), Low (<50)

## 🛠️ Implementation Guides

### Quick Start - EVTX Analysis
1. **Web Interface**: Upload EVTX files via http://localhost:4000/settings/log-sources
2. **Command Line**: `python3 scripts/evtx_parser_enhanced.py sample.evtx`
3. **Testing**: `python3 scripts/test_enhanced_evtx_pipeline.py --samples-path /path/to/EVTX-ATTACK-SAMPLES`

### Integration Examples
```bash
# Parse with attack detection
python3 scripts/evtx_parser_enhanced.py sample.evtx --attack-only

# Comprehensive analysis with JSON output
python3 scripts/evtx_parser_enhanced.py sample.evtx --output results.json

# Test against attack samples
python3 scripts/test_enhanced_evtx_pipeline.py \
  --samples-path /path/to/EVTX-ATTACK-SAMPLES-master \
  --max-files 10 \
  --output test_results.json
```

## 📈 Detection Coverage

### Top MITRE Techniques Detected
1. **T1059.001** - PowerShell (1,247 detections, 89% confidence)
2. **T1003** - OS Credential Dumping (892 detections, 94% confidence)
3. **T1218** - Signed Binary Proxy Execution (634 detections, 78% confidence)
4. **T1548.002** - UAC Bypass (523 detections, 85% confidence)
5. **T1112** - Registry Modification (445 detections, 72% confidence)

### Sysmon Event Coverage
- **Event 1**: Process Creation (15,678 events, 2,134 attack indicators)
- **Event 3**: Network Connection (8,934 events, 456 attack indicators)
- **Event 7**: Image Loaded (6,789 events, 234 attack indicators)
- **Event 11**: FileCreate (4,567 events, 189 attack indicators)
- **Event 13**: Registry Value Set (3,456 events, 445 attack indicators)

## 🎯 Use Cases

### Security Operations Center (SOC)
- **Incident Response**: Rapid triage with attack-only filtering
- **Threat Hunting**: Comprehensive MITRE ATT&CK technique search
- **Forensic Analysis**: Detailed event context and attack chains
- **Risk Assessment**: Automated prioritization with confidence scoring

### Red Team / Penetration Testing
- **Attack Validation**: Verify detection capabilities against known techniques
- **Evasion Testing**: Test detection thresholds and false positive rates
- **Technique Coverage**: Comprehensive MITRE ATT&CK technique validation
- **Tool Evaluation**: Assess detection of specific attack tools

### Threat Intelligence
- **TTP Analysis**: Map observed techniques to threat actors
- **Campaign Tracking**: Identify attack patterns and methodologies
- **IOC Correlation**: Link indicators with tactical context
- **Attribution Research**: Support threat actor attribution efforts

### Compliance & Audit
- **Evidence Collection**: Comprehensive event context for investigations
- **Audit Trail**: Complete parsing with full field preservation
- **Regulatory Compliance**: Support SOX, HIPAA, PCI-DSS requirements
- **Documentation**: Automated report generation with attack indicators

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning Integration**: ML-based anomaly detection
- **Threat Intelligence Correlation**: IOC and TTP correlation
- **Timeline Reconstruction**: Automated attack timeline generation
- **Multi-Format Support**: JSON, CSV, STIX/TAXII output formats

### Research Areas
- **Behavioral Analysis**: User and entity behavior analytics
- **Graph Analysis**: Attack path visualization
- **Attribution**: Threat actor correlation techniques
- **Automated Response**: SOAR platform integration

## 📞 Support & Contributing

### Getting Help
- **Documentation Issues**: Open an issue in the GitHub repository
- **Feature Requests**: Submit detailed enhancement proposals
- **Bug Reports**: Use the integrated bug tracking system

### Contributing Guidelines
1. **Documentation Standards**: Follow existing format and structure
2. **Testing Requirements**: Include validation against attack samples
3. **Performance Benchmarks**: Provide performance metrics for new features
4. **Security Review**: Ensure all code meets security standards

---

**Comprehensive documentation for enterprise-grade Windows event log analysis and MITRE ATT&CK-based threat detection** 🛡️

## 📊 Quick Reference

| Document | Purpose | Audience |
|----------|---------|----------|
| **EVTX_PARSER_ENHANCED.md** | Complete EVTX parser guide | Security Engineers, SOC Analysts |
| **EVTX_ATTACK_SAMPLES_TESTING.md** | Testing results and metrics | Security Researchers, Validators |
| **KQL_API_GUIDE.md** | Query language documentation | Threat Hunters, Analysts |
| **DEPLOYMENT_GUIDE.md** | Production deployment | DevOps, System Administrators |
| **testing-framework.md** | Quality assurance | QA Engineers, Developers |

For the most up-to-date information, always refer to the individual documentation files and the main project README.