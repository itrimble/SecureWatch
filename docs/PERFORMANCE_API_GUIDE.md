# SecureWatch Performance API Guide v2.1.1

> **📋 Documentation Navigation:** [Main README](README.md) | [Performance Guide](PERFORMANCE_OPTIMIZATION_GUIDE.md) | [Analytics Engine](DEPLOYMENT_GUIDE.md#analytics-engine-service-port-4009) | [Query Processor](DEPLOYMENT_GUIDE.md#query-processor-service-port-4008) | [OpenSearch Integration](OPENSEARCH_INTEGRATION_GUIDE.md) | [KQL API Guide](KQL_API_GUIDE.md)

## Overview

SecureWatch v2.1.1 provides enterprise-grade performance APIs designed for large-scale SIEM operations with enhanced TypeScript support and OpenSearch integration. The consolidated architecture includes 8 core services:

### Core Performance Services
1. **Query Processor Service** (Port 4008) - Async job processing with WebSocket notifications
2. **Analytics Engine** (Port 4009) - Consolidated analytics + dashboard APIs with intelligent caching

### Consolidated Service Architecture (8 Core Services)
- **auth-service** (Port 4006) - Authentication and RBAC
- **search-api** (Port 4004) - KQL and OpenSearch queries
- **log-ingestion** (Port 4002) - Data processing and normalization
- **frontend** (Port 4000) - Enterprise Next.js application
- **correlation-engine** (Port 4005) - Real-time threat correlation
- **hec-service** (Port 8888) - HTTP Event Collector (Splunk-compatible)
- **mcp-marketplace** (Port 4010) - MCP integrations
- **rule-ingestor** - Community rule management

## TypeScript Interface Definitions

### Common Types

```typescript
interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

interface PaginatedRequest {
  offset?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

interface TimeRangeFilter {
  start_time?: string; // ISO 8601
  end_time?: string;   // ISO 8601
  period?: '1h' | '6h' | '24h' | '7d' | '30d';
}

interface MultiTenantRequest {
  org_id?: string;
}
```

## Query Processor Service (Port 4008)

### TypeScript Interfaces

```typescript
interface JobSubmissionRequest extends MultiTenantRequest {
  query: string;
  type: 'sql' | 'kql' | 'opensearch';
  priority?: 'low' | 'normal' | 'high';
  timeout?: number; // milliseconds
  metadata?: Record<string, any>;
  callback_url?: string;
}

interface JobResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  result_count?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  execution_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

interface QueueStatsResponse extends ApiResponse {
  stats: {
    pending_jobs: number;
    running_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    workers_active: number;
    workers_total: number;
    queue_depth: number;
    avg_processing_time_ms: number;
    memory_usage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
}

interface WebSocketJobEvent {
  event: 'job:update' | 'job:completed' | 'job:failed' | 'job:cancelled';
  jobId: string;
  status: JobResponse['status'];
  progress?: number;
  result_count?: number;
  error_message?: string;
}
```

### Base URL
```
http://localhost:4008
```

### Health Check
```http
GET /health
```

```bash
curl http://localhost:4008/health
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "service": "query-processor",
    "version": "2.1.1",
    "uptime": 3600,
    "memory_usage": {
      "heapUsed": 45678912,
      "heapTotal": 67108864
    },
    "queue_status": "healthy"
  },
  "timestamp": "2025-06-08T10:30:00Z"
}
```

### Job Management

#### Submit Job
```http
POST /api/jobs/submit
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "query": "SELECT COUNT(*) FROM logs WHERE timestamp >= NOW() - INTERVAL '1 hour'",
  "type": "sql",
  "priority": "normal",
  "timeout": 300000,
  "org_id": "org_123",
  "metadata": {
    "user_id": "user_456",
    "dashboard_id": "dash_789"
  }
}
```

**Query Types:**
- `sql`: Direct PostgreSQL/TimescaleDB queries with JSON result format
- `kql`: Kusto Query Language (auto-converted to SQL/OpenSearch)
- `opensearch`: Native OpenSearch/Elasticsearch DSL queries

**Priority Levels:**
- `low`: Background processing (SLA: 5-10 minutes)
- `normal`: Standard priority (SLA: 1-2 minutes, default)
- `high`: Expedited processing (SLA: 10-30 seconds)

**Response:**
```json
{
  "status": "success",
  "data": {
    "job_id": "job_abc123",
    "estimated_duration_ms": 15000,
    "queue_position": 3
  },
  "timestamp": "2025-06-08T10:30:00Z"
}
```

#### Get Job Status
```http
GET /api/jobs/{job_id}/status
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4008/api/jobs/job_abc123/status
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "job_abc123",
    "status": "completed",
    "progress": 100,
    "result_count": 1247,
    "created_at": "2025-06-08T10:30:00Z",
    "updated_at": "2025-06-08T10:30:14Z",
    "completed_at": "2025-06-08T10:30:15Z",
    "execution_time_ms": 15234,
    "metadata": {
      "user_id": "user_456",
      "dashboard_id": "dash_789"
    }
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Get Job Results
```http
GET /api/jobs/{job_id}/results
Authorization: Bearer <token>
```

**Query Parameters:**
- `offset`: Start position (default: 0)
- `limit`: Max results (default: 1000, max: 10000)
- `format`: Response format (`json`, `csv`, `ndjson`)
- `include_metadata`: Include query metadata (default: false)

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4008/api/jobs/job_abc123/results?limit=100&format=json"
```

**Response (OpenSearch-style):**
```json
{
  "status": "success",
  "data": {
    "took": 15,
    "timed_out": false,
    "hits": {
      "total": {
        "value": 1247,
        "relation": "eq"
      },
      "max_score": null,
      "hits": [
        {
          "_index": "securewatch-logs-2025.06",
          "_id": "log_001",
          "_score": null,
          "_source": {
            "timestamp": "2025-06-08T10:29:45Z",
            "severity": "ERROR",
            "source_ip": "192.168.1.100",
            "event_type": "authentication_failure",
            "message": "Failed login attempt for user admin"
          }
        }
      ]
    },
    "aggregations": {},
    "job_metadata": {
      "execution_time_ms": 15234,
      "cache_hit": false
    }
  },
  "pagination": {
    "total": 1247,
    "offset": 0,
    "limit": 100,
    "has_more": true
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Cancel Job
```http
POST /api/jobs/{job_id}/cancel
Authorization: Bearer <token>
```

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:4008/api/jobs/job_abc123/cancel
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "job_id": "job_abc123",
    "previous_status": "running",
    "cancelled_at": "2025-06-08T10:35:00Z"
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### List Jobs
```http
GET /api/jobs/list
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (`pending`, `running`, `completed`, `failed`, `cancelled`)
- `limit`: Max results (default: 50, max: 200)
- `offset`: Pagination offset
- `org_id`: Organization filter
- `user_id`: User filter
- `created_after`: ISO 8601 timestamp
- `created_before`: ISO 8601 timestamp

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4008/api/jobs/list?status=running&limit=10&org_id=org_123"
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "job_abc123",
      "status": "running",
      "progress": 45,
      "query_type": "sql",
      "priority": "normal",
      "created_at": "2025-06-08T10:30:00Z",
      "estimated_completion": "2025-06-08T10:31:00Z",
      "metadata": {
        "user_id": "user_456"
      }
    }
  ],
  "pagination": {
    "total": 15,
    "offset": 0,
    "limit": 10,
    "has_more": true
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

### Queue Management

#### Queue Statistics
```http
GET /api/queue/stats
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4008/api/queue/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "queue_stats": {
      "pending_jobs": 5,
      "running_jobs": 2,
      "completed_jobs": 1247,
      "failed_jobs": 3,
      "cancelled_jobs": 8,
      "workers_active": 8,
      "workers_total": 10,
      "queue_depth": 7,
      "avg_processing_time_ms": 2341,
      "throughput_per_minute": 25.7
    },
    "memory_usage": {
      "heapUsed": 45678912,
      "heapTotal": 67108864,
      "external": 12345678,
      "queue_memory_mb": 156.4
    },
    "performance_metrics": {
      "p50_execution_time_ms": 1500,
      "p95_execution_time_ms": 8900,
      "p99_execution_time_ms": 15000,
      "success_rate": 98.2,
      "error_rate": 1.8
    }
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Flush Queue
```http
POST /api/queue/flush
Authorization: Bearer <admin-token>
```

```bash
curl -X POST -H "Authorization: Bearer <admin-token>" \
  http://localhost:4008/api/queue/flush
```

### WebSocket Notifications

Real-time job monitoring with enhanced TypeScript support:

```typescript
import { io, Socket } from 'socket.io-client';

interface SocketOptions {
  auth: {
    token: string;
  };
  transports: ['websocket'];
}

const socket: Socket = io('http://localhost:4008', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket']
} as SocketOptions);

