# 🚀 SecureWatch Quick Start - v2.1.0

> **📋 Documentation Navigation:** [Main README](README.md) | [Deployment Guide](DEPLOYMENT_GUIDE.md) | [Architecture Setup](MONOREPO_SETUP.md) | [Port Configuration](PORT_CONFIGURATION.md)

## ✅ Platform Ready!

Your SecureWatch SIEM platform v2.1.1 is fully operational with:
- ✅ 8 core microservices (optimized from 12+)
- ✅ Enterprise Next.js 15 frontend with full TypeScript support
- ✅ Consolidated analytics engine with dashboard APIs
- ✅ Production-ready TimescaleDB with performance optimizations
- ✅ Enhanced CLI dashboard for monitoring
- ✅ **Zero TypeScript compilation errors** across all packages
- ✅ **Next.js 15 App Router compatibility** with async route handlers
- ✅ **Complete type safety** for all SIEM components

## 🎯 Quick Start

### Option 1: Enterprise Startup (Recommended)
```bash
cd /Users/ian/Scripts/SecureWatch

# Start everything with health monitoring
./start-services.sh

# Access the platform
open http://localhost:4000

# Monitor services with CLI dashboard
./cli-dashboard.sh enhanced
```

### Option 2: Using Makefile
```bash
# Start all services
make up

# Check service health
make status

# Access monitoring dashboard
make dashboard
```

### Option 3: Manual Service Management
```bash
# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Start services individually with pnpm
cd apps/search-api && pnpm run dev          # Port 4004
cd apps/auth-service && pnpm run dev        # Port 4006  
cd apps/log-ingestion && pnpm run dev       # Port 4002

# Verify TypeScript compilation (should show zero errors)
pnpm run typecheck
cd apps/analytics-engine && pnpm run dev    # Port 4009
cd apps/correlation-engine && pnpm run dev  # Port 4005
cd apps/query-processor && pnpm run dev     # Port 4008
cd apps/mcp-marketplace && pnpm run dev     # Port 4010
cd apps/hec-service && pnpm run dev         # Port 8888

# Start frontend
cd frontend && pnpm run dev                  # Port 4000
```

## 🏗️ Current Architecture (v2.1.0)

### 8 Core Services
| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 4000 | Enterprise Next.js application |
| Log Ingestion | 4002 | Data ingestion and processing |
| Search API | 4004 | KQL queries and search |
| Correlation Engine | 4005 | Real-time correlation and rules |
| Auth Service | 4006 | Authentication and authorization |
| Query Processor | 4008 | Async job processing |
| Analytics Engine | 4009 | Dashboard APIs (consolidated) |
| MCP Marketplace | 4010 | MCP integrations |
| HEC Service | 8888 | Splunk-compatible HTTP Event Collector |

## 🔍 Verify Service Health

### Quick Health Check
```bash
# Check all services at once
make status

# Individual service checks
curl http://localhost:4000/api/health  # Frontend
curl http://localhost:4002/health      # Log Ingestion
curl http://localhost:4004/health      # Search API
curl http://localhost:4005/health      # Correlation Engine
curl http://localhost:4006/health      # Auth Service
curl http://localhost:4008/health      # Query Processor
curl http://localhost:4009/health      # Analytics Engine
curl http://localhost:4010/health      # MCP Marketplace
curl http://localhost:8888/health      # HEC Service
```

## 🎯 First Steps

1. **Access Platform**: Open http://localhost:4000
2. **Upload Data**: Go to Settings → Log Sources
3. **Search Events**: Use the Explorer tab with KQL queries
4. **View Analytics**: Check the Dashboard for real-time metrics
5. **Monitor Services**: Use `./cli-dashboard.sh enhanced`

## 📁 Key Configuration Files

```
SecureWatch/
├── .env                         # Environment variables (required)
├── docker-compose.dev.yml       # Infrastructure services
├── start-services.sh           # Enterprise startup script
├── Makefile                    # 30+ developer commands
├── turbo.json                  # Build pipeline config
├── pnpm-workspace.yaml         # Monorepo workspace
├── frontend/                   # Next.js application
├── apps/                       # 8 microservices
└── infrastructure/             # Database schemas & configs
```

## 🛠️ Troubleshooting

### Services Not Starting
```bash
# Check port conflicts
make fix-ports

# Reset and restart
make clean
./start-services.sh
```

### Database Issues
```bash
# Reset database
make db-reset
make db-init
```

### Build Errors
```bash
# Clean and rebuild
pnpm run clean
pnpm install
pnpm run build
```

## 🎉 Success!

Your SecureWatch SIEM v2.1.0 is ready! The platform provides:
- **Enterprise-grade** SIEM capabilities
- **Splunk-compatible** data ingestion
- **Real-time** correlation and alerting
- **Advanced analytics** with KQL support
- **Professional UI** with dark theme

### Next Steps:
- Explore the enhanced dashboard features
- Set up correlation rules for threat detection
- Configure data sources and ingestion
- Use the CLI dashboard for monitoring