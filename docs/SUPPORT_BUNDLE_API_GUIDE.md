# Support Bundle API Guide

## Overview

The Support Bundle API provides enterprise-grade troubleshooting log export capabilities for the SecureWatch SIEM platform. This API allows administrators to export internal operational logs from all microservices within specified time ranges for support analysis and debugging.

## API Endpoint

**Base URL:** `/api/support/export-logs`

## Supported Methods

### POST - Export Logs

Export internal platform logs as a compressed bundle.

#### Request

```http
POST /api/support/export-logs
Content-Type: application/json

{
  "startTime": "2025-01-05T00:00:00Z",
  "endTime": "2025-01-05T23:59:59Z",
  "services": ["correlation-engine", "search-api"],
  "logLevels": ["error", "warn"],
  "maxDocuments": 50000,
  "includeStackTraces": true
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | string | ✅ | ISO 8601 timestamp for start of time range |
| `endTime` | string | ✅ | ISO 8601 timestamp for end of time range |
| `services` | array | ❌ | Array of service names to include (omit for all) |
| `logLevels` | array | ❌ | Log levels to include: `error`, `warn`, `info`, `debug` |
| `maxDocuments` | number | ❌ | Maximum number of log documents (default: 50,000, max: 1,000,000) |
| `includeStackTraces` | boolean | ❌ | Include full stack traces in error logs (default: false) |

#### Service Names

Available services for filtering:

- `correlation-engine` - Real-time correlation and alerting
- `analytics-engine` - KQL analytics and query processing  
- `log-ingestion` - Log collection and normalization
- `search-api` - Search interface and API gateway
- `auth-service` - Authentication and authorization
- `mcp-marketplace` - MCP marketplace service
- `web-frontend` - Frontend application logs

#### Response

**Success (200):**
- Returns a ZIP file stream
- Headers:
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="securewatch-logs-YYYY-MM-DD.zip"`
  - `X-Export-Status: success`

**Error Responses:**

| Status | Description | Example Response |
|--------|-------------|------------------|
| 400 | Invalid request parameters | `{"error": "Invalid request parameters", "details": ["startTime is required"]}` |
| 404 | No logs found | `{"error": "No logs available", "details": "No log indices found for the specified time range."}` |
| 408 | Export timeout | `{"error": "Export timeout", "details": "The log export took too long to complete."}` |
| 503 | Service unavailable | `{"error": "OpenSearch service unavailable", "details": "Cannot connect to logging backend."}` |

### GET - Health Check

Check the health status of the log export service.

#### Request

```http
GET /api/support/export-logs
```

#### Response

```json
{
  "service": "log-export",
  "status": "healthy",
  "opensearch": {
    "cluster_name": "securewatch-cluster",
    "status": "green",
    "number_of_nodes": 1,
    "active_primary_shards": 5
  },
  "timestamp": "2025-01-05T10:30:00.000Z"
}
```

## Bundle Contents

Each exported bundle contains:

### 1. logs.json
Structured JSON array containing all log documents:

```json
[
  {
    "@timestamp": "2025-01-05T10:30:00.123Z",
    "level": "error",
    "message": "Database connection failed",
    "service": "search-api",
    "hostname": "securewatch-host",
    "pid": 12345,
    "requestId": "req_abc123",
    "error": {
      "name": "ConnectionError",
      "message": "timeout after 5000ms",
      "stack": "..."
    },
    "metadata": {
      "endpoint": "/api/search",
      "duration": 5000
    }
  }
]
```

### 2. metadata.json
Export metadata and statistics:

```json
{
  "exportInfo": {
    "exportId": "export-123e4567-e89b-12d3-a456-426614174000",
    "exportTime": "2025-01-05T11:00:00.000Z",
    "secureWatchVersion": "1.0.0",
    "exportedBy": "SecureWatch Support Bundle Service"
  },
  "requestedTimeRange": {
    "start": "2025-01-05T00:00:00.000Z",
    "end": "2025-01-05T23:59:59.000Z"
  },
  "actualTimeRange": {
    "start": "2025-01-05T00:15:23.456Z",
    "end": "2025-01-05T23:45:12.789Z"
  },
  "statistics": {
    "totalDocuments": 15750,
    "uniqueServices": 5,
    "uniqueLogLevels": 3,
    "services": ["correlation-engine", "search-api", "log-ingestion"],
    "logLevels": ["error", "warn", "info"]
  },
  "filters": {
    "services": ["correlation-engine", "search-api"],
    "logLevels": ["error", "warn"],
    "maxDocuments": 50000,
    "includeStackTraces": true
  }
}
```

### 3. README.txt
Human-readable documentation:

```
SecureWatch SIEM - Troubleshooting Log Bundle
=============================================

Export Information:
- Export ID: export-123e4567-e89b-12d3-a456-426614174000
- Export Time: 2025-01-05T11:00:00.000Z
- SecureWatch Version: 1.0.0

Time Range:
- Requested: 2025-01-05T00:00:00.000Z to 2025-01-05T23:59:59.000Z
- Actual: 2025-01-05T00:15:23.456Z to 2025-01-05T23:45:12.789Z

Statistics:
- Total Log Documents: 15,750
- Unique Services: 5
- Services Included: correlation-engine, search-api, log-ingestion
- Log Levels: error, warn, info

Files in this Bundle:
- logs.json: All log documents in JSON format
- metadata.json: Detailed metadata about this export
- README.txt: This file

Usage:
This bundle contains internal operational logs from the SecureWatch SIEM platform.
These logs are intended for troubleshooting and support purposes.

For support, please include this entire bundle when reporting issues.
```

