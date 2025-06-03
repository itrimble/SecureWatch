# SecureWatch - Enterprise SIEM Platform

A comprehensive Security Information and Event Management (SIEM) platform built with Next.js 15, designed for enterprise security monitoring, threat detection, and incident response.

## 🎯 Overview

SecureWatch is an enterprise-grade SIEM platform that provides comprehensive security monitoring, threat detection, and incident response capabilities. Built as a monorepo with microservices architecture, it offers real-time log analysis, AI-powered threat detection, and advanced visualization capabilities.

## 🚀 Features

- **📊 Unified Dashboard**: Real-time security metrics and threat intelligence
- **🔍 KQL-Powered Search**: Advanced query language for log analysis
- **🤖 AI/ML Integration**: Anomaly detection and pattern recognition
- **📈 Advanced Visualizations**: Interactive charts and threat maps
- **🔐 Multi-Factor Authentication**: OAuth 2.0 with MFA support
- **📋 Automated Reporting**: Scheduled reports and compliance documentation
- **🚨 Smart Alerting**: ML-based alert correlation and prioritization
- **🔄 Real-time Processing**: Kafka-based log ingestion pipeline
- **🌐 Multi-tenant Architecture**: Enterprise-ready with role-based access
- **📱 Responsive UI**: Mobile-friendly interface with dark mode

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Charts**: Recharts + Nivo
- **Authentication**: Supabase Auth

### Backend (Microservices)
- **API Gateway**: Express + GraphQL
- **Search API**: KQL Engine + Elasticsearch
- **Auth Service**: JWT + OAuth 2.0
- **Log Ingestion**: Kafka + Node.js
- **Analytics Engine**: Python + TensorFlow

### Infrastructure
- **Database**: TimescaleDB + PostgreSQL
- **Cache**: Redis Cluster
- **Message Queue**: Apache Kafka
- **Search**: Elasticsearch
- **Container**: Docker + Kubernetes
- **Monitoring**: Prometheus + Grafana

## 📦 Installation & Setup

### Frontend Application

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itrimble/SecureWatch.git
   cd SecureWatch
   ```

2. **Install dependencies**:
   ```bash
   # Using pnpm (recommended)
   pnpm install
   
   # Or using npm
   npm install
   ```

3. **Run development server**:
   ```bash
   # Start all services (recommended)
   pnpm run dev
   
   # Or start frontend only
   cd frontend && pnpm run dev
   ```

4. **Open browser**:
   Navigate to [http://localhost:4000](http://localhost:4000)

## 🔌 Port Configuration

All services use the 4000 port range to avoid conflicts:

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 4000 | Next.js web application |
| Auth Service | 4001 | Authentication & authorization |
| Log Ingestion | 4002 | Log collection & processing |
| API Gateway | 4003 | API routing & rate limiting |
| Search API | 4004 | KQL search engine |
| Analytics Engine | 4005 | ML/AI processing |

## 🐳 Infrastructure Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ 
- pnpm (recommended) or npm

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone https://github.com/itrimble/SecureWatch.git
   cd SecureWatch
   pnpm install
   ```

2. **Start infrastructure stack**:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Initialize database schema**:
   ```bash
   docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/auth_schema.sql
   ```

4. **Start development services**:
   ```bash
   pnpm run dev
   ```

### Infrastructure Services

The development stack includes:

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| **TimescaleDB** | `securewatch_postgres` | 5432 | PostgreSQL 16 + TimescaleDB 2.20.2 |
| **Redis Master** | `securewatch_redis_master` | 6379 | Primary cache & session store |
| **Redis Replica** | `securewatch_redis_replica` | 6380 | Cache replication |
| **Elasticsearch** | `securewatch_elasticsearch` | 9200 | Log search & indexing |
| **Kibana** | `securewatch_kibana` | 5601 | Data visualization |
| **Kafka** | `securewatch_kafka` | 9092 | Message streaming |
| **Zookeeper** | `securewatch_zookeeper` | 2181 | Kafka coordination |

### Environment Configuration

Environment files are provided for each service:

- `frontend/.env.local` - Frontend configuration
- `apps/auth-service/.env.local` - Authentication service
- `apps/search-api/.env.local` - Search API service  
- `apps/log-ingestion/.env.local` - Log ingestion service

