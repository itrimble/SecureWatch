# Event Log Tutorial - ThriveDX

A comprehensive Windows Event Log analysis platform built with Next.js 15, designed for cybersecurity education and training.

## 🎯 Overview

This application provides a modern, interactive interface for exploring and analyzing Windows Event Logs. It features a dashboard-style layout with multiple components for log exploration, visualization, reporting, and security monitoring.

## 🚀 Features

- **📊 Dashboard**: Overview of system health, critical alerts, and event summaries
- **🔍 Event Explorer**: Interactive table for browsing and searching event logs
- **📈 Visualizations**: Charts and graphs for log data analysis
- **📋 Reporting**: Generate and schedule reports
- **⚙️ Settings**: Configure log sources and system preferences
- **🚨 Alerts**: Monitor and manage critical security events
- **🤖 Log Collection Agent**: Python-based agent for collecting logs from multiple sources
- **🍎 macOS Support**: Comprehensive macOS log collection and normalization
- **💾 TimescaleDB Integration**: Time-series database for scalable log storage

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Charts**: Recharts
- **Build**: Turbopack (development)
- **Database**: TimescaleDB (PostgreSQL with time-series extensions)
- **Log Collection**: Python agent with configurable sources

## 📦 Installation & Setup

### Frontend Application

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itrimble/EventLogTutorialThriveDX.git
   cd EventLogTutorialThriveDX
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) (or [http://localhost:3002](http://localhost:3002) if using custom port)

### Database Setup

1. **Start TimescaleDB**:
   ```bash
   docker-compose up -d
   ```

2. **Initialize database schema**:
   ```bash
   docker exec -i eventlog_db_timescale_local psql -U eventlogger -d eventlog_dev < create_tables.sql
   ```

### Log Collection Agent

1. **Set up Python environment**:
   ```bash
   cd agent
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure agent**:
   ```bash
   cp config.ini.example config.ini
   # Edit config.ini with your settings
   ```

3. **Run agent**:
   ```bash
   python3 event_log_agent.py
   ```

For detailed agent setup, see [docs/agent_setup_and_usage.md](docs/agent_setup_and_usage.md).

## 🏗️ Build & Deploy

### Local Build
```bash
npm run build
npm start
```

### Vercel Deployment
This project is configured for automatic deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and configure build settings
3. Each push to `main` triggers a new deployment

**Build Configuration**:
- Build command: `npm run build`
- Install command: `npm install`
- Node.js version: 18.x or later

## 📁 Project Structure

```
EventLogTutorialThriveDX/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard (home page)
│   │   ├── explorer/          # Event log browser
│   │   ├── visualizations/    # Charts and graphs
│   │   ├── reporting/         # Report generation
│   │   ├── settings/          # Configuration
│   │   └── alerts/            # Alert management
│   ├── components/            # Reusable React components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── explorer/          # Event table components
│   │   ├── layout/            # Navigation and layout
│   │   ├── reporting/         # Report components
│   │   ├── settings/          # Settings forms
│   │   └── visualization/     # Chart components
│   └── lib/
│       ├── data/              # Mock data and configurations
│       └── log_normalizer.ts  # Log normalization engine
├── agent/                     # Python log collection agent
│   ├── event_log_agent.py    # Main agent script
│   └── config.ini.example    # Agent configuration template
├── docs/                      # Documentation
├── docker-compose.yml         # TimescaleDB setup
├── create_tables.sql          # Database schema
└── package.json              # Dependencies and scripts
```

## 🤖 Log Collection Agent

The Python-based log collection agent supports:

### Windows Systems
- **Windows Event Logs**: PowerShell-based collection with JSON conversion
- **File-based logs**: Configurable file tailing for application logs

### macOS Systems (New!)
- **System Logs**: `/var/log/system.log`
- **Install Logs**: `/var/log/install.log`
- **Authentication Events**: Login/logout tracking
- **Security Events**: Security-related activities
- **Process Events**: Process creation/termination
- **Network Events**: Network activity monitoring
- **Firewall Events**: Firewall rule triggers
- **Kernel Events**: Kernel-level activities
- **Audit Trail**: System audit logs

### Supported Log Source Identifiers
- `windows_event_json` - Windows Event Logs (JSON format)
- `syslog_rfc5424` - Standard syslog format
- `macos_install_events` - macOS installation logs
- `macos_system_log` - macOS system logs
- `macos_auth_events` - macOS authentication logs
- `macos_security_events` - macOS security logs
- `macos_process_events` - macOS process logs
- `macos_network_events` - macOS network logs
- `macos_firewall_events` - macOS firewall logs
- And many more...

## 🔧 Configuration

### Agent Configuration
The agent uses `agent/config.ini` for configuration:

```ini
[DEFAULT]
INGEST_API_URL = http://localhost:3002/api/ingest
BATCH_SIZE = 10
FLUSH_INTERVAL_SECONDS = 5

[FileLog:MacInstallLogs]
ENABLED = true
LOG_SOURCE_IDENTIFIER = macos_install_events
FILE_PATH = /var/log/install.log
COLLECTION_INTERVAL_SECONDS = 30
```

### Database Configuration
TimescaleDB is configured via `docker-compose.yml`:
- Database: `eventlog_dev`
- User: `eventlogger`
- Port: `5432`
- Hypertable: `events` (partitioned by timestamp)

## 📊 Recent Updates

### Latest Features (v1.3.0)
- ✅ **macOS Log Support**: Comprehensive macOS log collection and normalization
- ✅ **Agent Reliability**: Fixed file position tracking and improved error handling
- ✅ **Database Compatibility**: Updated TimescaleDB configuration for production use
- ✅ **Port Flexibility**: Configurable ports to avoid conflicts

### Previous Features
- ✅ **Dashboard Interface**: Modern React-based dashboard
- ✅ **Event Visualization**: Charts and graphs for log analysis
- ✅ **Windows Support**: Complete Windows Event Log integration
- ✅ **SIEM Query Generation**: Multi-platform query generation

## 🐛 Troubleshooting

### Common Build Issues

1. **Missing @heroicons/react**: 
   ```bash
   npm install @heroicons/react
   ```

2. **Port already in use**:
   ```bash
   npm run dev -- -p 3001
   ```

3. **Database connection issues**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Agent Issues

1. **File permission errors**: Ensure agent has read access to log files
2. **API connection errors**: Verify `INGEST_API_URL` in config.ini
3. **macOS log access**: Some logs may require elevated permissions

For detailed troubleshooting, see [docs/agent_setup_and_usage.md](docs/agent_setup_and_usage.md).

## 📚 Learning Resources

This project is designed for educational purposes in cybersecurity training:

- **Windows Event Log Analysis**: Understanding event IDs, log sources, and security implications
- **macOS Security Monitoring**: Learning macOS-specific security events and patterns
- **SIEM Concepts**: Log aggregation, correlation, and alerting
- **Incident Response**: Using logs for security investigations
- **Threat Hunting**: Proactive security monitoring techniques

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create a Pull Request

### Adding New Log Sources
To add support for new log sources:

1. Update `src/lib/log_normalizer.ts` with new normalization logic
2. Add corresponding log source identifier to the agent configuration
3. Test with sample log data
4. Update documentation

## 📄 License

This project is intended for educational use in cybersecurity training programs.

## 👨‍💻 Author

**Ian Trimble**
- Email: itrimble@gmail.com
- GitHub: [@itrimble](https://github.com/itrimble)
- Organization: Remnant Security Group

## 🔗 Related Resources

- [Windows Event Log Documentation](https://docs.microsoft.com/en-us/windows/win32/eventlog/event-logging)
- [macOS Unified Logging](https://developer.apple.com/documentation/os/logging)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ThriveDX Cybersecurity Training](https://thrivedx.com/)

## 🙏 Acknowledgments

- ThriveDX for cybersecurity education excellence
- MITRE Corporation for the ATT&CK framework
- Microsoft for comprehensive Windows Event documentation
- Apple for macOS security logging capabilities
- The cybersecurity community for threat intelligence sharing

---

**Built for cybersecurity education and hands-on learning** 🛡️