## Usage Examples

### Basic Export (Last Hour)

```javascript
const response = await fetch('/api/support/export-logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    endTime: new Date().toISOString(),
    logLevels: ['error', 'warn']
  })
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'securewatch-logs.zip';
  a.click();
}
```

### Service-Specific Export

```javascript
const exportConfig = {
  startTime: '2025-01-05T09:00:00Z',
  endTime: '2025-01-05T10:00:00Z',
  services: ['correlation-engine'],
  logLevels: ['error'],
  maxDocuments: 1000,
  includeStackTraces: true
};

const response = await fetch('/api/support/export-logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(exportConfig)
});
```

### Health Check

```javascript
const health = await fetch('/api/support/export-logs');
const status = await health.json();
console.log('Service status:', status.status);
```

## Rate Limiting

- Maximum 1 concurrent export per IP address
- Maximum 10 exports per hour per IP address
- Maximum time range: 30 days
- Maximum documents per export: 1,000,000

## Security Considerations

### Authentication
- Requires admin-level authentication
- API key authentication supported for automated tools
- Session-based authentication for web interface

### Data Privacy
- Logs are filtered to remove sensitive data (passwords, tokens)
- PII is masked or redacted where possible
- Export activity is logged and auditable

### Access Control
- Only administrators can access the export API
- Exports are logged with user identification
- Failed export attempts are monitored and alerted

## Error Handling

### Common Error Scenarios

#### Invalid Time Range
```json
{
  "error": "Invalid request parameters",
  "details": ["startTime must be before endTime", "Time range cannot exceed 30 days"]
}
```

#### No Data Found
```json
{
  "error": "No logs available",
  "details": "No log indices found for the specified time range."
}
```

#### Service Unavailable
```json
{
  "error": "OpenSearch service unavailable",
  "details": "Cannot connect to logging backend. Please try again later."
}
```

#### Export Timeout
```json
{
  "error": "Export timeout",
  "details": "The log export took too long to complete. Try reducing the time range or applying more filters."
}
```

## Performance Guidelines

### Optimal Usage Patterns

1. **Time Range Selection**
   - Prefer shorter time ranges (1-6 hours) for faster exports
   - Use service filtering to reduce data volume
   - Filter by log levels to focus on relevant events

2. **Service Filtering**
   - Specify only services related to the issue
   - Use error/warn levels for troubleshooting
   - Include debug logs only when necessary

3. **Batch Processing**
   - For large time ranges, consider multiple smaller exports
   - Use pagination with maxDocuments parameter
   - Monitor export progress through the UI

### Performance Metrics

| Time Range | Expected Documents | Export Time | Bundle Size |
|------------|-------------------|-------------|-------------|
| 1 hour | 1,000-5,000 | 5-15 seconds | 1-5 MB |
| 6 hours | 5,000-30,000 | 15-60 seconds | 5-25 MB |
| 24 hours | 20,000-120,000 | 1-5 minutes | 20-100 MB |
| 7 days | 100,000-500,000 | 5-15 minutes | 100-500 MB |

## Integration Examples

### Support Ticket Integration

```javascript
async function createSupportBundleForTicket(ticketId, issueTimeRange) {
  const exportConfig = {
    startTime: issueTimeRange.start,
    endTime: issueTimeRange.end,
    logLevels: ['error', 'warn'],
    maxDocuments: 100000
  };
  
  try {
    const response = await fetch('/api/support/export-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportConfig)
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const filename = `support-bundle-${ticketId}-${Date.now()}.zip`;
      
      // Save to support system or cloud storage
      await uploadSupportBundle(ticketId, blob, filename);
      
      return { success: true, filename };
    }
  } catch (error) {
    console.error('Support bundle generation failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Automated Health Monitoring

```javascript
async function scheduledHealthExport() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  
  const exportConfig = {
    startTime: oneHourAgo.toISOString(),
    endTime: now.toISOString(),
    logLevels: ['error'],
    services: ['correlation-engine', 'search-api'],
    maxDocuments: 10000
  };
  
  const response = await fetch('/api/support/export-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportConfig)
  });
  
  if (response.ok) {
    const blob = await response.blob();
    // Process or store the health bundle
    await processHealthBundle(blob);
  }
}

// Run every hour
setInterval(scheduledHealthExport, 3600000);
```

## Support and Troubleshooting

### Common Issues

1. **Export Hangs or Times Out**
   - Reduce time range or add more filters
   - Check OpenSearch cluster health
   - Verify network connectivity

2. **Empty or Small Bundles**
   - Verify services are generating logs
   - Check log level filters
   - Confirm time range covers the issue period

3. **Authentication Errors**
   - Verify admin-level permissions
   - Check session or API key validity
   - Review access control policies

### Support Contact

For issues with the Support Bundle API:
- Create a support ticket with error details
- Include the approximate time of the failed export
- Provide any error messages or HTTP status codes received

---

**Enterprise Support Bundle API - Comprehensive troubleshooting log export for SecureWatch SIEM** 🛠️