**Default credentials**:
- Database: `securewatch:securewatch_dev@localhost:5432/securewatch`
- Redis: `securewatch_dev` password on ports 6379/6380

### Health Checks

Verify services are running:

```bash
# Database connectivity
docker exec securewatch_postgres pg_isready -U securewatch -d securewatch

# Elasticsearch health
curl http://localhost:9200/_cluster/health

# Redis connectivity  
docker exec securewatch_redis_master redis-cli -a securewatch_dev ping
```

### Log Collection Agent

1. **Set up Python environment**:
   ```bash
   cd agent
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure agent**:
   ```bash
   cp config.ini.example config.ini
   # Edit config.ini with your settings
   ```

3. **Run agent**:
   ```bash
   python3 event_log_agent.py
   ```

For detailed agent setup, see [docs/agent_setup_and_usage.md](docs/agent_setup_and_usage.md).

## 🏗️ Build & Deploy

### Local Build
```bash
npm run build
npm start
```

### Vercel Deployment
This project is configured for automatic deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and configure build settings
3. Each push to `main` triggers a new deployment

**Build Configuration**:
- Build command: `npm run build`
- Install command: `npm install`
- Node.js version: 18.x or later

## 📁 Project Structure

```
SecureWatch/
├── frontend/                  # Next.js frontend application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   └── lib/                  # Utilities and services
├── apps/                     # Backend microservices
│   ├── auth-service/         # Authentication & authorization
│   ├── log-ingestion/        # Log collection & processing
│   ├── search-api/           # KQL search engine
│   ├── api-gateway/          # API routing & rate limiting
│   └── analytics-engine/     # ML/AI processing
├── packages/                 # Shared monorepo packages
│   ├── data-models/          # TypeScript data models
│   ├── shared-utils/         # Common utilities
│   ├── ui-components/        # Shared UI components
│   └── kql-engine/           # KQL parser & engine
├── infrastructure/           # Deployment configurations
│   ├── kubernetes/           # K8s manifests
│   ├── terraform/            # Infrastructure as code
│   └── docker/               # Container definitions
├── agent/                    # Python log collection agent
│   ├── core/                 # Core agent modules
│   └── management/           # Agent management console
├── scripts/                  # Utility scripts
├── docs/                     # Documentation
└── docker-compose.yml        # Local development setup
```

## 🤖 Log Collection Agent

The Python-based log collection agent supports:

### Windows Systems
- **Windows Event Logs**: PowerShell-based collection with JSON conversion
- **File-based logs**: Configurable file tailing for application logs

### macOS Systems (New!)
- **System Logs**: `/var/log/system.log`
- **Install Logs**: `/var/log/install.log`
- **Authentication Events**: Login/logout tracking
- **Security Events**: Security-related activities
- **Process Events**: Process creation/termination
- **Network Events**: Network activity monitoring
- **Firewall Events**: Firewall rule triggers
- **Kernel Events**: Kernel-level activities
- **Audit Trail**: System audit logs

### Supported Log Source Identifiers
- `windows_event_json` - Windows Event Logs (JSON format)
- `syslog_rfc5424` - Standard syslog format
- `macos_install_events` - macOS installation logs
- `macos_system_log` - macOS system logs
- `macos_auth_events` - macOS authentication logs
- `macos_security_events` - macOS security logs
- `macos_process_events` - macOS process logs
- `macos_network_events` - macOS network logs
- `macos_firewall_events` - macOS firewall logs
- And many more...

## 🔧 Configuration

### Agent Configuration
The agent uses `agent/config.ini` for configuration:

```ini
[DEFAULT]
INGEST_API_URL = http://localhost:4002/api/ingest
BATCH_SIZE = 10
FLUSH_INTERVAL_SECONDS = 5

