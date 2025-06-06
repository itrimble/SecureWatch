# Performance API Guide

## Overview

SecureWatch includes two new performance-focused microservices designed to handle enterprise-scale SIEM operations:

1. **Query Processor Service** (Port 4008) - Async job processing for long-running queries
2. **Analytics API Service** (Port 4009) - Specialized fast endpoints for dashboard widgets

## Query Processor Service (Port 4008)

### Base URL
```
http://localhost:4008
```

### Health Check
```bash
GET /health
curl http://localhost:4008/health
```

### Job Management

#### Submit Job
```bash
POST /api/jobs/submit
Content-Type: application/json

{
  "query": "SELECT COUNT(*) FROM logs WHERE timestamp >= NOW() - INTERVAL '1 hour'",
  "type": "sql",
  "priority": "normal",
  "timeout": 300000
}
```

**Supported Query Types:**
- `sql`: Direct PostgreSQL/TimescaleDB queries
- `kql`: Kusto Query Language (converted to SQL)
- `opensearch`: OpenSearch/Elasticsearch queries

**Priority Levels:**
- `low`: Background processing
- `normal`: Standard priority (default)
- `high`: Expedited processing

#### Get Job Status
```bash
GET /api/jobs/:id/status
curl http://localhost:4008/api/jobs/abc123/status
```

**Response:**
```json
{
  "status": "success",
  "job": {
    "id": "abc123",
    "status": "completed",
    "progress": 100,
    "result_count": 1247,
    "created_at": "2025-01-06T10:30:00Z",
    "completed_at": "2025-01-06T10:30:15Z",
    "execution_time_ms": 15234
  }
}
```

#### Get Job Results
```bash
GET /api/jobs/:id/results
curl http://localhost:4008/api/jobs/abc123/results
```

**Query Parameters:**
- `offset`: Start position (default: 0)
- `limit`: Max results (default: 1000)
- `format`: Response format (`json`, `csv`, `ndjson`)

#### Cancel Job
```bash
POST /api/jobs/:id/cancel
curl -X POST http://localhost:4008/api/jobs/abc123/cancel
```

#### List Jobs
```bash
GET /api/jobs/list
curl "http://localhost:4008/api/jobs/list?status=running&limit=10"
```

**Query Parameters:**
- `status`: Filter by status (`pending`, `running`, `completed`, `failed`)
- `limit`: Max results (default: 50)
- `offset`: Pagination offset

### Queue Management

#### Queue Statistics
```bash
GET /api/queue/stats
curl http://localhost:4008/api/queue/stats
```

**Response:**
```json
{
  "status": "success",
  "stats": {
    "pending_jobs": 5,
    "running_jobs": 2,
    "completed_jobs": 1247,
    "failed_jobs": 3,
    "workers_active": 8,
    "workers_total": 10,
    "queue_depth": 7,
    "avg_processing_time_ms": 2341
  }
}
```

### WebSocket Notifications

Connect to real-time job updates:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4008');

// Listen for job updates
socket.on('job:update', (data) => {
  console.log('Job update:', data);
  // { jobId: 'abc123', status: 'running', progress: 45 }
});

// Listen for job completion
socket.on('job:completed', (data) => {
  console.log('Job completed:', data);
  // { jobId: 'abc123', status: 'completed', result_count: 1247 }
});