// Enhanced job event handling
socket.on('job:update', (event: WebSocketJobEvent) => {
  console.log(`Job ${event.jobId} status: ${event.status} (${event.progress}%)`);
});

socket.on('job:completed', (event: WebSocketJobEvent) => {
  console.log(`Job ${event.jobId} completed with ${event.result_count} results`);
});

socket.on('job:failed', (event: WebSocketJobEvent) => {
  console.error(`Job ${event.jobId} failed: ${event.error_message}`);
});

// Queue monitoring
socket.on('queue:stats', (stats: QueueStatsResponse['data']) => {
  console.log(`Queue depth: ${stats.queue_stats.queue_depth}`);
});

// Subscribe to specific job or organization
socket.emit('subscribe:job', 'job_abc123');
socket.emit('subscribe:org', 'org_123');

// Unsubscribe
socket.emit('unsubscribe:job', 'job_abc123');
```

## Analytics Engine (Port 4009)

> **Note**: As of v2.1.1, the Analytics Engine is the consolidated service that merged analytics-api functionality, providing both analytics processing and dashboard APIs in a single optimized service with enhanced performance monitoring.

### TypeScript Interfaces

```typescript
interface DashboardMetrics {
  current_period: {
    total_events: number;
    total_errors: number;
    active_sources: number;
    unique_ips: number;
    critical_alerts: number;
    security_incidents: number;
  };
  trend: {
    events_change: number; // percentage
    errors_change: number;
    sources_change: number;
    alerts_change: number;
  };
  time_series: TimeSeriesPoint[];
  last_updated: string;
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface WidgetResponse<T = any> extends ApiResponse<T> {
  cached: boolean;
  cache_ttl: number;
  generated_at: string;
  org_id?: string;
}

interface CacheStatsResponse extends ApiResponse {
  cache_stats: {
    keys: number;
    hits: number;
    misses: number;
    hit_rate: string;
    memory_usage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    evictions: number;
    expired_keys: number;
  };
}

interface AnalyticsRequest extends MultiTenantRequest, TimeRangeFilter {
  aggregation_type?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  group_by?: string[];
  filters?: Record<string, any>;
  include_trends?: boolean;
}
```

### Base URL
```
http://localhost:4009
```

### Health Check
```http
GET /health
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4009/health
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "service": "analytics-engine",
    "version": "2.1.1",
    "uptime": 7200,
    "cache_status": "healthy",
    "database_connection": "healthy",
    "memory_usage": {
      "heapUsed": 89123456,
      "heapTotal": 134217728
    },
    "performance": {
      "avg_response_time_ms": 145,
      "cache_hit_rate": "94.5%",
      "active_widgets": 12
    }
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

### Dashboard Endpoints

#### Real-time Overview
```http
GET /api/dashboard/realtime-overview
Authorization: Bearer <token>
```

**Query Parameters:**
- `org_id`: Organization ID (required for multi-tenant)
- `refresh_cache`: Force cache refresh (default: false)
- `include_trends`: Include trend calculations (default: true)

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/realtime-overview?org_id=org_123&include_trends=true"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "current_period": {
      "total_events": 1247,
      "total_errors": 23,
      "active_sources": 12,
      "unique_ips": 45,
      "critical_alerts": 3,
      "security_incidents": 1
    },
    "trend": {
      "events_change": 12.5,
      "errors_change": -5.2,
      "sources_change": 0,
      "alerts_change": 50.0
    },
    "time_series": [
      {
        "timestamp": "2025-06-08T10:30:00Z",
        "value": 125,
        "metadata": { "source_count": 12 }
      },
      {
        "timestamp": "2025-06-08T10:31:00Z",
        "value": 142,
        "metadata": { "source_count": 12 }
      }
    ],
    "last_updated": "2025-06-08T10:35:00Z"
  },
  "cached": false,
  "cache_ttl": 30,
  "generated_at": "2025-06-08T10:35:00Z",
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Hourly Trends
```http
GET /api/dashboard/hourly-trends
Authorization: Bearer <token>
```

