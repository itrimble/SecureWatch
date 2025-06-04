# SecureWatch KQL API Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [KQL Search API](#kql-search-api)
3. [Visualization API](#visualization-api)
4. [Query Templates](#query-templates)
5. [Performance Optimization](#performance-optimization)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## 🎯 Overview

SecureWatch implements a Microsoft Sentinel-style KQL (Kusto Query Language) search and visualization pipeline. This guide covers the complete API for executing KQL queries and generating visualizations from security data.

### Key Features
- **Full KQL Support**: Complete Kusto Query Language implementation
- **Multiple Visualization Types**: Table, Bar, Line, Area, Pie, Timeline
- **Real-time Execution**: Query caching and performance optimization
- **Template System**: Predefined security-focused query templates
- **Interactive Results**: Click-to-drill-down capabilities

---

## 🔍 KQL Search API

### Base URL
```
http://localhost:4004/api/v1/search
```

### Authentication
Include the following header in all requests:
```http
X-Organization-ID: default
```

### Execute KQL Query

**POST** `/execute`

Execute a KQL query against the log data and return structured results.

#### Request Body
```json
{
  "query": "logs | where timestamp >= ago(1h) | where enriched_data.severity == 'Critical' | sort by timestamp desc | limit 100",
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T23:59:59Z"
  },
  "maxRows": 1000,
  "timeout": 30000,
  "cache": true
}
```

#### Parameters
- **query** (required): KQL query string (max 10,000 characters)
- **timeRange** (optional): Time range filter
  - **start**: ISO 8601 start time
  - **end**: ISO 8601 end time
- **maxRows** (optional): Maximum rows to return (1-10,000, default: 1000)
- **timeout** (optional): Query timeout in milliseconds (1000-300000, default: 30000)
- **cache** (optional): Enable result caching (default: true)

#### Response
```json
{
  "columns": [
    {
      "name": "timestamp",
      "type": "datetime",
      "nullable": false
    },
    {
      "name": "message",
      "type": "string",
      "nullable": true
    }
  ],
  "rows": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "message": "Critical security event detected",
      "source_identifier": "security_system",
      "enriched_data": {
        "severity": "Critical",
        "event_id": "SEC001"
      }
    }
  ],
  "metadata": {
    "totalRows": 250,
    "scannedRows": 1000,
    "executionTime": 1250,
    "fromCache": false,
    "totalTime": 1255
  }
}
```

### Validate KQL Query

**POST** `/validate`

Validate KQL query syntax without executing it.

#### Request Body
```json
{
  "query": "logs | where timestamp >= ago(1h)"
}
```

#### Response
```json
{
  "valid": true,
  "errors": []
}
```

### Query Execution Plan

**POST** `/explain`

Get the execution plan for a KQL query without running it.

#### Request Body
```json
{
  "query": "logs | where severity == 'Critical' | summarize count() by source_identifier",
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T23:59:59Z"
  }
}
```

#### Response
```json
{
  "executionPlan": {
    "steps": [
      {
        "operation": "TableScan",
        "table": "logs",
        "estimatedRows": 10000
      },
      {
        "operation": "Filter",
        "condition": "severity == 'Critical'",
        "estimatedRows": 500
      },
      {
        "operation": "Summarize",
        "groupBy": ["source_identifier"],
        "aggregations": ["count()"],
        "estimatedRows": 25
      }
    ]
  },
  "estimatedCost": 1.5,
  "estimatedRows": 25
}
```

### Query Completions

**POST** `/completions`

Get IntelliSense completions for KQL query editing.

#### Request Body
```json
{
  "text": "logs | where ",
  "position": {
    "line": 0,
    "character": 13
  },
  "context": {
    "triggerKind": 1,
    "triggerCharacter": " "
  }
}
```

#### Response
```json
[
  {
    "label": "timestamp",
    "kind": 5,
    "detail": "datetime",
    "documentation": "Event timestamp field",
    "insertText": "timestamp"
  },
  {
    "label": "severity",
    "kind": 5,
    "detail": "string",
    "documentation": "Event severity level",
    "insertText": "enriched_data.severity"
  }
]
```

### Search Statistics

**GET** `/statistics`

Get performance and usage statistics for the search engine.

#### Response
```json
{
  "cache": {
    "size": 245,
    "hits": 1250,
    "misses": 340
  },
  "uptime": 86400.5,
  "memoryUsage": {
    "rss": 512,
    "heapTotal": 256,
    "heapUsed": 180,
    "external": 45
  },
  "nodeVersion": "v18.17.0",
  "platform": "darwin"
}
```

---

## 📊 Visualization API

### Frontend Visualization Endpoint

**GET** `/api/logs`

Simplified endpoint for frontend visualization components.

#### Query Parameters
- **limit**: Maximum number of results (default: 100, max: 1000)
- **offset**: Number of results to skip (default: 0)

#### Response
```json
[
  {
    "id": "live-1",
    "timestamp": "2024-01-01T12:00:00Z",
    "source_identifier": "security_system",
    "log_file": "security.log",
    "message": "Authentication successful for user admin",
    "enriched_data": {
      "event_id": "AUTH_SUCCESS",
      "severity": "Information",
      "hostname": "web-server-01",
      "ip_address": "192.168.1.100",
      "user_id": "admin",
      "tags": ["authentication", "success"]
    }
  }
]
```

---

## 📋 Query Templates

### Predefined Security Templates

#### Critical Security Events
```kql
logs
| where timestamp >= ago(1h)
| where enriched_data.severity == "Critical" 
| sort by timestamp desc
| limit 100
```

#### Top Event Sources
```kql
logs
| summarize event_count = count() by source_identifier
| sort by event_count desc
| limit 10
```

#### Authentication Events
```kql
logs
| where message contains "login" or message contains "auth"
| where timestamp >= ago(24h)
| sort by timestamp desc
| limit 50
```

#### Error Analysis Over Time
```kql
logs
| where message contains "error" or message contains "exception"
| where timestamp >= ago(6h)
| summarize error_count = count() by bin(timestamp, 30m)
| sort by timestamp asc
```

#### Network Activity Analysis
```kql
logs
| where source_identifier contains "network" or message contains "connection"
| where timestamp >= ago(2h)
| extend ip = extract(@"(\d+\.\d+\.\d+\.\d+)", 1, message)
| where isnotempty(ip)
| summarize connection_count = count() by ip
| sort by connection_count desc
```

### Advanced SIEM Queries

#### Failed Login Attempts
```kql
logs
| where message contains "failed" and message contains "login"
| where timestamp >= ago(24h)
| extend user = extract(@"user[:\s]+([^\s,]+)", 1, message)
| extend ip = extract(@"(\d+\.\d+\.\d+\.\d+)", 1, message)
| summarize failed_attempts = count() by user, ip
| where failed_attempts > 5
| sort by failed_attempts desc
```

#### Suspicious Process Activity
```kql
logs
| where source_identifier contains "process"
| where message contains "powershell" or message contains "cmd.exe"
| where timestamp >= ago(4h)
| extend process = extract(@"process[:\s]+([^\s,]+)", 1, message)
| extend user = extract(@"user[:\s]+([^\s,]+)", 1, message)
| summarize process_count = count() by process, user
| where process_count > 10
| sort by process_count desc
```

#### Data Exfiltration Detection
```kql
logs
| where message contains "download" or message contains "export" or message contains "transfer"
| where timestamp >= ago(1h)
| extend file_size = extract(@"size[:\s]+(\d+)", 1, message)
| extend user = extract(@"user[:\s]+([^\s,]+)", 1, message)
| where toint(file_size) > 100000000  // > 100MB
| summarize total_size = sum(toint(file_size)) by user
| sort by total_size desc
```

---

## ⚡ Performance Optimization

### Query Optimization Tips

#### 1. Use Time Filters Early
```kql
// Good - filter by time first
logs
| where timestamp >= ago(1h)
| where severity == "Critical"

// Less efficient - time filter later
logs
| where severity == "Critical"
| where timestamp >= ago(1h)
```

#### 2. Limit Result Sets
```kql
// Always include appropriate limits
logs
| where timestamp >= ago(1h)
| summarize count() by source_identifier
| sort by count_ desc
| limit 20  // Limit results for performance
```

#### 3. Use Indexed Fields
```kql
// These fields are indexed for better performance:
// - timestamp
// - source_identifier
// - enriched_data.severity
// - enriched_data.event_id
```

### Caching Strategy

The KQL engine implements intelligent caching:

- **Cache TTL**: 5 minutes default
- **Cache Size**: 10,000 queries maximum
- **Cache Key**: Based on query hash and parameters
- **Invalidation**: Automatic on new data ingestion

### Rate Limiting

API rate limits are enforced:

- **General API**: 1000 requests per 15 minutes per IP
- **Query Execution**: 100 queries per minute per IP
- **Headers**: Rate limit info in response headers

---

## ❌ Error Handling

### Common Error Codes

#### 400 - Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "query",
      "message": "Query must be a non-empty string"
    }
  ]
}
```

#### 500 - Query Execution Failed
```json
{
  "error": "Query execution failed",
  "message": "Syntax error at line 1, column 15: unexpected token 'invalid'",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### 503 - Service Unavailable
```json
{
  "error": "Service temporarily unavailable",
  "message": "Database connection lost",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Error Recovery

Implement retry logic with exponential backoff:

```javascript
async function executeKQLQuery(query, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/v1/search/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': 'default'
        },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

---

## 💡 Examples

### JavaScript Frontend Integration

```javascript
// Initialize KQL client
class KQLClient {
  constructor(baseUrl = 'http://localhost:4004') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Organization-ID': 'default'
    };
  }

  async executeQuery(query, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1/search/execute`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query,
        maxRows: options.maxRows || 1000,
        timeout: options.timeout || 30000,
        cache: options.cache !== false
      })
    });

    if (!response.ok) {
      throw new Error(`KQL query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async validateQuery(query) {
    const response = await fetch(`${this.baseUrl}/api/v1/search/validate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query })
    });

    return await response.json();
  }
}

