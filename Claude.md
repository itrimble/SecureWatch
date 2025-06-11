# Project Context - SecureWatch SIEM Platform

## Recent Updates (June 9, 2025) - Advanced Transport Layer Implementation

### Memory Update: Changelog Principles

- remember to follow the principles here: https://keepachangelog.com/en/1.1.0/

### Memory Update: Taskmaster Workflow Reminder

- when every task is run from taskmaster use MCP visionquest to make sure we are working with the latest data
- make sure to take advantage of mcp openmemory for storage and retrieval of memories related to this project
- if you are not sure about something, don't forget that there is the project's CLAUDE.md as well as OpenMemories MCP, and VisionWorks and Context7, the task master tasks are in the /users/ian/Scripts/SecureWatch/tasks folder
- when you start a new task, don't forget to use MCPs, use Visionworks to have the latest documentation
- when i say add to the todo list ? or what is on the todo list, I am reffering to the taskmaster tasks

### Memory Update: Development Model

- always use Claude Sonnet 4 for this project
- Operating under Claude Max $100 plan - optimize for efficiency and automation
- Prioritize MCP tools and Claude Code to reduce manual overhead and maximize value
- Focus on production-ready configurations that minimize ongoing operational costs

### Memory Update: Error Tracking

- track errors that you have not resolved in a file so that we can troubleshoot them in the future
- the error tracking log needs to be automatic

### Memory Update: Task 24 Research

- Task 24 Research for the natural language query is located here: /Users/ian/Downloads/Task_24_Research.txt make sure you refer to it when it comes to do the work

### Memory Update: TaskMaster Workflow Integration

- Primary project management through TaskMaster MCP at /Users/ian/Scripts/SecureWatch/tasks/
- TaskMaster tasks.json contains comprehensive SecureWatch development roadmap
- Use MCP visionquery for AI-powered development patterns and best practices
- Leverage openmemory MCP for persistent context across Claude Code sessions
- When starting new tasks, always check TaskMaster status and use VisionCraft docs first

### Memory Update: Production Infrastructure Stack

- Core Platform: SecureWatch SIEM at /Users/ian/Scripts/SecureWatch/
- Container Orchestration: Kubernetes production deployment with HPA, resource limits, rolling updates
- Data Layer: TimescaleDB, Redis cluster, Kafka/Zookeeper for real-time processing
- Search & Analytics: Elasticsearch/Kibana stack with custom correlation engine
- Transport Layer: Rust agent with advanced resource management and optimization
- Frontend: Next.js 14+ with TypeScript, ShadCN UI, deployed via Vercel
- Backend Services: 12+ microservices architecture with Docker containerization

### Memory Update: Development Automation Priorities

- Claude Code Integration: Automated task execution via MCP tools
- CI/CD Pipeline: GitHub Actions with Vercel deployment automation
- Cost Optimization: AWS cost management scripts for stop/start resource control
- Documentation: Auto-generated via Read the Docs integration
- Testing: Playwright for E2E, Jest for unit tests, comprehensive QA automation
- Monitoring: Observability stack with Prometheus, Grafana, and alerting

### GitHub Repository & Documentation Links

- Primary Repository: https://github.com/itrimble/SecureWatch
- Documentation: https://securewatch.readthedocs.io/en/latest/
- CI/CD Pipeline: https://github.com/itrimble/SecureWatch/actions
- Security Scanning: https://github.com/itrimble/SecureWatch/security

### Core Platform Technology Links

- Next.js 15: https://nextjs.org/docs
- Vercel Deployment: https://vercel.com/dashboard
- TypeScript: https://www.typescriptlang.org/docs/
- Docker: https://docs.docker.com/
- Kubernetes: https://kubernetes.io/docs/
- TimescaleDB: https://docs.timescale.com/
- Redis: https://redis.io/docs/
- Kafka: https://kafka.apache.org/documentation/
- Elasticsearch: https://www.elastic.co/guide/
- Rust: https://doc.rust-lang.org/
- Pydantic: https://docs.pydantic.dev/
- ShadCN UI: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs

### MCP Integration Priorities

- PRIMARY: VisionCraft for AI-powered development patterns and best practices
- SECONDARY: Context7 for library documentation and API references when VisionCraft unavailable
- AUTOMATION: TaskMaster for project management, wcgw for shell automation
- DEVELOPMENT: GitHub MCP for repo operations, desktop-commander for file management
- TESTING: Playwright for browser automation, screenshot for visual testing
- INFRASTRUCTURE: AWS SSO MCP for cloud resource management, Docker MCP for containerization
- PRODUCTIVITY: Moom for window management, screenpipe for workflow recording
- COST CONTROL: AWS Instance Manager for resource optimization, automated stop/start scripts

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

### Current Automated Workflow Stack

#### CI/CD Pipeline (GitHub Actions)

- ci.yml: Automated build, test, and deployment pipeline
- security-scan.yml: Comprehensive security scanning with vulnerability detection
- Automatic Triggers: Push to main branch, pull requests, scheduled security scans

#### Build & Development Automation (Makefile)

- Service Management: make up/down/restart with health monitoring
- Development Workflows: make dev/debug/minimal for different environments
- Health Monitoring: make health/status/dashboard for real-time monitoring
- Infrastructure Management: make infra-up/down/reset for database/cache services
- Code Quality: make build/test/lint/format for quality assurance

#### Container Orchestration (Docker Compose)

- Development Environment: docker-compose.dev.yml for local development
- Resilient Architecture: docker-compose.resilient.yml for high-availability
- OpenSearch Integration: docker-compose.opensearch.yml for search analytics
- Production Ready: Multi-service orchestration with proper networking

#### Service Scripts & Automation

- Enhanced Service Management: start-services.sh with health monitoring
- CLI Dashboard: cli-dashboard.sh with real-time service monitoring
- Agent Installation: install_agent_mac.sh for automated agent deployment

### Claude Code Optimization Notes

- Use TaskMaster MCP for all task creation and status updates
- Leverage VisionCraft MCP for AI development best practices
- Implement cost-conscious resource management throughout development
- Prioritize automation to maximize value within $100/month Claude plan
- Focus on production-ready, scalable solutions that minimize ongoing maintenance

### Memory Update: Development Best Practices

- Set up Husky or lint-staged to auto-lint and format before every commit

### Memory Update: SecureWatch Documentation Location

- Documentation for the SecureWatch platform architecture is located at: /Users/ian/Scripts/SecureWatch/docs/securewatch_architecture.md
- Always refer to this document for the latest architectural overview and design principles

### Memory Update: Vision Clarification

- when i say vision, i mean use MCP visioncraft

### Memory Update: Session Management

- use openmemories mcp if we start a new session

## Agent Development Status (Rust Implementation)
