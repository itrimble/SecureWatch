# OpenSearch Integration Guide for SecureWatch

## Overview

This guide provides complete instructions for integrating OpenSearch 3.0 and OpenSearch Dashboards into the SecureWatch SIEM platform, enabling a hybrid architecture that leverages both PostgreSQL and OpenSearch for optimal performance and analytics capabilities.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Log Sources   │────▶│  Log Ingestion  │────▶│   Dual Write    │
│  (Agents/APIs)  │     │    Service      │     │    Service      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                    ┌─────────────────────┴─────────────────────┐
                                    │                                           │
                                    ▼                                           ▼
                        ┌─────────────────────┐                     ┌─────────────────────┐
                        │    PostgreSQL       │                     │    OpenSearch       │
                        │  (Structured Data)  │                     │   (Raw Logs)        │
                        └─────────────────────┘                     └─────────────────────┘
                                    │                                           │
                                    └─────────────────┬─────────────────────┘
                                                      │
                                                      ▼
                                            ┌─────────────────────┐
                                            │   Query Router      │
                                            │  (KQL Engine)       │
                                            └─────────────────────┘
                                                      │
                                                      ▼
                                            ┌─────────────────────┐
                                            │   Frontend UI       │
                                            │  (Next.js + OSD)    │
                                            └─────────────────────┘
```

## Installation Steps

### 1. Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM available
- 20GB free disk space
- SecureWatch platform running

### 2. Deploy OpenSearch Cluster

```bash
# Create network if not exists
docker network create securewatch-network

# Start OpenSearch cluster
cd infrastructure/opensearch
docker-compose -f docker-compose.opensearch.yml up -d

# Wait for cluster to be healthy (takes 1-2 minutes)
curl -k -u admin:admin https://localhost:9200/_cluster/health?pretty
```

### 3. Configure Log Ingestion for Dual Writes

Update your environment variables:

```bash
# Add to .env file
OPENSEARCH_NODE=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin
USE_OPENSEARCH=true
NEXT_PUBLIC_OPENSEARCH_DASHBOARDS_URL=http://localhost:5601
NEXT_PUBLIC_OPENSEARCH_DASHBOARDS_HOSTS=localhost:5601
```

### 4. Update Log Ingestion Service

The dual-write service automatically handles writing to both PostgreSQL and OpenSearch:

```typescript
// apps/log-ingestion/src/index.ts
import { DualWriteService } from './services/dual-write.service';

const dualWriteService = new DualWriteService({
  postgres: {
    connectionString: process.env.DATABASE_URL
  },
  opensearch: {
    node: process.env.OPENSEARCH_NODE,
    auth: {
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD
    }
  }
});

await dualWriteService.initialize();
```

### 5. Enable KQL to OpenSearch Translation

The KQL engine now supports automatic query routing:

```typescript
// Use OpenSearch for full-text search
const results = await fetch('/api/query', {
  method: 'POST',
  body: JSON.stringify({
    query: 'EventType contains "authentication" | where RiskScore > 70',
    backend: 'opensearch' // or 'auto' for automatic selection
  })
});
```

### 6. Configure Frontend Integration

Update your frontend components to use the hybrid dashboard:

```tsx
// pages/dashboard.tsx
import { SiemDashboardWithOpenSearch } from '@/components/siem-dashboard-opensearch';

export default function Dashboard() {
  return <SiemDashboardWithOpenSearch />;
}
```

## Query Examples

### KQL Queries with OpenSearch Backend

1. **Full-text search across all logs:**
```kql
* | where Message contains "failed login" 
  | summarize count() by User.name, bin(TimeCreated, 1h)
```

2. **MITRE ATT&CK technique analysis:**
```kql
SecurityLog 
  | where MitreTechnique has_any ("T1003", "T1059", "T1055")
  | summarize TechniqueCount = count() by MitreTechnique
  | order by TechniqueCount desc
