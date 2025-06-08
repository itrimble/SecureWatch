# SecureWatch Support Bundle API Guide v2.1.1

> **📋 Documentation Navigation:** [Main README](README.md) | [Deployment Guide](DEPLOYMENT_GUIDE.md) | [Troubleshooting Export](TROUBLESHOOTING_EXPORT_USER_GUIDE.md) | [Performance Guide](PERFORMANCE_OPTIMIZATION_GUIDE.md) | [TypeScript Architecture](TYPESCRIPT_ARCHITECTURE_GUIDE.md)

## Overview

The Support Bundle API provides enterprise-grade troubleshooting log export capabilities for SecureWatch v2.1.1. This TypeScript-enhanced API allows administrators to export internal operational logs from all 8 consolidated microservices within specified time ranges for support analysis and debugging with comprehensive type safety.

## TypeScript Interface Definitions

SecureWatch v2.1.1 includes comprehensive TypeScript interfaces for type-safe API interaction:

```typescript
interface ExportLogsRequest {
  startTime: string;        // ISO 8601 timestamp
  endTime: string;          // ISO 8601 timestamp
  services?: ServiceName[]; // Optional service filtering
  logLevels?: LogLevel[];   // Optional log level filtering
  maxDocuments?: number;    // Optional document limit (default: 50,000)
  includeStackTraces?: boolean; // Optional stack trace inclusion
}

type ServiceName = 
  | 'correlation-engine'
  | 'analytics-engine' 
  | 'log-ingestion'
  | 'search-api'
  | 'auth-service'
  | 'query-processor'
  | 'hec-service'
  | 'mcp-marketplace';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface ExportLogsResponse {
  success: boolean;
  data?: {
    exportId: string;
    downloadUrl?: string;
    estimatedSize?: number;
    processingTime?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  opensearch: {
    cluster_name: string;
    status: 'green' | 'yellow' | 'red';
    number_of_nodes: number;
    active_primary_shards: number;
  };
  timestamp: string;
  version: string;
}

interface LogEntry {
  '@timestamp': string;
  level: LogLevel;
  message: string;
  service: ServiceName;
  hostname: string;
  pid?: number;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
  performance?: {
    duration?: number;
    memoryUsage?: string;
    cpuUtilization?: number;
  };
}

interface BundleMetadata {
  exportInfo: {
    exportId: string;
    exportTime: string;
    secureWatchVersion: string;
    exportedBy: string;
    buildInfo: {
      nodeVersion: string;
      typescriptVersion: string;
      buildTimestamp: string;
      gitCommit: string;
    };
  };
  requestedTimeRange: {
    start: string;
    end: string;
  };
  actualTimeRange: {
    start: string;
    end: string;
  };
  statistics: {
    totalDocuments: number;
    uniqueServices: number;
    uniqueLogLevels: number;
    services: ServiceName[];
    logLevels: LogLevel[];
  };
  filters: ExportLogsRequest;
}
```

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

Available services for filtering (v2.1.1 consolidated architecture):

- `correlation-engine` (Port 4005) - Real-time correlation and alerting with TypeScript rule evaluation
- `analytics-engine` (Port 4009) - Consolidated KQL analytics, dashboard APIs, and query processing
- `log-ingestion` (Port 4002) - Log collection, TypeScript parsers, and normalization
- `search-api` (Port 4004) - Search interface, KQL engine, and OpenSearch integration
- `auth-service` (Port 4006) - Authentication, authorization, and JWT token management
- `query-processor` (Port 4008) - Async job processing and WebSocket notifications
- `hec-service` (Port 8888) - HTTP Event Collector (Splunk-compatible) with TypeScript validators
- `mcp-marketplace` (Port 4010) - MCP marketplace service with enhanced integrations

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
    "secureWatchVersion": "2.1.1",
    "exportedBy": "SecureWatch Support Bundle Service",
    "buildInfo": {
      "nodeVersion": "20.x",
      "typescriptVersion": "5.x",
      "buildTimestamp": "2025-01-05T10:00:00.000Z",
      "gitCommit": "abc123def456"
    }
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
SecureWatch SIEM - Troubleshooting Log Bundle v2.1.1
======================================================

Export Information:
- Export ID: export-123e4567-e89b-12d3-a456-426614174000
- Export Time: 2025-01-05T11:00:00.000Z
- SecureWatch Version: 2.1.1 (TypeScript-Enhanced)
- Architecture: 8 Core Services (Consolidated)

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

