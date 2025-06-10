# SecureWatch Data Retention Manager

The Data Retention Manager is a comprehensive service for managing data lifecycle, storage tiers, and pipeline monitoring in the SecureWatch SIEM platform.

## Features

### 🗄️ Tiered Storage Management

- **Hot Tier**: 0-7 days, SSD storage, full indexing
- **Warm Tier**: 8-30 days, HDD storage, partial indexing
- **Cold Tier**: 31-90 days, object storage, minimal indexing
- **Frozen Tier**: 90+ days, archive storage, no indexing

### 🔄 Automated Lifecycle Management

- Automatic tier migration based on data age
- Intelligent compression and indexing optimization
- Multi-cloud storage backend support (AWS S3, Azure Blob, GCS)
- Configurable retention policies per data type

### 📊 Pipeline Monitoring

- Real-time throughput and latency metrics
- Backpressure and queue depth monitoring
- Error rate tracking and alerting
- Prometheus metrics integration

### 💰 Cost Optimization

- Capacity planning and projection
- Storage cost analysis and recommendations
- Automatic compression optimization
- Storage backend cost comparison

### 🚨 Health Monitoring & Alerting

- Pipeline health checks every 5 minutes
- Configurable alert thresholds
- Webhook integration for notifications
- Comprehensive dashboards

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Hot Storage   │───▶│  Warm Storage   │───▶│  Cold Storage   │
│   (0-7 days)    │    │   (8-30 days)   │    │  (31-90 days)   │
│   SSD, Full IX  │    │   HDD, Part IX  │    │   S3, Min IX    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lifecycle Orchestrator                       │
│  • Scheduled tier migrations • Health monitoring                │
│  • Data pruning             • Capacity planning                 │
│  • Cost optimization        • Alert management                  │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Storage Manager │    │Pipeline Monitor │    │Capacity Planner │
│ • Tier migration│    │ • Metrics       │    │ • Projections   │
│ • Compression   │    │ • Alerting      │    │ • Optimization  │
│ • Cloud storage │    │ • Health checks │    │ • Cost analysis │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eventlog

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage Backends
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=securewatch-archive

AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_CONTAINER=securewatch-archive

GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCS_BUCKET=securewatch-archive

# Alerting
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
CRITICAL_ALERT_WEBHOOK=https://hooks.pagerduty.com/...

# Storage Limits (GB)
HOT_STORAGE_LIMIT_GB=10000
WARM_STORAGE_LIMIT_GB=50000
COLD_STORAGE_LIMIT_GB=100000
```

### Default Retention Policies

| Tier   | Age Range  | Compression | Indexing | Storage         | Replication |
| ------ | ---------- | ----------- | -------- | --------------- | ----------- |
| Hot    | 0-7 days   | None        | Full     | Local SSD       | 3x          |
| Warm   | 8-30 days  | Medium (3)  | Partial  | Local HDD       | 2x          |
| Cold   | 31-90 days | High (6)    | Minimal  | Object Storage  | 1x          |
| Frozen | 90+ days   | Max (9)     | None     | Archive Storage | 1x          |

## API Endpoints

### Storage Management

- `GET /api/retention/storage/stats` - Get storage statistics
- `POST /api/retention/migrate` - Trigger manual tier migration
- `POST /api/retention/prune` - Prune expired data

### Pipeline Monitoring

- `GET /api/retention/pipeline/metrics` - Get pipeline metrics
- `GET /api/retention/metrics` - Prometheus metrics endpoint
- `GET /api/retention/health` - Health check

### Capacity Planning

- `GET /api/retention/capacity/projections` - Get capacity projections
- `POST /api/retention/optimize` - Trigger storage optimization

### Lifecycle Management

- `GET /api/retention/transitions/active` - Get active transitions
- `GET /api/retention/transitions/history` - Get transition history

## Scheduled Jobs

| Schedule        | Job                  | Description                           |
| --------------- | -------------------- | ------------------------------------- |
| Hourly          | Tier Migration       | Check and migrate data between tiers  |
| Daily 2 AM      | Data Pruning         | Remove expired data based on policies |
| Daily 3 AM      | Capacity Planning    | Project storage needs and costs       |
| Every 6 hours   | Storage Optimization | Optimize compression and tiering      |
| Every 5 minutes | Health Check         | Monitor system health and metrics     |

## Monitoring & Alerting

### Metrics Tracked

- **Throughput**: Events per second across pipeline stages
- **Latency**: P50, P95, P99 processing times
- **Errors**: Error rates and types by component
- **Backpressure**: Queue depths and spillover events
- **Storage**: Usage, growth rates, and costs per tier

### Alert Conditions

- Pipeline throughput degradation (< 80% of normal)
- High error rate (> 5%)
- Excessive backpressure (> 90% queue depth)
- High latency (P99 > 1 second)
- Storage approaching limits (> 95% full)

## Storage Backends

### Local Storage

- **Hot/Warm**: Direct PostgreSQL/TimescaleDB storage
- **Compression**: Configurable per chunk
- **Performance**: Optimized for query speed

### Cloud Storage

- **AWS S3**: Standard, Standard-IA, Glacier, Deep Archive
- **Azure Blob**: Hot, Cool, Archive tiers
- **Google Cloud**: Standard, Nearline, Coldline, Archive

### Object Storage Features

- Automatic lifecycle policies
- Server-side encryption
- Cross-region replication
- Cost optimization recommendations

## Performance Characteristics

- **Throughput**: Supports 10M+ events/second ingestion
- **Latency**: Sub-100ms tier migration decisions
- **Scalability**: Horizontal scaling across multiple nodes
- **Reliability**: 99.9% uptime with automated failover
- **Cost Efficiency**: 70-80% storage cost reduction with optimal tiering

## Development

### Building

```bash
npm install
npm run build
```

### Running Locally

```bash
npm run dev
```

### Testing

```bash
npm test
```

### Docker

```bash
# Build image
docker build -t securewatch/retention-manager .

# Run container
docker run -p 3012:3012 --env-file .env securewatch/retention-manager
```

## Integration

### With SecureWatch Platform

The retention manager integrates seamlessly with:

- **Log Ingestion**: Monitors pipeline health and backpressure
- **TimescaleDB**: Manages hypertable chunks and compression
- **Kafka**: Tracks consumer lag and throughput
- **OpenSearch**: Coordinates with search indexing
- **Monitoring Stack**: Exports metrics to Prometheus/Grafana

### External Systems

- **Cloud Storage**: AWS S3, Azure Blob, Google Cloud Storage
- **Alerting**: Slack, PagerDuty, email, custom webhooks
- **Monitoring**: Prometheus, Grafana, custom dashboards

## Best Practices

1. **Set appropriate storage limits** based on your infrastructure capacity
2. **Configure cloud credentials** for seamless object storage integration
3. **Monitor alert thresholds** and adjust based on your SLA requirements
4. **Review capacity projections** regularly for budget planning
5. **Test backup/restore** procedures for disaster recovery
6. **Optimize compression levels** based on CPU and storage trade-offs

## Troubleshooting

### Common Issues

- **Migration failures**: Check storage permissions and available space
- **High CPU usage**: Reduce compression levels or migration frequency
- **Alert fatigue**: Adjust thresholds based on normal operating patterns
- **Storage cost spikes**: Enable auto-tiering and review retention policies

### Debugging

- Check logs at `/app/logs/` in container
- Monitor health endpoint for system status
- Review Prometheus metrics for detailed performance data
- Examine transition history for migration patterns
