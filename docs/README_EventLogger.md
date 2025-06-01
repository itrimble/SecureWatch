# Event Logger Application

## Overview
Event Logger is a comprehensive Windows Event Log analysis platform designed for cybersecurity education, training, and real-world security monitoring. Built with Next.js 15, it provides a modern interface for exploring, analyzing, and visualizing Windows Event Logs, making it an essential tool for security professionals, incident responders, and IT administrators.

## Key Features

### 🔍 **Event Log Exploration**
- Real-time search and filtering with KQL (Kusto Query Language) support
- Advanced filtering by event ID, source, level, and time range
- Detailed event viewer with JSON data exploration
- Export capabilities (CSV, JSON, XML)

### 📊 **Interactive Dashboards**
- **Overview Dashboard**: System health, critical alerts, and event statistics
- **Authentication Dashboard**: Login patterns, failed attempts, privilege escalations
- **Malware Defense Dashboard**: Threat detection, quarantine activities, scan results
- **Insider Threat Dashboard**: Unusual access patterns, data exfiltration attempts
- **Supply Chain Risk Dashboard**: Third-party software risks, update anomalies
- **CASB Integration Dashboard**: Cloud access security broker insights

### 🚨 **Alert Management**
- Real-time alert generation based on predefined rules
- Customizable alert thresholds and conditions
- Alert history and trend analysis
- Integration with notification systems

### 📈 **Visualization & Analytics**
- Events over time charts
- Top event IDs analysis
- Event correlation graphs
- Heat maps for activity patterns
- Timeline views for incident investigation

### 📝 **Reporting**
- Automated report generation
- Scheduled report delivery
- Customizable report templates
- Executive summaries and technical deep-dives

### 🔧 **Log Source Management**
- Multi-source log ingestion
- Real-time agent integration
- Log source health monitoring
- Configuration management

### 🛡️ **Security Features**
- SIEM query generation for popular platforms
- Threat intelligence integration (OTX feeds)
- Incident response workflows
- Compliance reporting support

## Technical Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Heroicons
- **Build Tool**: Turbopack (development)
- **Backend**: Supabase (optional), RESTful APIs
- **Agent**: Python-based log collection agent

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn
- Git
- Python 3.8+ (for agent)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/EventLogTutorialThriveDX.git
   cd EventLogTutorialThriveDX
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build
```bash
npm run build
npm start
```

## Agent Setup

The Event Logger includes a Python-based agent for collecting Windows Event Logs:

1. **Navigate to agent directory**
   ```bash
   cd agent
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install agent dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure agent**
   ```bash
   cp config.ini.example config.ini
   # Edit config.ini with your settings
   ```

5. **Run agent**
   ```bash
   python event_log_agent.py
   ```

## Project Structure

```
EventLogTutorialThriveDX/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Main dashboard
│   │   ├── explorer/          # Event log browser
│   │   ├── visualizations/    # Charts and analytics
│   │   ├── reporting/         # Report generation
│   │   ├── alerts/            # Alert management
│   │   └── settings/          # Configuration
│   ├── components/            # Reusable React components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── explorer/          # Event exploration components
│   │   ├── visualization/     # Chart components
│   │   └── layout/            # Navigation and layout
│   └── lib/                   # Utilities and helpers
│       ├── kql_parser/        # KQL parsing functionality
│       ├── threat_intel/      # Threat intelligence integration
│       └── data/              # Mock data and configurations
├── agent/                     # Python log collection agent
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## Use Cases

### Security Operations Center (SOC)
- Real-time monitoring of security events
- Incident detection and response
- Threat hunting and investigation
- Compliance monitoring

### IT Administration
- System health monitoring
- User activity tracking
- Performance analysis
- Troubleshooting

### Cybersecurity Education
- Hands-on training with real event log data
- Understanding Windows security events
- Learning threat detection techniques
- Practicing incident response

### Compliance & Auditing
- Generate compliance reports
- Track user access and activities
- Monitor privileged account usage
- Document security incidents

## Configuration

### Environment Variables
Create a `.env.local` file for configuration:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Agent Configuration
AGENT_API_KEY=your-agent-api-key
```

### Agent Configuration
Edit `agent/config.ini`:

```ini
[DEFAULT]
api_endpoint = http://localhost:3000/api/ingest
api_key = your-agent-api-key
batch_size = 100
poll_interval = 60

[LOG_SOURCES]
security = True
application = True
system = True
```

## API Documentation

### Event Ingestion
```http
POST /api/ingest
Content-Type: application/json

{
  "events": [
    {
      "timestamp": "2024-01-20T10:30:00Z",
      "eventId": 4624,
      "source": "Security",
      "level": "Information",
      "message": "An account was successfully logged on",
      "data": {...}
    }
  ]
}
```

### Query Events
```http
POST /api/query
Content-Type: application/json

{
  "kql": "EventID == 4624 and TimeGenerated > ago(1h)",
  "limit": 100
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Considerations

- The application uses mock data by default for safety
- Never commit real log files or sensitive data
- Use environment variables for secrets
- Follow security best practices when deploying

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Report bugs via GitHub Issues
- **Community**: Join our Discord server (link TBD)

## Roadmap

- [ ] Real-time streaming log ingestion
- [ ] Machine learning-based anomaly detection
- [ ] Multi-tenant support
- [ ] Enhanced threat intelligence integration
- [ ] Mobile responsive design improvements
- [ ] Advanced correlation engine
- [ ] Integration with popular SIEM platforms

## Acknowledgments

- Built for ThriveDX cybersecurity education
- Inspired by enterprise SIEM solutions
- Community contributions and feedback

---

**Note**: This application is designed for educational and training purposes. When using with real production data, ensure proper security measures are in place.