**Query Parameters:**
- `hours`: Time window in hours (default: 24, max: 168)
- `org_id`: Organization ID
- `aggregation_type`: Aggregation method (`sum`, `avg`, `max`)
- `group_by`: Grouping fields (e.g., `source_type`, `severity`)

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/hourly-trends?hours=24&org_id=org_123&aggregation_type=sum"
```

**Response (OpenSearch-style aggregations):**
```json
{
  "status": "success",
  "data": {
    "took": 45,
    "aggregations": {
      "hourly_counts": {
        "buckets": [
          {
            "key_as_string": "2025-06-08T09:00:00Z",
            "key": 1717831200000,
            "doc_count": 156,
            "events_per_minute": {
              "value": 2.6
            }
          }
        ]
      }
    },
    "time_range": {
      "from": "2025-06-07T10:35:00Z",
      "to": "2025-06-08T10:35:00Z"
    }
  },
  "cached": true,
  "cache_ttl": 300,
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Top Events
```http
GET /api/dashboard/top-events
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: Time period (`1h`, `6h`, `24h`, `7d`, `30d`)
- `limit`: Max results (default: 20, max: 100)
- `org_id`: Organization ID
- `event_type_filter`: Filter by event type
- `severity_filter`: Filter by severity level

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/top-events?period=24h&limit=20&org_id=org_123"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "top_events": [
      {
        "event_type": "authentication_failure",
        "count": 234,
        "percentage": 18.7,
        "trend": "+15.2%",
        "top_sources": ["192.168.1.100", "10.0.0.50"],
        "severity_distribution": {
          "high": 45,
          "medium": 189,
          "low": 0
        }
      }
    ],
    "total_events": 1247,
    "unique_event_types": 15,
    "period": "24h"
  },
  "cached": true,
  "cache_ttl": 180,
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Source Health
```http
GET /api/dashboard/source-health
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/source-health?org_id=org_123"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "sources": [
      {
        "source_id": "firewall-001",
        "source_type": "palo_alto_firewall",
        "status": "healthy",
        "last_event": "2025-06-08T10:34:45Z",
        "events_per_minute": 12.5,
        "error_rate": 0.1,
        "health_score": 98.5
      }
    ],
    "summary": {
      "total_sources": 12,
      "healthy_sources": 11,
      "degraded_sources": 1,
      "failed_sources": 0,
      "overall_health_score": 95.8
    }
  },
  "cached": true,
  "cache_ttl": 60,
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Daily Summary
```http
GET /api/dashboard/daily-summary
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/daily-summary?days=7&org_id=org_123"
```

