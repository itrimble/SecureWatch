# SecureWatch Log Formats Guide

This guide documents the enterprise log formats supported by SecureWatch's log ingestion pipeline.

## Table of Contents
1. [Overview](#overview)
2. [Supported Formats](#supported-formats)
3. [Configuration Examples](#configuration-examples)
4. [Field Mappings](#field-mappings)
5. [Advanced Features](#advanced-features)

## Overview

SecureWatch supports ingestion of various enterprise log formats through specialized adapters. Each adapter is optimized for its specific format and provides:

- Real-time and batch processing
- Automatic field extraction
- Flexible parsing configuration
- Error handling and recovery
- Performance metrics

## Supported Formats

### 1. Syslog (RFC3164 & RFC5424)

The syslog adapter supports both traditional (RFC3164) and modern (RFC5424) syslog formats with JSON payload parsing.

**Features:**
- UDP, TCP, and TLS transport protocols
- Structured data extraction
- JSON payload parsing after syslog header
- Facility and severity filtering

**Configuration:**
```javascript
{
  type: 'syslog',
  name: 'Enterprise Syslog',
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
      flushInterval: 5000
    }
  }
}
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

**Configuration:**
```javascript
{
  type: 'csv',
  name: 'Application Logs CSV',
  collection: {
    method: 'file',
    config: {
      watchDirectory: '/var/log/app_exports',
      delimiter: ',',
      quoteChar: '"',
      hasHeaders: true,
      timestampField: 'timestamp',
      timestampFormat: 'YYYY-MM-DD HH:mm:ss',
      fileExtensions: ['.csv', '.tsv'],
      maxFileSize: 104857600, // 100MB
      batchSize: 1000,
      flushInterval: 5000
    }
  }
}
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

All adapters support field normalization and mapping to ensure consistent data structure:

```javascript
{
  parsing: {
    format: 'csv',
    fieldMappings: [
      {
        source: 'timestamp',
        destination: '@timestamp',
        transformation: 'parseDate'
      },
      {
        source: 'user',
        destination: 'user.name',
        required: true
      },
      {
        source: 'ip_address',
        destination: 'source.ip',
        transformation: 'normalizeIP'
      }
    ]
  }
}
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

## Best Practices

1. **Timestamp Configuration**: Always configure timestamp parsing for accurate event ordering
2. **Field Normalization**: Use field mappings to normalize data across different sources
3. **Buffer Sizing**: Adjust buffer sizes based on your throughput requirements
4. **File Watching**: Use directory watching for automatic processing of new files
5. **Error Monitoring**: Set up alerts for parse errors and processing failures

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

## HTTP Event Collector (HEC) Integration

### Splunk-Compatible REST API

SecureWatch now includes a comprehensive HTTP Event Collector service for modern REST API-based log ingestion:

**Service Configuration:**
```javascript
{
  "endpoint": "http://localhost:8888/services/collector/event",
  "token": "generated-secure-token",
  "compression": true,
  "batch_size": 1000
}
```

**Endpoints:**
- **Single Event**: `POST /services/collector/event` - Submit individual events
- **Batch Events**: `POST /services/collector/events` - Submit multiple events efficiently  
- **Raw Text**: `POST /services/collector/raw` - Submit plain text logs
- **Health Check**: `GET /services/collector/health` - Service status

**Authentication:**
```bash
curl -X POST "http://localhost:8888/services/collector/event" \
  -H "Authorization: Bearer your-hec-token" \
  -H "Content-Type: application/json" \
  -d '{
    "time": 1640995200,
    "host": "web01",
    "source": "nginx",
    "sourcetype": "access_log",
    "event": {
      "method": "GET",
      "url": "/api/users",
      "status": 200,
      "response_time": 45
    }
  }'
```

**Features:**
- **Token-based Authentication**: Secure API access with configurable rate limits
- **Batch Processing**: High-throughput event submission with up to 1000 events per batch
- **Format Flexibility**: JSON events, raw text, or mixed payload support
- **Enterprise Security**: Rate limiting, CORS, request validation, and audit logging
- **Kafka Integration**: Direct streaming to SecureWatch's event processing pipeline
- **Administrative API**: Token management, usage statistics, and health monitoring

## Future Enhancements

- CEF (Common Event Format) support
- LEEF (Log Event Extended Format) support
- Binary log format support
- Custom parser plugin system
- Machine learning-based field detection
- HEC Acknowledgments for guaranteed delivery
- Custom index management and data routing