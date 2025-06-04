# SecureWatch CLI Dashboard - Usage Examples

## Quick Start

### 1. Basic Health Check
```bash
./cli-dashboard.sh health
```
**Output:**
```
🏥 Health Check Results:
✅ Frontend: healthy
✅ Search API: healthy
✅ Log Ingestion: healthy
✅ Correlation Engine: healthy
✅ Analytics Engine: healthy
✅ Overall Status: All systems operational
```

### 2. System Status Overview
```bash
./cli-dashboard.sh status
```
**Shows:**
- Service health and response times
- System resource utilization (CPU, Memory, Disk)
- Recent security alerts
- Formatted tables with color coding

### 3. Interactive Dashboard
```bash
./cli-dashboard.sh dashboard
```
**Features:**
- Real-time monitoring with 6 information panels
- Keyboard navigation (Tab, Arrow keys)
- Live updates every 5 seconds
- Color-coded status indicators

## Advanced Usage

### Custom Refresh Rate
```bash
# Update dashboard every 10 seconds
./cli-dashboard.sh dashboard --refresh 10
```

### JSON Output for Automation
```bash
# Get machine-readable status
./cli-dashboard.sh status --json > status.json

# Use in scripts
if ./cli-dashboard.sh health; then
  echo "All systems operational"
else
  echo "Issues detected - check logs"
fi
```

### Service-Specific Logs
```bash
# View last 50 lines from Search API
./cli-dashboard.sh logs --service search-api --lines 50

# Monitor all recent logs
./cli-dashboard.sh logs --lines 100
```

## Dashboard Navigation

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Navigate between panels |
| `↑↓←→` | Scroll within panels |
| `PgUp` / `PgDn` | Page up/down |
| `Home` / `End` | Jump to start/end |
| `Enter` / `Space` | Show detailed view |
| `r` / `F5` | Manual refresh |
| `h` / `?` | Show help |
| `q` / `Esc` / `Ctrl+C` | Quit |

### Panel Layout

```
┌─────────────────────┬─────────────────────┐
│   Service Status    │  System Resources   │
│                     │                     │
├─────────────────────┼─────────────────────┤
│  Platform Metrics   │  Docker Services    │
│                     │                     │
├─────────────────────┼─────────────────────┤
│   Recent Alerts     │   Recent Logs       │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

## Use Cases

### 1. System Administrator Daily Check
```bash
# Morning health check
./cli-dashboard.sh health

# Review overnight alerts and logs
./cli-dashboard.sh status
```

### 2. Incident Response
```bash
# Quick triage
./cli-dashboard.sh status

# Monitor real-time during incident
./cli-dashboard.sh dashboard --refresh 2

# Check specific service logs
./cli-dashboard.sh logs --service correlation-engine
```

### 3. Performance Monitoring
```bash
# Long-term monitoring session
./cli-dashboard.sh dashboard

# Export current metrics for analysis
./cli-dashboard.sh status --json > "metrics-$(date +%Y%m%d-%H%M%S).json"
```

### 4. Automation and Scripts
```bash
#!/bin/bash
# Health monitoring script

if ! ./cli-dashboard.sh health >/dev/null 2>&1; then
  echo "SecureWatch health check failed!" | mail admin@company.com
  ./cli-dashboard.sh status --json > /var/log/securewatch-status.json
fi
```

## Status Codes and Colors

### Service Health
- 🟢 **Healthy**: Service responding normally
- 🟡 **Degraded**: Service responding but with issues
- 🔴 **Unhealthy**: Service not responding or critical errors

### Resource Usage
- **Green** (0-70%): Normal usage
- **Yellow** (71-85%): Elevated usage
- **Red** (86-100%): Critical usage

### Alert Severity
- **CRIT** (Red): Critical security events
- **HIGH** (Red): High-priority alerts
- **MED** (Yellow): Medium-priority warnings
- **LOW** (Blue): Informational alerts

## Troubleshooting Dashboard Issues

### Dashboard Won't Start
```bash
# Check dependencies
cd cli-dashboard && npm install

# Rebuild if needed
npm run build

# Test basic functionality
./cli-dashboard.sh health
```

### Services Show Unhealthy
```bash
# Check if SecureWatch is running
./start-services.sh

# Verify specific service
curl http://localhost:4004/health

# Check service logs
./cli-dashboard.sh logs --service search-api
```

### No Docker Information
```bash
# Verify Docker is running
docker ps

# Check compose file exists
ls docker-compose.dev.yml

# Test docker compose command
docker compose -f docker-compose.dev.yml ps
```

## Integration Examples

### Nagios/Icinga Integration
```bash
#!/bin/bash
# /usr/local/bin/check_securewatch.sh

cd /opt/securewatch
if ./cli-dashboard.sh health >/dev/null 2>&1; then
  echo "OK - All SecureWatch services healthy"
  exit 0
else
  echo "CRITICAL - SecureWatch health check failed"
  exit 2
fi
```

### Grafana Dashboard Data
```bash
#!/bin/bash
# Export metrics for Grafana ingestion

./cli-dashboard.sh status --json | jq '{
  timestamp: .lastUpdated,
  services: [.services[] | {
    name: .name,
    healthy: (.status == "healthy"),
    response_time: .responseTime
  }],
  cpu_percent: .systemResources.cpu.percentage,
  memory_percent: .systemResources.memory.percentage,
  disk_percent: .systemResources.disk.percentage
}' > /var/lib/grafana/securewatch-metrics.json
```

### Slack Notifications
```bash
#!/bin/bash
# Send alerts to Slack when issues detected

STATUS=$(./cli-dashboard.sh health 2>&1)
if [[ $? -ne 0 ]]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 SecureWatch Alert\\n\`\`\`$STATUS\`\`\`\"}" \
    $SLACK_WEBHOOK_URL
fi
```

## Performance Tips

### Optimize Refresh Rate
- Use longer intervals (10-30s) for continuous monitoring
- Use shorter intervals (2-5s) during incidents
- Consider system load when setting refresh rates

### Resource Usage
- Dashboard uses minimal resources (~50MB RAM)
- Network usage depends on API response sizes
- Log tailing can consume more CPU for large log files

### Terminal Optimization
- Use terminals with good Unicode support
- Enable color support for better visualization
- Resize terminal to at least 120x30 for optimal layout