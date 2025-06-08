# SecureWatch Lookup Tables User Guide v2.1.0

> **📋 Documentation Navigation:** [Main README](README.md) | [Quick Start](QUICK_START.md) | [Data Ingestion](DATA_INGESTION_GUIDE.md) | [KQL Guide](KQL_API_GUIDE.md)

## Overview

The SecureWatch SIEM Lookup Tables system provides enterprise-grade data enrichment capabilities similar to Splunk's lookup functionality, with modern enhancements for cybersecurity use cases. This guide covers everything from basic CSV uploads to advanced API integrations and search-time enrichment.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Uploading CSV Lookup Tables](#uploading-csv-lookup-tables)
3. [Managing Lookup Tables](#managing-lookup-tables)
4. [Search-Time Enrichment](#search-time-enrichment)
5. [External API Integration](#external-api-integration)
6. [Enrichment Rules](#enrichment-rules)
7. [Performance & Analytics](#performance--analytics)
8. [Sample Data & Use Cases](#sample-data--use-cases)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing Lookup Tables

Navigate to **Settings** → **Knowledge Objects** → **Lookups** in the SecureWatch interface:

```
http://localhost:4000/settings/knowledge/lookups
```

### Key Concepts

- **Lookup Table**: A CSV file uploaded as a searchable database table
- **Key Field**: The primary field used for lookups (e.g., IP address, username)
- **Enrichment**: Automatic addition of fields to search results
- **External Lookup**: API-based enrichment from external services

---

## Uploading CSV Lookup Tables

### Step-by-Step Upload Process

1. **Prepare Your CSV File**
   - Ensure first row contains column headers
   - Use consistent data formatting
   - Maximum file size: 50MB
   - Supported delimiters: comma, semicolon, tab, pipe

2. **Upload Interface**
   - Click **"Upload CSV"** button
   - Select your CSV file
   - Configure upload options

3. **Configuration Options**
   ```
   Key Field: The primary lookup field (required)
   Description: Optional description for the table
   Tags: Comma-separated tags for organization
   Delimiter: Character separating CSV values
   Has Header: Whether first row contains headers
   ```

### Example CSV Structure

```csv
ip_address,country,city,threat_level,last_seen
192.168.1.1,United States,New York,Low,2025-01-05
203.0.113.1,Unknown,Unknown,Critical,2025-01-04
8.8.8.8,United States,Mountain View,Safe,2025-01-05
```

### Automatic Field Detection

The system automatically detects field types:

| Type | Detection Pattern | Example |
|------|-------------------|---------|
| **IP Address** | IPv4/IPv6 format | `192.168.1.1`, `2001:db8::1` |
| **Email** | Contains @ symbol | `user@domain.com` |
| **URL** | HTTP/HTTPS format | `https://example.com` |
| **Date** | ISO format | `2025-01-05T10:30:00Z` |
| **Number** | Numeric values | `123`, `45.67` |
| **Boolean** | True/false values | `true`, `false`, `1`, `0` |
| **String** | Default fallback | Any text |

---

## Managing Lookup Tables

### Table Overview

The main interface displays:

- **Table Statistics**: Record count, file size, last used
- **Status Indicators**: Active/inactive status
- **Performance Metrics**: Query count, cache hit rate
- **Actions**: View, cache clear, delete

### Table Operations

#### Viewing Table Details
```
Click the eye icon to view:
- Field definitions and sample values
- Usage statistics
- Recent query performance
```

#### Cache Management
```
Click the refresh icon to clear cached lookups
Useful after updating external data sources
Cache clears automatically after 5 minutes
```

#### Testing Lookups
Use the **Test Lookup** tab to validate your data:

```
1. Select a lookup table
2. Enter a key value to search for
3. Specify return fields (optional)
4. View the lookup result
```

---

## Search-Time Enrichment

### Automatic Enrichment

Enrichment happens automatically during KQL searches when enabled:

```javascript
// Search with enrichment enabled
const response = await fetch('/api/v1/search/execute', {
  method: 'POST',
  body: JSON.stringify({
    query: 'Events | where src_ip contains "192.168"',
    enrichment: {
      enabled: true,
      externalLookups: true
    }
  })
});
```

### Enrichment Results

Enriched search results include:
- **Additional Fields**: New columns from lookup tables
- **Enrichment Metadata**: Statistics about applied rules
- **Performance Info**: Lookup count and processing time

Example enriched result:
```json
{
  "columns": [
    {"name": "timestamp", "type": "datetime"},
    {"name": "src_ip", "type": "ip"},
    {"name": "geo_country", "type": "string", "enriched": true},
    {"name": "threat_level", "type": "string", "enriched": true}
  ],
  "enrichment": {
    "applied": true,
    "statistics": {
      "appliedRules": ["ip-geolocation", "threat-intel"],
      "totalLookups": 45,
      "processingTime": 234
    }
  }
}
```

---

## External API Integration

### Pre-configured APIs

SecureWatch includes built-in support for:

#### 1. VirusTotal IP Lookup
```
Purpose: IP reputation and threat intelligence
Fields: reputation, country, as_owner
Rate Limit: 500 requests/day (free tier)
```

#### 2. AbuseIPDB
```
Purpose: IP abuse confidence and geolocation
Fields: abuse_confidence, country_code, usage_type
Rate Limit: 1000 requests/day (free tier)
```

#### 3. IPStack Geolocation
```
Purpose: IP geolocation and ISP information
Fields: country, region, city, latitude, longitude
Rate Limit: 10,000 requests/month (free tier)
```

### Custom API Configuration

Create custom API lookups via the management interface:

```json
{
  "name": "Custom Threat Feed",
  "baseUrl": "https://api.threatfeed.com/lookup",
  "apiKey": "your-api-key",
  "queryParams": {
    "ip": "{value}",
    "format": "json"
  },
  "fieldMapping": {
    "input": "ip",
    "output": {
      "threat_score": "score",
      "classification": "type",
      "confidence": "confidence"
    }
  },
  "rateLimit": {
    "requests": 100,
    "window": 3600
  },
  "cacheTTL": 3600
}
```

---

## Enrichment Rules

### Rule Configuration

Enrichment rules define how data is automatically added to search results:

```json
{
  "name": "IP Geolocation Enrichment",
  "sourceField": "src_ip",
  "lookupTable": "ip_geolocation",
  "lookupKeyField": "ip_address",
  "outputFields": [
    {
      "sourceField": "country",
      "outputField": "geo_country",
      "defaultValue": "Unknown"
    },
    {
      "sourceField": "city", 
      "outputField": "geo_city",
      "transform": "capitalize"
    }
  ],
  "conditions": [
    {
      "field": "event_type",
      "operator": "contains",
      "value": "network"
    }
  ],
  "priority": 100,
  "isActive": true
}
```

### Rule Components

#### Source Field
The field in your data to use for lookups (e.g., `src_ip`, `username`)

#### Output Fields
Define how lookup results map to enriched fields:
- **sourceField**: Field from lookup table
- **outputField**: New field name in results
- **defaultValue**: Value when lookup fails
- **transform**: Data transformation (uppercase, lowercase, trim, capitalize)

#### Conditions
Optional conditions to apply rules only when criteria are met:
- **equals**: Exact match
- **contains**: Substring match
- **startsWith**: Prefix match
- **endsWith**: Suffix match
- **regex**: Regular expression match

#### Priority
Lower numbers = higher priority (rules applied in order)

---

## Performance & Analytics

### Statistics Dashboard

Monitor lookup performance via the **Statistics** tab:

#### Usage Metrics
- **Total Queries (24h)**: Number of lookups performed
- **Cache Hit Rate**: Percentage of queries served from cache
- **Average Response Time**: Mean query execution time
- **Error Rate**: Percentage of failed lookups

#### Top Tables
View most frequently used lookup tables:
- Query count per table
- Last usage timestamp
- Performance trends

### Optimization Tips

#### Indexing
- Key fields are automatically indexed
- Additional indexes created on common lookup fields
- Up to 3 secondary indexes per table

#### Caching Strategy
```
Cache Duration: 5 minutes (configurable)
Cache Storage: Redis
Cache Keys: lookup:{table}:{key}:{value}
Eviction: LRU with TTL
```

#### Batch Processing
- Large CSV files processed in 1000-record batches
- Progress tracking during upload
- Automatic error recovery

---

## Sample Data & Use Cases

### Pre-loaded Lookup Tables

SecureWatch includes sample data for common use cases:

#### 1. IP Geolocation (`ip_geolocation`)
```csv
ip_address,country,city,latitude,longitude
8.8.8.8,United States,Mountain View,37.3860517,-122.0838511
1.1.1.1,Australia,Sydney,-33.8688197,151.2092955
```

**Use Case**: Enrich network events with geographic context

#### 2. User Directory (`user_directory`)
```csv
username,department,title,risk_score,manager
john.doe,IT Security,Security Analyst,25,jane.smith
jane.smith,IT Security,CISO,15,ceo
```

**Use Case**: Add organizational context to authentication events

#### 3. Asset Inventory (`asset_inventory`)
```csv
hostname,criticality,owner,environment,cost_center
web-server-01,High,alice.johnson,Production,IT-001
db-server-01,Critical,mike.brown,Production,IT-001
```

**Use Case**: Enhance host-based events with asset information

#### 4. Threat Intelligence (`threat_intel_ips`)
```csv
ip_address,threat_type,confidence,severity,source
203.0.113.1,C2 Server,95,Critical,Threat Feed A
198.51.100.50,Scanning,75,High,Internal Detection
```

**Use Case**: Correlate network activity with known threats

### Common Enrichment Scenarios

#### Network Security
```kql
Events 
| where event_type == "firewall_block"
| lookup ip_geolocation src_ip as ip_address
| lookup threat_intel_ips src_ip as ip_address
```

Result: Firewall blocks enriched with geolocation and threat intelligence

#### User Behavior Analytics
```kql
Events 
| where event_type == "authentication"
| lookup user_directory user_name as username
```

Result: Authentication events enriched with user department and risk scores

#### Asset Management
```kql
Events 
| where event_type == "host_activity"
| lookup asset_inventory hostname as hostname
```

Result: Host events enriched with asset criticality and ownership

---

## Best Practices

### Data Preparation

#### CSV Formatting
```
✅ Use consistent date formats (ISO 8601)
✅ Include descriptive column headers
✅ Handle missing values explicitly
✅ Remove special characters from key fields
✅ Use UTF-8 encoding
```

#### Key Field Selection
```
✅ Choose fields with high uniqueness
✅ Use normalized formats (lowercase, trimmed)
✅ Consider multiple key fields for complex lookups
✅ Validate key field data quality
```

### Performance Optimization

#### Table Size Management
```
Small Tables (< 1K records): Fast in-memory caching
Medium Tables (1K - 100K): Optimal for most use cases
Large Tables (> 100K): Consider data archival strategies
```

#### Query Optimization
```
✅ Use specific return fields vs. SELECT *
✅ Implement caching for frequently accessed data
✅ Monitor query performance regularly
✅ Archive old or unused tables
```

### Security Considerations

#### Data Sensitivity
```
⚠️ Avoid uploading sensitive personal data
⚠️ Use data masking for production environments
⚠️ Implement access controls on sensitive tables
⚠️ Regular audit of uploaded data
```

#### API Security
```
✅ Store API keys securely
✅ Use rate limiting to prevent abuse
✅ Monitor external API usage
✅ Implement retry logic with backoff
```

---

## Troubleshooting

### Common Upload Issues

#### Large File Upload Failures
```
Problem: Upload timeout or memory errors
Solution: 
- Split large files into smaller chunks
- Increase upload timeout settings
- Use streaming upload for very large files
```

#### Field Type Detection Errors
```
Problem: Incorrect automatic type detection
Solution:
- Clean data before upload
- Use consistent formatting
- Manually verify field types after upload
```

#### Duplicate Key Errors
```
Problem: Duplicate entries in key field
Solution:
- Remove duplicates from source CSV
- Choose a different key field
- Use composite keys if necessary
```

### Performance Issues

#### Slow Lookup Queries
```
Diagnosis:
1. Check cache hit rate in statistics
2. Review query patterns and frequency
3. Analyze database index usage

Solutions:
- Increase cache TTL
- Add additional indexes
- Optimize query patterns
```

#### High Memory Usage
```
Diagnosis:
1. Monitor Redis memory usage
2. Check for cache overflow
3. Review table sizes

Solutions:
- Implement cache eviction policies
- Reduce cache TTL for large tables
- Archive unused data
```

### API Integration Issues

#### External API Failures
```
Common Causes:
- Rate limit exceeded
- Invalid API keys
- Network connectivity issues
- API service downtime

Solutions:
- Implement exponential backoff
- Monitor API quotas
- Use fallback data sources
- Cache API responses longer
```

#### Field Mapping Errors
```
Problem: API response fields not mapping correctly
Solution:
- Validate API response structure
- Update field mapping configuration
- Test with sample API responses
```

---

## API Reference

### REST Endpoints

#### Upload Lookup Table
```http
POST /api/lookup-tables
Content-Type: multipart/form-data

file: CSV file
keyField: Primary lookup field
description: Optional description
tags: Comma-separated tags
```

#### Query Lookup Table
```http
GET /api/lookup-tables/query?table={name}&keyField={field}&keyValue={value}
POST /api/lookup-tables/query
{
  "single": true,
  "tableName": "ip_geolocation",
  "keyField": "ip_address", 
  "keyValue": "8.8.8.8"
}
```

#### Search with Enrichment
```http
POST /api/v1/search/execute
{
  "query": "Events | limit 100",
  "enrichment": {
    "enabled": true,
    "rules": ["ip-geolocation"],
    "externalLookups": false
  }
}
```

### Configuration Management

#### Enrichment Rules
```http
GET /api/search/enrich?action=rules
POST /api/enrichment-rules
PUT /api/enrichment-rules/{id}
DELETE /api/enrichment-rules/{id}
```

#### External API Configs
```http
GET /api/lookup-tables/external-apis
POST /api/lookup-tables/external-apis
PUT /api/lookup-tables/external-apis?id={id}
DELETE /api/lookup-tables/external-apis?id={id}
```

---

**Enterprise Lookup Tables - Advanced data enrichment for SecureWatch SIEM** 🔍