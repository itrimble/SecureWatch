# Claude.md

## 1. Project Overview
- **Brief description:** A comprehensive enterprise-grade SIEM (Security Information and Event Management) platform with Splunk-compatible data ingestion capabilities. Built with Next.js 15, this production-ready system features **HTTP Event Collector (HEC) service for Splunk-compatible REST API ingestion**, **universal syslog support (UDP 514, TCP 514, TCP 601 RFC 5425, TLS 6514)**, **file upload API with drag-and-drop interface for CSV/XML/JSON/EVTX files**, **enhanced agent with persistent SQLite queuing and guaranteed delivery**, live Mac agent data collection, TimescaleDB storage with **extended normalized schema (100+ fields)**, KQL-powered search and visualization pipeline, real-time correlation & rules engine with automated threat detection, customizable drag-drop dashboards, interactive analytics (heatmaps, network graphs, geolocation maps), **enhanced CLI dashboard v2.0 with granular service monitoring and control**, and a professional enterprise-grade UI with 25+ specialized security modules supporting **50+ enterprise security use cases** for comprehensive cybersecurity monitoring and threat detection.

- **Tech stack:**
    - **Frontend**: Next.js 15.3.2 (App Router), React 19, TypeScript, Tailwind CSS + Professional Dark Theme, Lucide React Icons, Recharts, Interactive Visualizations (Heatmaps, Network Graphs, Geolocation Maps), Customizable Dashboards, TanStack Virtual for 100K+ row virtualization
    - **Backend**: Express.js microservices, KQL Engine, Correlation & Rules Engine, PostgreSQL/TimescaleDB, Redis, Async Job Processing (Query Processor Service - Port 4008), Analytics Engine (Port 4009 - Consolidated from analytics-api), WebSocket notifications
    - **Data Ingestion**: HTTP Event Collector (HEC) service (port 8888), Universal Syslog Adapter (UDP/TCP 514, TCP 601, TLS 6514), File Upload API with drag-and-drop interface, Multi-format processing (CSV, XML, JSON, EVTX)
    - **Agent**: Python 3.12+ with macOS Unified Logging integration, Persistent SQLite queuing, Guaranteed delivery with retry logic, Compression and batching
    - **CLI Dashboard**: Enhanced TypeScript-based terminal UI with blessed.js, granular service monitoring, collapsible panels, service control capabilities, **blessed-contrib rich dashboard with line charts, gauges, sparklines, Nerd Font support, and responsive 4K layouts**
    - **Infrastructure**: Docker Compose, Redis, Kafka (message streaming), TimescaleDB, OpenSearch, Kubernetes-ready deployments
    - **Database**: TimescaleDB (PostgreSQL) with time-series optimization + Extended Normalized Schema (100+ security fields) + Continuous Aggregates for sub-second dashboard performance
    - **Performance**: TanStack Virtual for 100K+ row tables, TimescaleDB continuous aggregates (6 materialized views), Async job processing with Redis Bull queue, Specialized analytics endpoints with intelligent caching
    - **Build**: Turbo monorepo, pnpm workspaces, TypeScript 5.x