#### Alert Performance
```http
GET /api/dashboard/alert-performance
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/alert-performance?hours=24&org_id=org_123"
```

### Widget Endpoints

High-performance widget endpoints with intelligent caching and optimized for dashboard rendering.

#### Total Events Widget
```http
GET /api/widgets/total-events
Authorization: Bearer <token>
```

**Query Parameters:**
- `org_id`: Organization ID
- `period`: Time period (`1h`, `6h`, `24h`, `7d`)
- `include_trend`: Include trend calculation (default: true)

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/widgets/total-events?org_id=org_123&period=24h"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_events": 1247,
    "trend": {
      "change_percentage": 12.5,
      "direction": "up",
      "previous_period": 1109
    },
    "breakdown": {
      "by_severity": {
        "critical": 15,
        "high": 89,
        "medium": 456,
        "low": 687
      }
    }
  },
  "cached": true,
  "cache_ttl": 30,
  "generated_at": "2025-06-08T10:35:00Z",
  "org_id": "org_123",
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Critical Alerts Widget
```http
GET /api/widgets/critical-alerts
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/widgets/critical-alerts?org_id=org_123"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "critical_alerts": 3,
    "active_incidents": 1,
    "trend": {
      "change_percentage": 50.0,
      "direction": "up"
    },
    "top_alert_types": [
      {
        "type": "brute_force_attack",
        "count": 2,
        "severity": "critical"
      }
    ]
  },
  "cached": true,
  "cache_ttl": 15,
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Active Sources Widget
```http
GET /api/widgets/active-sources
Authorization: Bearer <token>
```

#### Security Incidents Widget
```http
GET /api/widgets/security-incidents
Authorization: Bearer <token>
```

#### Network Activity Widget
```http
GET /api/widgets/network-activity
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "active_connections": 245,
    "unique_ips": 89,
    "bandwidth_utilization": 67.3,
    "top_protocols": [
      { "protocol": "HTTPS", "percentage": 45.2 },
      { "protocol": "HTTP", "percentage": 23.1 }
    ],
    "geographical_distribution": {
      "domestic": 78.5,
      "international": 21.5
    }
  },
  "cached": true,
  "cache_ttl": 60,
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Events Timeline Widget
```http
GET /api/widgets/events-timeline
Authorization: Bearer <token>
```

