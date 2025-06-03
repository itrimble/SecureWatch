# SecureWatch Agent Management Console

A comprehensive web-based management interface for SecureWatch agents that provides real-time monitoring, configuration management, and deployment capabilities.

## Features

### 🖥️ Web Dashboard
- **Real-time Metrics**: Live CPU, memory, disk usage, and event rates
- **Agent Status Monitoring**: Online/offline status with health scores
- **Interactive Charts**: Historical metrics visualization with Chart.js
- **Responsive Design**: Modern Bootstrap-based UI that works on all devices

### 🔧 Agent Management
- **Remote Control**: Start, stop, restart agents remotely
- **Configuration Management**: Update agent settings through web UI
- **Bulk Operations**: Manage multiple agents simultaneously
- **Real-time Updates**: WebSocket-based live status updates

### 📊 Monitoring & Analytics
- **System Health**: Comprehensive health scoring and alerting
- **Performance Metrics**: Historical data with 24-hour retention
- **Event Tracking**: Agent events and status changes
- **Resource Monitoring**: CPU, memory, disk, and network usage

### 🚀 Deployment & Installation
- **Remote Agent Deployment**: Automated installation on target systems
- **Cross-Platform Support**: Linux, Windows, and macOS deployment
- **Service Management**: Automatic service registration and startup
- **Configuration Templates**: Pre-configured collector setups

## Quick Start

### Prerequisites
- Python 3.11+
- Web browser (Chrome, Firefox, Safari, Edge)
- Network connectivity to target agents

### Installation

1. **Install Dependencies**:
```bash
cd agent/management
pip install -r requirements.txt
```

2. **Run Development Server**:
```bash
python console.py --debug
```

3. **Access Console**:
Open your browser to `http://localhost:8080`

### Production Deployment

Use the automated deployment script:

```bash
# Deploy console as system service
sudo python deploy_console.py deploy --production

# Check deployment status
python deploy_console.py status

# Uninstall
sudo python deploy_console.py uninstall
```

## Agent Installation

### Remote Agent Installation

Install agents on remote systems using the installer:

```bash
# Install agent via SSH with password
python agent_installer.py install \
  --host 192.168.1.100 \
  --username admin \
  --password mypassword \
  --collectors file syslog windows_event

# Install agent via SSH with private key
python agent_installer.py install \
  --host server.company.com \
  --username deploy \
  --private-key ~/.ssh/id_rsa \
  --collectors file syslog

# Uninstall agent
python agent_installer.py uninstall \
  --host 192.168.1.100 \
  --username admin \
  --password mypassword
```

### Manual Agent Installation

1. **Copy agent files** to target system
2. **Install Python 3.11+** and dependencies
3. **Configure agent** with appropriate settings
4. **Start agent service**

See [Agent Documentation](../core/README.md) for detailed instructions.

## Architecture

### Console Components

```
Management Console/
├── console.py              # Main Flask application
├── templates/              # HTML templates
│   ├── base.html          # Base template with navigation
│   ├── dashboard.html     # Main dashboard
│   ├── agents.html        # Agent list and management
│   └── agent_detail.html  # Individual agent details
├── deploy_console.py      # Deployment automation
├── agent_installer.py     # Remote agent installer
└── requirements.txt       # Python dependencies
```

### Database Schema

The console uses SQLite with the following tables:

- **agents**: Agent registration and status
- **agent_metrics**: Historical performance data
- **agent_events**: Event log for status changes and operations

### Security Features

- **mTLS Authentication**: Mutual TLS for agent communication
- **API Key Authentication**: Secure API access
- **RBAC Support**: Role-based access control (planned)
- **SSL/TLS**: HTTPS encryption for web interface

## Configuration

### Console Configuration

Create `console.conf` in the config directory:

```ini
[console]
host = 0.0.0.0
port = 8080
debug = false
secret_key = your-secret-key-here

[database]
path = ./data/console.db

[logging]
level = INFO
file = ./logs/console.log
max_size = 100MB
backup_count = 5

[security]
enable_https = true
cert_file = ./config/cert.pem
key_file = ./config/key.pem
```

### Agent Configuration

Agents are configured via JSON files. Example configuration:

```json
{
  "agent_id": "agent-web01-001",
  "version": "1.0.0",
  "console_url": "https://console.company.com:8443",
  "api_key": "your-api-key",
  "transport": {
    "protocol": "https",
    "compression": {"enabled": true, "level": 6},
    "tls": {"enabled": true, "verify_certs": true}
  },
  "collectors": {
    "file_collector": {
      "type": "file",
      "enabled": true,
      "config": {
        "file_patterns": ["/var/log/*.log"],
        "log_format": "auto"
      }
    }
  }
}
```

## API Reference

### REST API Endpoints

- `GET /api/agents` - List all agents
- `GET /api/agent/{id}/metrics` - Get agent metrics
- `POST /api/agent/{id}/command` - Send command to agent
- `PUT /api/agent/{id}/config` - Update agent configuration
- `GET /api/stats` - Get dashboard statistics

### WebSocket Events

- `stats_update` - Real-time dashboard statistics
- `agent_update` - Individual agent status updates
- `subscribe_agent` - Subscribe to agent-specific updates

## Monitoring

### Health Checks

The console provides built-in health monitoring:

- **Agent Health Score**: Composite score based on metrics
- **System Resource Monitoring**: CPU, memory, disk usage
- **Event Rate Monitoring**: Events per minute tracking
- **Error Tracking**: Agent error counts and types

### Alerting

Built-in alerting for:

- Agent offline/error states
- Resource threshold breaches
- Configuration failures
- Network connectivity issues

## Troubleshooting

### Common Issues

1. **Agent Not Appearing**:
   - Check agent configuration
   - Verify network connectivity
   - Review agent logs

2. **Console Not Starting**:
   - Check port availability
   - Verify Python dependencies
   - Review console logs

3. **SSL/TLS Issues**:
   - Verify certificate files
   - Check certificate expiry
   - Validate certificate chain

### Log Locations

- **Console Logs**: `./logs/console.log`
- **Agent Logs**: `/opt/securewatch-agent/logs/agent.log` (Linux)
- **System Logs**: Check systemd journal or Windows Event Log

### Debug Mode

Enable debug mode for detailed logging:

```bash
python console.py --debug
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security Considerations

### Production Security

- **Use HTTPS**: Always enable SSL/TLS in production
- **Strong Passwords**: Use strong API keys and passwords
- **Network Security**: Restrict access via firewall rules
- **Regular Updates**: Keep dependencies updated

### Agent Security

- **Certificate Management**: Implement proper certificate rotation
- **Network Isolation**: Use VPNs or private networks where possible
- **Least Privilege**: Run agents with minimal required permissions
- **Monitoring**: Monitor for unauthorized access attempts

## Performance

### Scaling Considerations

- **Database**: Consider PostgreSQL for large deployments
- **Load Balancing**: Use multiple console instances behind a load balancer
- **Agent Limits**: Monitor resource usage with many agents
- **Network Bandwidth**: Consider compression settings

### Optimization

- **Metrics Retention**: Adjust retention periods based on needs
- **Polling Intervals**: Balance update frequency with performance
- **Compression**: Use appropriate compression levels
- **Caching**: Implement caching for frequently accessed data

## License

This project is part of the SecureWatch SIEM platform and is subject to the same licensing terms.

## Support

For support and documentation:

- **Issues**: Report bugs via GitHub issues
- **Documentation**: See the main SecureWatch documentation
- **Community**: Join the SecureWatch community forums