## 2. Directory and File Structure
- **High-level directory map:**
  ```
  SecureWatch/
  ├── frontend/                  # Next.js 15 App Router frontend (SINGLE IMPLEMENTATION)
  │   ├── app/                   # App Router pages
  │   │   ├── page.tsx          # Dashboard (home page)
  │   │   ├── explorer/         # Event log browser with virtualized tables
  │   │   ├── visualizations/   # Charts and graphs
  │   │   ├── reporting/        # Report generation
  │   │   ├── settings/         # Configuration with platform status
  │   │   ├── alerts/           # Alert management
  │   │   ├── correlation/      # Correlation rules interface
  │   │   ├── kql-analytics/    # KQL query interface
  │   │   └── marketplace/      # MCP integrations
  │   ├── components/           # Reusable React components
  │   │   ├── explorer/         # EventsTable with TanStack Virtual
  │   │   ├── dashboard/        # Dashboard widgets
  │   │   ├── visualization/    # Advanced visualizations
  │   │   └── correlation/      # Rules management components
  │   ├── lib/                  # Client utilities
  │   │   ├── api-service.ts    # Unified API client
  │   │   └── supabase/         # Auth integration
  │   └── public/
  │       ├── securewatch-logo.svg  # Official SecureWatch logo
  │       └── logo.svg             # Alias for branding
  ├── apps/                     # Microservices (8 core services)
  │   ├── analytics-engine/     # Analytics + Dashboard APIs (Port 4009) ⭐ CONSOLIDATED
  │   ├── auth-service/         # Authentication & RBAC (Port 4006)
  │   ├── correlation-engine/   # Rules & correlation (Port 4005)
  │   ├── hec-service/          # HTTP Event Collector (Port 8888)
  │   ├── log-ingestion/        # Data ingestion service (Port 4002)
  │   ├── mcp-marketplace/      # MCP integration (Port 4010)
  │   ├── query-processor/      # Async job processing (Port 4008)
  │   └── search-api/           # Search & KQL service (Port 4004)
  ├── packages/                 # Shared packages (@securewatch/*)
  │   ├── alert-fatigue-reduction/  # Alert clustering algorithms
  │   ├── kql-engine/           # KQL parsing and execution
  │   ├── lookup-service/       # Lookup table management
  │   └── shared-utils/         # Common utilities
  ├── infrastructure/           # Database & infrastructure
  │   ├── database/
  │   │   ├── auth_schema.sql   # Authentication schema
  │   │   ├── correlation_schema.sql  # Correlation rules
  │   │   ├── continuous_aggregates.sql  # Performance views
  │   │   ├── extended_schema.sql  # 100+ field schema
  │   │   └── migrations/       # Schema migrations
  │   ├── docker/
  │   │   ├── docker-compose.yml  # Production stack
  │   │   ├── docker-compose.dev.yml  # Development stack
  │   │   └── docker-compose.resilient.yml  # HA configuration
  │   └── kubernetes/           # K8s deployment configs
  ├── agent/                    # Python log collection agent
  │   ├── core/                 # Agent core functionality
  │   ├── event_log_agent.py    # Main agent entry
  │   └── management/           # Agent management console
  ├── cli-dashboard/            # Enhanced terminal UI
  │   ├── src/                  # TypeScript source
  │   │   ├── ui/
  │   │   │   ├── blessed-contrib-dashboard.ui.ts  # Rich widgets
  │   │   │   └── enhanced-status-display.ui.ts    # Service control
  │   │   └── services/         # Backend integration
  │   └── dist/                 # Compiled JavaScript
  ├── scripts/                  # Utility scripts
  │   ├── evtx_parser_enhanced.py  # EVTX parser with MITRE ATT&CK
  │   ├── bug-tracker.py        # Bug tracking system
  │   └── test-tracker.py       # Test management
  ├── docs/                     # Documentation
  │   ├── CLAUDE.md             # This file - AI assistant guide
  │   ├── Claude.md             # Project instructions (legacy)
  │   ├── MONOREPO_SETUP.md     # v2.1.0 consolidation status
  │   ├── DEPLOYMENT_GUIDE.md   # Production deployment
  │   ├── PERFORMANCE_OPTIMIZATION_GUIDE.md  # Performance tuning
  │   ├── aws-ec2-free-tier-tutorial.md  # AWS EC2 setup guide
  │   └── PRD_SecureWatch_Unified.md  # Product requirements
  ├── Makefile                  # 30+ developer commands
  ├── package.json              # Root workspace config
  ├── pnpm-workspace.yaml       # Monorepo configuration
  ├── turbo.json               # Turborepo config
  ├── start-services.sh         # Enterprise startup script
  ├── stop-services.sh          # Graceful shutdown
  └── README.md                 # Project README
  ```
  
- **Entry points:**
    - `frontend/app/layout.tsx`: The root layout component for the entire application
    - `frontend/app/page.tsx`: The main dashboard page, serving as the primary landing page
    - `apps/*/src/index.ts`: Entry points for each microservice
    - `agent/event_log_agent.py`: Python agent for log collection
    - `cli-dashboard/src/index.ts`: Terminal UI entry point
    - `start-services.sh`: Main startup script for the entire platform

## 3. Architecture & Recent Changes