**Query Parameters:**
- `hours`: Time window (default: 6, max: 168)
- `resolution`: Data resolution (`1m`, `5m`, `15m`, `1h`)
- `event_types`: Filter by event types (comma-separated)

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/widgets/events-timeline?hours=6&resolution=5m&org_id=org_123"
```

#### Top Sources Widget
```http
GET /api/widgets/top-sources
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/widgets/top-sources?limit=10&org_id=org_123"
```

#### System Performance Widget
```http
GET /api/widgets/system-performance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "ingestion_rate": {
      "events_per_second": 245.7,
      "trend": "stable"
    },
    "query_performance": {
      "avg_response_time_ms": 145,
      "p95_response_time_ms": 450
    },
    "storage": {
      "used_gb": 567.8,
      "available_gb": 1234.5,
      "retention_days": 90
    },
    "alerts": {
      "storage_warning": false,
      "performance_degradation": false
    }
  },
  "cached": true,
  "cache_ttl": 120,
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Recent Alerts Widget
```http
GET /api/widgets/recent-alerts
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/widgets/recent-alerts?limit=10&org_id=org_123"
```

### Cache Management

#### Cache Statistics
```http
GET /api/dashboard/cache-stats
Authorization: Bearer <token>
```

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4009/api/dashboard/cache-stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "cache_stats": {
      "keys": 24,
      "hits": 1247,
      "misses": 156,
      "hit_rate": "88.89",
      "evictions": 12,
      "expired_keys": 45,
      "memory_usage": {
        "heapUsed": 45678912,
        "heapTotal": 67108864,
        "external": 8765432
      }
    },
    "performance_metrics": {
      "avg_cache_lookup_time_ms": 0.5,
      "cache_efficiency_score": 94.2
    },
    "cache_breakdown": {
      "widgets": 15,
      "dashboard_data": 6,
      "aggregations": 3
    }
  },
  "timestamp": "2025-06-08T10:35:00Z"
}
```

#### Clear Cache
```http
POST /api/dashboard/cache/clear
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "cache_type": "widgets", // "all", "widgets", "dashboard", "aggregations"
  "org_id": "org_123" // optional, clears org-specific cache
}
```

#### Cache Warm-up
```http
POST /api/dashboard/cache/warmup
Authorization: Bearer <admin-token>
```

### API Documentation

Both services provide built-in OpenAPI 3.0 documentation:

```bash
# Query Processor API docs (OpenAPI/Swagger)
curl http://localhost:4008/api/docs

# Analytics Engine API docs (OpenAPI/Swagger)
curl http://localhost:4009/api/docs

# Get OpenAPI spec in JSON format
curl http://localhost:4008/api/docs/json
curl http://localhost:4009/api/docs/json
```

## Performance Features v2.1.1

### Enhanced Caching Strategy

The Analytics Engine implements intelligent multi-layer caching with adaptive TTL values:

**Widget Cache TTL (Optimized for Real-time):**
- **Critical Alerts**: 15 seconds (high refresh rate)
- **Total Events**: 30 seconds
- **Active Sources**: 60 seconds
- **Security Incidents**: 120 seconds
- **Alert Performance**: 180 seconds
- **Daily Summary**: 600 seconds (10 minutes)

**Query Result Caching:**
- **Simple aggregations**: 5 minutes
- **Complex analytics**: 15 minutes
- **Historical reports**: 1 hour

**Intelligent Cache Invalidation:**
- Real-time data updates trigger selective cache invalidation
- Dependency-aware cache clearing (e.g., source changes invalidate related widgets)
- Memory pressure-based LRU eviction

### Advanced Rate Limiting v2.1.1

Enhanced rate limiting with burst capacity and user-tier support:

```typescript
interface RateLimitConfig {
  tier: 'basic' | 'pro' | 'enterprise';
  requests_per_minute: number;
  burst_capacity: number;
  concurrent_connections: number;
}

// Default rate limits
const rateLimits = {
  basic: { requests_per_minute: 60, burst_capacity: 10, concurrent_connections: 5 },
  pro: { requests_per_minute: 300, burst_capacity: 50, concurrent_connections: 20 },
  enterprise: { requests_per_minute: 1000, burst_capacity: 200, concurrent_connections: 100 }
};
```

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1717834800
X-RateLimit-Tier: pro
```

### Query Optimization

**Automatic Query Optimization:**
- SQL query plan analysis and optimization
- Index recommendations for slow queries
- Automatic query result caching based on complexity
- Parallel processing for large result sets

