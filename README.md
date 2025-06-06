# SecureWatch - Enterprise SIEM Platform

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Live Pipeline](https://img.shields.io/badge/pipeline-live-success.svg)
![Data Ingestion](https://img.shields.io/badge/ingestion-splunk--compatible-orange.svg)

<p align="center">
  <img src="frontend/public/images/siem-interface.png" alt="SecureWatch SIEM Interface" width="800">
</p>

## 🚀 Enterprise-Grade Security Platform

SecureWatch is a comprehensive Security Information and Event Management (SIEM) platform that rivals enterprise solutions like Splunk, Sentinel, and QRadar. Built for modern security operations, it provides advanced threat detection, real-time analytics, and comprehensive data ingestion capabilities.

**🔥 Latest Release: Splunk-Compatible Data Ingestion System**  
Complete enterprise-grade data ingestion with HTTP Event Collector (HEC), universal syslog support, file upload API, and enhanced agent capabilities.

## ⭐ Key Features

### 🚀 Splunk-Compatible Data Ingestion
- **HTTP Event Collector (HEC)**: Full Splunk API compatibility with token authentication
- **Universal Syslog**: Support for UDP 514, TCP 514, TCP 601 (RFC 5425), TLS 6514
- **File Upload API**: Drag-and-drop interface for CSV, XML, JSON, EVTX files
- **Enhanced Agent**: Persistent queuing with guaranteed delivery and compression

### 🔍 Advanced Analytics & Search
- **KQL Engine**: Microsoft Sentinel-compatible query language
- **Real-time Processing**: Stream processing with <100ms latency
- **Interactive Visualizations**: Heatmaps, network graphs, geolocation maps
- **Customizable Dashboards**: Drag-and-drop security widgets

### 🛡️ Enterprise Security Features
- **Threat Intelligence**: VirusTotal, AbuseIPDB, MISP integration
- **MITRE ATT&CK**: Automatic technique detection and mapping
- **Correlation Engine**: Real-time pattern detection and alerting
- **UEBA**: User and Entity Behavior Analytics

### 📊 Compliance & Reporting
- **SOX, HIPAA, PCI-DSS**: Built-in compliance frameworks
- **Automated Reporting**: Scheduled reports with multi-format export
- **Audit Trail**: Complete activity logging and forensic capabilities
- **Data Retention**: Configurable retention policies with hot/cold storage

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SecureWatch SIEM Platform                   │
├─────────────────────────────────────────────────────────────────┤
│  Data Ingestion Layer                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ HEC Service │ │   Syslog    │ │ File Upload │ │  Agents  │  │
│  │   (8888)    │ │ (514,601,   │ │     API     │ │(Enhanced)│  │
│  │             │ │    6514)    │ │   (4000)    │ │          │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Processing Layer                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │Log Ingestion│ │Correlation  │ │ Analytics   │              │
│  │   (4002)    │ │ Engine      │ │   Engine    │              │
│  │             │ │   (4005)    │ │   (4003)    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Storage Layer                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │TimescaleDB  │ │   Kafka     │ │   Redis     │              │
│  │  (5432)     │ │   (9092)    │ │   (6379)    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  API & Frontend Layer                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ Search API  │ │   Frontend  │ │     MCP     │              │
│  │   (4004)    │ │   (4000)    │ │ Marketplace │              │
│  │             │ │             │ │   (4006)    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ 
- Python 3.8+ (for agents)
- 8GB RAM, 50GB storage

### 1. Clone Repository
```bash
git clone https://github.com/your-org/SecureWatch.git
cd SecureWatch
```

### 2. Start Platform
```bash
# Enterprise startup (recommended)
./start.sh

# OR manual startup
docker compose up -d
pnpm install
pnpm run dev
```

### 3. Access Interfaces
- **Web Interface**: http://localhost:4000
- **HEC Service**: http://localhost:8888
- **Search API**: http://localhost:4004
- **Correlation Engine**: http://localhost:4005

### 4. Start Data Collection
```bash
# Start agent for live data
source agent_venv/bin/activate
python3 agent/event_log_agent.py

# OR send test data via HEC
curl -X POST http://localhost:8888/services/collector \
  -H "Authorization: Splunk your-token" \
  -H "Content-Type: application/json" \
  -d '{"event": {"message": "Test event", "source": "test"}}'
```

## 📡 Data Ingestion Methods

### 1. HTTP Event Collector (HEC)
**Splunk-compatible REST API for high-volume log ingestion**

```bash
# Single event
curl -X POST http://localhost:8888/services/collector \
  -H "Authorization: Splunk <TOKEN>" \
  -d '{"event": {"message": "User login", "user": "john.doe"}}'

# Batch events
curl -X POST http://localhost:8888/services/collector \
  -H "Authorization: Splunk <TOKEN>" \
  -d '{"event": {"message": "Event 1"}}
      {"event": {"message": "Event 2"}}'
```

### 2. Universal Syslog
**Support for all standard syslog ports and protocols**

```bash
# UDP syslog (traditional)
echo '<134>Jan 1 12:00:00 server1 app: User authenticated' | nc -u localhost 514

# TCP syslog (reliable)
echo '<134>Jan 1 12:00:00 server1 app: User authenticated' | nc localhost 514

# TLS syslog (secure)
openssl s_client -connect localhost:6514 -cert client.crt
```

### 3. File Upload
**Web interface for ad-hoc file analysis**
- Navigate to Settings → Log Sources
- Drag and drop CSV, XML, JSON, EVTX files
- Monitor real-time processing progress

### 4. Enhanced Agents
**Persistent agents with guaranteed delivery**
- SQLite-backed queuing
- Automatic retry with exponential backoff
- Compression and batching
- Cross-platform support

## 🔍 Usage Examples

### KQL Queries
```kql
// Find failed login attempts
SecurityEvent
| where EventID == 4625
| where TimeGenerated > ago(24h)
| summarize FailedAttempts = count() by Account, Computer
| order by FailedAttempts desc

// Detect potential credential stuffing
SecurityEvent
| where EventID == 4625
| where TimeGenerated > ago(1h)
| summarize AttemptCount = count() by SourceIP = IpAddress
| where AttemptCount > 50
```

### Threat Detection
```kql
// MITRE ATT&CK T1003 - Credential Dumping
ProcessEvents
| where ProcessCommandLine contains_any ("mimikatz", "lsass", "procdump")
| extend MitreTechnique = "T1003"
| project TimeGenerated, Computer, ProcessName, ProcessCommandLine, MitreTechnique
```

### Compliance Reporting
```kql
// PCI-DSS Requirement 8.2.3 - Password Policy
SecurityEvent
| where EventID in (4723, 4724, 4725)
| where TimeGenerated > ago(30d)
| summarize PasswordChanges = count() by Account
| extend ComplianceStatus = iff(PasswordChanges > 0, "Compliant", "Non-Compliant")
```

## 🛡️ Security Features

### Threat Intelligence Integration
- **VirusTotal**: Automatic hash and URL checking
- **AbuseIPDB**: IP reputation scoring
- **MISP**: Threat intelligence sharing
- **Custom APIs**: Extensible enrichment framework

### MITRE ATT&CK Mapping
- Automatic technique detection from Sysmon events
- 50+ supported techniques across all tactics
- Confidence scoring and context analysis
- Attack chain visualization

### Real-time Correlation
- Pattern-based detection rules
- Behavioral analytics
- Anomaly detection with ML
- Custom rule development

## 📊 Monitoring & Operations

### Health Monitoring
```bash
# Platform health
curl http://localhost:4000/api/health

# Service-specific health
curl http://localhost:8888/health      # HEC
curl http://localhost:4002/health      # Log Ingestion
curl http://localhost:4004/health      # Search API
curl http://localhost:4005/health      # Correlation
```

### Performance Metrics
```bash
# Prometheus metrics
curl http://localhost:8888/metrics
curl http://localhost:4002/metrics

# Service statistics
curl http://localhost:4002/adapters/syslog/stats
curl http://localhost:8888/admin/stats
```

### CLI Dashboard
```bash
# Enhanced terminal dashboard
./cli-dashboard.sh enhanced

# Rich widgets dashboard
./cli-dashboard.sh blessed-contrib

# Service control
./cli-dashboard.sh control start HEC
./cli-dashboard.sh logs --service "Search API"
```

## 🏢 Enterprise Deployment

### Production Configuration
```yaml
# docker-compose.prod.yml
services:
  hec-service:
    image: securewatch/hec:latest
    environment:
      - RATE_LIMIT_MAX_REQUESTS=10000
      - KAFKA_BROKERS=kafka-cluster:9092
    deploy:
      replicas: 3
      
  log-ingestion:
    image: securewatch/log-ingestion:latest
    ports:
      - "514:514/udp"
      - "6514:6514/tcp"
    deploy:
      replicas: 2
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/
kubectl apply -f infrastructure/kubernetes/securewatch-platform.yaml
```

### High Availability Setup
- Load balancer for HEC endpoints
- Kafka cluster with replication
- TimescaleDB with streaming replication
- Redis cluster for caching

## 📚 Documentation

### Comprehensive Guides
- **[Data Ingestion Guide](docs/DATA_INGESTION_GUIDE.md)** - Complete ingestion setup
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment
- **[KQL API Guide](docs/KQL_API_GUIDE.md)** - Query language reference
- **[EVTX Parser Guide](docs/EVTX_PARSER_ENHANCED.md)** - Windows event analysis
- **[Lookup Tables Guide](docs/LOOKUP_TABLES_USER_GUIDE.md)** - Data enrichment

### User Guides
- **[Visualization Guide](docs/VISUALIZATION_USER_GUIDE.md)** - Dashboard creation
- **[Troubleshooting Export](docs/TROUBLESHOOTING_EXPORT_USER_GUIDE.md)** - Support bundles
- **[Support Bundle API](docs/SUPPORT_BUNDLE_API_GUIDE.md)** - Technical reference

### Developer Resources
- **[API Reference](docs/API_REFERENCE.md)** - REST API documentation
- **[Integration Guide](docs/INTEGRATION_GUIDE.md)** - Third-party integrations
- **[Testing Framework](docs/testing-framework.md)** - QA guidelines

## 🔧 Development

### Local Development
```bash
# Install dependencies
pnpm install

# Start development services
./start-dev.sh

# Run tests
pnpm test
pnpm test:e2e

# Build for production
pnpm build
```

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Quality
- **ESLint**: Code linting and formatting
- **TypeScript**: Type safety and documentation
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing

## 📈 Performance & Scaling

### Benchmarks
- **Ingestion Rate**: 1M+ events/second
- **Query Response**: <100ms for most queries
- **Storage Efficiency**: 70% compression ratio
- **Uptime**: 99.9% availability target

### Scaling Options
- **Horizontal Scaling**: Add more service instances
- **Database Sharding**: Distribute data across nodes
- **Kafka Partitioning**: Increase message throughput
- **CDN Integration**: Global content delivery

## 🛡️ Security Considerations

### Authentication & Authorization
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- API token management
- Active Directory integration

### Data Protection
- Encryption at rest and in transit
- Data anonymization options
- GDPR compliance features
- Audit logging

### Network Security
- TLS 1.3 for all communications
- IP allowlisting
- Rate limiting and DDoS protection
- VPN integration support

## 🌟 Use Cases

### Security Operations Center (SOC)
- Real-time threat monitoring
- Incident response workflows
- Threat hunting capabilities
- Analyst dashboards

### Compliance Management
- Automated compliance reporting
- Policy enforcement
- Audit trail maintenance
- Regulatory frameworks

### DevSecOps
- Security pipeline integration
- Vulnerability management
- Code security scanning
- Infrastructure monitoring

### Enterprise IT
- System monitoring
- Performance analytics
- Capacity planning
- Troubleshooting support

## 📞 Support & Community

### Getting Help
- **Documentation**: Comprehensive guides and API reference
- **GitHub Issues**: Bug reports and feature requests
- **Community Forums**: User discussions and best practices
- **Enterprise Support**: 24/7 support for production deployments

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code style guidelines
- Testing requirements
- Documentation standards
- Review process

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the cybersecurity community**

[![Stars](https://img.shields.io/github/stars/your-org/SecureWatch?style=social)](https://github.com/your-org/SecureWatch)
[![Forks](https://img.shields.io/github/forks/your-org/SecureWatch?style=social)](https://github.com/your-org/SecureWatch)
[![Contributors](https://img.shields.io/github/contributors/your-org/SecureWatch)](https://github.com/your-org/SecureWatch/graphs/contributors)

> **Enterprise-grade SIEM platform with Splunk-compatible data ingestion, real-time analytics, and comprehensive threat detection capabilities** 🚀