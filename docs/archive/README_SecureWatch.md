# SecureWatch SIEM Platform

![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Live Pipeline](https://img.shields.io/badge/pipeline-live-success.svg)

<p align="center">
  <img src="public/images/siem-interface.png" alt="SecureWatch SIEM Interface" width="800">
</p>

## Overview

SecureWatch is an advanced Security Information and Event Management (SIEM) platform designed for modern enterprise security operations. Built with Next.js and powered by KQL (Kusto Query Language), SecureWatch provides comprehensive security monitoring, threat detection, incident response, and compliance capabilities in a unified interface.

**🚀 CURRENT STATUS: FULLY OPERATIONAL**
- ✅ Live Mac Agent collecting from 15+ system sources  
- ✅ Real-time log ingestion with 0% error rate
- ✅ TimescaleDB storing 3,000+ live log entries
- ✅ End-to-end pipeline: Agent → Ingestion → Database → Search → Frontend

## Key Features

### 🔍 Advanced Log Search & Analytics
- **KQL-Powered Search Engine**: Complete Microsoft Sentinel-style KQL implementation with query templates
- **Interactive Visualizations**: Heatmaps, network graphs, geolocation maps, and timeline analysis
- **Customizable Dashboards**: Drag-drop widget system with 8+ specialized security components
- **Real-time Log Ingestion**: Process millions of events per second with 0% error rate
- **Query-to-Visualization Pipeline**: Seamless transformation from KQL queries to interactive charts
- **Export & Reporting**: Multi-format exports (CSV, JSON, Visual) with automated reporting

### 🛡️ Threat Detection & Intelligence
- **AI-Enhanced Detection**: Leverage machine learning for anomaly detection
- **Threat Intelligence Integration**: Connect with VirusTotal, MISP, Shodan, and more
- **UEBA Capabilities**: User and Entity Behavior Analytics with configurable thresholds
- **Insider Risk Management**: Detect and respond to insider threats

### 🔄 Incident Response
- **Case Management**: Streamlined investigation workflow
- **Automated Playbooks**: Orchestrate response actions
- **Evidence Collection**: Gather and preserve forensic data
- **Timeline Analysis**: Chronological view of security events

### 🔌 Extensive Integrations
- **MCP Support**: Multi-Cloud Platform integration
- **Local LLM Options**: Use Ollama or LM Studio for private AI analysis
- **Vulnerability Management**: Connect with Nessus, Semgrep, and more
- **SIEM Tool Integration**: Wazuh, CloudWatch Logs, and other security tools

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Modern web browser (Chrome, Firefox, Edge, Safari)

## 📚 Documentation

### Comprehensive Guides
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)**: Complete setup and configuration instructions
- **[KQL API Guide](KQL_API_GUIDE.md)**: Full API documentation for KQL search and visualization
- **[Visualization User Guide](VISUALIZATION_USER_GUIDE.md)**: User manual for all visualization features
- **[Testing Framework](testing-framework.md)**: Quality assurance and testing procedures
- **[Bug Tracking](bug-tracker.md)**: Issue management and resolution workflow

### Quick References
- **KQL Query Examples**: Pre-built security analysis queries
- **Dashboard Widget Catalog**: Complete widget library with use cases
- **Visualization Best Practices**: Guidelines for effective security analysis
- **Performance Optimization**: Tips for large-scale deployments
- **API Integration Examples**: Code samples for custom integrations

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/securewatch-siem.git
   cd securewatch-siem