**Performance Monitoring:**
- Real-time query performance metrics
- Slow query logging and analysis
- Resource usage monitoring per organization
- Proactive alerting for performance degradation

### Multi-tenancy v2.1.1

Enhanced multi-tenant architecture with improved isolation:

**Tenant Isolation:**
- Row-level security (RLS) for data access
- Separate cache namespaces per organization
- Resource quotas and usage tracking
- Cross-tenant query prevention

**Tenant-specific Performance Tuning:**
- Configurable cache TTL per organization
- Custom rate limits based on subscription tier
- Dedicated worker pools for enterprise clients
- Priority queuing for high-tier customers

## Integration Examples v2.1.1

### TypeScript Frontend Integration

```typescript
import { ApiResponse, JobSubmissionRequest, WidgetResponse } from '@securewatch/types';

class SecureWatchAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Submit async query with enhanced error handling
  async submitQuery(request: JobSubmissionRequest): Promise<{ job_id: string }> {
    try {
      const response = await this.request<{ job_id: string; estimated_duration_ms: number }>(
        '/api/jobs/submit',
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
      return { job_id: response.data.job_id };
    } catch (error) {
      console.error('Failed to submit query:', error);
      throw error;
    }
  }

  // Get widget data with caching awareness
  async getWidget<T>(
    widget: string, 
    params: Record<string, any> = {}
  ): Promise<WidgetResponse<T>> {
    const queryString = new URLSearchParams(params).toString();
    return this.request<T>(`/api/widgets/${widget}?${queryString}`);
  }

  // Advanced dashboard data fetching
  async getDashboardOverview(orgId: string, includeTrends = true): Promise<DashboardMetrics> {
    const response = await this.request<DashboardMetrics>(
      `/api/dashboard/realtime-overview?org_id=${orgId}&include_trends=${includeTrends}`
    );
    return response.data;
  }
}

// Usage example
const api = new SecureWatchAPI('http://localhost:4009', 'your-jwt-token');

// Submit KQL query
const queryResult = await api.submitQuery({
  query: 'SecurityEvent | where EventID == 4624 | summarize count() by Account',
  type: 'kql',
  org_id: 'org_123',
  priority: 'high',
  metadata: { dashboard_id: 'security_overview' }
});
```

### Advanced Dashboard Implementation

```typescript
import { io, Socket } from 'socket.io-client';
import { WebSocketJobEvent, QueueStatsResponse } from '@securewatch/types';

class DashboardManager {
  private api: SecureWatchAPI;
  private socket: Socket;
  private widgets: Map<string, any> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(api: SecureWatchAPI) {
    this.api = api;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.socket = io('http://localhost:4008', {
      auth: { token: this.api.token },
      transports: ['websocket']
    });

    // Enhanced real-time updates
    this.socket.on('job:completed', this.handleJobCompleted.bind(this));
    this.socket.on('job:failed', this.handleJobFailed.bind(this));
    this.socket.on('queue:stats', this.handleQueueStats.bind(this));
  }

  private async handleJobCompleted(event: WebSocketJobEvent) {
    console.log(`Job ${event.jobId} completed with ${event.result_count} results`);
    
    // Refresh related widgets based on job metadata
    const relatedWidgets = this.getRelatedWidgets(event.jobId);
    await Promise.all(relatedWidgets.map(widget => this.refreshWidget(widget)));
  }

  private handleJobFailed(event: WebSocketJobEvent) {
    console.error(`Job ${event.jobId} failed: ${event.error_message}`);
    // Implement retry logic or user notification
  }

  private handleQueueStats(stats: QueueStatsResponse['data']) {
    // Update performance indicators
    this.updatePerformanceMetrics(stats);
  }

  // Intelligent widget loading with cache awareness
  async loadWidget(widgetName: string, params: Record<string, any> = {}) {
    try {
      const startTime = performance.now();
      const result = await this.api.getWidget(widgetName, params);
      const loadTime = performance.now() - startTime;

      // Store widget data with metadata
      this.widgets.set(widgetName, {
        data: result.data,
        cached: result.cached,
        loadTime,
        lastUpdated: new Date(),
      });

      // Set up refresh interval based on cache TTL
      this.scheduleRefresh(widgetName, result.cache_ttl, params);

      return result;
    } catch (error) {
      console.error(`Failed to load widget ${widgetName}:`, error);
      throw error;
    }
  }

  private scheduleRefresh(widgetName: string, ttl: number, params: Record<string, any>) {
    // Clear existing interval
    const existingInterval = this.refreshIntervals.get(widgetName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule refresh slightly before cache expires
    const refreshTime = Math.max(ttl * 0.8 * 1000, 5000); // 80% of TTL or 5 seconds minimum
    const interval = setInterval(() => {
      this.refreshWidget(widgetName, params);
    }, refreshTime);

    this.refreshIntervals.set(widgetName, interval);
  }

  private async refreshWidget(widgetName: string, params?: Record<string, any>) {
    try {
      await this.loadWidget(widgetName, params);
      // Emit event for UI updates
      this.emit('widgetUpdated', { widgetName, data: this.widgets.get(widgetName) });
    } catch (error) {
      console.error(`Failed to refresh widget ${widgetName}:`, error);
    }
  }

  // Batch widget loading for dashboard initialization
  async loadDashboard(orgId: string) {
    const widgets = [
      'total-events',
      'critical-alerts',
      'active-sources',
      'security-incidents',
      'network-activity'
    ];

    const results = await Promise.allSettled(
      widgets.map(widget => this.loadWidget(widget, { org_id: orgId }))
    );

    // Handle failed widgets gracefully
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to load widget ${widgets[index]}:`, result.reason);
      }
    });

    return this.widgets;
  }

  // Performance monitoring
  getPerformanceMetrics() {
    const metrics = Array.from(this.widgets.entries()).map(([name, widget]) => ({
      name,
      loadTime: widget.loadTime,
      cached: widget.cached,
      lastUpdated: widget.lastUpdated,
    }));

    return {
      widgets: metrics,
      avgLoadTime: metrics.reduce((sum, w) => sum + w.loadTime, 0) / metrics.length,
      cacheHitRate: metrics.filter(w => w.cached).length / metrics.length,
    };
  }
}
```

## Monitoring & Debugging v2.1.1

### Enhanced Health Monitoring

```bash
# Comprehensive health check with performance metrics
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4008/health" | jq '.data'

curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/health" | jq '.data'

# Detailed service stats with performance indicators
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4008/api/queue/stats" | jq '.data'

curl -H "Authorization: Bearer <token>" \
  "http://localhost:4009/api/dashboard/cache-stats" | jq '.data'
```

### Advanced Performance Monitoring

```bash
# Real-time cache performance monitoring
watch -n 5 'curl -s -H "Authorization: Bearer <token>" \
  http://localhost:4009/api/dashboard/cache-stats | \
  jq ".data.cache_stats | {hit_rate, memory_usage, cache_efficiency_score}"'

# Queue depth and throughput monitoring
watch -n 2 'curl -s -H "Authorization: Bearer <token>" \
  http://localhost:4008/api/queue/stats | \
  jq ".data.queue_stats | {queue_depth, throughput_per_minute, avg_processing_time_ms}"'

# Performance percentiles monitoring
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4008/api/queue/stats" | \
  jq '.data.performance_metrics | {p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms}'
```

### Performance Alerting Setup

```bash
# Create monitoring script for automated alerting
cat << 'EOF' > monitor_performance.sh
#!/bin/bash

ANALYTICS_URL="http://localhost:4009"
QUERY_URL="http://localhost:4008"
TOKEN="your-jwt-token"

# Check cache hit rate
CACHE_HIT_RATE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$ANALYTICS_URL/api/dashboard/cache-stats" | \
  jq -r '.data.cache_stats.hit_rate | tonumber')

if (( $(echo "$CACHE_HIT_RATE < 80" | bc -l) )); then
  echo "ALERT: Cache hit rate below 80%: $CACHE_HIT_RATE%"
fi

# Check queue depth
QUEUE_DEPTH=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$QUERY_URL/api/queue/stats" | \
  jq -r '.data.queue_stats.queue_depth')

if [ "$QUEUE_DEPTH" -gt 20 ]; then
  echo "ALERT: Queue depth too high: $QUEUE_DEPTH"
fi

# Check error rate
ERROR_RATE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$QUERY_URL/api/queue/stats" | \
  jq -r '.data.performance_metrics.error_rate')

if (( $(echo "$ERROR_RATE > 5.0" | bc -l) )); then
  echo "ALERT: Error rate too high: $ERROR_RATE%"
fi
EOF