// Subscribe to specific job
socket.emit('subscribe:job', 'abc123');
```

## Analytics API Service (Port 4009)

### Base URL
```
http://localhost:4009
```

### Health Check
```bash
GET /health
curl http://localhost:4009/health
```

### Dashboard Endpoints

#### Real-time Overview
```bash
GET /api/dashboard/realtime-overview
curl "http://localhost:4009/api/dashboard/realtime-overview?org_id=uuid"
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
      "unique_ips": 45
    },
    "trend": {
      "events_change": 12.5,
      "errors_change": -5.2,
      "sources_change": 0
    },
    "time_series": [...],
    "last_updated": "2025-01-06T10:30:00Z"
  },
  "cached": false
}
```

#### Hourly Trends
```bash
GET /api/dashboard/hourly-trends
curl "http://localhost:4009/api/dashboard/hourly-trends?hours=24&org_id=uuid"
```

#### Top Events
```bash
GET /api/dashboard/top-events
curl "http://localhost:4009/api/dashboard/top-events?period=24h&limit=20"
```

**Period Options:** `1h`, `6h`, `24h`, `7d`

#### Source Health
```bash
GET /api/dashboard/source-health
curl "http://localhost:4009/api/dashboard/source-health?org_id=uuid"
```

#### Daily Summary
```bash
GET /api/dashboard/daily-summary
curl "http://localhost:4009/api/dashboard/daily-summary?days=7&org_id=uuid"
```

#### Alert Performance
```bash
GET /api/dashboard/alert-performance
curl "http://localhost:4009/api/dashboard/alert-performance?hours=24"
```

### Widget Endpoints

#### Total Events Widget
```bash
GET /api/widgets/total-events
curl "http://localhost:4009/api/widgets/total-events?org_id=uuid"
```

#### Critical Alerts Widget
```bash
GET /api/widgets/critical-alerts
curl "http://localhost:4009/api/widgets/critical-alerts?org_id=uuid"
```

#### Active Sources Widget
```bash
GET /api/widgets/active-sources
curl "http://localhost:4009/api/widgets/active-sources?org_id=uuid"
```

#### Security Incidents Widget
```bash
GET /api/widgets/security-incidents
curl "http://localhost:4009/api/widgets/security-incidents?org_id=uuid"
```

#### Network Activity Widget
```bash
GET /api/widgets/network-activity
curl "http://localhost:4009/api/widgets/network-activity?org_id=uuid"
```

#### Events Timeline Widget
```bash
GET /api/widgets/events-timeline
curl "http://localhost:4009/api/widgets/events-timeline?hours=6&org_id=uuid"
```

#### Top Sources Widget
```bash
GET /api/widgets/top-sources
curl "http://localhost:4009/api/widgets/top-sources?limit=10&org_id=uuid"
```

#### System Performance Widget
```bash
GET /api/widgets/system-performance
curl "http://localhost:4009/api/widgets/system-performance?org_id=uuid"
```

#### Recent Alerts Widget
```bash
GET /api/widgets/recent-alerts
curl "http://localhost:4009/api/widgets/recent-alerts?limit=10&org_id=uuid"
```

### Cache Management

#### Cache Statistics
```bash
GET /api/dashboard/cache-stats
curl http://localhost:4009/api/dashboard/cache-stats
```

**Response:**
```json
{
  "status": "success",
  "cache_stats": {
    "keys": 24,
    "hits": 1247,
    "misses": 156,
    "hit_rate": "88.89",
    "memory_usage": {
      "heapUsed": 45678912,
      "heapTotal": 67108864
    }
  }
}
```

### API Documentation

Both services provide built-in API documentation:

```bash
# Query Processor API docs
curl http://localhost:4008/api/docs

# Analytics API docs  
curl http://localhost:4009/api/docs
```

## Performance Features

### Caching Strategy

The Analytics API implements intelligent caching with different TTL values:

- **Critical Alerts**: 15 seconds (high refresh rate)
- **Total Events**: 30 seconds
- **Active Sources**: 1 minute
- **Security Incidents**: 2 minutes
- **Alert Performance**: 3 minutes
- **Daily Summary**: 10 minutes

### Rate Limiting

Both services include rate limiting:
- **Analytics API**: 100 requests/minute per IP
- **Query Processor**: Configurable per endpoint

### Multi-tenancy

Both services support multi-tenant operations via the `org_id` parameter.

## Integration Examples

### Frontend Integration

```typescript
// Submit async query
const response = await fetch('http://localhost:4008/api/jobs/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'SELECT * FROM logs WHERE severity = "ERROR"',
    type: 'sql'
  })
});

const { job_id } = await response.json();

// Get widget data
const widgetData = await fetch('http://localhost:4009/api/widgets/total-events');
const data = await widgetData.json();
```

### Dashboard Implementation

```typescript
// Real-time dashboard updates
const socket = io('http://localhost:4008');

// Subscribe to job updates
socket.on('job:completed', async (data) => {
  // Refresh dashboard widgets
  await refreshDashboard();
});

// Fast widget loading
const loadWidget = async (widget: string, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`http://localhost:4009/api/widgets/${widget}?${queryString}`);
  return response.json();
};
```

## Monitoring & Debugging

### Health Monitoring

```bash
# Monitor all services
curl http://localhost:4008/health && echo ""
curl http://localhost:4009/health && echo ""

# Check service stats
curl http://localhost:4008/api/queue/stats
curl http://localhost:4009/api/dashboard/cache-stats
```

### Performance Metrics

```bash
# Monitor cache performance
watch -n 5 'curl -s http://localhost:4009/api/dashboard/cache-stats | jq .cache_stats.hit_rate'

# Monitor queue depth
watch -n 2 'curl -s http://localhost:4008/api/queue/stats | jq .stats.queue_depth'
```

### Troubleshooting

Common issues and solutions:

1. **High response times**: Check cache hit rates and database connectivity
2. **Job queue backup**: Monitor worker count and processing times
3. **Memory usage**: Check cache size and implement cleanup policies
4. **WebSocket disconnections**: Verify network stability and implement reconnection logic

---

**Enterprise-grade performance APIs for large-scale SIEM operations** 🚀