[FileLog:MacInstallLogs]
ENABLED = true
LOG_SOURCE_IDENTIFIER = macos_install_events
FILE_PATH = /var/log/install.log
COLLECTION_INTERVAL_SECONDS = 30
```

### Database Configuration
TimescaleDB is configured via `docker-compose.yml`:
- Database: `eventlog_dev`
- User: `eventlogger`
- Port: `5432`
- Hypertable: `events` (partitioned by timestamp)

## 📊 Recent Updates

### Latest Features (v1.3.0)
- ✅ **macOS Log Support**: Comprehensive macOS log collection and normalization
- ✅ **Agent Reliability**: Fixed file position tracking and improved error handling
- ✅ **Database Compatibility**: Updated TimescaleDB configuration for production use
- ✅ **Port Flexibility**: Configurable ports to avoid conflicts

### Previous Features
- ✅ **Dashboard Interface**: Modern React-based dashboard
- ✅ **Event Visualization**: Charts and graphs for log analysis
- ✅ **Windows Support**: Complete Windows Event Log integration
- ✅ **SIEM Query Generation**: Multi-platform query generation

## 🐛 Troubleshooting

### Common Build Issues

1. **Missing @heroicons/react**: 
   ```bash
   npm install @heroicons/react
   ```

2. **Port already in use**:
   ```bash
   npm run dev -- -p 4001
   ```

3. **Database connection issues**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Agent Issues

1. **File permission errors**: Ensure agent has read access to log files
2. **API connection errors**: Verify `INGEST_API_URL` in config.ini
3. **macOS log access**: Some logs may require elevated permissions

For detailed troubleshooting, see [docs/agent_setup_and_usage.md](docs/agent_setup_and_usage.md).

## 🐛 Bug Tracking & Testing

SecureWatch includes comprehensive bug tracking and testing systems to ensure code quality:

### Bug Tracking System
- **Location**: `docs/bug-tracker.md` and `scripts/bug-tracker.py`
- **Features**: 
  - Persistent JSON-based bug tracking
  - Priority levels (Critical, High, Medium, Low)
  - Status tracking (Open, In Progress, Fixed, Closed, Won't Fix)
  - Integration with development workflow
- **Usage**: 
  ```bash
  python3 scripts/bug-tracker.py
  ```

### Testing Framework  
- **Location**: `docs/testing-framework.md` and `scripts/test-tracker.py`
- **Features**:
  - Unit test tracking with Jest + React Testing Library
  - E2E test management with Playwright/Cypress
  - Test-to-bug relationship mapping
  - Coverage reporting and CI/CD integration
- **Usage**:
  ```bash
  python3 scripts/test-tracker.py
  ```

### Test Execution
```bash
# Run unit tests
pnpm run test

# Run E2E tests  
pnpm run test:e2e

# Run all tests
pnpm run test:all

# Generate coverage report
pnpm run test:coverage
```

## 📚 Learning Resources

This project is designed for educational purposes in cybersecurity training:

- **Windows Event Log Analysis**: Understanding event IDs, log sources, and security implications
- **macOS Security Monitoring**: Learning macOS-specific security events and patterns
- **SIEM Concepts**: Log aggregation, correlation, and alerting
- **Incident Response**: Using logs for security investigations
- **Threat Hunting**: Proactive security monitoring techniques
- **Quality Assurance**: Bug tracking and testing methodologies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create a Pull Request

### Adding New Log Sources
To add support for new log sources:

1. Update `src/lib/log_normalizer.ts` with new normalization logic
2. Add corresponding log source identifier to the agent configuration
3. Test with sample log data
4. Update documentation

## 📄 License

This project is intended for educational use in cybersecurity training programs.

## 👨‍💻 Author

**Ian Trimble**
- Email: itrimble@gmail.com
- GitHub: [@itrimble](https://github.com/itrimble)
- Organization: Remnant Security Group

## 🔗 Related Resources

- [Windows Event Log Documentation](https://docs.microsoft.com/en-us/windows/win32/eventlog/event-logging)
- [macOS Unified Logging](https://developer.apple.com/documentation/os/logging)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ThriveDX Cybersecurity Training](https://thrivedx.com/)

## 🙏 Acknowledgments

- ThriveDX for cybersecurity education excellence
- MITRE Corporation for the ATT&CK framework
- Microsoft for comprehensive Windows Event documentation
- Apple for macOS security logging capabilities
- The cybersecurity community for threat intelligence sharing

---

**Built for cybersecurity education and hands-on learning** 🛡️