chmod +x monitor_performance.sh
```

### Troubleshooting Guide v2.1.1

#### Performance Issues

1. **High Response Times (>500ms)**
   ```bash
   # Check cache performance
   curl -H "Authorization: Bearer <token>" \
     http://localhost:4009/api/dashboard/cache-stats | \
     jq '.data.performance_metrics'
   
   # Verify database connectivity
   curl -H "Authorization: Bearer <token>" \
     http://localhost:4009/health | \
     jq '.data.database_connection'
   ```

2. **Job Queue Backup (>50 pending jobs)**
   ```bash
   # Monitor worker utilization
   curl -H "Authorization: Bearer <token>" \
     http://localhost:4008/api/queue/stats | \
     jq '.data.queue_stats | {workers_active, workers_total, queue_depth}'
   
   # Check for failed jobs
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:4008/api/jobs/list?status=failed&limit=10"
   ```

3. **Memory Usage Alerts**
   ```bash
   # Monitor memory usage across services
   curl -H "Authorization: Bearer <token>" \
     http://localhost:4008/health | \
     jq '.data.memory_usage'
   
   # Check cache memory usage
   curl -H "Authorization: Bearer <token>" \
     http://localhost:4009/api/dashboard/cache-stats | \
     jq '.data.cache_stats.memory_usage'
   ```

4. **WebSocket Connection Issues**
   ```typescript
   // Enhanced reconnection logic
   const socket = io('http://localhost:4008', {
     auth: { token: 'your-jwt-token' },
     transports: ['websocket'],
     reconnection: true,
     reconnectionDelay: 1000,
     reconnectionDelayMax: 5000,
     maxReconnectionAttempts: 5
   });

   socket.on('connect_error', (error) => {
     console.error('WebSocket connection failed:', error);
     // Implement fallback to HTTP polling
   });

   socket.on('reconnect', (attemptNumber) => {
     console.log(`Reconnected after ${attemptNumber} attempts`);
   });
   ```

#### OpenSearch Integration Issues

1. **Query Translation Errors**
   ```bash
   # Test KQL to SQL/OpenSearch translation
   curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"query": "SecurityEvent | where EventID == 4624", "type": "kql"}' \
     http://localhost:4008/api/jobs/submit
   ```

2. **Index Template Issues**
   ```bash
   # Verify OpenSearch index templates
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:4004/api/search/templates/status"
   ```

### Service Dependencies Check

```bash
# Comprehensive dependency health check
cat << 'EOF' > check_dependencies.sh
#!/bin/bash

echo "=== SecureWatch v2.1.1 Service Health Check ==="

services=(
  "auth-service:4006"
  "search-api:4004" 
  "log-ingestion:4002"
  "frontend:4000"
  "correlation-engine:4005"
  "analytics-engine:4009"
  "query-processor:4008"
  "hec-service:8888"
)

for service in "${services[@]}"; do
  name="${service%:*}"
  port="${service#*:}"
  
  if curl -s --connect-timeout 5 "http://localhost:$port/health" > /dev/null; then
    echo "✅ $name (port $port) - HEALTHY"
  else
    echo "❌ $name (port $port) - UNHEALTHY"
  fi
done

echo ""
echo "=== Database Connections ==="
# Check PostgreSQL/TimescaleDB
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
  echo "✅ PostgreSQL/TimescaleDB - CONNECTED"
else
  echo "❌ PostgreSQL/TimescaleDB - DISCONNECTED"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis - CONNECTED"
else
  echo "❌ Redis - DISCONNECTED"
fi
EOF

chmod +x check_dependencies.sh
./check_dependencies.sh
```

### Performance Optimization Recommendations

1. **Cache Optimization**
   - Monitor cache hit rates and adjust TTL values
   - Implement cache warming for frequently accessed data
   - Consider Redis clustering for high-throughput scenarios

2. **Query Performance**
   - Use query hints for complex analytics queries
   - Implement query result caching for expensive operations
   - Monitor slow query logs and optimize indexes

3. **Resource Scaling**
   - Scale worker processes based on queue depth
   - Implement horizontal pod autoscaling in Kubernetes
   - Use connection pooling for database connections

4. **Network Optimization**
   - Enable HTTP/2 for improved multiplexing
   - Implement request compression for large payloads
   - Use CDN for static dashboard assets

---

**🚀 Enterprise-grade performance APIs for large-scale SIEM operations (v2.1.1)**

> **Next Steps:** Review the [OpenSearch Integration Guide](OPENSEARCH_INTEGRATION_GUIDE.md) for advanced search capabilities, and [KQL API Guide](KQL_API_GUIDE.md) for query language documentation.