```

3. **User behavior analytics:**
```kql
EventLog
  | where User.name != "SYSTEM"
  | summarize 
      LoginCount = countif(EventID == 4624),
      FailedLogins = countif(EventID == 4625),
      ProcessCount = countif(EventID == 4688)
    by User.name, bin(TimeCreated, 1d)
  | where FailedLogins > 5
```

4. **Network traffic analysis:**
```kql
NetworkLog
  | where Network.bytes_sent > 1000000
  | summarize 
      TotalBytes = sum(Network.bytes_sent),
      ConnectionCount = count()
    by Network.destination_ip, bin(TimeCreated, 5m)
  | order by TotalBytes desc
  | take 10
```

## OpenSearch Dashboards Visualizations

### Creating Custom Visualizations

1. **Access OpenSearch Dashboards:**
   ```
   http://localhost:5601
   Username: admin
   Password: admin
   ```

2. **Create Index Pattern:**
   - Navigate to Stack Management → Index Patterns
   - Create pattern: `securewatch-logs*`
   - Set timestamp field: `timestamp`

3. **Build Visualizations:**
   - Go to Visualize → Create
   - Choose visualization type
   - Use KQL or DQL for queries
   - Save with embed-friendly name

4. **Embed in SecureWatch:**
   ```tsx
   <OpenSearchWidget
     visualizationUrl="http://localhost:5601/app/visualize#/edit/your-viz-id?embed=true"
     title="Custom Security Metric"
     height={400}
   />
   ```

## Performance Optimization

### 1. Index Management

```bash
# Create index lifecycle policy
curl -k -u admin:admin -X PUT "https://localhost:9200/_plugins/_ism/policies/securewatch-ilm" \
  -H 'Content-Type: application/json' -d '{
  "policy": {
    "description": "SecureWatch log retention policy",
    "states": [{
      "name": "hot",
      "actions": [{
        "rollover": {
          "min_size": "10gb",
          "min_index_age": "1d"
        }
      }],
      "transitions": [{
        "state_name": "warm",
        "conditions": {
          "min_index_age": "7d"
        }
      }]
    }, {
      "name": "warm",
      "actions": [{
        "force_merge": {
          "max_num_segments": 1
        }
      }],
      "transitions": [{
        "state_name": "delete",
        "conditions": {
          "min_index_age": "30d"
        }
      }]
    }, {
      "name": "delete",
      "actions": [{
        "delete": {}
      }]
    }]
  }
}'
```

### 2. Query Performance Tips

- Use time ranges to limit data scanned
- Leverage aggregations instead of retrieving raw documents
- Create custom indices for specific log types
- Use index aliases for seamless index rotation

### 3. Resource Allocation

```yaml
# Update docker-compose for production
environment:
  - "OPENSEARCH_JAVA_OPTS=-Xms4g -Xmx4g"  # Increase for production
  - "cluster.max_shards_per_node=3000"     # Adjust based on workload
```

## Security Configuration

### 1. Enable TLS/SSL

Generate certificates:
```bash
cd infrastructure/opensearch/config/certs
./generate-certs.sh
```

### 2. Configure Authentication

```bash
# Change default passwords
docker exec -it opensearch-node1 bash
/usr/share/opensearch/plugins/opensearch-security/tools/securityadmin.sh \
  -cd /usr/share/opensearch/config/opensearch-security/ \
  -icl -nhnv -cacert /usr/share/opensearch/config/certs/root-ca.pem \
  -cert /usr/share/opensearch/config/certs/admin.pem \
  -key /usr/share/opensearch/config/certs/admin-key.pem
```

### 3. Role-Based Access Control

Create custom roles for SecureWatch users:
```json
{
  "securewatch_analyst": {
    "cluster_permissions": ["cluster:monitor/*"],
    "index_permissions": [{
      "index_patterns": ["securewatch-*"],
      "allowed_actions": ["read", "search"]
    }]
  },
  "securewatch_admin": {
    "cluster_permissions": ["*"],
    "index_permissions": [{
      "index_patterns": ["*"],
      "allowed_actions": ["*"]
    }]
  }
}
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Cluster health
curl -k -u admin:admin https://localhost:9200/_cluster/health?pretty