## TypeScript Client Implementation

### Enhanced Type-Safe Client

```typescript
class SupportBundleClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = '/api/support/export-logs', authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Export logs with comprehensive type safety
   */
  async exportLogs(request: ExportLogsRequest): Promise<ExportLogsResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new SupportBundleError(
        response.status,
        error.message || `HTTP ${response.status}: ${response.statusText}`,
        error.details
      );
    }

    // Handle binary response for ZIP files
    if (response.headers.get('content-type')?.includes('application/zip')) {
      const blob = await response.blob();
      const filename = this.extractFilename(response.headers.get('content-disposition'));
      return {
        success: true,
        data: {
          exportId: response.headers.get('x-export-id') || 'unknown',
          downloadUrl: URL.createObjectURL(blob),
          estimatedSize: blob.size,
          processingTime: Number(response.headers.get('x-processing-time')) || 0
        }
      };
    }

    return response.json();
  }

  /**
   * Check service health with typed response
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'GET',
      headers: {
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      }
    });

    if (!response.ok) {
      throw new SupportBundleError(
        response.status,
        `Health check failed: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Download bundle with progress tracking
   */
  async downloadBundle(
    request: ExportLogsRequest,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new SupportBundleError(response.status, 'Export failed');
    }

    const reader = response.body?.getReader();
    const contentLength = Number(response.headers.get('content-length')) || 0;

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (onProgress && contentLength > 0) {
        onProgress((receivedLength / contentLength) * 100);
      }
    }

    return new Blob(chunks);
  }

  private extractFilename(contentDisposition: string | null): string {
    if (!contentDisposition) return 'support-bundle.zip';
    
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    return match ? match[1] : 'support-bundle.zip';
  }
}

/**
 * Custom error class for support bundle operations
 */
class SupportBundleError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string[]
  ) {
    super(message);
    this.name = 'SupportBundleError';
  }

  get isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 408;
  }
}

/**
 * Utility functions for common operations
 */
export class SupportBundleUtils {
  /**
   * Create time range for the last N hours
   */
  static lastHours(hours: number): { startTime: string; endTime: string } {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    
    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    };
  }

  /**
   * Create time range for a specific day
   */
  static specificDay(date: Date): { startTime: string; endTime: string } {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    
    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    };
  }

  /**
   * Validate export request parameters
   */
  static validateRequest(request: ExportLogsRequest): string[] {
    const errors: string[] = [];
    
    if (!request.startTime) {
      errors.push('startTime is required');
    }
    
    if (!request.endTime) {
      errors.push('endTime is required');
    }
    
    if (request.startTime && request.endTime) {
      const start = new Date(request.startTime);
      const end = new Date(request.endTime);
      
      if (start >= end) {
        errors.push('startTime must be before endTime');
      }
      
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        errors.push('Time range cannot exceed 30 days');
      }
    }
    
    if (request.maxDocuments && (request.maxDocuments < 1 || request.maxDocuments > 1000000)) {
      errors.push('maxDocuments must be between 1 and 1,000,000');
    }
    
    return errors;
  }
}
```

## Usage Examples

### Basic Export (Last Hour)

```typescript
// Using the type-safe client
const client = new SupportBundleClient();

