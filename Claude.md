- I moved all the docs to the docs folder

# Project Context - SecureWatch SIEM Platform

## Recent Updates (June 6, 2025) - CONSOLIDATION COMPLETED

### 🏗️ Architecture Consolidation v2.1.0 - MAJOR CLEANUP COMPLETED
**95,000+ LINES OF DUPLICATE CODE REMOVED**

#### ✅ Phase 1: Removed Obsolete Code
- **Legacy Frontend**: Removed obsolete `/src` directory (50+ duplicate components)
- **Duplicate Configs**: Cleaned up root-level configuration files
- **Backup Scripts**: Removed outdated backup and legacy scripts

#### ✅ Phase 2: Service Consolidation  
- **Analytics Merger**: Merged analytics-api functionality into analytics-engine
- **Port Optimization**: Resolved port conflicts (analytics-engine → port 4009)
- **Feature Preservation**: Retained all dashboard and widget endpoints

#### ✅ Phase 3: Package Standardization
- **Naming Convention**: Standardized all packages to @securewatch/service-name
- **Version Alignment**: Updated all services to version 1.9.0
- **Build System**: Fixed TypeScript build errors across all packages

#### ✅ Phase 4: Frontend Consolidation
- **Single Implementation**: Consolidated to main `/frontend` directory
- **Removed Duplicates**: Eliminated `/apps/web-frontend` minimal implementation
- **Enterprise Features**: Preserved all advanced security modules

#### 📋 Required Environment Variables
```bash
JWT_ACCESS_SECRET="[secure-random-secret]"
JWT_REFRESH_SECRET="[secure-random-secret]" 
MFA_ENCRYPTION_KEY="[32-byte-base64-key]"
REDIS_URL="redis://localhost:6379"
```

#### 📊 Consolidation Impact Summary
- **Codebase Size**: Reduced by ~95,000 lines of duplicate code
- **Service Count**: Optimized from 12+ to 8 core services  
- **Build Status**: ✅ All packages compile successfully
- **Architecture**: ✅ Clean, maintainable, enterprise-ready

#### 📖 Updated Documentation
- `README.md` - Updated architecture diagrams and service ports
- `docs/MONOREPO_SETUP.md` - Consolidation status and current architecture
- `docs/DEPLOYMENT_GUIDE.md` - Updated service endpoints and health checks

### Current Service Architecture
- **8 Core Services** (consolidated from 12+):
  - `analytics-engine` (Port 4009) - Consolidated analytics + dashboard APIs
  - `auth-service` (Port 4006) - Authentication and authorization
  - `correlation-engine` (Port 4005) - Real-time correlation and rules
  - `hec-service` (Port 8888) - HTTP Event Collector (Splunk-compatible)
  - `log-ingestion` (Port 4002) - Data ingestion and processing
  - `mcp-marketplace` (Port 4010) - MCP integrations
  - `query-processor` (Port 4008) - Async job processing
  - `search-api` (Port 4004) - Search functionality and KQL engine
- **Single Frontend** (Port 4000) - Enterprise Next.js application

### Developer Tooling
- Added comprehensive Makefile with 30+ commands
- Enhanced docker-compose.dev.yml with resource limits
- Key commands:
  - `make up` - Start all services
  - `make status` - Check service health
  - `make dashboard` - Live monitoring
  - `make restart s=service-name` - Restart specific service

### Performance Features (Implemented)
- EventsTable virtualization with TanStack Virtual
- TimescaleDB continuous aggregates
- Query Processor async job handling
- Analytics API with specialized endpoints
- WebSocket real-time notifications

## Project Memory Snapshot

### Use these ACTUAL prompts with Claude Code:

#### Real project context:
- SecureWatch SIEM v1.9.0 enterprise platform at /Users/ian/Scripts/SecureWatch with 12+ microservices, pnpm workspaces, Python EVTX parsing, TaskMaster AI integration, enhanced CLI with ASCII startup

#### Actual services:
- Core services: auth-service:4006, search-api:4004, log-ingestion:4002, frontend:4000
- Extended services: analytics-api:4009, analytics-engine, correlation-engine:4005, query-processor:4008, mcp-marketplace:4010, hec-service, rule-ingestor, api-gateway, web-frontend

#### Technology stack:
- Next.js 15.3.2, React 19, TypeScript, Turbo monorepo, pnpm
- Databases: PostgreSQL/TimescaleDB, Redis, Elasticsearch/OpenSearch
- Python EVTX parsing, multiple Docker variants

#### Development workflow:
- Use ./start-services.sh (with --minimal, --debug options)
- pnpm commands
- Check /tmp/*.log files
- TaskMaster for project management
- cli-dashboard for monitoring

#### Current features:
- Working ASCII CLI startup
- EVTX-ATTACK-SAMPLES integration
- MCP marketplace
- Multi-environment Docker configs
- Resilience testing
- Live dashboard mode

#### Key files to know:
- start-services.sh (enhanced)
- package.json (workspaces)
- docker-compose variants
- scripts/evtx_parser_enhanced.py
- .taskmaster config
- cli-dashboard system

## Claude Code Memories

- assume the answer will always be "yes" if you ask me to do something