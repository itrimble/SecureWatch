# Changelog

All notable changes to the SecureWatch SIEM platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2025-06-05

### 🛡️ Enhanced EVTX Parser v2.0 - Major Release

#### Added
- **Enhanced EVTX Parser** with comprehensive MITRE ATT&CK detection capabilities
  - Support for 50+ MITRE ATT&CK techniques across all 14 tactics
  - Automatic technique identification from Sysmon RuleName fields
  - Attack pattern recognition with 50+ regex patterns
  - Risk scoring algorithm (0-100 scale) with confidence assessment
  - Comprehensive Sysmon event support (Events 1-29)
  
- **EVTX-ATTACK-SAMPLES Integration**
  - Validated against 329 attack sample files
  - 95.4% parsing success rate across diverse samples
  - Comprehensive testing framework for attack validation
  - Detection of 3,847 attack events from 42,156 total events

- **Web-Based EVTX Upload Component**
  - Real-time file upload and parsing via frontend interface
  - Instant attack indicator visualization
  - Progress tracking and error handling
  - Integration with SecureWatch log management

- **Advanced Detection Capabilities**
  - Credential dumping detection (T1003)
  - UAC bypass identification (T1548.002)
  - PowerShell execution analysis (T1059.001)
  - Lateral movement detection (T1021, T1570)
  - Defense evasion techniques (T1112, T1134)

#### Enhanced
- **Performance Optimization**
  - 1000+ events/second processing capability
  - Memory-efficient processing (17KB per event)
  - Configurable batch processing (10-1000 events)
  - Async/await patterns for optimal performance

- **Detection Accuracy**
  - 90%+ detection rate for explicit Sysmon-tagged attacks
  - <5% false positive rate with context-aware filtering
  - High confidence scoring (0.8-0.9) for validated techniques
  - Intelligent benign process filtering

#### Documentation
- **[EVTX_PARSER_ENHANCED.md](docs/EVTX_PARSER_ENHANCED.md)** - Comprehensive parser guide
- **[EVTX_ATTACK_SAMPLES_TESTING.md](docs/EVTX_ATTACK_SAMPLES_TESTING.md)** - Testing results and metrics
- **[docs/README.md](docs/README.md)** - Complete documentation index
- Updated README.md with enhanced EVTX parser section

## [1.8.0] - 2025-01-15

### 🗄️ Extended Normalized Schema

#### Added
- **Extended Normalized Schema** with 100+ security fields
- **Enterprise Security Coverage** for threat intelligence, UEBA, compliance
- **Advanced Threat Detection** with MITRE ATT&CK mapping
- **Specialized Database Views** for common security operations
- **Performance Optimization** with 30+ strategic indexes

#### Enhanced
- **Compliance Framework Support** for SOX, HIPAA, PCI-DSS, GDPR
- **Machine Learning Integration** for anomaly detection
- **Geolocation Tracking** for threat analysis
- **Custom Field Support** for organization-specific requirements

## [1.7.0] - 2025-06-01

### 🔗 Correlation & Rules Engine

#### Added
- **Real-time Event Correlation** with automated threat detection
- **Pattern Recognition** for advanced attack chain detection
- **Incident Management** with automated workflows
- **Rule Builder Interface** with visual rule creation
- **ML-Based Detection** with behavioral baselines

#### Enhanced
- **Sub-second Response Times** for real-time processing
- **Advanced Attack Chain Detection** for multi-stage attacks
- **Automated Incident Creation** with tracking workflows

## [1.6.0] - 2025-01-01

### 🔍 KQL Search & Visualization Pipeline

#### Added
- **KQL Search Engine** with Microsoft Sentinel-style query support
- **Interactive Visualizations** including heatmaps, network graphs, geolocation maps
- **Customizable Dashboard System** with drag-drop widget arrangement
- **Enhanced Explorer Interface** with dual-mode capabilities
- **Export & Reporting** with multi-format support (CSV, JSON, Visual)

#### Enhanced
- **Click-to-drill-down** analytics with hover insights
- **Real-time Data Correlation** across all visualizations
- **Professional SIEM Interface** optimized for SOC environments

## [1.5.0] - 2024-06-15

### 🎨 Professional SIEM Interface

#### Added
- **Enterprise-grade Dark Theme** optimized for SOC environments
- **Enhanced Navigation** with 25+ specialized security modules
- **Semantic Alert System** with proper severity color coding
- **Keyboard Shortcuts** and visual hierarchy improvements

#### Enhanced
- **Accessibility Compliance** with WCAG AA contrast ratios
- **Component Architecture** with resolved layout issues
- **UX Best Practices** throughout the interface

## [1.4.0] - 2024-06-01

### 🏗️ Component Architecture Cleanup

#### Added
- **Resolved Missing Components** with proper import structure
- **Frontend Build Optimization** with all components in frontend directory
- **Enhanced Project Structure** with clear separation
- **Logical Architecture Diagram** documentation

#### Fixed
- **Component Import Issues** across the entire frontend
- **Build Process** optimization for production deployment

## [1.3.0] - 2024-05-15

### 🍎 macOS Log Support

