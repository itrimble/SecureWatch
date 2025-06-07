# SecureWatch SIEM Platform Documentation

```{image} _static/securewatch-logo.svg
:alt: SecureWatch Logo
:width: 200px
:align: center
```

Welcome to the **SecureWatch SIEM Platform** documentation! SecureWatch is a comprehensive, enterprise-grade Security Information and Event Management (SIEM) platform built with modern microservices architecture and designed for scalability, performance, and ease of use.

## What is SecureWatch?

SecureWatch provides real-time security monitoring, threat detection, and incident response capabilities for organizations of all sizes. Built on a foundation of proven technologies and security best practices, it offers:

- **Universal Data Ingestion** - Collect logs from any source via syslog, HTTP Event Collector (HEC), agents, and file uploads
- **Real-time Analysis** - Powered by KQL (Kusto Query Language) for advanced log analysis and threat hunting
- **Automated Correlation** - Built-in correlation engine with MITRE ATT&CK framework integration
- **Enterprise Security** - Multi-tenancy, RBAC, OAuth, MFA, and comprehensive audit trails
- **Modern Architecture** - Cloud-native microservices designed for horizontal scaling

:::{admonition} Version 2.1.0 - Latest Release
:class: tip

This documentation covers SecureWatch v2.1.0, featuring major architecture consolidation, enhanced performance, and streamlined deployment. See {doc}`CHANGELOG` for complete release notes.
:::

## Quick Start

Get SecureWatch running in minutes with our comprehensive guides:

::::{grid} 2
:gutter: 3

:::{grid-item-card} 🚀 Quick Start Guide
:link: QUICK_START
:link-type: doc

Get up and running with SecureWatch in under 10 minutes using our streamlined installation process.
:::

:::{grid-item-card} 🔧 Enterprise Deployment
:link: ENTERPRISE_DEPLOYMENT
:link-type: doc

Production-ready deployment guide with HA configuration, security hardening, and monitoring.
:::

:::{grid-item-card} 📊 Data Ingestion
:link: DATA_INGESTION_GUIDE
:link-type: doc

Learn how to connect your log sources and start collecting security data immediately.
:::

:::{grid-item-card} 🔍 KQL Analytics
:link: KQL_API_GUIDE
:link-type: doc

Master the power of KQL for advanced threat hunting and security analysis.
:::

::::

```{toctree}
:maxdepth: 2
:caption: 🚀 Getting Started
:hidden:

README
QUICK_START
DEPLOYMENT_GUIDE
ENTERPRISE_DEPLOYMENT
aws-ec2-free-tier-tutorial
```

```{toctree}
:maxdepth: 2
:caption: 📖 User Guides
:hidden:

DATA_INGESTION_GUIDE
LOG_FORMATS_GUIDE
KQL_API_GUIDE
VISUALIZATION_USER_GUIDE
LOOKUP_TABLES_USER_GUIDE
CLI_DASHBOARD_IMPLEMENTATION
TROUBLESHOOTING_EXPORT_USER_GUIDE
```

```{toctree}
:maxdepth: 2
:caption: 🔒 Security & Operations
:hidden:

SECURITY_CONFIGURATION_GUIDE
SECURITY_FIXES_SUMMARY
INCIDENT_RESPONSE_PROCEDURES
PERFORMANCE_OPTIMIZATION_GUIDE
PORT_CONFIGURATION
```

```{toctree}
:maxdepth: 2
:caption: 🛠 Developer Documentation
:hidden:

MONOREPO_SETUP
CORRELATION_RULES_ENGINE_ERD
ENTITY_RELATIONSHIP_DIAGRAM
EVTX_PARSING_STRATEGY
EVTX_PARSER_ENHANCED
OPENSEARCH_INTEGRATION_GUIDE
testing-framework
windows-event-field-mappings
```

```{toctree}
:maxdepth: 2
:caption: 📡 API Reference
:hidden:

KQL_API_GUIDE
PERFORMANCE_API_GUIDE
SUPPORT_BUNDLE_API_GUIDE
```

```{toctree}
:maxdepth: 1
:caption: 📋 Additional Resources
:hidden:

CHANGELOG
claude-siem-integration-guide
bug-tracker
```

## Architecture Overview

SecureWatch v2.1.0 features a streamlined microservices architecture with 8 core services:

```{mermaid}
graph TB
    subgraph "Data Ingestion Layer"
        A[Syslog] --> D[Log Ingestion Service<br/>Port 4002]
        B[HEC API] --> E[HEC Service<br/>Port 8888]
        C[Agent] --> D
        F[File Upload] --> D
    end
    
    subgraph "Processing Layer"
        D --> G[Search API<br/>Port 4004]
        E --> G
        G --> H[Correlation Engine<br/>Port 4005]
        G --> I[Analytics Engine<br/>Port 4009]
        G --> J[Query Processor<br/>Port 4008]
    end
    
    subgraph "Security & Integration"
        K[Auth Service<br/>Port 4006] --> L[Frontend<br/>Port 4000]
        M[MCP Marketplace<br/>Port 4010] --> L
    end
    
    subgraph "Data Storage"
        N[(TimescaleDB)]
        O[(Redis)]
        P[(OpenSearch)]
    end
    
    G --> N
    H --> N
    I --> N
    J --> O
    L --> G
    L --> I
```

## Key Features

:::::{grid} 1 2 2 3
:gutter: 2

::::{grid-item-card} ⚡ Real-time Processing
:class-header: sd-bg-primary sd-text-white

Process millions of events per second with TimescaleDB optimization and intelligent caching
::::

::::{grid-item-card} 🔍 Advanced Analytics
:class-header: sd-bg-secondary sd-text-white

KQL-powered search engine with correlation rules, threat intelligence, and MITRE ATT&CK integration
::::

::::{grid-item-card} 🛡️ Enterprise Security
:class-header: sd-bg-success sd-text-white

Multi-tenancy, RBAC, OAuth, MFA, audit trails, and comprehensive compliance frameworks
::::

::::{grid-item-card} 🚀 Cloud Native
:class-header: sd-bg-info sd-text-white

Kubernetes-ready, horizontally scalable microservices with Docker containerization
::::

::::{grid-item-card} 📊 Rich Visualizations
:class-header: sd-bg-warning sd-text-white

Interactive dashboards, heatmaps, network graphs, geolocation maps, and custom widgets
::::

::::{grid-item-card} 🔌 Universal Ingestion
:class-header: sd-bg-danger sd-text-white

Syslog, HEC, agents, file uploads - collect data from any source in any format
::::

:::::

## Community & Support

::::{grid} 2
:gutter: 3

:::{grid-item-card} 🐛 Report Issues
:link: https://github.com/yourusername/SecureWatch/issues
:link-type: url

Found a bug? Have a feature request? Open an issue on GitHub.
:::

:::{grid-item-card} 💬 Join Discussions
:link: https://github.com/yourusername/SecureWatch/discussions
:link-type: url

Connect with the community, share ideas, and get help from other users.
:::

::::

## Quick Links

- 🏠 [Project Homepage](https://github.com/yourusername/SecureWatch)
- 📦 [Latest Release](https://github.com/yourusername/SecureWatch/releases)
- 🔄 [Change Log](CHANGELOG.md)
- ⚙️ [Configuration Guide](DEPLOYMENT_GUIDE.md)
- 🎯 [Performance Tuning](PERFORMANCE_OPTIMIZATION_GUIDE.md)

---

*SecureWatch SIEM Platform - Enterprise security monitoring made simple.*
