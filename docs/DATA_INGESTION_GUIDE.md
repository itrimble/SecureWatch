# SecureWatch Data Ingestion Guide v2.1.0

> **📋 Documentation Navigation:** [Main README](README.md) | [Quick Start](QUICK_START.md) | [Deployment Guide](DEPLOYMENT_GUIDE.md) | [Log Formats](LOG_FORMATS_GUIDE.md)

## 📋 Overview

SecureWatch provides comprehensive, enterprise-grade data ingestion capabilities designed to rival Splunk's data collection and processing features. Our modular architecture supports multiple ingestion methods, protocols, and data formats with high-performance processing and guaranteed delivery.

## 🚀 Ingestion Methods

### 1. HTTP Event Collector (HEC) Service

**Port**: 8888  
**Protocol**: HTTP/HTTPS  
**Compatibility**: Splunk HEC API compatible

#### Features
- **Token-based Authentication**: Secure API access with configurable tokens
- **Multi-format Support**: JSON events, raw data, batch processing
- **Rate Limiting**: Configurable request limits and throttling
- **High Performance**: Async processing with Kafka integration
- **Health Monitoring**: Built-in health checks and metrics

#### Usage Examples

```bash
# Single Event
curl -X POST http://localhost:8888/services/collector \
  -H "Authorization: Splunk <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"event": {"message": "User login", "user": "john.doe"}}'

# Batch Events
curl -X POST http://localhost:8888/services/collector \
  -H "Authorization: Splunk <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"event": {"message": "Event 1"}}
      {"event": {"message": "Event 2"}}'

# Raw Data
curl -X POST http://localhost:8888/services/collector/raw \
  -H "Authorization: Splunk <YOUR_TOKEN>" \
  -H "Content-Type: text/plain" \
  -d 'Jan 1 12:00:00 server1 sshd[1234]: User login from 192.168.1.100'
```

#### Token Management

```bash
# Create new token
curl -X POST http://localhost:8888/admin/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-app",
    "description": "Production application token",
    "permissions": ["write"],
    "rateLimit": 1000,
    "enabled": true
  }'

# List tokens
curl http://localhost:8888/admin/tokens

# Disable token
curl -X DELETE http://localhost:8888/admin/tokens/<TOKEN_ID>
```

### 2. Universal Syslog Ingestion

**Ports**: 514 (UDP/TCP), 601 (TCP), 6514 (TLS)  
**Protocols**: UDP, TCP, TLS  
**Standards**: RFC 3164, RFC 5424

#### Supported Protocols

| Port | Protocol | Description | Use Case |
|------|----------|-------------|----------|
| 514/udp | UDP | Traditional syslog | High-volume, fire-and-forget |
| 514/tcp | TCP | Reliable syslog | Guaranteed delivery |
| 601/tcp | TCP | RFC 5425 compliant | Standards-based deployment |
| 6514/tcp | TLS | Secure syslog | Encrypted transmission |

#### Configuration

```bash
# Environment variables for log-ingestion service
SYSLOG_UDP_PORT=514
SYSLOG_TCP_PORT=514
SYSLOG_RFC5425_PORT=601
SYSLOG_TLS_PORT=6514
```

#### Usage Examples

```bash
# Send via UDP (traditional)
echo '<134>Jan 1 12:00:00 server1 app[1234]: User authenticated' | nc -u localhost 514

# Send via TCP (reliable)
echo '<134>Jan 1 12:00:00 server1 app[1234]: User authenticated' | nc localhost 514

# Send with JSON payload
echo '<134>Jan 1 12:00:00 server1 app[1234]: User authenticated JSON:{"user":"john","ip":"192.168.1.100"}' | nc localhost 514

# TLS syslog (requires proper certificates)
openssl s_client -connect localhost:6514 -cert client.crt -key client.key
```

#### JSON Payload Support

SecureWatch supports structured data within syslog messages:

```
<134>Jan 1 12:00:00 server1 app[1234]: User login JSON:{"user":"john.doe","source_ip":"192.168.1.100","session_id":"abc123"}
```

The JSON portion is automatically extracted and indexed as structured fields.

### 3. File Upload & Processing API

**Port**: 4000 (Frontend) + 4002 (Processing)  
**Interface**: Web UI + REST API  
**Formats**: CSV, XML, JSON, EVTX, Text

#### Web Interface

