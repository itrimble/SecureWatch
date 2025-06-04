# SecureWatch SIEM CLI Dashboard

A comprehensive command-line dashboard for monitoring and managing the SecureWatch SIEM platform. This tool provides real-time monitoring, health checks, and system insights for administrators and engineers.

## Features

### 🎯 Core Functionality
- **Real-time Service Monitoring**: Track health and status of all SecureWatch services
- **System Resource Monitoring**: CPU, memory, disk usage with live updates
- **Platform Metrics**: Service-specific performance indicators and KPIs
- **Docker Infrastructure Status**: Monitor containerized services and dependencies
- **Alert Management**: View recent security alerts and incidents
- **Log Aggregation**: Tail and monitor logs from all services

### 📊 Interactive Dashboard
- **Multi-panel Layout**: Six information-rich panels with keyboard navigation
- **Color-coded Status**: Visual indicators for service health and resource usage
- **Real-time Updates**: Configurable refresh intervals (default: 5 seconds)
- **Keyboard Controls**: Intuitive navigation and actions

### 🔧 Command-line Tools
- **Quick Status**: Instant overview of system health
- **Health Checks**: Automated service validation
- **Log Viewing**: Filter and view logs by service
- **JSON Output**: Machine-readable output for automation

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- Access to SecureWatch SIEM platform (services running)
- Terminal with color support

### Setup
```bash
# Navigate to the CLI dashboard directory
cd cli-dashboard

# Install dependencies
npm install

# Build the application
npm run build

# Make CLI globally available (optional)
npm link
```

## Usage

### Interactive Dashboard
Launch the full-featured dashboard with real-time monitoring:

```bash
# Start dashboard with default settings
npm run dev
# or if globally installed:
securewatch-cli dashboard

# Start with custom refresh interval (10 seconds)
securewatch-cli dashboard --refresh 10
```

### Quick Commands

#### System Status
Get a quick overview of all services:
```bash
securewatch-cli status

# JSON output for automation
securewatch-cli status --json
```

#### Health Check
Perform comprehensive health validation:
```bash
securewatch-cli health
```

#### Log Viewing
View recent logs from all services:
```bash
# Show last 20 logs from all services
securewatch-cli logs

# Show last 50 logs from specific service
securewatch-cli logs --service search-api --lines 50
```

## Dashboard Layout

### Service Status Panel
- **Service Name**: Individual SecureWatch services
- **Status**: Health indicator (Healthy/Degraded/Unhealthy)
- **Uptime**: Service runtime duration
- **Response Time**: API response latency
- **Last Check**: Timestamp of last health verification

### System Resources Panel
- **CPU Usage**: Current processor utilization percentage
- **Memory**: RAM usage (used/total/percentage)
- **Disk Space**: Storage utilization
- **Load Average**: System load indicators

### Platform Metrics Panel
- **Memory Usage**: Service-specific memory consumption
- **CPU Time**: Processing time per service
- **Cache Performance**: Hit/miss ratios and efficiency
- **Redis Status**: Cache connectivity and health

### Docker Infrastructure Panel
- **Container Status**: Running/stopped containers
- **Port Mappings**: Exposed service ports
- **Health Checks**: Container health indicators

### Recent Alerts Panel
- **Timestamp**: Alert occurrence time
- **Severity**: Critical/High/Medium/Low priority
- **Title**: Alert description
- **Status**: Active/Acknowledged/Resolved

### Recent Logs Panel
- **Real-time Log Stream**: Live log entries from all services
- **Service Attribution**: Log source identification
- **Level Filtering**: Error/Warning/Info/Debug levels

## Keyboard Controls

### Navigation
- **Tab / Shift+Tab**: Navigate between panels
- **Arrow Keys**: Scroll within panels
- **Page Up/Down**: Scroll pages
- **Home/End**: Go to start/end

### Actions
- **Enter / Space**: Show detailed view
- **r / F5**: Refresh data manually
- **h / ?**: Show help screen
- **q / Escape / Ctrl+C**: Quit application

## Configuration

### Service Endpoints
The dashboard monitors these SecureWatch services by default:

- **Frontend** (Port 4000): Main web interface
- **Search API** (Port 4004): KQL query engine
- **Log Ingestion** (Port 4002): Event processing
- **Correlation Engine** (Port 4005): Threat detection
- **Analytics Engine** (Port 4006): KQL analytics

### Customization
Edit `src/config/dashboard.config.ts` to modify:
- Service endpoints and ports
- Refresh intervals
- Timeout values
- Log file paths
- Docker configuration

## Data Sources

### API Endpoints
- **Health Checks**: `/health` endpoints on each service
- **Metrics**: Service-specific performance APIs
- **Alerts**: Correlation engine alert feeds
- **Logs**: File system log monitoring

### System Integration
- **Docker**: Container status via docker-compose
- **Process Monitoring**: Port-based service detection
- **System Resources**: OS-level resource monitoring
- **Log Files**: Tail functionality for service logs

## Troubleshooting

### Common Issues

#### Services Show as Unhealthy
1. Verify SecureWatch services are running: `./start-services.sh`
2. Check service ports are accessible: `curl http://localhost:4004/health`
3. Review firewall and network connectivity

#### Dashboard Won't Start
1. Ensure Node.js 18+ is installed: `node --version`
2. Install dependencies: `npm install`
3. Build application: `npm run build`

#### No Metrics Data
1. Verify metrics endpoints are enabled on services
2. Check API connectivity to metrics URLs
3. Review service-specific metric configurations

#### Docker Services Not Detected
1. Ensure docker-compose.dev.yml file exists
2. Verify Docker daemon is running
3. Check docker-compose command availability

### Log Locations
- **Service Logs**: `/tmp/{service-name}.log`
- **Dashboard Logs**: Console output
- **Error Logs**: stderr output

## Development

### Architecture
- **TypeScript**: Type-safe development
- **Blessed**: Terminal UI framework
- **Axios**: HTTP client for API calls
- **Commander**: CLI argument parsing

### Adding New Panels
1. Create panel in `src/ui/dashboard.ui.ts`
2. Add data collection in `src/services/data.service.ts`
3. Define types in `src/types/index.ts`
4. Update layout grid configuration

### Testing
```bash
# Development mode with auto-reload
npm run watch

# Build and test
npm run build && npm start
```

## Security Considerations

- **Read-only Operations**: Dashboard performs only monitoring, no control actions
- **Local Network**: Designed for localhost/internal network access
- **No Authentication**: Assumes trusted environment
- **Log Privacy**: Be aware of sensitive data in log outputs

## Contributing

1. Follow TypeScript best practices
2. Maintain terminal compatibility
3. Test on multiple operating systems
4. Document configuration changes
5. Ensure graceful error handling

## License

MIT License - See LICENSE file for details

## Support

For issues and feature requests:
1. Check existing issues in the repository
2. Review troubleshooting section
3. Provide system information and error logs
4. Include SecureWatch platform version