# SecureWatch SIEM - Comprehensive Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start Deployment](#quick-start-deployment)
3. [Advanced Configuration](#advanced-configuration)
4. [Production Deployment](#production-deployment)
5. [OpenSearch Integration](#opensearch-integration)
6. [Support Bundle Export](#support-bundle-export)
7. [Visualization Features Setup](#visualization-features-setup)
8. [KQL Search Configuration](#kql-search-configuration)
9. [Health Monitoring](#health-monitoring)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)

---

## 🔧 Prerequisites

### System Requirements
- **Operating System**: macOS 10.15+ (for Mac agent), Linux (for production)
- **Node.js**: 18.x or higher
- **Package Manager**: pnpm (recommended) or npm
- **Docker**: Latest version with Docker Compose
- **Memory**: 8GB RAM minimum (16GB recommended for production)
- **Storage**: 50GB minimum (SSD recommended)
- **Network**: Ports 4000, 4002-4010, 5432, 6379, 8080, 8888, 9200 available

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
- ✅ Starts Docker infrastructure (PostgreSQL, Redis, OpenSearch, Kafka)
- ✅ Initializes TimescaleDB with continuous aggregates
- ✅ Starts all 10+ microservices (Analytics API, Query Processor, Search API, Log Ingestion, HEC Service, Auth Service, etc.)
- ✅ Creates performance-optimized database indexes and materialized views
- ✅ Initializes WebSocket notification system
- ✅ Runs comprehensive health checks across all services
- ✅ Provides real-time monitoring and performance metrics

### 3. Verify Deployment
```bash
# Check all services
curl http://localhost:4000/api/health  # Frontend
curl http://localhost:4002/health      # Log Ingestion Service
curl http://localhost:4003/health      # API Gateway
curl http://localhost:4004/health      # Search API Service
curl http://localhost:4005/health      # HEC Service
curl http://localhost:4006/health      # Auth Service
curl http://localhost:4007/health      # Correlation Engine
curl http://localhost:4008/health      # Query Processor Service
curl http://localhost:4009/health      # Analytics API Service
curl http://localhost:4010/health      # MCP Marketplace

# Check WebSocket notifications
wscat -c ws://localhost:8080

# Access the platform
open http://localhost:4000
```

---

## ⚡ Performance & Scalability Features

SecureWatch now includes enterprise-grade performance optimizations designed for handling large-scale SIEM operations.

### New Performance Services (June 2025)

#### Query Processor Service (Port 4008)
Dedicated microservice for async job processing:
```bash
# Start query processor
cd apps/query-processor
pnpm install
pnpm run dev

# Health check
curl http://localhost:4008/health

# Submit async job
curl -X POST http://localhost:4008/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) FROM logs", "type": "sql"}'
```

#### Analytics API Service (Port 4009)
Specialized endpoints for dashboard widgets:
```bash
# Start analytics API
cd apps/analytics-api
pnpm install
pnpm run dev

# Health check
curl http://localhost:4009/health

# Test dashboard endpoints
curl http://localhost:4009/api/dashboard/realtime-overview
curl http://localhost:4009/api/widgets/total-events
curl http://localhost:4009/api/dashboard/cache-stats
```

#### Performance Features Deployment

1. **TimescaleDB Continuous Aggregates**
   ```sql
   -- Apply continuous aggregates for performance
   docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/continuous_aggregates.sql
   
   -- Verify aggregates
   docker exec -i securewatch_postgres psql -U securewatch -d securewatch -c "
   SELECT schemaname, matviewname 
   FROM pg_matviews 
   WHERE schemaname = 'public';
   "
   ```

2. **EventsTable Virtualization**
   - Automatically enabled in frontend (`/frontend/components/explorer/EventsTable.tsx`)
   - Handles 100K+ rows with smooth scrolling
   - No additional configuration required

3. **WebSocket Notifications**
   ```bash
   # Test WebSocket connection
   wscat -c ws://localhost:4008/socket.io/?EIO=4&transport=websocket
   
   # Monitor real-time job updates
   curl -X POST http://localhost:4008/api/jobs/submit \
     -H "Content-Type: application/json" \
     -d '{"query": "SELECT * FROM logs LIMIT 1000", "type": "sql"}'
   ```

### EventsTable Virtualization

The frontend now uses TanStack Virtual for handling large datasets:

#### Configuration
```typescript
// Frontend configuration for virtual scrolling
const VIRTUALIZATION_CONFIG = {
  estimateSize: () => 48,      // Estimated row height
  overscan: 10,                // Extra rows to render
  scrollMargin: 200,           // Scroll margin for smooth navigation
  getItemKey: (index) => `event-${index}`,
  scrollElement: tableContainer,
};
```

#### Features
- **100K+ Row Support**: Handle massive datasets without performance degradation
- **Memory Optimization**: Only renders visible rows plus a small buffer
- **Smooth Scrolling**: Hardware-accelerated scrolling with momentum
- **Search Integration**: Fast filtering compatible with virtualization
- **Dynamic Heights**: Support for variable row heights and expanded content

### TimescaleDB Continuous Aggregates

Pre-computed metrics provide sub-second dashboard performance:

#### Available Aggregates
```sql
-- Real-time security events (5-minute buckets)
SELECT * FROM realtime_security_events WHERE bucket >= NOW() - INTERVAL '1 hour';

-- Hourly security metrics for trend analysis
SELECT * FROM hourly_security_metrics WHERE time_bucket >= NOW() - INTERVAL '24 hours';

-- Daily security summary for historical analysis
SELECT * FROM daily_security_summary WHERE day >= NOW() - INTERVAL '30 days';

-- Source health metrics for monitoring
SELECT * FROM source_health_metrics WHERE bucket >= NOW() - INTERVAL '6 hours';

-- Alert performance tracking
SELECT * FROM alert_performance_metrics WHERE bucket >= NOW() - INTERVAL '12 hours';
```

#### Performance Benefits
- **10x Faster Queries**: Dashboard widgets load in <100ms
- **Reduced Load**: Aggregated data reduces computational overhead
- **Automatic Refresh**: Continuous aggregates update automatically
- **Memory Efficient**: Materialized views reduce memory usage

### Async Job Processing

Long-running queries are handled by the dedicated Query Processor Service:

#### Configuration
```bash
# Environment variables for query processor
QUERY_PROCESSOR_PORT=4008
WS_PORT=8080
MAX_CONCURRENT_JOBS=5
REDIS_URL=redis://localhost:6379
JOB_TIMEOUT_MS=300000  # 5 minutes
```

#### Features
- **Job Queue Management**: Redis-backed queue with priority scheduling
- **WebSocket Notifications**: Real-time job status updates
- **Concurrent Processing**: Configurable worker pools
- **Query Validation**: Pre-execution syntax and performance validation
- **Progress Tracking**: Detailed progress information for long-running queries

#### Usage Example
```javascript
// Submit a long-running query
const jobResponse = await fetch('http://localhost:4008/api/jobs/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'logs | where timestamp >= ago(7d) | summarize count() by source_identifier',
    userId: 'user123',
    priority: 'high'
  })
});

const { jobId } = await jobResponse.json();

// Listen for real-time updates
const ws = new WebSocket('ws://localhost:8080?userId=user123');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.jobId === jobId) {
    console.log(`Job progress: ${update.progress}%`);
  }
};
```

### Analytics API Service

Specialized endpoints optimized for dashboard performance:

#### Fast Dashboard Endpoints
```bash
# Real-time security overview (cached for 30 seconds)
GET http://localhost:4009/api/dashboard/realtime-overview

# Hourly trends with continuous aggregates
GET http://localhost:4009/api/dashboard/hourly-trends?hours=24

# Top security events from pre-computed views
GET http://localhost:4009/api/dashboard/top-events?limit=10

# Source health from continuous aggregates
GET http://localhost:4009/api/dashboard/source-health

# Cache performance statistics
GET http://localhost:4009/api/dashboard/cache-stats
```

#### Intelligent Caching Strategy
- **Multi-tier Caching**: Memory + Redis for optimal performance
- **TTL Optimization**: Different cache times per endpoint type
- **Cache Warming**: Pre-load frequently accessed data
- **Invalidation**: Smart cache invalidation on data updates

### WebSocket Notifications

Real-time updates eliminate the need for polling:

#### Configuration
```typescript
// WebSocket service configuration
const WS_CONFIG = {
  port: 8080,
  heartbeatInterval: 30000,    // 30 seconds
  maxConnections: 1000,
  compressionEnabled: true,
  authRequired: false,         // Set to true for production
};
```

#### Notification Types
- **Job Status Updates**: Query processing progress and completion
- **Alert Notifications**: Real-time security alerts
- **Data Ingestion Status**: Live log ingestion monitoring
- **System Health**: Service status changes and performance metrics
- **Dashboard Updates**: Real-time dashboard refresh triggers

#### Client Integration
```javascript
// Connect to WebSocket notifications
const ws = new WebSocket('ws://localhost:8080?organizationId=default');

ws.onopen = () => {
  console.log('Connected to SecureWatch notifications');
};

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  
  switch (notification.type) {
    case 'job_completed':
      handleJobCompletion(notification.data);
      break;
    case 'new_alert':
      showAlertNotification(notification.data);
      break;
    case 'data_ingested':
      updateIngestionMetrics(notification.data);
      break;
  }
};
```

---

## 🔍 OpenSearch Integration

SecureWatch now uses **OpenSearch 3.0.0** and **OpenSearch Dashboards 3.0.0** as the primary search and analytics backend, replacing the previous Elasticsearch/Kibana stack.

### OpenSearch Services

The platform includes two OpenSearch-related services:

#### 1. OpenSearch (Port 9200)
- **Purpose**: Primary search engine for log indexing and retrieval
- **Configuration**: Single-node cluster for development
- **Index Pattern**: `securewatch-logs` for application logs, `platform-internal-logs-*` for troubleshooting
- **Health Check**: `curl http://localhost:9200/_cluster/health`

#### 2. OpenSearch Dashboards (Port 5601)
- **Purpose**: Web interface for advanced analytics and visualization
- **Access**: `http://localhost:5601`
- **Integration**: Optional - SecureWatch provides native React visualization

### OpenSearch Configuration

OpenSearch is automatically configured during deployment but can be customized:

```yaml
# docker-compose.dev.yml OpenSearch configuration
opensearch:
  image: opensearchproject/opensearch:3.0.0
  container_name: securewatch_opensearch
  environment:
    - cluster.name=securewatch-cluster
    - node.name=opensearch-node
    - discovery.type=single-node
    - bootstrap.memory_lock=true
    - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
    - plugins.security.disabled=true
    - plugins.security.ssl.http.enabled=false
    - plugins.security.ssl.transport.enabled=false
    - OPENSEARCH_INITIAL_ADMIN_PASSWORD=SecureWatch123!
  ulimits:
    memlock:
      soft: -1
      hard: -1
    nofile:
      soft: 65536
      hard: 65536
  volumes:
    - opensearch_data:/usr/share/opensearch/data
  ports:
    - "9200:9200"
    - "9600:9600"
```

### KQL to OpenSearch Translation

SecureWatch includes a sophisticated KQL-to-OpenSearch DSL translator:

```typescript
// Example KQL query translation
const kqlQuery = `Events | where TimeCreated > ago(1h) | summarize count() by EventID`;

// Translated to OpenSearch DSL:
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "timestamp": {
              "gte": "now-1h"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "group_by_event_id": {
      "terms": {
        "field": "event_id",
        "size": 1000
      },
      "aggs": {
        "total_count": {
          "value_count": {
            "field": "_id"
          }
        }
      }
    }
  }
}
```

### API Integration

The platform provides seamless OpenSearch integration through the query API:

```bash
# Test OpenSearch integration
curl -X POST http://localhost:4000/api/query/opensearch-route \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Events | count",
    "backend": "opensearch",
    "aggregations": true
  }'
```

---

## 📊 Support Bundle Export

Enterprise-grade troubleshooting log export system for SecureWatch support and debugging.

### Overview

The Support Bundle Export feature allows administrators to export internal platform logs from all microservices for troubleshooting purposes. This is essential for enterprise support scenarios.

### Configuration

The support bundle service is automatically configured but can be customized:

```typescript
// packages/support-bundle-service configuration
const SUPPORT_CONFIG = {
  opensearch: {
    node: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
    auth: {
      username: process.env.OPENSEARCH_USERNAME || 'admin',
      password: process.env.OPENSEARCH_PASSWORD || 'admin'
    }
  },
  indexPattern: 'platform-internal-logs-*',
  maxDocuments: 100000,
  compression: {
    level: 9,
    format: 'zip'
  }
};
```

### Usage

#### Web Interface
1. Navigate to **Settings** → **Platform Status**
2. Scroll to **Troubleshooting Export** section
3. Select time range and filters
4. Click **Generate and Download Log Bundle**

#### API Usage
```bash
# Export last hour of error logs
curl -X POST http://localhost:4000/api/support/export-logs \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-01-05T10:00:00Z",
    "endTime": "2025-01-05T11:00:00Z",
    "logLevels": ["error", "warn"],
    "services": ["correlation-engine", "search-api"],
    "maxDocuments": 10000
  }'
```

### Bundle Contents

Each export bundle includes:

1. **logs.json** - All log documents in structured JSON format
2. **metadata.json** - Export metadata and statistics
3. **README.txt** - Human-readable documentation

### Service Health Check

Verify the support bundle service is operational:

```bash
# Check service health
curl http://localhost:4000/api/support/export-logs

# Expected response
{
  "service": "log-export",
  "status": "healthy",
  "opensearch": {
    "cluster_name": "securewatch-cluster",
    "status": "green"
  },
  "timestamp": "2025-01-05T10:30:00.000Z"
}
```

For detailed API documentation, see [SUPPORT_BUNDLE_API_GUIDE.md](SUPPORT_BUNDLE_API_GUIDE.md).

---

## 🔍 Lookup Tables & Data Enrichment

Enterprise-grade lookup table system for automatic data enrichment during search operations.

### Overview

The lookup table system provides Splunk-style data enrichment with modern enhancements:

- **CSV Upload Management**: Upload and manage lookup tables via web interface
- **Automatic Field Detection**: Smart type inference for IP, email, URL, date fields
- **Search-Time Enrichment**: Automatic field enrichment during KQL queries
- **External API Integration**: Built-in support for threat intelligence APIs
- **Performance Optimization**: Redis caching and optimized database queries

### Configuration

The lookup service is automatically configured but can be customized:

```typescript
// packages/lookup-service configuration
const LOOKUP_CONFIG = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'securewatch',
    user: process.env.DB_USER || 'securewatch',
    password: process.env.DB_PASSWORD || 'securewatch_dev'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'securewatch_dev'
  },
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['.csv'],
    batchSize: 1000
  },
  caching: {
    defaultTTL: 300, // 5 minutes
    maxCacheSize: 10000
  }
};
```

### Usage

#### Web Interface
1. Navigate to **Settings** → **Knowledge Objects** → **Lookups**
2. Click **Upload CSV** to add new lookup tables
3. Configure enrichment rules for automatic field enhancement
4. Monitor performance via statistics dashboard

#### API Usage
```bash
# Upload lookup table
curl -X POST http://localhost:4000/api/lookup-tables \
  -F "file=@geolocation.csv" \
  -F "keyField=ip_address" \
  -F "description=IP geolocation database"

# Query lookup table
curl "http://localhost:4000/api/lookup-tables/query?table=geolocation&keyField=ip_address&keyValue=8.8.8.8"

# Search with enrichment
curl -X POST http://localhost:4000/api/v1/search/execute \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Events | where src_ip contains \"192.168\"",
    "enrichment": {
      "enabled": true,
      "externalLookups": true
    }
  }'
```

### Sample Data

The system includes pre-loaded sample data for common use cases:

#### 1. IP Geolocation (`lookup_ip_geolocation`)
```sql
-- Sample entries for network event enrichment
ip_address          | country        | city           | latitude   | longitude
8.8.8.8            | United States  | Mountain View  | 37.3860517 | -122.0838511
1.1.1.1            | Australia      | Sydney         | -33.8688197| 151.2092955
```

#### 2. User Directory (`lookup_user_directory`)
```sql
-- Sample entries for authentication event enrichment
username    | department   | title            | risk_score | manager
john.doe    | IT Security  | Security Analyst | 25         | jane.smith
jane.smith  | IT Security  | CISO            | 15         | ceo
```

#### 3. Asset Inventory (`lookup_asset_inventory`)
```sql
-- Sample entries for host-based event enrichment
hostname        | criticality | owner         | environment | cost_center
web-server-01   | High        | alice.johnson | Production  | IT-001
db-server-01    | Critical    | mike.brown    | Production  | IT-001
```

#### 4. Threat Intelligence (`lookup_threat_intel_ips`)
```sql
-- Sample entries for security event enrichment
ip_address     | threat_type | confidence | severity | source
203.0.113.1    | C2 Server   | 95         | Critical | Threat Feed A
198.51.100.50  | Scanning    | 75         | High     | Internal Detection
```

### External API Integration

Built-in support for popular threat intelligence APIs:

```bash
# Configure VirusTotal integration
curl -X POST http://localhost:4000/api/lookup-tables/external-apis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VirusTotal_IP",
    "baseUrl": "https://www.virustotal.com/vtapi/v2/ip-address/report",
    "apiKey": "your-virustotal-api-key",
    "queryParams": {"ip": "{value}"},
    "fieldMapping": {
      "input": "ip",
      "output": {
        "vt_reputation": "response_code",
        "vt_country": "country"
      }
    },
    "rateLimit": {"requests": 500, "window": 86400},
    "cacheTTL": 3600
  }'
```

### Performance Features

#### Caching Strategy
- **Redis Integration**: 5-minute TTL with LRU eviction
- **Batch Processing**: 1000-record batches for large datasets
- **Query Optimization**: Strategic indexing on key and common fields

#### Monitoring
- **Usage Statistics**: Query count, cache hit rate, performance metrics
- **Health Checks**: Service status and database connectivity
- **Error Tracking**: Failed queries and API integration issues

### Service Health Check

Verify the lookup service is operational:

```bash
# Check lookup service health
curl http://localhost:4000/api/lookup-tables?stats=true

# Expected response
{
  "totalTables": 4,
  "totalRecords": 32,
  "totalQueries": 1247,
  "cacheHitRate": 87.3,
  "averageQueryTime": 23.4
}
```

For detailed usage instructions, see [LOOKUP_TABLES_USER_GUIDE.md](LOOKUP_TABLES_USER_GUIDE.md).

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

## 🗄️ Database Schema & Extended Normalization

SecureWatch features an **Extended Normalized Schema** with **100+ security fields** supporting **50+ enterprise use cases**.

### Schema Migration
The extended schema is automatically applied during deployment, but can be manually managed:

```bash
# Apply extended schema migration
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/migrations/001_extend_logs_schema.sql

# Apply lookup tables schema
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/lookup_schema.sql

# Apply sample enrichment data (optional)
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/sample_enrichment_data.sql

# Verify schema extension
docker exec -i securewatch_postgres psql -U securewatch -d securewatch -c "
SELECT COUNT(*) as total_columns 
FROM information_schema.columns 
WHERE table_name = 'logs' AND table_schema = 'public';"

# Check lookup tables
docker exec -i securewatch_postgres psql -U securewatch -d securewatch -c "
SELECT name, record_count, is_active FROM lookup_tables;"

# Check specialized views
docker exec -i securewatch_postgres psql -U securewatch -d securewatch -c "\dv"
```

### Schema Components

**Core Tables:**
- `logs` - Extended normalized log storage (100+ fields)
- `threat_intelligence` - Dedicated TI correlation
- `organizations` - Multi-tenancy support
- `alert_rules` - Configurable alerting
- `alerts` - Alert instance tracking

**Lookup Tables:**
- `lookup_tables` - CSV lookup table metadata and configuration
- `enrichment_rules` - Automatic field enrichment rules
- `api_lookup_configs` - External API integration configurations
- `lookup_query_log` - Usage analytics and performance monitoring
- `lookup_*` - Dynamic tables for uploaded CSV data

**Specialized Views:**
- `authentication_events` - Login/access analysis
- `network_security_events` - Traffic monitoring
- `file_system_events` - Endpoint security
- `threat_detection_events` - Advanced threat hunting
- `compliance_events` - Regulatory compliance

**Performance Features:**
- 30+ strategic indexes for optimal query performance
- Materialized views for real-time threat correlation
- Time-series partitioning with automatic compression
- Full-text search across all security fields

### Security Domain Coverage

The extended schema supports comprehensive enterprise security use cases:

| Domain | Key Fields | Use Cases |
|--------|------------|-----------|
| **Threat Intelligence** | `threat_indicator`, `threat_confidence` | IOC correlation, attribution |
| **UEBA** | `user_risk_score`, `behavior_anomaly` | Insider threat detection |
| **Compliance** | `compliance_framework`, `policy_violation` | SOX, HIPAA, PCI-DSS, GDPR |
| **Incident Response** | `incident_id`, `evidence_collected` | Case management |
| **MITRE ATT&CK** | `attack_technique`, `kill_chain_phase` | Threat mapping |
| **Geolocation** | `geo_country`, `geo_latitude` | Geographic analysis |
| **Device Management** | `device_compliance`, `asset_criticality` | Asset inventory |
| **Cloud Security** | `cloud_provider`, `cloud_api_call` | Multi-cloud monitoring |

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