1. Navigate to Settings → Log Sources
2. Use the File Upload widget
3. Configure upload options:
   - Source name
   - Source type
   - CSV delimiter
   - Header detection
4. Drag and drop files or browse to select
5. Monitor real-time processing progress

#### REST API

```bash
# Upload file via API
curl -X POST http://localhost:4000/api/files/upload \
  -F "file=@logfile.csv" \
  -F "options={\"source\":\"webserver\",\"sourcetype\":\"access_log\",\"hasHeaders\":true}"

# Check processing status
curl http://localhost:4000/api/files/upload?fileId=<FILE_ID>
```

#### Supported File Types

| Format | Extensions | Max Size | Description |
|--------|------------|----------|-------------|
| CSV | .csv | 50MB | Comma-separated values with automatic field detection |
| XML | .xml | 25MB | Structured XML logs with nested element support |
| JSON | .json | 25MB | JSON objects and arrays with automatic parsing |
| EVTX | .evtx | 100MB | Windows Event Logs with full field extraction |
| Text | .txt, .log | 50MB | Plain text logs with regex parsing |

### 4. Enhanced Agent with Persistent Queuing

**Platform**: Cross-platform (Windows, macOS, Linux)  
**Transport**: HTTPS with mTLS  
**Features**: Guaranteed delivery, compression, retry logic

#### Agent Configuration

```ini
[agent]
agent_id = unique-agent-id
config_update_interval = 300

[transport]
endpoint = https://securewatch.company.com/api/ingest
cert_path = /etc/securewatch/certs/client.crt
key_path = /etc/securewatch/certs/client.key
ca_path = /etc/securewatch/certs/ca.crt
batch_size = 100

[queue]
max_size = 50000
max_age_hours = 72
compression_threshold = 2048
retry_delays = [30, 300, 1800, 7200]
```

#### Queue Management

```python
# Agent queue statistics
from agent.core.persistent_queue import PersistentQueue

queue = PersistentQueue(config)
stats = await queue.get_stats()

print(f"Pending events: {stats['status_counts']['pending']}")
print(f"Completed events: {stats['status_counts']['completed']}")
print(f"Failed events: {stats['status_counts']['failed']}")
```

## 🔧 Configuration & Setup

### Docker Deployment

```yaml
# docker-compose.yml excerpt
services:
  hec-service:
    build: ./apps/hec-service
    ports:
      - "8888:8888"
    environment:
      - KAFKA_BROKERS=kafka:29092
      - RATE_LIMIT_MAX_REQUESTS=1000
    
  log-ingestion:
    build: ./apps/log-ingestion
    ports:
      - "4002:4002"
      - "514:514/udp"
      - "514:514/tcp"
      - "601:601/tcp"
      - "6514:6514/tcp"
    environment:
      - SYSLOG_UDP_PORT=514
      - SYSLOG_TCP_PORT=514
      - SYSLOG_RFC5425_PORT=601
      - SYSLOG_TLS_PORT=6514
```

### Startup

```bash
# Complete platform startup
./start.sh

# Individual services
docker-compose up -d hec-service
docker-compose up -d log-ingestion
```

## 📊 Monitoring & Metrics

### Health Checks

```bash
# HEC Service
curl http://localhost:8888/health

# Log Ingestion
curl http://localhost:4002/health

# Syslog adapter statistics
curl http://localhost:4002/adapters/syslog/stats
```

### Performance Metrics

