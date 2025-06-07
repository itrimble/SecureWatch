# SecureWatch Port Configuration - v2.1.0 Consolidated Architecture

All services have been configured to use standardized ports to avoid conflicts and ensure clean architecture.

## Frontend
- **Port 4000**: Enterprise Next.js Frontend Application
  - Location: `/frontend`
  - Start: `pnpm run dev` (from frontend directory)
  - Status: ✅ Operational (single consolidated implementation)

## Core Microservices (8 Services)
- **Port 4002**: Log Ingestion Service
  - Location: `/apps/log-ingestion`
  - Handles: Data ingestion, multi-format parsing, normalization
  - Status: ✅ Operational
  
- **Port 4004**: Search API
  - Location: `/apps/search-api`
  - Handles: KQL queries, log search, field analysis
  - Status: ✅ Operational

- **Port 4005**: Correlation Engine
  - Location: `/apps/correlation-engine`
  - Handles: Real-time correlation, rules engine, incident management
  - Status: ✅ Operational
  
- **Port 4006**: Auth Service
  - Location: `/apps/auth-service`
  - Handles: Authentication, OAuth, JWT tokens, RBAC, MFA
  - Status: ✅ Operational

- **Port 4008**: Query Processor
  - Location: `/apps/query-processor`
  - Handles: Async job processing, WebSocket notifications
  - Status: ✅ Operational

- **Port 4009**: Analytics Engine (Consolidated)
  - Location: `/apps/analytics-engine`
  - Handles: Dashboard APIs, analytics, widgets (merged from analytics-api)
  - Status: ✅ Operational

- **Port 4010**: MCP Marketplace
  - Location: `/apps/mcp-marketplace`
  - Handles: MCP integrations, marketplace connections
  - Status: ✅ Operational

- **Port 8888**: HEC Service
  - Location: `/apps/hec-service`
  - Handles: HTTP Event Collector (Splunk-compatible)
  - Status: ✅ Operational

## Infrastructure Services (Docker)
- **Port 5432**: PostgreSQL/TimescaleDB
  - Database: Extended normalized schema (100+ fields)
  - Continuous aggregates for performance optimization
- **Port 6379**: Redis Master
  - Caching, session storage, job queues
- **Port 6380**: Redis Replica (optional)
- **Port 9092**: Kafka
  - Message streaming for log ingestion
- **Port 9200**: OpenSearch (replaces Elasticsearch)
  - Full-text search and log analytics
- **Port 5601**: OpenSearch Dashboards (replaces Kibana)
  - Data visualization and exploration

## Starting Services

### Option 1: Enterprise Startup Script (Recommended)
```bash
# Start everything with health monitoring
./start-services.sh

# Monitor with CLI dashboard
./cli-dashboard.sh enhanced
```

### Option 2: Using Makefile Commands
```bash
# Start all services
make up

# Check service health
make status

# Restart specific service
make restart s=analytics-engine

# View service logs
make logs s=search-api
```

### Option 3: Manual Service Startup
```bash
# Infrastructure first
docker compose -f docker-compose.dev.yml up -d

# Individual services (pnpm)
cd apps/search-api && pnpm run dev
cd apps/auth-service && pnpm run dev
cd apps/log-ingestion && pnpm run dev
cd apps/analytics-engine && pnpm run dev
cd apps/correlation-engine && pnpm run dev
cd apps/query-processor && pnpm run dev
cd apps/mcp-marketplace && pnpm run dev
cd apps/hec-service && pnpm run dev

# Frontend
cd frontend && pnpm run dev
```

## Service Health Checks

All services expose health endpoints for monitoring:

```bash
# Frontend
curl http://localhost:4000/api/health

# Core services
curl http://localhost:4002/health  # Log Ingestion
curl http://localhost:4004/health  # Search API
curl http://localhost:4005/health  # Correlation Engine
curl http://localhost:4006/health  # Auth Service
curl http://localhost:4008/health  # Query Processor
curl http://localhost:4009/health  # Analytics Engine
curl http://localhost:4010/health  # MCP Marketplace
curl http://localhost:8888/health  # HEC Service
```

## Environment Variables

Required environment variables for v2.1.0:

```bash
# Authentication (Required)
JWT_ACCESS_SECRET="[secure-random-secret]"
JWT_REFRESH_SECRET="[secure-random-secret]"
MFA_ENCRYPTION_KEY="[32-byte-base64-key]"

# Infrastructure
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="securewatch_dev"
DB_PASSWORD="securewatch_dev"

# Service URLs (Auto-configured)
NEXT_PUBLIC_AUTH_API_URL=http://localhost:4006
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:4004
NEXT_PUBLIC_LOG_INGESTION_URL=http://localhost:4002
NEXT_PUBLIC_ANALYTICS_API_URL=http://localhost:4009
NEXT_PUBLIC_HEC_SERVICE_URL=http://localhost:8888
```

## Port Conflicts Resolution

If you encounter port conflicts:

```bash
# Check which process is using a port
lsof -i :4000

# Fix port conflicts automatically
make fix-ports

# Kill specific port process
sudo kill -9 $(lsof -t -i:4000)
```

---

**Last Updated**: June 7, 2025 - v2.1.0 Consolidation Complete