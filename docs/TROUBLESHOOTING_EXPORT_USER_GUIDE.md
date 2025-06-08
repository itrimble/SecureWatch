# SecureWatch Troubleshooting Export User Guide v2.1.1

> **📋 Documentation Navigation:** 
> - **Core Guides**: [Main README](README.md) | [Quick Start](QUICK_START.md) | [Deployment Guide](DEPLOYMENT_GUIDE.md)
> - **API References**: [Support Bundle API](SUPPORT_BUNDLE_API_GUIDE.md) | [KQL API Guide](KQL_API_GUIDE.md) | [Performance API](PERFORMANCE_API_GUIDE.md)
> - **Integration**: [OpenSearch Guide](OPENSEARCH_INTEGRATION_GUIDE.md) | [Data Ingestion](DATA_INGESTION_GUIDE.md)
> - **Operations**: [Performance Optimization](PERFORMANCE_OPTIMIZATION_GUIDE.md) | [Security Configuration](SECURITY_CONFIGURATION_GUIDE.md)
> - **Troubleshooting**: [Incident Response](INCIDENT_RESPONSE_PROCEDURES.md) | [Log Formats](LOG_FORMATS_GUIDE.md)

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Feature](#accessing-the-feature)
3. [Export Configuration](#using-the-export-interface)
4. [Bundle Analysis](#understanding-export-bundles)
5. [Use Cases & Scenarios](#common-use-cases)
6. [TypeScript Troubleshooting](#typescript-specific-troubleshooting)
7. [OpenSearch Integration](#opensearch-integration-analysis)
8. [Troubleshooting Guide](#troubleshooting-the-export-feature)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

## Overview

The Troubleshooting Export feature in SecureWatch allows administrators to export internal platform logs for support analysis and debugging. This guide covers how to use the feature effectively for enterprise troubleshooting scenarios.

## Accessing the Feature

### Web Interface

1. **Navigate to Settings**
   - Click the **Settings** link in the main navigation
   - Or visit `http://localhost:4000/settings`

2. **Go to Platform Status**
   - In the Settings page, click **Platform Status**
   - Or visit `http://localhost:4000/settings/platform-status`

3. **Find Troubleshooting Export**
   - Scroll down to the **Troubleshooting Export** section
   - This panel contains all export controls and options

## Using the Export Interface

### Time Range Selection

#### Quick Time Ranges
- **Last Hour**: Most common for recent issues
- **Last 6 Hours**: Good for identifying patterns
- **Last 24 Hours**: Comprehensive daily analysis
- **Custom Range**: Use date/time picker for specific periods

#### Best Practices
- **Start with shorter ranges** (1-6 hours) for faster exports
- **Expand gradually** if issue timeframe is unclear
- **Avoid ranges longer than 7 days** unless necessary
- **Use specific times** when you know exactly when an issue occurred

### Service Filtering

#### Available Services (v2.1.1 Consolidated Architecture)
- **correlation-engine** (Port 4005): Real-time alerting and correlation with TypeScript rule evaluation
- **analytics-engine** (Port 4009): Consolidated KQL query processing, analytics, and dashboard APIs
- **log-ingestion** (Port 4002): Data ingestion, TypeScript parsers, and normalization pipeline
- **search-api** (Port 4004): Search interface, KQL engine, and OpenSearch integration
- **auth-service** (Port 4006): Authentication, authorization, and JWT token management
- **hec-service** (Port 8888): HTTP Event Collector (Splunk-compatible) with TypeScript validators
- **query-processor** (Port 4008): Async job processing and WebSocket notifications
- **mcp-marketplace** (Port 4010): MCP integrations and marketplace services

#### When to Filter Services
- **Specific Component Issues**: Select only the affected service
- **Performance Problems**: Include search-api and correlation-engine
- **Data Flow Issues**: Include log-ingestion and search-api
- **UI Problems**: Include web-frontend
- **Unknown Issues**: Leave all unchecked to include everything

### Log Level Selection

#### Available Levels
- **Error**: Critical failures and exceptions
- **Warning**: Potential issues and important notices
- **Info**: General operational information
- **Debug**: Detailed debugging information

#### Recommended Combinations
- **Support Tickets**: Error + Warning (most efficient)
- **Performance Analysis**: All levels (comprehensive view)
- **Quick Diagnosis**: Error only (fastest export)
- **Development Issues**: Error + Warning + Debug

### Advanced Options

#### Maximum Documents
- **Default**: 50,000 documents
- **Light Export**: 10,000 documents (faster processing)
- **Comprehensive**: 100,000+ documents (longer timeframes)
- **Maximum**: 1,000,000 documents (enterprise scenarios)

#### Include Stack Traces
- **Enabled**: Full error context with code traces (recommended)
- **Disabled**: Smaller file size, faster processing

## Export Process

### Step-by-Step Process

1. **Configure Time Range**
   ```
   Example: Last 2 hours for recent issue
   Start: 2025-01-05 08:00
   End:   2025-01-05 10:00
   ```

2. **Select Services (Optional)**
   ```
   Example: API performance issue
   ✓ search-api
   ✓ correlation-engine
   ✗ web-frontend
   ✗ auth-service
   ```

3. **Choose Log Levels**
   ```
   Example: Standard troubleshooting
   ✓ Error
   ✓ Warning
   ✗ Info
   ✗ Debug
   ```

4. **Set Advanced Options**
   ```
   Max Documents: 50,000
   Include Stack Traces: Yes
   ```

5. **Generate Bundle**
   - Click **"Generate and Download Log Bundle"**
   - Monitor progress indicator
   - Download will start automatically when complete

### Progress Monitoring

The interface shows real-time progress:

- **Validating Request**: Checking parameters and permissions
- **Querying Log Data**: Retrieving logs from OpenSearch
- **Creating Bundle**: Compressing files into ZIP archive
- **Download Starting**: File ready for download

### Expected Timeframes

| Configuration | Expected Time | Bundle Size |
|---------------|---------------|-------------|
| 1 hour, Error only | 10-30 seconds | 1-5 MB |
| 6 hours, Error+Warning | 30-90 seconds | 5-25 MB |
| 24 hours, All levels | 2-5 minutes | 25-100 MB |
| 7 days, Filtered services | 5-15 minutes | 50-200 MB |

## Understanding Export Bundles

### Bundle Contents

Each downloaded ZIP file contains:

#### 1. logs.json
```json
[
  {
    "@timestamp": "2025-01-05T10:30:00.123Z",
    "level": "error" | "warn" | "info" | "debug",
    "message": "Database connection timeout",
    "service": "search-api",
    "hostname": "securewatch-host",
    "requestId": "req_abc123",
    "correlationId": "corr_xyz789",
    "userId": "user_456def",
    "sessionId": "sess_123ghi",
    "performance": {
      "duration": 5000,
      "memoryUsage": "245MB",
      "cpuUtilization": 0.85
    },
    "context": {
      "environment": "production",
      "region": "us-west-2",
      "version": "2.1.1"
    },
    "error": {
      "name": "TimeoutError",
      "message": "Connection timeout after 5000ms",
      "code": "DB_TIMEOUT_001",
      "stack": "TimeoutError: Connection timeout\n    at Database.connect...",
      "metadata": {
        "query": "SELECT * FROM events WHERE...",
        "connectionPool": "primary",
        "retryAttempt": 3
      }
    }
  }
]
```

#### 2. metadata.json
```json
{
  "exportInfo": {
    "exportId": "export-123e4567...",
    "exportTime": "2025-01-05T11:00:00.000Z",
    "secureWatchVersion": "2.1.1",
    "buildInfo": {
      "nodeVersion": "20.x",
      "typescriptVersion": "5.x",
      "buildTimestamp": "2025-01-05T10:00:00.000Z",
      "gitCommit": "abc123def456"
    }
  },
  "statistics": {
    "totalDocuments": 15750,
    "uniqueServices": 3,
    "services": ["search-api", "correlation-engine", "log-ingestion"],
    "logLevels": ["error", "warn"]
  }
}
```

#### 3. README.txt
Human-readable documentation explaining the export contents and how to use them.

### Bundle Analysis

#### Finding Key Information

1. **Error Patterns**
   ```bash
   # Count error types
   grep '"level":"error"' logs.json | grep -o '"message":"[^"]*"' | sort | uniq -c
   ```

2. **Service Issues**
   ```bash
   # Errors by service
   grep '"level":"error"' logs.json | grep -o '"service":"[^"]*"' | sort | uniq -c
   ```

3. **Timeline Analysis**
   ```bash
   # Errors over time
   grep '"level":"error"' logs.json | grep -o '"@timestamp":"[^"]*"' | cut -c16-21 | uniq -c
   ```

## Common Use Cases

### 1. API Performance Issues

**Scenario**: Users report slow search responses

**Configuration**:
- Time Range: Last 2 hours
- Services: search-api, correlation-engine
- Log Levels: Error, Warning
- Max Documents: 25,000

**Analysis Focus**:
- Database connection errors
- Query timeout warnings
- High response time logs

### 2. Authentication Problems

**Scenario**: Users cannot log in

**Configuration**:
- Time Range: Last 1 hour
- Services: auth-service, web-frontend
- Log Levels: Error, Warning
- Max Documents: 10,000

**Analysis Focus**:
- Authentication failures
- Session management errors
- OAuth integration issues

### 3. Data Ingestion Failures

**Scenario**: Logs not appearing in the system

**Configuration**:
- Time Range: Last 6 hours
- Services: log-ingestion, search-api
- Log Levels: All levels
- Max Documents: 50,000

**Analysis Focus**:
- Ingestion pipeline errors
- Database write failures
- Processing bottlenecks

### 4. Correlation Engine Issues

**Scenario**: Alerts not triggering correctly

**Configuration**:
- Time Range: Last 24 hours
- Services: correlation-engine
- Log Levels: Error, Warning, Info
- Max Documents: 75,000

**Analysis Focus**:
- Rule evaluation errors
- Pattern matching failures
- Alert generation logs

## Troubleshooting the Export Feature

### Common Issues

#### 1. Export Takes Too Long
- **Reduce time range** (try 1-3 hours instead of 24 hours)
- **Add service filters** (select only relevant services)
- **Use fewer log levels** (Error + Warning only)
- **Lower max documents** (25,000 instead of 100,000)

#### 2. Empty or Small Bundles
- **Check time range** (ensure it covers the issue period)
- **Verify service selection** (make sure affected services are included)
- **Check log levels** (include Info if Error/Warning are insufficient)
- **Confirm services are running** (use Platform Status to verify)

#### 3. Download Fails
- **Check browser settings** (allow downloads from localhost)
- **Try different browser** (Chrome, Firefox, Safari)
- **Clear browser cache** and retry
- **Check network connectivity** to the SecureWatch instance

#### 4. Cannot Access Feature
- **Verify admin privileges** (only administrators can export logs)
- **Check authentication** (ensure you're logged in)
- **Contact system administrator** for permission issues

### Health Checks

Before exporting, verify the system is healthy:

1. **Service Status**: All services should show "Healthy" in Platform Status
2. **OpenSearch Connection**: Green status indicator
3. **Recent Activity**: Recent logs should be visible in the main dashboard

### Getting Help

If you encounter issues:

1. **Check service health** in Platform Status
2. **Try a smaller export** (last 1 hour, Error only)
3. **Review browser console** for JavaScript errors
4. **Contact support** with:
   - Exact time range attempted
   - Services and log levels selected
   - Any error messages received
   - Browser and version information

## TypeScript-Specific Troubleshooting

### Build and Runtime Issues

#### 1. TypeScript Compilation Errors
**Scenario**: Services fail to start due to TypeScript compilation issues

**Configuration**:
- Time Range: Last 30 minutes
- Services: All services
- Log Levels: Error
- Max Documents: 10,000

**Analysis Focus**:
- TypeScript compilation errors
- Module resolution failures
- Type definition conflicts
- Build pipeline issues

#### 2. Type Safety Violations
**Scenario**: Runtime errors due to type mismatches

**Log Pattern Examples**:
```json
{
  "level": "error",
  "message": "Type assertion failed",
  "service": "analytics-engine",
  "error": {
    "type": "TypeError",
    "expected": "SearchRequest",
    "received": "undefined",
    "location": "src/engine/query-planner.ts:142"
  }
}
```

#### 3. Interface Compatibility Issues
**Common Patterns to Look For**:
- `Property 'x' does not exist on type 'y'`
- `Argument of type 'A' is not assignable to parameter of type 'B'`
- `Cannot read property 'x' of undefined`
- `Object is possibly 'null' or 'undefined'`

## OpenSearch Integration Analysis

### Query Performance Troubleshooting

When analyzing search-related issues, look for these OpenSearch-specific patterns:

#### Query Execution Logs
```json
{
  "service": "search-api",
  "level": "info",
  "message": "OpenSearch query executed",
  "query": {
    "index": "securewatch-logs-*",
    "type": "kql",
    "execution_time_ms": 1250,
    "total_hits": 15847,
    "shard_failures": 0
  },
  "opensearch": {
    "cluster_health": "green",
    "nodes_available": 3,
    "indices_searched": ["securewatch-logs-2025.01.05", "securewatch-logs-2025.01.04"]
  }
}
```

#### Index Management Issues
```json
{
  "service": "log-ingestion",
  "level": "warn",
  "message": "Index rollover threshold reached",
  "index": {
    "name": "securewatch-logs-2025.01.05",
    "size_gb": 2.5,
    "document_count": 1500000,
    "rollover_triggered": true
  }
}
```

## API Reference

### Export Bundle API Endpoint

```typescript
interface ExportRequest {
  timeRange: {
    start: string; // ISO 8601 timestamp
    end: string;   // ISO 8601 timestamp
  };
  services?: string[];
  logLevels?: ('error' | 'warn' | 'info' | 'debug')[];
  maxDocuments?: number;
  includeStackTraces?: boolean;
}

interface ExportResponse {
  exportId: string;
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  metadata: {
    totalDocuments: number;
    bundleSize: number;
    processingTime: number;
  };
}
```

### Health Check Endpoints

- **GET** `/api/support/health` - System health status
- **POST** `/api/support/export-logs` - Create export bundle
- **GET** `/api/support/export-logs/{exportId}` - Check export status
- **GET** `/api/support/export-logs/{exportId}/download` - Download bundle

## Best Practices

### For Support Tickets

1. **Be Specific**: Use precise time ranges when the issue occurred
2. **Start Small**: Begin with Error + Warning levels for faster processing
3. **Include Context**: Note what user actions preceded the issue
4. **Multiple Exports**: Create separate bundles for different time periods if needed

### For System Monitoring

1. **Regular Exports**: Schedule periodic exports for baseline analysis
2. **Service-Specific**: Create focused exports for individual service health
3. **Long-term Trends**: Use larger time ranges for pattern analysis
4. **Archive Important Bundles**: Save bundles for significant incidents

### For Development

1. **Debug Mode**: Include all log levels for development issues
2. **Stack Traces**: Always include stack traces for error analysis
3. **Recent Changes**: Export logs immediately after deployments
4. **Compare Versions**: Export before and after changes for comparison

---

**Enterprise Troubleshooting Export - Comprehensive log analysis for SecureWatch SIEM** 🔍