```bash
# Prometheus metrics
curl http://localhost:8888/metrics
curl http://localhost:4002/metrics

# Kafka topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Service Statistics

```json
{
  "hec": {
    "tokens_active": 5,
    "events_received": 15420,
    "events_processed": 15420,
    "rate_limit_hits": 0,
    "avg_response_time_ms": 45
  },
  "syslog": {
    "ports": {
      "udp": 514,
      "tcp": 514,
      "rfc5425": 601,
      "tls": 6514
    },
    "active_connections": {
      "tcp": 12,
      "rfc5425": 3
    },
    "messages_received": 89234,
    "parse_errors": 23
  },
  "agent": {
    "agents_connected": 45,
    "queue_pending": 1250,
    "queue_processed": 234567,
    "compression_ratio": 0.65
  }
}
```

## 🛡️ Security Features

### Authentication & Authorization

- **HEC Tokens**: Unique tokens with configurable permissions
- **mTLS for Agents**: Mutual TLS authentication for agent connections
- **TLS Syslog**: Encrypted syslog transmission
- **Rate Limiting**: Per-token and global rate limiting

### Data Protection

- **Encryption in Transit**: TLS 1.2+ for all HTTP/HTTPS traffic
- **Compression**: Automatic payload compression to reduce bandwidth
- **Data Validation**: Input validation and sanitization
- **Audit Logging**: Complete audit trail of all ingestion activities

## 🚀 Performance Optimization

### High-Volume Scenarios

1. **Use HEC Batch API**: Send multiple events per request
2. **Enable Compression**: Automatic payload compression
3. **Kafka Partitioning**: Distribute load across Kafka partitions
4. **Buffer Management**: Configure appropriate buffer sizes
5. **Connection Pooling**: Reuse connections for better performance

### Tuning Parameters

```bash
# HEC Service
BATCH_SIZE=100
BATCH_TIMEOUT_MS=5000
RATE_LIMIT_MAX_REQUESTS=1000

# Log Ingestion
KAFKA_BATCH_SIZE=100
BUFFER_SIZE=1000000
COMPRESSION_ENABLED=true

# Agent
QUEUE_MAX_SIZE=50000
COMPRESSION_THRESHOLD=2048
BATCH_SIZE=100
```

## 🔍 Troubleshooting

### Common Issues

#### HEC Service Not Responding
```bash
# Check service status
curl http://localhost:8888/health

# View logs
docker logs securewatch_hec

# Verify Kafka connection
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

#### Syslog Messages Not Received
```bash
# Test UDP connectivity
nc -u localhost 514 < test_message.txt

# Check port bindings
netstat -tulpn | grep :514

# View adapter statistics
curl http://localhost:4002/adapters/syslog/stats
```

#### Agent Queue Issues
```bash
# Check agent status
ps aux | grep event_log_agent.py

# View queue statistics
python3 -c "from agent.core.persistent_queue import PersistentQueue; print('Queue operational')"

# Monitor transport logs
tail -f /var/log/securewatch/agent.log
```

### Performance Issues

1. **High Latency**: Increase batch sizes, enable compression
2. **Memory Usage**: Adjust buffer sizes, enable disk spillover
3. **Network Issues**: Check firewall rules, DNS resolution
4. **Queue Backlog**: Increase processing threads, optimize Kafka

## 📚 Integration Examples

### Splunk Universal Forwarder Migration

```bash
# Replace Splunk forwarder with SecureWatch agent
# Old Splunk outputs.conf:
[tcpout]
defaultGroup = securewatch
server = splunk.company.com:9997

# New SecureWatch agent config:
[transport]
endpoint = https://securewatch.company.com:8888/services/collector
```

### Application Integration

```python
# Python application sending to HEC
import requests

def send_to_securewatch(event_data):
    headers = {
        'Authorization': 'Splunk your-token-here',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'event': event_data,
        'source': 'python-app',
        'sourcetype': 'application_log'
    }
    
    response = requests.post(
        'http://localhost:8888/services/collector',
        json=payload,
        headers=headers
    )
    
    return response.status_code == 200
```

### Rsyslog Integration

```bash
# /etc/rsyslog.conf
# Forward all logs to SecureWatch
*.* @@localhost:514

# Forward specific facility
mail.* @@localhost:601

# TLS forwarding (requires certificates)
$DefaultNetstreamDriverCAFile /etc/ssl/certs/ca.pem
$ActionSendStreamDriver gtls
$ActionSendStreamDriverMode 1
$ActionSendStreamDriverAuthMode x509/name
*.* @@localhost:6514
```

## 📈 Scaling & Production Deployment

### Horizontal Scaling

1. **Load Balancer**: Distribute HEC requests across multiple instances
2. **Kafka Partitioning**: Scale message processing
3. **Database Sharding**: Distribute storage load
4. **Agent Distribution**: Deploy agents across multiple regions

### Production Checklist

- [ ] TLS certificates configured for all services
- [ ] Rate limiting configured appropriately
- [ ] Monitoring and alerting set up
- [ ] Log retention policies defined
- [ ] Backup and disaster recovery tested
- [ ] Security audit completed
- [ ] Performance testing conducted
- [ ] Documentation updated

---

**Enterprise-grade data ingestion for comprehensive security monitoring and log management** 🚀