try {
  const timeRange = SupportBundleUtils.lastHours(1);
  const request: ExportLogsRequest = {
    ...timeRange,
    logLevels: ['error', 'warn'],
    maxDocuments: 10000
  };

  // Validate request
  const errors = SupportBundleUtils.validateRequest(request);
  if (errors.length > 0) {
    throw new Error(`Validation errors: ${errors.join(', ')}`);
  }

  const result = await client.exportLogs(request);
  
  if (result.success && result.data?.downloadUrl) {
    // Trigger download
    const a = document.createElement('a');
    a.href = result.data.downloadUrl;
    a.download = 'securewatch-logs-last-hour.zip';
    a.click();
  }
} catch (error) {
  if (error instanceof SupportBundleError) {
    console.error(`Export failed (${error.statusCode}):`, error.message);
    if (error.isRetryable) {
      console.log('This error is retryable, consider trying again');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Service-Specific Export with Progress

```typescript
const client = new SupportBundleClient('/api/support/export-logs', 'your-auth-token');

const exportConfig: ExportLogsRequest = {
  startTime: '2025-01-05T09:00:00Z',
  endTime: '2025-01-05T10:00:00Z',
  services: ['correlation-engine', 'analytics-engine'],
  logLevels: ['error', 'warn'],
  maxDocuments: 5000,
  includeStackTraces: true
};

try {
  // Download with progress tracking
  const blob = await client.downloadBundle(exportConfig, (progress) => {
    console.log(`Download progress: ${Math.round(progress)}%`);
    // Update progress bar in UI
    updateProgressBar(progress);
  });

  // Save the blob
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'correlation-engine-logs.zip';
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
} catch (error) {
  console.error('Export failed:', error);
}
```

### Health Check with Type Safety

```typescript
const client = new SupportBundleClient();

try {
  const health: HealthCheckResponse = await client.checkHealth();
  
  console.log(`Service status: ${health.status}`);
  console.log(`OpenSearch cluster: ${health.opensearch.cluster_name} (${health.opensearch.status})`);
  console.log(`Active shards: ${health.opensearch.active_primary_shards}`);
  
  if (health.status !== 'healthy') {
    console.warn('Support Bundle API is not fully healthy!');
  }
} catch (error) {
  console.error('Health check failed:', error);
}
```

### Advanced Integration Example

```typescript
class SupportTicketIntegration {
  private client: SupportBundleClient;

  constructor(authToken: string) {
    this.client = new SupportBundleClient('/api/support/export-logs', authToken);
  }

  /**
   * Create support bundle for a specific incident
   */
  async createIncidentBundle(
    incidentId: string,
    incidentTime: Date,
    affectedServices: ServiceName[]
  ): Promise<{ success: boolean; bundleUrl?: string; error?: string }> {
    try {
      // Create time range around incident (±2 hours)
      const bufferHours = 2;
      const startTime = new Date(incidentTime.getTime() - bufferHours * 60 * 60 * 1000);
      const endTime = new Date(incidentTime.getTime() + bufferHours * 60 * 60 * 1000);

      const request: ExportLogsRequest = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        services: affectedServices,
        logLevels: ['error', 'warn', 'info'],
        maxDocuments: 50000,
        includeStackTraces: true
      };

      // Validate request
      const validationErrors = SupportBundleUtils.validateRequest(request);
      if (validationErrors.length > 0) {
        return { success: false, error: validationErrors.join(', ') };
      }

      const result = await this.client.exportLogs(request);
      
      if (result.success && result.data?.downloadUrl) {
        // Upload to support system
        const bundleUrl = await this.uploadToSupportSystem(
          incidentId,
          result.data.downloadUrl
        );
        
        return { success: true, bundleUrl };
      } else {
        return { 
          success: false, 
          error: result.error?.message || 'Unknown error' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      };
    }
  }

  /**
   * Perform health check before critical operations
   */
  async ensureServiceHealth(): Promise<boolean> {
    try {
      const health = await this.client.checkHealth();
      return health.status === 'healthy' && health.opensearch.status === 'green';
    } catch {
      return false;
    }
  }

  private async uploadToSupportSystem(incidentId: string, bundleUrl: string): Promise<string> {
    // Implementation for uploading to support system
    // This would integrate with your support ticket system
    return `https://support.example.com/incidents/${incidentId}/bundles/latest`;
  }
}
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

## TypeScript Troubleshooting Guide

### Common TypeScript Integration Issues

#### 1. Interface Compatibility Problems
```typescript
// ❌ Incorrect usage - missing required fields
const request = {
  startTime: '2025-01-05T10:00:00Z'
  // Missing endTime - TypeScript will catch this
};

// ✅ Correct usage with proper interface
const request: ExportLogsRequest = {
  startTime: '2025-01-05T10:00:00Z',
  endTime: '2025-01-05T11:00:00Z',
  logLevels: ['error', 'warn'],
  services: ['correlation-engine'],
  maxDocuments: 10000
};
```

#### 2. Service Name Type Safety
```typescript
// ❌ Incorrect - 'invalid-service' is not a valid ServiceName
const services = ['correlation-engine', 'invalid-service'];

// ✅ Correct - TypeScript enforces valid service names
const services: ServiceName[] = ['correlation-engine', 'analytics-engine'];
```

#### 3. Error Handling with Types
```typescript
try {
  const result = await client.exportLogs(request);
} catch (error) {
  // ✅ Proper error handling with type checking
  if (error instanceof SupportBundleError) {
    switch (error.statusCode) {
      case 400:
        console.error('Invalid request:', error.details);
        break;
      case 408:
        console.error('Export timeout - try smaller time range');
        break;
      case 503:
        console.error('Service unavailable - retry later');
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
  } else {
    console.error('Non-bundle error:', error);
  }
}
```

### Type Declaration Integration

For projects using the Support Bundle API, add these type declarations:

```typescript
// types/support-bundle.d.ts
declare module '@securewatch/support-bundle' {
  export interface ExportLogsRequest {
    startTime: string;
    endTime: string;
    services?: ServiceName[];
    logLevels?: LogLevel[];
    maxDocuments?: number;
    includeStackTraces?: boolean;
  }

  export type ServiceName = 
    | 'correlation-engine'
    | 'analytics-engine'
    | 'log-ingestion'
    | 'search-api'
    | 'auth-service'
    | 'query-processor'
    | 'hec-service'
    | 'mcp-marketplace';

  export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

  export class SupportBundleClient {
    constructor(baseUrl?: string, authToken?: string);
    exportLogs(request: ExportLogsRequest): Promise<ExportLogsResponse>;
    checkHealth(): Promise<HealthCheckResponse>;
    downloadBundle(request: ExportLogsRequest, onProgress?: (progress: number) => void): Promise<Blob>;
  }

  export class SupportBundleError extends Error {
    statusCode: number;
    details?: string[];
    isRetryable: boolean;
  }

  export class SupportBundleUtils {
    static lastHours(hours: number): { startTime: string; endTime: string };
    static specificDay(date: Date): { startTime: string; endTime: string };
    static validateRequest(request: ExportLogsRequest): string[];
  }
}
```

## Enterprise Integration Examples

### Support Ticket Integration (TypeScript)

```typescript
interface TicketBundle {
  ticketId: string;
  bundleId: string;
  filename: string;
  uploadedAt: Date;
  size: number;
}

class EnterpriseTicketIntegration {
  private supportClient: SupportBundleClient;
  private ticketSystem: TicketSystemClient;

  constructor(authToken: string, ticketSystemConfig: TicketSystemConfig) {
    this.supportClient = new SupportBundleClient('/api/support/export-logs', authToken);
    this.ticketSystem = new TicketSystemClient(ticketSystemConfig);
  }

  async createSupportBundleForTicket(
    ticketId: string,
    issueTimeRange: { start: Date; end: Date },
    affectedServices?: ServiceName[]
  ): Promise<{ success: boolean; bundle?: TicketBundle; error?: string }> {
    try {
      // Ensure service health before export
      const isHealthy = await this.supportClient.checkHealth();
      if (isHealthy.status !== 'healthy') {
        return { 
          success: false, 
          error: `Support service unhealthy: ${isHealthy.status}` 
        };
      }

      const request: ExportLogsRequest = {
        startTime: issueTimeRange.start.toISOString(),
        endTime: issueTimeRange.end.toISOString(),
        logLevels: ['error', 'warn', 'info'],
        maxDocuments: 100000,
        includeStackTraces: true,
        ...(affectedServices && { services: affectedServices })
      };

      // Validate before sending
      const validationErrors = SupportBundleUtils.validateRequest(request);
      if (validationErrors.length > 0) {
        return { 
          success: false, 
          error: `Validation failed: ${validationErrors.join(', ')}` 
        };
      }

      const result = await this.supportClient.exportLogs(request);
      
      if (result.success && result.data?.downloadUrl) {
        // Upload to enterprise storage
        const uploadResult = await this.uploadToEnterpriseStorage(
          ticketId,
          result.data.downloadUrl,
          result.data.estimatedSize || 0
        );
        
        // Link to ticket system
        await this.ticketSystem.attachBundle(ticketId, uploadResult.bundleId);
        
        return { 
          success: true, 
          bundle: {
            ticketId,
            bundleId: uploadResult.bundleId,
            filename: uploadResult.filename,
            uploadedAt: new Date(),
            size: result.data.estimatedSize || 0
          }
        };
      } else {
        return { 
          success: false, 
          error: result.error?.message || 'Export failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async uploadToEnterpriseStorage(
    ticketId: string,
    bundleUrl: string,
    size: number
  ): Promise<{ bundleId: string; filename: string }> {
    const bundleId = `bundle-${ticketId}-${Date.now()}`;
    const filename = `${bundleId}-securewatch-logs.zip`;
    
    // Enterprise storage implementation would go here
    // This could be S3, Azure Blob, enterprise file system, etc.
    
    return { bundleId, filename };
  }
}

### Automated Health Monitoring (TypeScript)

```typescript
interface MonitoringConfig {
  interval: number; // minutes
  services: ServiceName[];
  alertThresholds: {
    errorRate: number;
    responseTime: number;
  };
  notification: {
    webhook?: string;
    email?: string[];
  };
}

class AutomatedHealthMonitoring {
  private client: SupportBundleClient;
  private config: MonitoringConfig;
  private intervalId?: NodeJS.Timeout;

  constructor(config: MonitoringConfig, authToken?: string) {
    this.client = new SupportBundleClient('/api/support/export-logs', authToken);
    this.config = config;
  }

  start(): void {
    this.intervalId = setInterval(
      () => this.performHealthCheck(),
      this.config.interval * 60 * 1000
    );
    
    console.log(`Health monitoring started (interval: ${this.config.interval}m)`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('Health monitoring stopped');
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const timeRange = SupportBundleUtils.lastHours(1);
      const request: ExportLogsRequest = {
        ...timeRange,
        services: this.config.services,
        logLevels: ['error', 'warn'],
        maxDocuments: 10000
      };

      const result = await this.client.exportLogs(request);
      
      if (result.success) {
        await this.analyzeHealthBundle(result.data?.downloadUrl);
      } else {
        await this.sendAlert(`Health check export failed: ${result.error?.message}`);
      }
    } catch (error) {
      await this.sendAlert(`Health monitoring error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeHealthBundle(bundleUrl?: string): Promise<void> {
    if (!bundleUrl) return;

    // Download and analyze the bundle
    // Implementation would parse logs and check against thresholds
    // For now, we'll simulate analysis
    
    const healthStatus = await this.analyzeLogs(bundleUrl);
    
    if (healthStatus.errorRate > this.config.alertThresholds.errorRate) {
      await this.sendAlert(`High error rate detected: ${healthStatus.errorRate}%`);
    }
    
    if (healthStatus.avgResponseTime > this.config.alertThresholds.responseTime) {
      await this.sendAlert(`High response time: ${healthStatus.avgResponseTime}ms`);
    }
  }

  private async analyzeLogs(bundleUrl: string): Promise<{
    errorRate: number;
    avgResponseTime: number;
  }> {
    // Simulated analysis - in reality would parse the bundle
    return {
      errorRate: Math.random() * 10,
      avgResponseTime: Math.random() * 1000 + 100
    };
  }

  private async sendAlert(message: string): Promise<void> {
    console.warn(`ALERT: ${message}`);
    
    if (this.config.notification.webhook) {
      await fetch(this.config.notification.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          alert: message, 
          timestamp: new Date().toISOString(),
          service: 'SecureWatch Health Monitor'
        })
      });
    }
    
    // Email notification implementation would go here
    if (this.config.notification.email?.length) {
      // Send email alerts
    }
  }
}

// Usage example
const monitor = new AutomatedHealthMonitoring({
  interval: 60, // Check every hour
  services: ['correlation-engine', 'search-api', 'analytics-engine'],
  alertThresholds: {
    errorRate: 5, // Alert if >5% error rate
    responseTime: 2000 // Alert if >2s average response time
  },
  notification: {
    webhook: 'https://hooks.slack.com/your-webhook',
    email: ['admin@company.com', 'devops@company.com']
  }
}, 'your-auth-token');

monitor.start();
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

## Related Documentation

- **[TROUBLESHOOTING_EXPORT_USER_GUIDE.md](TROUBLESHOOTING_EXPORT_USER_GUIDE.md)** - User-friendly guide for web interface usage
- **[TYPESCRIPT_ARCHITECTURE_GUIDE.md](TYPESCRIPT_ARCHITECTURE_GUIDE.md)** - Complete TypeScript architecture documentation
- **[PERFORMANCE_API_GUIDE.md](PERFORMANCE_API_GUIDE.md)** - Performance monitoring and analytics APIs
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment and configuration
- **[SECURITY_CONFIGURATION_GUIDE.md](SECURITY_CONFIGURATION_GUIDE.md)** - Security hardening and access control

**Last Updated:** December 8, 2025 - v2.1.1 TypeScript Enhancement Release

**Enterprise Support Bundle API v2.1.1 - Type-safe troubleshooting log export for SecureWatch SIEM** 🛠️