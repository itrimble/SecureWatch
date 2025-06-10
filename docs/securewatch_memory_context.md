# Project Context - SecureWatch SIEM Platform

## Recent Updates (June 10, 2025) - Production Optimization & Claude Code Integration

### Memory Update: Budget-Conscious Development Strategy
- Operating under Claude Max $100 plan - optimize for efficiency and automation
- Prioritize MCP tools and Claude Code to reduce manual overhead and maximize value
- Focus on production-ready configurations that minimize ongoing operational costs

### Memory Update: TaskMaster Workflow Integration
- Primary project management through TaskMaster MCP at `/Users/ian/Scripts/SecureWatch/tasks/`
- TaskMaster tasks.json contains comprehensive SecureWatch development roadmap
- Use MCP visionquery for AI-powered development patterns and best practices
- Leverage openmemory MCP for persistent context across Claude Code sessions
- When starting new tasks, always check TaskMaster status and use VisionCraft docs first

### Memory Update: Production Infrastructure Stack
- **Core Platform**: SecureWatch SIEM at `/Users/ian/Scripts/SecureWatch/`
- **Container Orchestration**: Kubernetes production deployment with HPA, resource limits, rolling updates
- **Data Layer**: TimescaleDB, Redis cluster, Kafka/Zookeeper for real-time processing
- **Search & Analytics**: Elasticsearch/Kibana stack with custom correlation engine
- **Transport Layer**: Rust agent with advanced resource management and optimization
- **Frontend**: Next.js 14+ with TypeScript, ShadCN UI, deployed via Vercel
- **Backend Services**: 12+ microservices architecture with Docker containerization

### Memory Update: Development Automation Priorities
- **Claude Code Integration**: Automated task execution via MCP tools
- **CI/CD Pipeline**: GitHub Actions with Vercel deployment automation
- **Cost Optimization**: AWS cost management scripts for stop/start resource control
- **Documentation**: Auto-generated via Read the Docs integration
- **Testing**: Playwright for E2E, Jest for unit tests, comprehensive QA automation
- **Monitoring**: Observability stack with Prometheus, Grafana, and alerting

## GitHub Repository & Documentation Links:
- **Primary Repository**: https://github.com/itrimble/SecureWatch
- **Documentation**: https://securewatch.readthedocs.io/en/latest/
- **CI/CD Pipeline**: https://github.com/itrimble/SecureWatch/actions
- **Security Scanning**: https://github.com/itrimble/SecureWatch/security

## Core Platform Technology Links:
- **Next.js 15**: https://nextjs.org/docs
- **Vercel Deployment**: https://vercel.com/dashboard
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Docker**: https://docs.docker.com/
- **Kubernetes**: https://kubernetes.io/docs/
- **TimescaleDB**: https://docs.timescale.com/
- **Redis**: https://redis.io/docs/
- **Kafka**: https://kafka.apache.org/documentation/
- **Elasticsearch**: https://www.elastic.co/guide/
- **Rust**: https://doc.rust-lang.org/
- **Pydantic**: https://docs.pydantic.dev/
- **ShadCN UI**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs

## MCP Integration Priorities:
- **PRIMARY**: VisionCraft for AI-powered development patterns and best practices
- **SECONDARY**: Context7 for library documentation and API references when VisionCraft unavailable
- **AUTOMATION**: TaskMaster for project management, wcgw for shell automation
- **DEVELOPMENT**: GitHub MCP for repo operations, desktop-commander for file management
- **TESTING**: Playwright for browser automation, screenshot for visual testing
- **INFRASTRUCTURE**: AWS SSO MCP for cloud resource management, Docker MCP for containerization
- **PRODUCTIVITY**: Moom for window management, screenpipe for workflow recording
- **COST CONTROL**: AWS Instance Manager for resource optimization, automated stop/start scripts

### Memory Update: Resource Optimization Strategy
- Kubernetes HPA for dynamic scaling based on actual load
- AWS cost optimization through automated instance management
- Efficient Docker multi-stage builds for minimal image sizes
- Vercel edge functions for global performance optimization
- TimescaleDB compression for long-term data retention efficiency
- Redis clustering for high-availability with resource efficiency

