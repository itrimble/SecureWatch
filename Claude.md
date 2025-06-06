- I moved all the docs to the docs folder

# Project Context - SecureWatch SIEM Platform

## Recent Updates (June 6, 2025) - SECURITY FIXES COMPLETED

### 🛡️ Security Update v1.13.0 - CRITICAL FIXES COMPLETED
**ALL P0 SECURITY VULNERABILITIES RESOLVED**

#### ✅ Critical Security Issues Fixed (P0)
- **JWT Security**: Fixed hardcoded secrets, added environment variable validation
- **MFA Security**: Implemented complete Redis storage, fixed encryption key management  
- **API Key Authentication**: Complete validation system with database lookup
- **Token Refresh**: Fixed permission fetching vulnerability
- **Organization ID Validation**: Prevents cross-tenant data access

#### ✅ High-Priority Issues Fixed (P1/P2)
- **Service Dependencies**: Fixed correlation engine missing logger
- **Database Performance**: Applied TimescaleDB continuous aggregates
- **Production Logging**: Replaced console.log with winston logging
- **Error Handling**: Implemented sanitized error responses
- **Service Monitoring**: Added comprehensive health checks and alerting

#### 📋 Required Environment Variables
```bash
JWT_ACCESS_SECRET="[secure-random-secret]"
JWT_REFRESH_SECRET="[secure-random-secret]" 
MFA_ENCRYPTION_KEY="[32-byte-base64-key]"
REDIS_URL="redis://localhost:6379"
```

#### 📊 Security Impact Summary
- **Security Risk**: Reduced from CRITICAL to LOW
- **Service Availability**: Improved from 5/8 to 8/8 services operational
- **Production Readiness**: ✅ ACHIEVED
- **Multi-tenancy**: ✅ SECURE

#### 📖 Security Documentation
- `docs/SECUREWATCH_BUG_ANALYSIS.md` - Complete vulnerability analysis
- `docs/SECURITY_FIXES_SUMMARY.md` - Detailed security fixes summary
- `docs/CHANGELOG.md` - Security update details

### Build System Fixes
- Fixed TypeScript build errors across multiple packages:
  - analytics-api: Router type annotations and unused parameters
  - hec-service: Strict optional property types
  - rule-ingestor: Removed invalid dependency
- All packages now build successfully with `pnpm run build`

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