### Version 2.1.0 - Major Consolidation (June 2025)
- **95,000+ lines of duplicate code removed**
- **Service consolidation from 12+ to 8 core services**
- **Unified frontend implementation** (removed duplicate `/src` and `/apps/web-frontend`)
- **Analytics consolidation**: Merged analytics-api into analytics-engine (Port 4009)
- **Package standardization**: All packages now use @securewatch/* naming
- **Version alignment**: All services updated to v1.9.0
- **Build fixes**: Resolved all TypeScript duplicate export errors
- **Frontend fixes**: Fixed React hydration errors and authentication flow

### Current Service Architecture (8 Core Services)
1. **analytics-engine** (Port 4009) - Consolidated analytics + dashboard APIs
2. **auth-service** (Port 4006) - Authentication, RBAC, OAuth, MFA
3. **correlation-engine** (Port 4005) - Real-time correlation and rules
4. **hec-service** (Port 8888) - HTTP Event Collector (Splunk-compatible)
5. **log-ingestion** (Port 4002) - Data ingestion and processing
6. **mcp-marketplace** (Port 4010) - MCP integrations marketplace
7. **query-processor** (Port 4008) - Async job processing with Bull queue
8. **search-api** (Port 4004) - Search functionality and KQL engine

### Frontend Architecture
- **Single implementation** at `/frontend` (Next.js 15.3.2 + React 19)
- **Enterprise features**: 25+ security modules, 50+ use cases
- **Performance optimized**: TanStack Virtual, continuous aggregates
- **Professional UI**: Dark theme, interactive visualizations
- **Logo integration**: Official SecureWatch branding assets

## 4. Key Concepts & Domain Knowledge

### Core Concepts
- **SIEM Platform**: Enterprise security information and event management
- **Log Ingestion**: Multi-format support (syslog, HEC, file upload, agent)
- **Correlation Engine**: Real-time pattern detection and incident generation
- **KQL Support**: Kusto Query Language for advanced log analysis
- **MITRE ATT&CK**: Threat intelligence framework integration
- **UEBA**: User and Entity Behavior Analytics
- **Compliance**: SOX, HIPAA, PCI-DSS, GDPR framework support

### Data Flow
```
Data Sources → Ingestion → TimescaleDB → Processing → Visualization
     ↓             ↓            ↓            ↓             ↓
  Agent/HEC    Parsing    Extended Schema  KQL/Rules   Dashboard
```

### Current Status (June 2025)
- ✅ **All 8 services operational** (100% platform health)
- ✅ **End-to-end pipeline verified**: Agent → Ingestion → DB → API → Frontend
- ✅ **Frontend-backend communication fixed**: API authentication handling
- ✅ **React hydration errors resolved**: SSR compatibility fixes
- ✅ **Official branding added**: SecureWatch logo integrated
- ✅ **AWS documentation added**: EC2 free tier testing guide
- ✅ **Git repository updated**: All changes pushed to GitHub

### Extended Schema Features
- **100+ normalized fields** for comprehensive security analysis
- **Threat intelligence** correlation fields
- **Behavioral analytics** support
- **Geolocation tracking**
- **Compliance mappings**
- **Machine learning** integration points

## 5. How to Run, Build, and Test

### Prerequisites
- Node.js 18.x or later (v24.1.0 tested)
- pnpm 8.x or later
- Docker and Docker Compose
- Python 3.12+ (for agent)
- Git
- 8GB+ RAM recommended
- macOS/Linux (Windows via WSL2)

### Quick Start - Enterprise Mode (Recommended)
```bash
# Clone and setup
git clone https://github.com/yourusername/SecureWatch.git
cd SecureWatch
pnpm install

# Start everything with one command
./start-services.sh

# Access the platform
open http://localhost:4000

# Monitor services
./cli-dashboard.sh enhanced
```

### Environment Variables (Required)
```bash
# Create .env file in project root
JWT_ACCESS_SECRET="[secure-random-secret]"
JWT_REFRESH_SECRET="[secure-random-secret]"
MFA_ENCRYPTION_KEY="[32-byte-base64-key]"
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="securewatch_dev"
DB_PASSWORD="securewatch_dev"
```

### Manual Startup (Advanced)
```bash
# 1. Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# 2. Initialize database
make db-init

# 3. Start services individually
make start-service s=search-api      # Port 4004
make start-service s=log-ingestion   # Port 4002
make start-service s=correlation-engine # Port 4005
make start-service s=analytics-engine # Port 4009
make start-service s=auth-service    # Port 4006
make start-service s=hec-service     # Port 8888
make start-service s=query-processor # Port 4008
make start-service s=mcp-marketplace # Port 4010

# 4. Start frontend
cd frontend && pnpm run dev

# 5. Start agent (optional)
make start-agent
```

### Service Management
```bash
# Using Makefile (recommended)
make status              # Check all services
make restart s=frontend  # Restart specific service
make logs s=search-api   # View service logs
make stop-all           # Stop everything
make clean              # Clean build artifacts

# Using scripts
./stop-services.sh      # Graceful shutdown
./start-services.sh     # Start with health checks

# Using CLI dashboard
./cli-dashboard.sh control start "Search API"
./cli-dashboard.sh control stop all
./cli-dashboard.sh logs --service "Analytics Engine"
```

### Build and Test Commands
```bash
# Development
pnpm run dev            # Start all services in dev mode
pnpm run build          # Production build
pnpm run lint           # Run ESLint
pnpm run typecheck      # TypeScript validation

# Testing
pnpm run test           # Unit tests
pnpm run test:e2e       # End-to-end tests
pnpm run test:coverage  # Coverage report

# Service-specific
cd apps/search-api && pnpm run test
cd apps/correlation-engine && pnpm run test
```

### Health Monitoring
```bash
# Platform health
curl http://localhost:4000/api/health

# Individual services
curl http://localhost:4004/health  # Search API
curl http://localhost:4002/health  # Log Ingestion
curl http://localhost:4005/health  # Correlation Engine
curl http://localhost:4009/health  # Analytics Engine
curl http://localhost:4006/health  # Auth Service
curl http://localhost:8888/health  # HEC Service
curl http://localhost:4008/health  # Query Processor
curl http://localhost:4010/health  # MCP Marketplace

# Database health
curl http://localhost:4002/api/db/health

# Infrastructure
docker compose -f docker-compose.dev.yml ps

# Performance metrics
curl http://localhost:4009/api/v1/analytics/metrics
curl http://localhost:4008/api/jobs/stats
```

## 6. Development Workflow

### Using Makefile Commands
The project includes a comprehensive Makefile with 30+ commands:

```bash
# Service management
make up                 # Start all services
make down              # Stop all services  
make restart s=frontend # Restart specific service
make status            # Check service health
make logs s=search-api # View service logs

# Development
make dev               # Start in development mode
make build             # Build all services
make clean             # Clean build artifacts
make test              # Run all tests

# Database
make db-init           # Initialize database
make db-migrate        # Run migrations
make db-reset          # Reset database

# Monitoring
make dashboard         # Open CLI dashboard
make monitor           # Real-time monitoring
make health            # Health check all services

# Troubleshooting
make debug s=analytics-engine  # Debug specific service
make fix-ports         # Fix port conflicts
make clean-logs        # Clean log files
```

### CLI Dashboard Usage
```bash
# Enhanced dashboard with service control
./cli-dashboard.sh enhanced

# Blessed-contrib rich widgets dashboard
./cli-dashboard.sh blessed-contrib

# Short aliases
./cli-dashboard.sh bc --refresh 3

# Service control
./cli-dashboard.sh control start "Frontend"
./cli-dashboard.sh control stop "Analytics Engine"
./cli-dashboard.sh control restart all

# Status and health
./cli-dashboard.sh status --detailed
./cli-dashboard.sh health --verbose

# Logs viewing
./cli-dashboard.sh logs --service "Search API" --lines 100
```

### Git Workflow
```bash
# Feature development
git checkout -b feature/your-feature
# Make changes
git add .
git commit -m "feat: Add new feature"
git push origin feature/your-feature

# Hotfix
git checkout -b hotfix/fix-issue
# Make fixes
git add .
git commit -m "fix: Resolve issue"
git push origin hotfix/fix-issue
```

## 7. Troubleshooting Guide

### Common Issues and Solutions

#### Services Not Starting
```bash
# Check port availability
lsof -i :4000-4010

# Fix port conflicts
make fix-ports

# Check Docker
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs

# Reset and restart
make clean
make db-reset
./start-services.sh
```

#### Frontend Issues
```bash
# Clear Next.js cache
rm -rf frontend/.next
cd frontend && pnpm run dev

# Check API connectivity
curl -I http://localhost:4000/api/health

# Verify backend services
make status
```

#### Database Connection Issues
```bash
# Check PostgreSQL
docker exec -it securewatch_postgres psql -U securewatch -c "\l"

# Verify credentials
echo $DB_PASSWORD  # Should be "securewatch_dev"

# Reinitialize database
make db-reset
make db-init
```

#### Agent Not Collecting Logs
```bash
# Check agent status
ps aux | grep event_log_agent.py

# Restart agent
make stop-agent
make start-agent

# Check agent logs
tail -f /tmp/agent.log
```

### Performance Optimization
```bash
# Enable continuous aggregates
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/continuous_aggregates.sql

# Monitor query performance
curl http://localhost:4009/api/v1/analytics/performance

# Check cache hit rates
curl http://localhost:4009/api/v1/analytics/cache-stats
```

## 8. API Documentation

### Authentication
All API endpoints require JWT authentication except health checks:
```bash
# Get auth token
curl -X POST http://localhost:4006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@securewatch.io","password":"admin123"}'

# Use token in requests
curl http://localhost:4004/api/v1/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Key API Endpoints

#### Search API (Port 4004)
- `GET /api/v1/search` - KQL search
- `GET /api/v1/search/fields` - Available fields
- `GET /api/v1/search/saved` - Saved searches
- `POST /api/v1/search/export` - Export results

#### Analytics Engine (Port 4009)
- `GET /api/v1/analytics/dashboard` - Dashboard data
- `GET /api/v1/analytics/widgets` - Widget configurations
- `GET /api/v1/analytics/metrics` - Performance metrics
- `POST /api/v1/analytics/query` - Custom analytics

#### Correlation Engine (Port 4005)
- `GET /api/v1/rules` - List correlation rules
- `POST /api/v1/rules` - Create rule
- `GET /api/v1/incidents` - Active incidents
- `POST /api/v1/rules/test` - Test rule

#### HEC Service (Port 8888)
- `POST /services/collector/event` - Splunk-compatible event ingestion
- `POST /services/collector/raw` - Raw data ingestion
- `GET /services/collector/health` - HEC health status

## 9. Cloud Deployment

### AWS EC2 Deployment
The project includes comprehensive AWS deployment documentation:
- See `docs/aws-ec2-free-tier-tutorial.md` for EC2 setup
- Supports Windows Server, Ubuntu, and Amazon Linux instances
- Includes CloudWatch agent configuration for log forwarding
- Cost optimization strategies for free tier usage

### Docker Production Deployment
```bash
# Build production images
docker compose -f docker-compose.yml build

# Deploy with proper environment
docker compose -f docker-compose.yml up -d

# Scale services
docker compose -f docker-compose.yml up -d --scale log-ingestion=3
```

### Kubernetes Deployment
```bash
# Apply configurations
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/

# Check deployment
kubectl get pods -n securewatch
kubectl get services -n securewatch
```

## 10. Security Considerations

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Enable TLS for all services
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up backup procedures
- [ ] Configure rate limiting
- [ ] Enable MFA for admin accounts
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities
- [ ] Implement network segmentation

### Secret Management
```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT secrets
openssl rand -base64 24  # For encryption keys

# Store in environment
export JWT_ACCESS_SECRET="your-generated-secret"
export MFA_ENCRYPTION_KEY="your-generated-key"
```

## 11. Contributing

### Code Style
- TypeScript with strict mode
- ESLint + Prettier formatting
- Conventional commits
- Comprehensive JSDoc comments
- Unit tests for new features

### Pull Request Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request with detailed description

### Development Guidelines
- Follow existing patterns
- Maintain backward compatibility
- Add tests for new features
- Update documentation
- Run full test suite before PR

## 12. Support and Resources

### Documentation
- Project README: `/README.md`
- API Documentation: `/docs/API_GUIDE.md`
- Deployment Guide: `/docs/DEPLOYMENT_GUIDE.md`
- Performance Guide: `/docs/PERFORMANCE_OPTIMIZATION_GUIDE.md`
- AWS Tutorial: `/docs/aws-ec2-free-tier-tutorial.md`

### Community
- GitHub Issues: Report bugs and request features
- Discussions: Architecture and feature discussions
- Wiki: Additional guides and tutorials

### License
This project is licensed under the MIT License - see the LICENSE file for details.

---

## Recent Updates Log

### June 7, 2025
- ✅ Completed v2.1.0 architecture consolidation (95k+ lines removed)
- ✅ Fixed all service operational issues (8/8 services running)
- ✅ Resolved frontend-backend communication errors
- ✅ Fixed React hydration mismatches
- ✅ Added official SecureWatch logo
- ✅ Added AWS EC2 free tier documentation
- ✅ Updated all documentation to reflect current state
- ✅ All changes committed and pushed to GitHub

### Version History
- **v2.1.0** - Major consolidation and cleanup
- **v2.0.0** - Enhanced enterprise features
- **v1.9.0** - Performance optimizations
- **v1.8.0** - Correlation engine integration
- **v1.7.0** - CLI dashboard enhancement
- **v1.6.0** - TimescaleDB integration
- **v1.5.0** - KQL engine implementation

---

*Last updated: June 7, 2025*