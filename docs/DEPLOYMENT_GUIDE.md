# SecureWatch SIEM - Comprehensive Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start Deployment](#quick-start-deployment)
3. [Advanced Configuration](#advanced-configuration)
4. [Production Deployment](#production-deployment)
5. [Visualization Features Setup](#visualization-features-setup)
6. [KQL Search Configuration](#kql-search-configuration)
7. [Health Monitoring](#health-monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## 🔧 Prerequisites

### System Requirements
- **Operating System**: macOS 10.15+ (for Mac agent), Linux (for production)
- **Node.js**: 18.x or higher
- **Package Manager**: pnpm (recommended) or npm
- **Docker**: Latest version with Docker Compose
- **Memory**: 8GB RAM minimum (16GB recommended for production)
- **Storage**: 50GB minimum (SSD recommended)
- **Network**: Ports 4000, 4002, 4004, 5432, 6379, 9200 available

### Development Dependencies
```bash
# Install Node.js and pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh
pnpm env use --global 18

# Install Docker Desktop (macOS)
# Download from: https://docker.com/products/docker-desktop

# Verify installations
node --version    # Should be 18.x+
pnpm --version    # Should be 8.x+
docker --version  # Should be 20.x+
```

---

## 🚀 Quick Start Deployment

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/itrimble/SecureWatch.git
cd SecureWatch

# Install all dependencies
pnpm install
```

### 2. Enterprise Single-Command Startup
```bash
# Start complete SIEM platform with one command
./start-services.sh
```

**This automatically:**
- ✅ Starts Docker infrastructure (PostgreSQL, Redis, Elasticsearch, Kafka)
- ✅ Initializes TimescaleDB schema
- ✅ Starts all microservices (Search API, Log Ingestion, Frontend)
- ✅ Runs comprehensive health checks
- ✅ Provides real-time monitoring

### 3. Verify Deployment
```bash
# Check all services
curl http://localhost:4000/api/health  # Frontend
curl http://localhost:4004/health      # Search API
curl http://localhost:4002/health      # Log Ingestion

# Access the platform
open http://localhost:4000
```

---

## ⚙️ Advanced Configuration

### Environment Variables

Create environment files for each service:

#### Frontend (`.env.local`)
```env
# Database
DATABASE_URL=postgresql://securewatch:securewatch_dev@localhost:5432/securewatch

# API Endpoints
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:4004
NEXT_PUBLIC_INGESTION_API_URL=http://localhost:4002

# Authentication (optional)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:4000

# Visualization Settings
NEXT_PUBLIC_ENABLE_GEOLOCATION=true
NEXT_PUBLIC_ENABLE_HEATMAPS=true
NEXT_PUBLIC_ENABLE_NETWORK_GRAPHS=true
```

#### Search API (`.env.local`)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=securewatch
DB_USER=securewatch
DB_PASSWORD=securewatch_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=securewatch_dev

# KQL Engine
KQL_CACHE_SIZE=10000
KQL_CACHE_TTL=300000
KQL_MAX_ROWS=10000
KQL_TIMEOUT=30000

# CORS
CORS_ORIGIN=http://localhost:4000,http://localhost:4001
```

#### Log Ingestion (`.env.local`)
```env
# Database
DATABASE_URL=postgresql://securewatch:securewatch_dev@localhost:5432/securewatch

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=log-ingestion-service

# Processing
BATCH_SIZE=15
FLUSH_INTERVAL=5000
MAX_RETRIES=3
```

### Service Configuration

#### Mac Agent Configuration (`agent/config.ini`)
```ini
[DEFAULT]
INGEST_API_URL = http://localhost:4002/api/ingest
BATCH_SIZE = 10
FLUSH_INTERVAL_SECONDS = 5
DEBUG_MODE = false

# Enable all log sources for comprehensive monitoring
[FileLog:MacSystemLogs]
ENABLED = true
LOG_SOURCE_IDENTIFIER = macos_system_log
FILE_PATH = /var/log/system.log
COLLECTION_INTERVAL_SECONDS = 30

[FileLog:MacInstallLogs]
ENABLED = true
LOG_SOURCE_IDENTIFIER = macos_install_events
FILE_PATH = /var/log/install.log
COLLECTION_INTERVAL_SECONDS = 60

[FileLog:MacAuthLogs]
ENABLED = true
LOG_SOURCE_IDENTIFIER = macos_auth_events
FILE_PATH = /var/log/auth.log
COLLECTION_INTERVAL_SECONDS = 15
```

---

## 🏭 Production Deployment

### Docker Compose Production Setup

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://securewatch:${DB_PASSWORD}@postgres:5432/securewatch
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  search-api:
    build:
      context: ./apps/search-api
      dockerfile: Dockerfile.prod
    ports:
      - "4004:4004"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
      - elasticsearch
    restart: unless-stopped

  log-ingestion:
    build:
      context: ./apps/log-ingestion
      dockerfile: Dockerfile.prod
    ports:
      - "4002:4002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://securewatch:${DB_PASSWORD}@postgres:5432/securewatch
    depends_on:
      - postgres
      - kafka
    restart: unless-stopped

  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      - POSTGRES_DB=securewatch
      - POSTGRES_USER=securewatch
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      - ./infrastructure/database:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    restart: unless-stopped

volumes:
  timescaledb_data:
  redis_data:
  elasticsearch_data:
```

### Kubernetes Deployment

For enterprise Kubernetes deployment, see `infrastructure/kubernetes/` directory:

```bash
# Apply namespace and configurations
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/securewatch-platform.yaml

# Monitor deployment
kubectl get pods -n securewatch
kubectl logs -f deployment/securewatch-frontend -n securewatch
```

---

## 📊 Visualization Features Setup

### Interactive Dashboard Configuration

The new visualization features are automatically enabled with the standard deployment. Key components include:

#### 1. Customizable Dashboard System
- **Location**: `http://localhost:4000` → Custom Dashboard tab
- **Features**: Drag-drop widgets, resize controls, 8+ widget types
- **Categories**: Analytics, Security, Intelligence, System, Overview

#### 2. KQL Search & Visualization
- **Location**: `http://localhost:4000/explorer` → KQL Search & Visualization tab
- **Features**: Query editor, predefined templates, multiple chart types
- **Supported Formats**: Table, Bar, Line, Area, Pie, Timeline

#### 3. Advanced Visualizations
- **Location**: `http://localhost:4000/visualizations`
- **Components**:
  - Interactive Heatmaps (User Activity, Security Events, System Performance)
  - Network Correlation Graphs (Attack Paths, Entity Relationships)
  - Threat Geolocation Maps (Global IP Threat Mapping)

### Visualization Data Sources

Configure data sources for optimal visualization:

```javascript
// Frontend configuration for visualization data
const VISUALIZATION_CONFIG = {
  heatmaps: {
    updateInterval: 30000,     // 30 seconds
    dataRetention: 86400000,   // 24 hours
    colorSchemes: ['security', 'activity', 'performance']
  },
  networkGraphs: {
    maxNodes: 100,
    refreshRate: 60000,        // 1 minute
    scenarios: ['lateral-movement', 'data-exfiltration', 'insider-threat']
  },
  geolocation: {
    enableRealTime: true,
    threatIntelSources: ['internal', 'otx', 'custom'],
    mapThemes: ['dark', 'satellite', 'terrain', 'light']
  }
};
```

---

## 🔍 KQL Search Configuration

### KQL Engine Setup

The KQL engine is pre-configured but can be customized:

```typescript
// Search API KQL Engine Configuration
const KQL_CONFIG = {
  database: timescaleDbConnection,
  cache: {
    enabled: true,
    maxSize: 10000,
    ttl: 5 * 60 * 1000    // 5 minutes
  },
  timeout: 30000,         // 30 seconds
  maxRows: 10000,
  rateLimiting: {
    windowMs: 60000,      // 1 minute
    maxQueries: 100       // 100 queries per minute
  }
};
```

### Predefined Query Templates

Add custom query templates in `frontend/components/kql-search-visualization.tsx`:

```typescript
const CUSTOM_QUERIES = [
  {
    name: "Custom Security Alert",
    description: "Organization-specific security patterns",
    query: `logs
| where timestamp >= ago(1h)
| where source_identifier contains "security"
| where message contains "failed" or message contains "unauthorized"
| summarize count() by bin(timestamp, 5m), source_identifier
| sort by timestamp desc`,
    category: "Custom"
  }
];
```

---

## 🏥 Health Monitoring

### Service Health Endpoints

Monitor all services with automated health checks:

```bash
# Comprehensive health check script
#!/bin/bash
services=(
  "Frontend:http://localhost:4000/api/health"
  "Search API:http://localhost:4004/health"
  "Log Ingestion:http://localhost:4002/health"
  "Database:http://localhost:4002/db/health"
)

for service in "${services[@]}"; do
  name=$(echo $service | cut -d':' -f1)
  url=$(echo $service | cut -d':' -f2-)
  
  status=$(curl -s -o /dev/null -w "%{http_code}" $url)
  if [ $status -eq 200 ]; then
    echo "✅ $name: Healthy"
  else
    echo "❌ $name: Unhealthy (HTTP $status)"
  fi
done
```

### Infrastructure Monitoring

```bash
# Check Docker containers
docker compose -f docker-compose.dev.yml ps

# Check service logs
docker compose -f docker-compose.dev.yml logs -f --tail=50

# Monitor resource usage
docker stats
```

### Mac Agent Monitoring

```bash
# Check agent status
ps aux | grep event_log_agent.py

# Monitor agent logs
tail -f /tmp/mac-agent.log

# Restart agent if needed
source agent_venv/bin/activate
python3 agent/event_log_agent.py
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Services Won't Start
```bash
# Check port conflicts
lsof -i :4000 -i :4002 -i :4004 -i :5432 -i :6379 -i :9200

# Kill conflicting processes
kill -9 $(lsof -ti:4000)

# Restart with clean state
./stop-services.sh && ./start-services.sh
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
docker exec -it securewatch_postgres psql -U securewatch -d securewatch -c "SELECT version();"

# Reset database if needed
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

#### 3. Visualization Not Loading
```bash
# Check frontend build
cd frontend && pnpm run build

# Verify API connectivity
curl -H "X-Organization-ID: default" http://localhost:4004/api/v1/search/logs

# Check browser console for JavaScript errors
```

#### 4. KQL Queries Failing
```bash
# Validate KQL engine
curl -X POST http://localhost:4004/api/v1/search/validate \
  -H "Content-Type: application/json" \
  -H "X-Organization-ID: default" \
  -d '{"query": "logs | limit 10"}'

# Check search API logs
docker compose logs search-api
```

### Performance Optimization

#### Database Optimization
```sql
-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY idx_logs_timestamp ON logs (timestamp DESC);
CREATE INDEX CONCURRENTLY idx_logs_source_identifier ON logs (source_identifier);
CREATE INDEX CONCURRENTLY idx_logs_severity ON logs ((enriched_data->>'severity'));

-- Optimize TimescaleDB
SELECT set_chunk_time_interval('logs', INTERVAL '1 day');
SELECT add_retention_policy('logs', INTERVAL '90 days');
```

#### Frontend Optimization
```bash
# Build optimized production bundle
cd frontend
pnpm run build
pnpm run start
```

---

## 🔒 Security Considerations

### Network Security
- **Firewall Rules**: Only expose necessary ports (4000 for web interface)
- **TLS/SSL**: Enable HTTPS in production with proper certificates
- **CORS Configuration**: Restrict origins to trusted domains
- **Rate Limiting**: Configure appropriate API rate limits

### Authentication & Authorization
- **Default Development**: No authentication required
- **Production**: Implement OAuth 2.0, SAML, or similar
- **API Keys**: Use organization-specific API keys for service authentication
- **Role-Based Access**: Implement RBAC for different user types

### Data Protection
- **Encryption at Rest**: Enable database encryption for sensitive data
- **Log Sanitization**: Remove or hash PII from collected logs
- **Retention Policies**: Implement appropriate data retention
- **Backup Security**: Encrypt database backups

### Agent Security
```bash
# Run agent with minimal privileges
sudo -u logcollector python3 agent/event_log_agent.py

# Restrict file access
chmod 600 agent/config.ini
chown logcollector:logcollector agent/config.ini
```

---

## 📈 Scaling Considerations

### Horizontal Scaling
- **Load Balancing**: Use nginx or HAProxy for frontend load balancing
- **Database Clustering**: Implement TimescaleDB clustering for high availability
- **Microservice Scaling**: Scale individual services based on load
- **Message Queuing**: Use Kafka partitioning for high-throughput log ingestion

### Monitoring and Alerting
- **Prometheus + Grafana**: For infrastructure monitoring
- **Application Metrics**: Custom dashboards for SIEM-specific metrics
- **Log Aggregation**: ELK stack for centralized logging
- **Alert Management**: Integration with PagerDuty, Slack, or email

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] System requirements verified
- [ ] Dependencies installed (Node.js, Docker, pnpm)
- [ ] Network ports available
- [ ] Storage capacity planned

### Deployment
- [ ] Repository cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Services started with `./start-services.sh`
- [ ] Health checks passing
- [ ] Mac agent configured and running

### Post-Deployment
- [ ] All services accessible via web browser
- [ ] KQL search functionality tested
- [ ] Visualization components loading correctly
- [ ] Dashboard customization working
- [ ] Data flowing from agent to frontend
- [ ] Performance monitoring configured
- [ ] Security settings applied

### Production Readiness
- [ ] TLS/SSL certificates configured
- [ ] Authentication system implemented
- [ ] Backup procedures established
- [ ] Monitoring and alerting configured
- [ ] Documentation updated for operations team
- [ ] Disaster recovery plan created

---

For additional support or advanced configuration options, refer to the main README.md or open an issue in the GitHub repository.