// Usage example
const kql = new KQLClient();

// Execute security analysis query
const result = await kql.executeQuery(`
  logs
  | where timestamp >= ago(1h)
  | where enriched_data.severity in ("High", "Critical")
  | summarize count() by enriched_data.severity, bin(timestamp, 10m)
  | sort by timestamp desc
`);

// Process results for visualization
const chartData = result.rows.map(row => ({
  time: row.timestamp,
  severity: row.severity,
  count: row.count_
}));
```

### Python Analytics Integration

```python
import requests
import pandas as pd
from datetime import datetime, timedelta

class SecureWatchKQL:
    def __init__(self, base_url="http://localhost:4004"):
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "X-Organization-ID": "default"
        }
    
    def execute_query(self, query, **kwargs):
        """Execute KQL query and return results"""
        payload = {
            "query": query,
            "maxRows": kwargs.get("max_rows", 1000),
            "timeout": kwargs.get("timeout", 30000),
            "cache": kwargs.get("cache", True)
        }
        
        response = requests.post(
            f"{self.base_url}/api/v1/search/execute",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def query_to_dataframe(self, query):
        """Execute query and return pandas DataFrame"""
        result = self.execute_query(query)
        df = pd.DataFrame(result["rows"])
        return df

# Usage example
kql = SecureWatchKQL()

# Analyze security events by hour
query = """
logs
| where timestamp >= ago(24h)
| where enriched_data.severity == "Critical"
| summarize event_count = count() by bin(timestamp, 1h)
| sort by timestamp asc
"""

df = kql.query_to_dataframe(query)
print(f"Found {len(df)} critical security events in the last 24 hours")

# Plot results
import matplotlib.pyplot as plt
df['timestamp'] = pd.to_datetime(df['timestamp'])
plt.plot(df['timestamp'], df['event_count'])
plt.title('Critical Security Events by Hour')
plt.xticks(rotation=45)
plt.show()
```

### Visualization Integration

```javascript
// React component for KQL-powered visualization
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const SecurityAnalyticsDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityMetrics = async () => {
      try {
        const response = await fetch('/api/v1/search/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Organization-ID': 'default'
          },
          body: JSON.stringify({
            query: `
              logs
              | where timestamp >= ago(7d)
              | summarize 
                  total_events = count(),
                  critical_events = countif(enriched_data.severity == "Critical"),
                  high_events = countif(enriched_data.severity == "High"),
                  medium_events = countif(enriched_data.severity == "Medium")
                by bin(timestamp, 1d)
              | sort by timestamp asc
            `
          })
        });

        const result = await response.json();
        setData(result.rows);
      } catch (error) {
        console.error('Failed to fetch security metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityMetrics();
  }, []);

  if (loading) return <div>Loading security analytics...</div>;

  return (
    <div className="security-dashboard">
      <h2>7-Day Security Event Trends</h2>
      <BarChart width={800} height={400} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="critical_events" fill="#ef4444" name="Critical" />
        <Bar dataKey="high_events" fill="#f59e0b" name="High" />
        <Bar dataKey="medium_events" fill="#eab308" name="Medium" />
      </BarChart>
    </div>
  );
};

export default SecurityAnalyticsDashboard;
```

---

For more advanced usage patterns and integration examples, refer to the source code in `frontend/components/kql-search-visualization.tsx` and the search API implementation in `apps/search-api/src/routes/search.ts`.