### Memory Update: Quality Assurance Framework
- Automated security scanning via GitHub Actions
- Performance monitoring with custom metrics dashboards
- Error tracking system with comprehensive logging
- Automated backup strategies for critical data
- Disaster recovery procedures with RTO/RPO targets

### Memory Update: Changelog Principles
- Follow keepachangelog.com/en/1.1.0/ standards for version management
- Maintain detailed changelog for SecureWatch platform updates
- Document breaking changes, deprecations, and security updates clearly

### Memory Update: Development Model
- Always use Claude Sonnet 4 for SecureWatch project development
- Leverage TaskMaster MCP for task tracking and dependency management
- Integrate VisionCraft patterns for scalable AI development practices
- Maintain Context7 integration as fallback for library documentation

## Current Automated Workflow Stack:
### CI/CD Pipeline (GitHub Actions)
- **ci.yml**: Automated build, test, and deployment pipeline
- **security-scan.yml**: Comprehensive security scanning with vulnerability detection
- **Automatic Triggers**: Push to main branch, pull requests, scheduled security scans

### Build & Development Automation (Makefile)
- **Service Management**: `make up/down/restart` with health monitoring
- **Development Workflows**: `make dev/debug/minimal` for different environments
- **Health Monitoring**: `make health/status/dashboard` for real-time monitoring
- **Infrastructure Management**: `make infra-up/down/reset` for database/cache services
- **Code Quality**: `make build/test/lint/format` for quality assurance

### Container Orchestration (Docker Compose)
- **Development Environment**: `docker-compose.dev.yml` for local development
- **Resilient Architecture**: `docker-compose.resilient.yml` for high-availability
- **OpenSearch Integration**: `docker-compose.opensearch.yml` for search analytics
- **Production Ready**: Multi-service orchestration with proper networking

### Service Scripts & Automation
- **Enhanced Service Management**: `start-services.sh` with health monitoring
- **CLI Dashboard**: `cli-dashboard.sh` with real-time service monitoring
- **Agent Installation**: `install_agent_mac.sh` for automated agent deployment

---

**Claude Code Optimization Notes:**
- Use TaskMaster MCP for all task creation and status updates
- Leverage VisionCraft MCP for AI development best practices
- Implement cost-conscious resource management throughout development
- Prioritize automation to maximize value within $100/month Claude plan
- Focus on production-ready, scalable solutions that minimize ongoing maintenance

## Recommended Automation Enhancements for Claude Code Integration:

### 1. **Advanced GitHub Actions Workflow**
```yaml
# .github/workflows/claude-code-integration.yml
- Automated TaskMaster task updates on PR merge
- Vercel deployment with health checks
- Slack/Discord notifications for deployment status
- Automated changelog generation using conventional commits
- Cost monitoring alerts for AWS resources
```

### 2. **Enhanced MCP Workflow Integration**
```bash
# Daily automation scripts
- Morning: TaskMaster status check → Claude Code task prioritization
- Development: Real-time error tracking → bug_tracker.json updates
- Evening: Automated backup of tasks/ directory → GitHub commit
- Weekly: Cost analysis report → AWS spending optimization
```

### 3. **Intelligent Cost Management System**
```typescript
// scripts/claude-cost-optimizer.ts
- Monitor Claude API usage throughout development sessions
- Auto-pause expensive operations when approaching budget limits
- Prioritize VisionCraft queries over Context7 for better efficiency
- Generate weekly usage reports with optimization suggestions
```

### 4. **Production Deployment Automation**
```bash
# Enhanced deployment pipeline
- Pre-deployment: Automated security scanning + performance tests
- Deployment: Zero-downtime rolling updates via Kubernetes
- Post-deployment: Health monitoring + automated rollback triggers
- Monitoring: Real-time alerts for service degradation
```

### 5. **Development Environment Optimization**
```makefile
# Enhanced Makefile targets for Claude Code
claude-setup:     # Initialize Claude Code session with TaskMaster sync
claude-status:    # Show current tasks + service health in one view
claude-deploy:    # Intelligent deployment based on TaskMaster priorities
claude-monitor:   # Real-time dashboard optimized for Claude Code workflows
```