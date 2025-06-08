# SecureWatch Log Formats Guide v2.1.1

> **📋 Documentation Navigation:** [Main README](README.md) | [Data Ingestion](DATA_INGESTION_GUIDE.md) | [Field Mappings](windows-event-field-mappings.md) | [EVTX Parser](EVTX_PARSER_ENHANCED.md) | [Architecture](MONOREPO_SETUP.md) | [Deployment](DEPLOYMENT_GUIDE.md) | [Performance](PERFORMANCE_OPTIMIZATION_GUIDE.md)

This guide documents the enterprise log formats supported by SecureWatch's TypeScript-enhanced log ingestion pipeline in v2.1.1, featuring improved type safety, validation, and parsing capabilities.

## Table of Contents
1. [Overview](#overview)
2. [TypeScript Parser Architecture](#typescript-parser-architecture)
3. [Supported Formats](#supported-formats)
4. [Configuration Examples](#configuration-examples)
5. [Field Mappings](#field-mappings)
6. [Advanced Features](#advanced-features)
7. [Type Safety & Validation](#type-safety--validation)
8. [Service Integration](#service-integration)

## Overview

SecureWatch v2.1.1 supports ingestion of various enterprise log formats through TypeScript-enhanced specialized adapters. The consolidated 8-service architecture provides enterprise-grade log processing with improved type safety and performance:

- **TypeScript-First Design**: Strong typing throughout the parsing pipeline
- **Real-time and batch processing** with async/await patterns
- **Automatic field extraction** with type validation
- **Flexible parsing configuration** using JSON Schema validation
- **Enhanced error handling** with typed error responses
- **Performance metrics** and telemetry integration
- **Service Integration**: Direct integration with analytics-engine, search-api, and correlation-engine

## TypeScript Parser Architecture

### Core Parser Interfaces

SecureWatch v2.1.1 introduces strongly-typed parser interfaces for enhanced reliability:

```typescript
// Base parser interface with generics for type safety
interface LogParser<T extends LogEvent = LogEvent> {
  readonly name: string;
  readonly version: string;
  readonly supportedFormats: LogFormat[];
  
  parse(input: string | Buffer, context?: ParseContext): Promise<T[]>;
  validate(event: T): ValidationResult;
  getSchema(): JsonSchema;
}

// Enhanced log event structure with type safety
interface LogEvent {
  '@timestamp': Date;
  event: {
    dataset: string;
    module: string;
    original: string;
    severity?: number;
  };
  source: {
    ip?: string;
    port?: number;
    domain?: string;
  };
  user?: {
    name?: string;
    id?: string;
    domain?: string;
  };
  [key: string]: unknown;
}

// Parser configuration with validation
interface ParserConfig {
  readonly type: LogFormat;
  readonly name: string;
  readonly enabled: boolean;
  readonly collection: CollectionConfig;
  readonly parsing: ParsingConfig;
  readonly output: OutputConfig;
}
```

### Type-Safe Field Mappings

```typescript
interface FieldMapping {
  readonly source: string;
  readonly destination: string;
  readonly transformation?: TransformationType;
  readonly required?: boolean;
  readonly defaultValue?: unknown;
  readonly validation?: FieldValidator;
}

// Enhanced transformation with type checking
type TransformationType = 
  | 'parseDate'
  | 'normalizeIP' 
  | 'extractDomain'
  | 'parseJSON'
  | 'toLowerCase'
  | 'parseNumber'
  | 'extractUserAgent';

interface FieldValidator {
  readonly type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email';
  readonly pattern?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly required?: boolean;
}
```

### Parser Registry with Type Safety

```typescript
class ParserRegistry {
  private readonly parsers = new Map<LogFormat, LogParser>();
  
  register<T extends LogParser>(parser: T): void {
    if (!this.validateParser(parser)) {
      throw new InvalidParserError(`Parser ${parser.name} failed validation`);
    }
    this.parsers.set(parser.supportedFormats[0], parser);
  }
  
  getParser<T extends LogEvent = LogEvent>(format: LogFormat): LogParser<T> | null {
    return this.parsers.get(format) as LogParser<T> | null;
  }
  
  async parseEvent<T extends LogEvent = LogEvent>(
    format: LogFormat, 
    input: string, 
    context?: ParseContext
  ): Promise<T[]> {
    const parser = this.getParser<T>(format);
    if (!parser) {
      throw new UnsupportedFormatError(`No parser found for format: ${format}`);
    }
    return parser.parse(input, context);
  }
}
```

## Supported Formats

### 1. Syslog (RFC3164 & RFC5424)

The syslog adapter supports both traditional (RFC3164) and modern (RFC5424) syslog formats with JSON payload parsing.

**Features:**
- UDP, TCP, and TLS transport protocols
- Structured data extraction
- JSON payload parsing after syslog header
- Facility and severity filtering

**TypeScript Configuration:**
```typescript
interface SyslogConfig extends ParserConfig {
  type: 'syslog';
  collection: {
    method: 'stream';
    config: {
      udpPort: number;
      tcpPort: number;
      tlsPort: number;
      rfc: 'RFC3164' | 'RFC5424';
      enableJsonPayloadParsing: boolean;
      jsonPayloadDelimiter: string;
      maxMessageSize: number;
      batchSize: number;
      flushInterval: number;
      enableTLS?: boolean;
      tlsCertPath?: string;
    };
  };
  parsing: {
    format: 'syslog';
    fieldMappings: FieldMapping[];
    validation: {
      strictMode: boolean;
      requiredFields: string[];
    };
  };
}

// Example configuration with type safety
const syslogConfig: SyslogConfig = {
  type: 'syslog',
  name: 'Enterprise Syslog',
  enabled: true,
  collection: {
    method: 'stream',
    config: {
      udpPort: 514,
      tcpPort: 601,
      tlsPort: 6514,
      rfc: 'RFC5424',
      enableJsonPayloadParsing: true,
      jsonPayloadDelimiter: ' JSON:',
      maxMessageSize: 65536,
      batchSize: 100,
      flushInterval: 5000,
      enableTLS: true
    }
  },
  parsing: {
    format: 'syslog',
    fieldMappings: [
      {
        source: 'timestamp',
        destination: '@timestamp',
        transformation: 'parseDate',
        required: true,
        validation: { type: 'date', required: true }
      }
    ],
    validation: {
      strictMode: true,
      requiredFields: ['@timestamp', 'message', 'host']
    }
  },
  output: {
    destinations: ['analytics-engine', 'search-api'],
    format: 'json'
  }
};
```

**Example Message with JSON Payload:**
```
<134>1 2024-01-15T10:30:45.123Z server01 myapp 1234 - - User login attempt JSON:{"user":"john.doe","ip":"192.168.1.100","status":"success","mfa":true}
```

### 2. CSV (Comma-Separated Values)

The CSV adapter handles various delimited text formats including CSV, TSV, and custom delimiters.

**Features:**
- Configurable delimiters and quote characters
- Header row support
- Custom timestamp parsing
- Directory watching for automatic processing
- Large file support with streaming

**TypeScript Configuration:**
```typescript
interface CSVConfig extends ParserConfig {
  type: 'csv';
  collection: {
    method: 'file';
    config: {
      watchDirectory: string;
      delimiter: ',' | '\t' | '|' | ';';
      quoteChar: '"' | "'";
      hasHeaders: boolean;
      timestampField: string;
      timestampFormat: string;
      fileExtensions: readonly string[];
      maxFileSize: number;
      batchSize: number;
      flushInterval: number;
      encoding?: BufferEncoding;
      skipEmptyLines?: boolean;
    };
  };
}

// Type-safe CSV configuration
const csvConfig: CSVConfig = {
  type: 'csv',
  name: 'Application Logs CSV',
  enabled: true,
  collection: {
    method: 'file',
    config: {
      watchDirectory: '/var/log/app_exports',
      delimiter: ',',
      quoteChar: '"',
      hasHeaders: true,
      timestampField: 'timestamp',
      timestampFormat: 'YYYY-MM-DD HH:mm:ss',
      fileExtensions: ['.csv', '.tsv'] as const,
      maxFileSize: 104_857_600, // 100MB
      batchSize: 1000,
      flushInterval: 5000,
      encoding: 'utf8',
      skipEmptyLines: true
    }
  },
  parsing: {
    format: 'csv',
    fieldMappings: [
      {
        source: 'timestamp',
        destination: '@timestamp',
        transformation: 'parseDate',
        required: true,
        validation: { type: 'date', required: true }
      },
      {
        source: 'user',
        destination: 'user.name',
        required: true,
        validation: { type: 'string', minLength: 1, maxLength: 255 }
      },
      {
        source: 'ip_address',
        destination: 'source.ip',
        transformation: 'normalizeIP',
        validation: { type: 'ip', required: false }
      }
    ],
    validation: {
      strictMode: false,
      requiredFields: ['@timestamp', 'user.name']
    }
  },
  output: {
    destinations: ['analytics-engine'],
    format: 'json'
  }
};
```

**Example CSV:**
```csv
timestamp,user,action,ip_address,status
2024-01-15 10:30:45,john.doe,login,192.168.1.100,success
2024-01-15 10:31:02,jane.smith,file_access,192.168.1.101,denied
```

### 3. XML (Extensible Markup Language)

The XML adapter processes structured XML log files with flexible record extraction.

**Features:**
- Configurable record path extraction
- Attribute and element parsing
- Nested structure flattening
- Namespace support
- Custom timestamp extraction

**Configuration:**
```javascript
{
  type: 'xml',
  name: 'Security Event Logs',
  collection: {
    method: 'file',
    config: {
      watchDirectory: '/var/log/security_exports',
      recordPath: 'Events/Event',
      timestampField: 'TimeCreated.SystemTime',
      includeAttributes: true,
      mergeAttributes: false,
      fileExtensions: ['.xml'],
      maxFileSize: 104857600, // 100MB
      batchSize: 500,
      flushInterval: 5000
    }
  }
}
```

**Example XML:**
```xml
<Events>
  <Event>
    <System>
      <EventID>4624</EventID>
      <TimeCreated SystemTime="2024-01-15T10:30:45.123Z"/>
      <Computer>WORKSTATION01</Computer>
    </System>
    <EventData>
      <Data Name="SubjectUserName">john.doe</Data>
      <Data Name="IpAddress">192.168.1.100</Data>
      <Data Name="LogonType">3</Data>
    </EventData>
  </Event>
</Events>
```

### 4. JSON (JavaScript Object Notation)

JSON logs can be processed using the CSV adapter with appropriate configuration or through custom parsing.

**Features:**
- Single-line JSON (JSONL/NDJSON)
- Array of JSON objects
- Nested structure support
- Flexible field extraction

**Configuration:**
```javascript
{
  type: 'json',
  name: 'Application JSON Logs',
  collection: {
    method: 'file',
    config: {
      watchDirectory: '/var/log/json_logs',
      fileExtensions: ['.json', '.jsonl'],
      batchSize: 1000,
      flushInterval: 5000
    }
  }
}
```

### 5. Key-Value Pairs

Key-value logs are parsed using the field extractor integrated into multiple adapters.

**Features:**
- Configurable delimiters
- Quoted value support
- Mixed format handling (e.g., syslog with KV pairs)

**Example:**
```
timestamp="2024-01-15T10:30:45Z" user="john.doe" action="login" status="success" ip="192.168.1.100"
```

## Field Mappings

All adapters support field normalization and mapping with TypeScript type safety:

```typescript
// Enhanced field mapping with validation
interface EnhancedFieldMapping extends FieldMapping {
  readonly source: string;
  readonly destination: string;
  readonly transformation?: TransformationType;
  readonly required?: boolean;
  readonly defaultValue?: unknown;
  readonly validation?: FieldValidator;
  readonly conditionalMapping?: ConditionalMapping;
}

interface ConditionalMapping {
  readonly condition: (value: unknown, event: LogEvent) => boolean;
  readonly trueMapping: string;
  readonly falseMapping?: string;
}

// JSON Schema validation for field mappings
const fieldMappingSchema: JsonSchema = {
  type: 'object',
  properties: {
    source: { type: 'string', minLength: 1 },
    destination: { type: 'string', minLength: 1 },
    transformation: {
      type: 'string',
      enum: ['parseDate', 'normalizeIP', 'extractDomain', 'parseJSON', 'toLowerCase', 'parseNumber']
    },
    required: { type: 'boolean', default: false },
    validation: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'ip', 'email'] },
        pattern: { type: 'string' },
        minLength: { type: 'number', minimum: 0 },
        maxLength: { type: 'number', minimum: 1 }
      }
    }
  },
  required: ['source', 'destination']
};

// Example with enhanced mapping
const enhancedMappings: EnhancedFieldMapping[] = [
  {
    source: 'timestamp',
    destination: '@timestamp',
    transformation: 'parseDate',
    required: true,
    validation: { 
      type: 'date', 
      required: true 
    }
  },
  {
    source: 'user',
    destination: 'user.name',
    required: true,
    validation: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 255,
      pattern: /^[a-zA-Z0-9._-]+$/
    }
  },
  {
    source: 'ip_address',
    destination: 'source.ip',
    transformation: 'normalizeIP',
    validation: { 
      type: 'ip', 
      required: false 
    },
    conditionalMapping: {
      condition: (value) => typeof value === 'string' && value.includes('.'),
      trueMapping: 'source.ip',
      falseMapping: 'source.domain'
    }
  }
];
```

## Advanced Features

### 1. Combined Formats

SecureWatch can handle logs that combine multiple formats:

**Syslog + JSON:**
```
<134>1 2024-01-15T10:30:45.123Z server01 app - - - {"event":"login","user":"john"}
```

**Syslog + Key-Value:**
```
<134>Jan 15 10:30:45 server01 app: event=login user=john status=success
```

### 2. Performance Optimization

Each adapter includes:
- **Buffering**: In-memory buffering with configurable size
- **Batching**: Process events in batches for better throughput
- **Streaming**: Handle large files without loading into memory
- **Parallel Processing**: Multiple files can be processed concurrently

### 3. Error Handling

- **Parse Errors**: Logged with context, original message preserved
- **File Errors**: Automatic retry with exponential backoff
- **Buffer Overflow**: Graceful degradation with metrics
- **Recovery**: Resume processing from last known position

### 4. Monitoring and Metrics

Each adapter exposes metrics:
- Messages/records processed
- Parse errors
- Processing latency
- Buffer utilization
- File processing status

## Usage Examples

### Processing a CSV File Programmatically

```javascript
const csvSource = new CSVSource(config);
await csvSource.start();

const result = await csvSource.processFile('/path/to/logfile.csv', {
  delimiter: '|',
  timestampField: 'date',
  timestampFormat: 'MM/DD/YYYY HH:mm:ss'
});

console.log(`Processed ${result.rowsProcessed} rows`);
```

### Processing XML with Custom Record Path

```javascript
const xmlSource = new XMLSource(config);
await xmlSource.start();

const result = await xmlSource.processFile('/path/to/events.xml', {
  recordPath: 'LogData/Events/SecurityEvent',
  timestampField: 'EventTime',
  includeAttributes: true
});
```

### Enabling JSON Payload in Syslog

```javascript
const syslogConfig = {
  enableJsonPayloadParsing: true,
  jsonPayloadDelimiter: ' JSON:', // or '|||' or any custom delimiter
  // ... other config
};
```

## Type Safety & Validation

### Runtime Validation with JSON Schema

SecureWatch v2.1.1 implements comprehensive runtime validation using JSON Schema:

```typescript
import { Validator } from 'jsonschema';

class LogEventValidator {
  private readonly validator = new Validator();
  private readonly eventSchema: JsonSchema = {
    type: 'object',
    properties: {
      '@timestamp': { type: 'string', format: 'date-time' },
      event: {
        type: 'object',
        properties: {
          dataset: { type: 'string', minLength: 1 },
          module: { type: 'string', minLength: 1 },
          original: { type: 'string' },
          severity: { type: 'number', minimum: 0, maximum: 7 }
        },
        required: ['dataset', 'module', 'original']
      },
      source: {
        type: 'object',
        properties: {
          ip: { type: 'string', format: 'ipv4' },
          port: { type: 'number', minimum: 1, maximum: 65535 },
          domain: { type: 'string', pattern: '^[a-zA-Z0-9.-]+$' }
        }
      },
      user: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          id: { type: 'string' },
          domain: { type: 'string' }
        }
      }
    },
    required: ['@timestamp', 'event']
  };

  validate(event: LogEvent): ValidationResult {
    const result = this.validator.validate(event, this.eventSchema);
    return {
      valid: result.valid,
      errors: result.errors.map(err => ({
        field: err.property,
        message: err.message,
        value: err.instance
      }))
    };
  }
}
```

### Error Handling with TypeScript

```typescript
// Typed error classes for better error handling
abstract class ParseError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
}

class ValidationError extends ParseError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    message: string
  ) {
    super(`Validation failed for field '${field}': ${message}`);
  }
}

class TransformationError extends ParseError {
  readonly code = 'TRANSFORMATION_ERROR';
  readonly retryable = false;
  
  constructor(
    public readonly transformation: TransformationType,
    public readonly input: unknown,
    message: string
  ) {
    super(`Transformation '${transformation}' failed: ${message}`);
  }
}

// Error handling in parsers
async function parseWithValidation<T extends LogEvent>(
  parser: LogParser<T>,
  input: string,
  context?: ParseContext
): Promise<ParseResult<T>> {
  try {
    const events = await parser.parse(input, context);
    const validatedEvents: T[] = [];
    const errors: ParseError[] = [];

    for (const event of events) {
      const validation = parser.validate(event);
      if (validation.valid) {
        validatedEvents.push(event);
      } else {
        errors.push(new ValidationError(
          validation.errors[0]?.field || 'unknown',
          validation.errors[0]?.value,
          validation.errors[0]?.message || 'Validation failed'
        ));
      }
    }

    return {
      success: true,
      events: validatedEvents,
      errors,
      metrics: {
        totalEvents: events.length,
        validEvents: validatedEvents.length,
        errorCount: errors.length
      }
    };
  } catch (error) {
    return {
      success: false,
      events: [],
      errors: [error as ParseError],
      metrics: { totalEvents: 0, validEvents: 0, errorCount: 1 }
    };
  }
}
```

## Service Integration

### Analytics Engine Integration (Port 4009)

The consolidated analytics-engine provides specialized endpoints for log format analytics:

```typescript
// Analytics API client with type safety
class AnalyticsEngineClient {
  constructor(private readonly baseUrl = 'http://localhost:4009') {}

  async submitParsedEvents<T extends LogEvent>(
    events: T[],
    source: string
  ): Promise<AnalyticsSubmissionResult> {
    const response = await fetch(`${this.baseUrl}/api/events/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        events: events.map(event => ({
          ...event,
          '@timestamp': event['@timestamp'].toISOString()
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Analytics submission failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getParsingMetrics(timeRange: TimeRange): Promise<ParsingMetrics> {
    const params = new URLSearchParams({
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    });

    const response = await fetch(`${this.baseUrl}/api/metrics/parsing?${params}`);
    return response.json();
  }
}
```

### Search API Integration (Port 4004)

Direct integration with the search-api for indexed log events:

```typescript
// Search API integration for parsed events
class SearchApiClient {
  constructor(private readonly baseUrl = 'http://localhost:4004') {}

  async indexEvents<T extends LogEvent>(
    events: T[],
    indexName: string
  ): Promise<IndexResult> {
    const response = await fetch(`${this.baseUrl}/api/index/${indexName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });

    return response.json();
  }

  async searchParsedEvents(
    query: SearchQuery,
    filters?: LogEventFilters
  ): Promise<SearchResult<LogEvent>> {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters })
    });

    return response.json();
  }
}
```

### Correlation Engine Integration (Port 4005)

Real-time correlation of parsed log events:

```typescript
// Correlation engine client for log events
class CorrelationEngineClient {
  constructor(private readonly baseUrl = 'http://localhost:4005') {}

  async submitForCorrelation<T extends LogEvent>(
    events: T[]
  ): Promise<CorrelationResult> {
    const response = await fetch(`${this.baseUrl}/api/correlate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    });

    return response.json();
  }

  async getCorrelationRules(): Promise<CorrelationRule[]> {
    const response = await fetch(`${this.baseUrl}/api/rules`);
    return response.json();
  }
}
```

### Service Health Monitoring

Monitor all 8 core services from the log ingestion pipeline:

```typescript
interface ServiceStatus {
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
}

class ServiceMonitor {
  private readonly services: Array<{ name: string; port: number; healthPath: string }> = [
    { name: 'log-ingestion', port: 4002, healthPath: '/health' },
    { name: 'search-api', port: 4004, healthPath: '/health' },
    { name: 'correlation-engine', port: 4005, healthPath: '/health' },
    { name: 'auth-service', port: 4006, healthPath: '/health' },
    { name: 'query-processor', port: 4008, healthPath: '/health' },
    { name: 'analytics-engine', port: 4009, healthPath: '/health' },
    { name: 'mcp-marketplace', port: 4010, healthPath: '/health' },
    { name: 'hec-service', port: 8888, healthPath: '/services/collector/health' }
  ];

  async checkAllServices(): Promise<ServiceStatus[]> {
    const results = await Promise.allSettled(
      this.services.map(service => this.checkService(service))
    );

    return results.map((result, index) => {
      const service = this.services[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: service.name,
          port: service.port,
          status: 'unhealthy' as const,
          lastCheck: new Date()
        };
      }
    });
  }

  private async checkService(service: { name: string; port: number; healthPath: string }): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`http://localhost:${service.port}${service.healthPath}`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return {
        name: service.name,
        port: service.port,
        status: response.ok ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        name: service.name,
        port: service.port,
        status: 'unhealthy',
        lastCheck: new Date()
      };
    }
  }
}
```

## Best Practices

1. **TypeScript Configuration**: Always use strict mode and enable all type checking options
2. **Validation First**: Implement comprehensive validation before processing events
3. **Error Handling**: Use typed error classes for better error categorization and handling
4. **Service Integration**: Leverage the 8-service architecture for specialized processing
5. **Performance Monitoring**: Monitor parsing performance across all service endpoints
6. **Schema Evolution**: Version your schemas and support backward compatibility
7. **Testing**: Implement comprehensive unit tests with TypeScript type assertions

## Troubleshooting

### Common Issues

1. **Parse Errors**
   - Check delimiter configuration
   - Verify timestamp format
   - Ensure proper quote/escape character settings

2. **Performance Issues**
   - Increase batch size for better throughput
   - Adjust buffer size for memory usage
   - Enable streaming for large files

3. **Missing Data**
   - Verify field mappings
   - Check for parse errors in logs
   - Ensure file permissions are correct

### Debug Mode

Enable debug logging for detailed parsing information:

```javascript
process.env.LOG_LEVEL = 'debug';
```

## HTTP Event Collector (HEC) Integration v2.1.1

### TypeScript-Enhanced Splunk-Compatible REST API

SecureWatch v2.1.1 includes a comprehensive HTTP Event Collector service with TypeScript type safety:

**TypeScript Service Configuration:**
```typescript
interface HECConfig {
  readonly endpoint: string;
  readonly port: 8888;
  readonly authentication: {
    readonly tokens: HECToken[];
    readonly requireAuth: boolean;
    readonly rateLimiting: RateLimitConfig;
  };
  readonly processing: {
    readonly batchSize: number;
    readonly maxPayloadSize: number;
    readonly compression: boolean;
    readonly validation: boolean;
  };
  readonly integration: {
    readonly analytics: boolean;
    readonly correlation: boolean;
    readonly search: boolean;
  };
}

interface HECToken {
  readonly id: string;
  readonly token: string;
  readonly name: string;
  readonly permissions: readonly string[];
  readonly rateLimit: number;
  readonly expiresAt?: Date;
}

// HEC service configuration
const hecConfig: HECConfig = {
  endpoint: "http://localhost:8888",
  port: 8888,
  authentication: {
    tokens: [
      {
        id: "default",
        token: "generated-secure-token",
        name: "Default HEC Token",
        permissions: ["events:write", "health:read"],
        rateLimit: 1000
      }
    ],
    requireAuth: true,
    rateLimiting: {
      windowMs: 60000, // 1 minute
      maxRequests: 1000
    }
  },
  processing: {
    batchSize: 1000,
    maxPayloadSize: 10485760, // 10MB
    compression: true,
    validation: true
  },
  integration: {
    analytics: true,
    correlation: true,
    search: true
  }
};
```

**Enhanced REST API Endpoints:**
- **Single Event**: `POST /services/collector/event` - Submit individual typed events
- **Batch Events**: `POST /services/collector/events` - Submit multiple events with validation
- **Raw Text**: `POST /services/collector/raw` - Submit plain text with auto-parsing
- **Health Check**: `GET /services/collector/health` - Comprehensive service status
- **Admin API**: `GET /services/collector/admin/stats` - Usage statistics and metrics
- **Token Management**: `POST /services/collector/admin/tokens` - Token lifecycle management

**TypeScript Client Integration:**
```typescript
// Type-safe HEC client
class HECClient {
  constructor(
    private readonly endpoint: string,
    private readonly token: string
  ) {}

  async submitEvent<T extends LogEvent>(
    event: HECEvent<T>
  ): Promise<HECResponse> {
    const response = await fetch(`${this.endpoint}/services/collector/event`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new HECError(
        `Event submission failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  }

  async submitBatch<T extends LogEvent>(
    events: HECEvent<T>[]
  ): Promise<HECBatchResponse> {
    const response = await fetch(`${this.endpoint}/services/collector/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ events })
    });

    if (!response.ok) {
      throw new HECError(
        `Batch submission failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  }
}

// HEC event types
interface HECEvent<T extends LogEvent = LogEvent> {
  readonly time?: number;
  readonly host?: string;
  readonly source?: string;
  readonly sourcetype?: string;
  readonly index?: string;
  readonly event: T;
}

interface HECResponse {
  readonly success: boolean;
  readonly eventId?: string;
  readonly error?: string;
}

interface HECBatchResponse {
  readonly success: boolean;
  readonly results: HECResponse[];
  readonly summary: {
    readonly total: number;
    readonly successful: number;
    readonly failed: number;
  };
}
```

**Service Integration with 8-Core Architecture:**
```typescript
// HEC service integrates with all core services
class HECService {
  constructor(
    private readonly analyticsClient: AnalyticsEngineClient,
    private readonly searchClient: SearchApiClient,
    private readonly correlationClient: CorrelationEngineClient
  ) {}

  async processHECEvent<T extends LogEvent>(
    hecEvent: HECEvent<T>
  ): Promise<ProcessingResult> {
    // 1. Validate and transform HEC event to LogEvent
    const logEvent = this.transformHECEvent(hecEvent);
    
    // 2. Submit to analytics-engine (Port 4009)
    const analyticsResult = await this.analyticsClient.submitParsedEvents(
      [logEvent], 
      hecEvent.source || 'hec'
    );
    
    // 3. Index in search-api (Port 4004)
    const indexResult = await this.searchClient.indexEvents(
      [logEvent],
      hecEvent.index || 'securewatch-events'
    );
    
    // 4. Submit for correlation (Port 4005)
    const correlationResult = await this.correlationClient.submitForCorrelation([logEvent]);
    
    return {
      success: true,
      services: {
        analytics: analyticsResult,
        search: indexResult,
        correlation: correlationResult
      }
    };
  }
}
```

**Advanced Features v2.1.1:**
- **TypeScript Validation**: Full type checking for all HEC payloads
- **Multi-Service Integration**: Automatic distribution to analytics, search, and correlation engines
- **Enhanced Security**: JWT-based authentication with role-based access control
- **Performance Metrics**: Real-time throughput and latency monitoring
- **Auto-Scaling**: Dynamic batch size adjustment based on system load
- **Schema Registry**: Centralized event schema management and validation

## Future Enhancements v2.1.1+

### Planned TypeScript Enhancements
- **CEF (Common Event Format)**: TypeScript parser with full schema validation
- **LEEF (Log Event Extended Format)**: Enhanced IBM QRadar integration with type safety
- **Binary Log Formats**: Protocol Buffers and Apache Avro support with TypeScript bindings
- **Plugin System**: TypeScript-based custom parser plugin architecture
- **ML Field Detection**: Machine learning-powered field extraction with confidence scoring
- **Schema Evolution**: Automatic schema versioning and backward compatibility
- **Real-time Validation**: Stream-based validation with circuit breaker patterns

### Enterprise Features Roadmap
- **Advanced HEC Features**: 
  - Acknowledgments for guaranteed delivery
  - Custom index routing with TypeScript rules
  - Multi-tenant event isolation
  - Advanced authentication (SAML, LDAP integration)
- **Performance Optimizations**:
  - WebAssembly parsers for high-throughput scenarios
  - GPU-accelerated field extraction
  - Distributed parsing across multiple nodes
- **Enhanced Monitoring**:
  - Real-time parser performance dashboards
  - Predictive parsing error detection
  - Automated parser tuning recommendations

### Integration Expansions
- **Cloud Provider Integration**: Native AWS CloudTrail, Azure Activity Logs, GCP Audit Logs parsers
- **Security Platform Integration**: Native CrowdStrike, SentinelOne, Carbon Black parsers
- **Network Security Integration**: Enhanced Palo Alto, Check Point, Fortinet log parsing
- **SOAR Integration**: TypeScript-based playbook triggers from parsed events

### Developer Experience Improvements
- **Parser Development Kit**: Complete TypeScript SDK for custom parser development
- **Testing Framework**: Comprehensive parser testing utilities with mock data generation
- **Documentation Generation**: Automatic API documentation from TypeScript interfaces
- **Performance Profiling**: Built-in parser performance analysis and optimization tools

---

> **📚 Related Documentation:** 
> - [Architecture Overview](MONOREPO_SETUP.md) - Complete system architecture
> - [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment instructions  
> - [Performance Guide](PERFORMANCE_OPTIMIZATION_GUIDE.md) - Optimization strategies
> - [EVTX Parser](EVTX_PARSER_ENHANCED.md) - Windows Event Log parsing
> - [Field Mappings](windows-event-field-mappings.md) - Windows event field reference

**Last Updated:** June 8, 2025 - v2.1.1 TypeScript Enhancement Release