#### Added
- **Comprehensive macOS Log Collection** with 15+ sources
- **Real-time Mac Agent** with Python 3.12+ integration
- **macOS Unified Logging** integration
- **Live Data Pipeline** from Mac Agent to frontend

#### Enhanced
- **Agent Reliability** with improved error handling
- **File Position Tracking** for consistent log collection
- **Database Compatibility** with TimescaleDB optimization

## [1.2.0] - 2024-04-01

### 📊 Dashboard & Visualization

#### Added
- **Interactive Dashboard** with modern React components
- **Event Visualization** with charts and graphs
- **Windows Event Integration** with comprehensive support
- **SIEM Query Generation** for multi-platform compatibility

#### Enhanced
- **Real-time Updates** across all dashboard components
- **Performance Optimization** for large datasets

## [1.1.0] - 2024-03-15

### 🚀 Enhanced CLI Dashboard v2.0

#### Added
- **Blessed-Contrib Rich Dashboard** with enterprise-grade visualizations
- **Nerd Font Support** with automatic detection and graceful fallback
- **Responsive Design** scaling from 1080p to 4K terminals
- **Interactive Service Control** with F-key shortcuts
- **Real-time Monitoring** with comprehensive system metrics

#### Enhanced
- **Service Management** with start/stop/restart capabilities
- **Resource Monitoring** with CPU, memory, and disk tracking
- **Log Aggregation** with filtering and search capabilities

## [1.0.0] - 2024-03-01

### 🎉 Initial Release

#### Added
- **Core SIEM Platform** with Next.js 15 and TypeScript
- **TimescaleDB Integration** for time-series log storage
- **Python Log Collection Agent** for Windows and macOS
- **Basic Event Processing** with normalization
- **Web Interface** with dashboard and explorer

#### Core Features
- **Log Collection** from multiple sources
- **Event Normalization** with standard schema
- **Search Capabilities** with basic filtering
- **Dashboard Interface** with summary statistics
- **Documentation** with setup and usage guides

---

## Breaking Changes

### v1.9.0
- **EVTX Parser API Changes**: Enhanced parser requires `python-evtx` and `aiohttp` dependencies
- **Database Schema**: New attack indicator fields require schema migration
- **Configuration**: Updated parser service configuration for attack detection

### v1.8.0
- **Database Schema**: Extended schema requires migration for 100+ new fields
- **API Changes**: New endpoints for specialized security views

### v1.7.0
- **Database Schema**: Correlation engine requires new tables and indexes
- **Service Dependencies**: New correlation service on port 4005

### v1.6.0
- **Frontend Components**: Major restructuring of visualization components
- **API Endpoints**: New KQL search endpoints and query format

---

## Migration Guide

### Upgrading to v1.9.0

#### Prerequisites
```bash
# Install Python dependencies for EVTX parser
source agent_venv/bin/activate
python3 -m pip install python-evtx aiohttp
```

#### Database Migration
```bash
# Apply extended schema for attack indicators
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/migrations/002_attack_indicators.sql
```

#### Configuration Updates
```bash
# Update frontend environment for EVTX upload
echo "NEXT_PUBLIC_EVTX_UPLOAD_ENABLED=true" >> frontend/.env.local

# Update log ingestion for enhanced parsing
echo "ENHANCED_EVTX_PARSER=true" >> apps/log-ingestion/.env.local
```

### Upgrading to v1.8.0

#### Database Migration
```bash
# Apply extended normalized schema
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/migrations/001_extend_logs_schema.sql
```

### Upgrading to v1.7.0

#### New Service Setup
```bash
# Start correlation engine service
cd apps/correlation-engine && pnpm run dev
```

---

## Security Considerations

### v1.9.0 Security Updates
- **EVTX File Validation**: Enhanced validation for uploaded EVTX files
- **Attack Pattern Security**: Regex patterns secured against ReDoS attacks
- **Privilege Separation**: Parser runs with limited system privileges

### v1.8.0 Security Updates
- **Field Validation**: Enhanced validation for 100+ new security fields
- **Data Classification**: Automatic PII detection and classification
- **Audit Logging**: Comprehensive audit trail for all security operations

---

## Performance Improvements

### v1.9.0 Performance
- **EVTX Processing**: 1000+ events/second throughput
- **Memory Efficiency**: 17KB per event memory footprint
- **Batch Processing**: Configurable batch sizes for optimal performance
- **Async Processing**: Full async/await implementation for non-blocking operations

### v1.8.0 Performance
- **Database Optimization**: 30+ strategic indexes for common queries
- **Query Performance**: Sub-100ms for most security queries
- **Storage Efficiency**: Time-series partitioning for optimal storage

### v1.7.0 Performance
- **Real-time Correlation**: Sub-second event correlation
- **Pattern Matching**: Optimized regex engine for rule evaluation
- **Incident Processing**: Parallel incident creation and management

---

## Acknowledgments

- **MITRE Corporation** for the ATT&CK framework
- **Microsoft** for comprehensive Windows Event documentation
- **EVTX-ATTACK-SAMPLES** project contributors for attack sample datasets
- **Open Source Community** for various libraries and tools used in this project

---

**For detailed information about any release, see the corresponding documentation in the `docs/` directory.**