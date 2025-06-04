# SecureWatch CLI Dashboard - Enhanced Features

## 🚀 Enhanced Dashboard v2.0 Features

The enhanced CLI dashboard provides granular service monitoring, collapsible panels, and service control capabilities for comprehensive SecureWatch SIEM management.

## ✨ New Features

### 🎛️ Granular Service Monitoring

#### Complete Service Coverage
- **Microservices**: Frontend, Search API, Log Ingestion, Correlation Engine, Analytics Engine, Auth Service, API Gateway
- **Infrastructure**: PostgreSQL, Redis, Kafka, Zookeeper, Elasticsearch, Kibana
- **Monitoring Tools**: Prometheus, Grafana, Jaeger, AlertManager
- **Agents**: Mac Agent, Windows Agent, Linux Agent

#### Enhanced Service Details
Each service displays:
- **Health Score**: Percentage-based health indicator
- **Response Time**: API endpoint latency monitoring
- **Memory Usage**: Real-time memory consumption
- **Port Information**: Network port assignments
- **Dependencies**: Service dependency mapping
- **Version Information**: Software version tracking
- **Environment**: Runtime environment details

### 📊 Collapsible Panels

#### Smart Panel Management
- **Space-Optimized Layout**: Collapse unused panels to focus on critical information
- **Dynamic Resizing**: Panels automatically adjust based on collapsed state
- **Keyboard Control**: Press `c` or `Space` to toggle panel collapse
- **Visual Indicators**: Active panel highlighting with bold borders

#### Panel Categories
1. **Microservices Panel**: Application-level services
2. **Infrastructure Panel**: Database, cache, and messaging services
3. **System Resources Panel**: CPU, memory, and disk utilization
4. **Alerts Panel**: Recent security alerts and incidents
5. **Logs Panel**: Live log streaming from all services

### 🎮 Service Control Capabilities

#### Interactive Service Management
- **Start Services**: Press `s` to start selected service
- **Stop Services**: Press `S` (Shift+s) to stop selected service
- **Restart Services**: Press `r` to restart selected service
- **Bulk Operations**: F1-F4 keys for bulk service management

#### Command-Line Service Control
```bash
# Individual service control
./cli-dashboard.sh control start Frontend
./cli-dashboard.sh control stop "Search API"
./cli-dashboard.sh control restart "Log Ingestion"

# Bulk operations
./cli-dashboard.sh start-all
./cli-dashboard.sh stop-all
```

### 🔍 Advanced Monitoring

#### Real-Time Metrics
- **Service Health Scores**: 0-100% health indicators
- **Response Time Tracking**: Millisecond-precision latency monitoring
- **Memory Usage**: Live memory consumption tracking
- **Cache Performance**: Hit/miss ratios and efficiency metrics
- **Error Rate Monitoring**: Service error tracking and alerting

#### System Resource Monitoring
- **CPU Utilization**: Real-time processor usage with load averages
- **Memory Management**: RAM usage with detailed breakdowns
- **Disk Space**: Storage utilization with capacity alerts
- **Network Activity**: Basic throughput monitoring

### 📋 Enhanced Logging

#### Multi-Service Log Aggregation
- **Live Log Streaming**: Real-time log updates from all services
- **Service-Specific Filtering**: View logs from individual services
- **Log Level Filtering**: Error, warning, info, and debug levels
- **Searchable History**: Navigate through historical log entries

#### Log Viewing Commands
```bash
# View all recent logs
./cli-dashboard.sh logs

# Service-specific logs
./cli-dashboard.sh logs --service "Search API" --lines 100

# Follow logs in real-time
./cli-dashboard.sh logs --service Frontend --follow
```

## 🎯 Enhanced Navigation

### Keyboard Controls

#### Panel Navigation
- **Tab / Shift+Tab**: Navigate between panels
- **↑/↓ or k/j**: Navigate services within panel
- **←/→**: Scroll horizontally in tables
- **PgUp/PgDn**: Page through long lists
- **Home/End**: Jump to start/end of list

#### Service Management
- **s**: Start selected service
- **S**: Stop selected service (Shift+s)
- **r**: Restart selected service
- **l**: View service logs
- **m**: View service metrics
- **d**: View detailed service information

#### Quick Actions
- **F1**: Start all services
- **F2**: Stop all services
- **F3**: Restart all services
- **F4**: Run health check on all services
- **F5 or R**: Refresh dashboard data

#### View Modes
- **1**: All services view
- **2**: Critical services only
- **3**: Compact view

### Service Control Panel

#### Service Details View
- Comprehensive service information display
- Real-time metrics and health indicators
- Dependency mapping and version tracking
- Performance metrics and error tracking

#### Control Actions
- Start/stop/restart operations with visual feedback
- Log viewing with syntax highlighting
- Metrics visualization with historical data
- Configuration management interface

## 🖥️ Usage Examples