# Index statistics
curl -k -u admin:admin https://localhost:9200/securewatch-logs/_stats?pretty

# Node statistics
curl -k -u admin:admin https://localhost:9200/_nodes/stats?pretty
```

### 2. Backup and Recovery

```bash
# Create snapshot repository
curl -k -u admin:admin -X PUT "https://localhost:9200/_snapshot/securewatch_backup" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/usr/share/opensearch/data/snapshots"
  }
}'

# Create snapshot
curl -k -u admin:admin -X PUT "https://localhost:9200/_snapshot/securewatch_backup/snapshot_1?wait_for_completion=true"
```

### 3. Performance Monitoring

Access OpenSearch Dashboards monitoring:
- Navigate to Stack Management → Index Management
- View index metrics and performance
- Monitor query performance in DevTools

## Troubleshooting

### Common Issues

1. **Connection refused errors:**
   ```bash
   # Check if services are running
   docker-compose -f docker-compose.opensearch.yml ps
   
   # Check logs
   docker logs opensearch-node1
   ```

2. **High memory usage:**
   ```bash
   # Adjust JVM heap size in docker-compose
   OPENSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
   ```

3. **Slow queries:**
   ```bash
   # Enable slow log
   curl -k -u admin:admin -X PUT "https://localhost:9200/securewatch-logs/_settings" -H 'Content-Type: application/json' -d '{
     "index.search.slowlog.threshold.query.warn": "10s",
     "index.search.slowlog.threshold.query.info": "5s"
   }'
   ```

## Migration from Existing Data

### Export from PostgreSQL to OpenSearch

```python
# scripts/migrate_to_opensearch.py
import psycopg2
from opensearchpy import OpenSearch
import json
from datetime import datetime

# Connect to PostgreSQL
pg_conn = psycopg2.connect("postgresql://...")
pg_cursor = pg_conn.cursor()

# Connect to OpenSearch
os_client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    http_auth=('admin', 'admin'),
    use_ssl=True,
    verify_certs=False
)

# Migrate data in batches
batch_size = 1000
offset = 0

while True:
    pg_cursor.execute(f"""
        SELECT * FROM logs 
        ORDER BY timestamp 
        LIMIT {batch_size} OFFSET {offset}
    """)
    
    rows = pg_cursor.fetchall()
    if not rows:
        break
    
    # Bulk index to OpenSearch
    bulk_data = []
    for row in rows:
        doc = {
            # Map PostgreSQL columns to OpenSearch fields
            'timestamp': row[0].isoformat(),
            'raw_message': row[1],
            # ... map other fields
        }
        bulk_data.append({'index': {'_index': 'securewatch-logs'}})
        bulk_data.append(doc)
    
    os_client.bulk(body=bulk_data)
    offset += batch_size
    print(f"Migrated {offset} documents")
```

## Best Practices

1. **Use OpenSearch for:**
   - Full-text search
   - Log aggregations
   - Time-series analysis
   - Pattern detection
   - Large-scale analytics

2. **Use PostgreSQL for:**
   - Structured metadata
   - User management
   - Configuration data
   - Audit trails
   - Relational queries

3. **Query Routing Strategy:**
   - Route based on query patterns
   - Cache frequently accessed data
   - Use appropriate backend for each use case

## Next Steps

1. Configure advanced OpenSearch features:
   - Machine Learning anomaly detection
   - Alerting and notifications
   - Cross-cluster replication

2. Create custom dashboards:
   - SOC operations dashboard
   - Executive summary dashboard
   - Compliance reporting dashboard

3. Integrate with existing tools:
   - SOAR platforms
   - Threat intelligence feeds
   - Ticketing systems

---

For additional support, refer to:
- [OpenSearch Documentation](https://opensearch.org/docs/latest/)
- [OpenSearch Dashboards Guide](https://opensearch.org/docs/latest/dashboards/)
- [SecureWatch Documentation](./README.md)