### Starting the Enhanced Dashboard
```bash
# Launch enhanced dashboard
./cli-dashboard.sh enhanced

# Or use the enhanced flag
./cli-dashboard.sh dashboard --enhanced

# With custom refresh rate
./cli-dashboard.sh enhanced --refresh 10
```

### Service Management Examples
```bash
# Check detailed status
./cli-dashboard.sh status --detailed

# Control specific services
./cli-dashboard.sh control start "Correlation Engine"
./cli-dashboard.sh control restart PostgreSQL

# Bulk operations
./cli-dashboard.sh start-all
./cli-dashboard.sh stop-all

# Health checks with verbose output
./cli-dashboard.sh health --verbose
```

### Log Management Examples
```bash
# View recent logs from all services
./cli-dashboard.sh logs --lines 50

# Monitor specific service logs
./cli-dashboard.sh logs --service "Analytics Engine" --lines 100

# Follow logs in real-time
./cli-dashboard.sh logs --service Frontend --follow
```

## 🔧 Configuration

### Service Categories
Services are organized into logical categories for better management:

#### Microservices
- Frontend (Port 4000)
- Search API (Port 4004)
- Log Ingestion (Port 4002)
- Correlation Engine (Port 4005)
- Analytics Engine (Port 4006)
- Auth Service (Port 4001)
- API Gateway (Port 4003)

#### Infrastructure
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Kafka (Port 9092)
- Zookeeper (Port 2181)
- Elasticsearch (Port 9200)
- Kibana (Port 5601)

#### Monitoring (Optional)
- Prometheus
- Grafana
- Jaeger
- AlertManager

#### Agents
- Mac Agent
- Windows Agent
- Linux Agent

### Customization Options
- **Refresh Intervals**: Configurable update frequencies
- **Panel Layout**: Customizable panel arrangements
- **Service Endpoints**: Configurable service URLs and ports
- **Log File Paths**: Adjustable log file locations
- **Docker Configuration**: Flexible container management

## 📈 Performance Enhancements

### Optimized Data Collection
- **Parallel API Calls**: Simultaneous health checks for faster updates
- **Intelligent Caching**: Reduced API calls through smart caching
- **Error Recovery**: Graceful degradation when services are unavailable
- **Resource Efficiency**: Minimal system resource usage

### Responsive Interface
- **Sub-Second Updates**: Real-time data refresh capabilities
- **Smooth Navigation**: Optimized keyboard and mouse interactions
- **Memory Management**: Efficient memory usage for long-running sessions
- **Cross-Platform**: Consistent behavior across macOS and Linux

## 🛡️ Security Considerations

### Read-Only Operations
- Dashboard performs monitoring only, no destructive actions
- Service control operations require explicit confirmation
- Log viewing respects system permissions
- No sensitive data exposure in error messages

### Access Control
- Designed for trusted internal environments
- Local network access patterns
- No authentication required (assumes secure context)
- Audit-friendly operation logging

## 🔮 Future Enhancements

### Planned Features
- **Historical Metrics**: Trend analysis and reporting
- **Alert Thresholds**: Configurable notification systems
- **Plugin Architecture**: Custom monitoring modules
- **Remote Monitoring**: Secure multi-system monitoring
- **Web Interface**: Browser-based dashboard companion
- **Mobile Support**: Critical alert notifications

### Integration Roadmap
- **Grafana Integration**: Metrics export for dashboard creation
- **Slack/Teams**: Alert notification automation
- **Prometheus**: Metrics collection integration
- **Kubernetes**: Container orchestration support
- **Multi-Tenant**: Support for managed environments

## 📝 Troubleshooting

### Common Issues

#### Dashboard Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild dashboard
cd cli-dashboard && npm install && npm run build

# Test basic functionality
./cli-dashboard.sh health
```

#### Services Show Unhealthy
```bash
# Verify SecureWatch is running
./start-services.sh

# Check specific service
curl http://localhost:4004/health

# View service logs
./cli-dashboard.sh logs --service "Search API"
```

#### Service Control Issues
```bash
# Check Docker is running
docker ps

# Verify service configurations
./cli-dashboard.sh status --detailed

# Test individual service control
./cli-dashboard.sh control start Frontend
```

### Performance Issues
- **High CPU Usage**: Increase refresh interval (`--refresh 10`)
- **Memory Consumption**: Restart dashboard periodically for long sessions
- **Network Latency**: Check service endpoint connectivity
- **Log Volume**: Use service-specific log viewing for large log files

## 📚 Documentation Links

- **Main README**: `/Users/ian/Scripts/SecureWatch/README.md`
- **Usage Examples**: `/Users/ian/Scripts/SecureWatch/cli-dashboard/USAGE_EXAMPLES.md`
- **CLI Dashboard README**: `/Users/ian/Scripts/SecureWatch/cli-dashboard/README.md`
- **Implementation Summary**: `/Users/ian/Scripts/SecureWatch/CLI_DASHBOARD_IMPLEMENTATION.md`

---

**Enhanced Dashboard v2.0** - Comprehensive SIEM monitoring and service management 🛡️