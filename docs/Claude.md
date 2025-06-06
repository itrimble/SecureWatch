# Claude.md

## 1. Project Overview
- **Brief description:** A comprehensive enterprise-grade SIEM (Security Information and Event Management) platform with Splunk-compatible data ingestion capabilities. Built with Next.js 15, this production-ready system features **HTTP Event Collector (HEC) service for Splunk-compatible REST API ingestion**, **universal syslog support (UDP 514, TCP 514, TCP 601 RFC 5425, TLS 6514)**, **file upload API with drag-and-drop interface for CSV/XML/JSON/EVTX files**, **enhanced agent with persistent SQLite queuing and guaranteed delivery**, live Mac agent data collection, TimescaleDB storage with **extended normalized schema (100+ fields)**, KQL-powered search and visualization pipeline, real-time correlation & rules engine with automated threat detection, customizable drag-drop dashboards, interactive analytics (heatmaps, network graphs, geolocation maps), **enhanced CLI dashboard v2.0 with granular service monitoring and control**, and a professional enterprise-grade UI with 25+ specialized security modules supporting **50+ enterprise security use cases** for comprehensive cybersecurity monitoring and threat detection.
- **Tech stack:**
    - **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS + Professional Dark Theme, Lucide React Icons, Recharts, Interactive Visualizations (Heatmaps, Network Graphs, Geolocation Maps), Customizable Dashboards, TanStack Virtual for 100K+ row virtualization
    - **Backend**: Express.js microservices, KQL Engine, Correlation & Rules Engine, PostgreSQL/TimescaleDB, Async Job Processing (Query Processor Service - Port 4008), Specialized Analytics API (Port 4009), WebSocket notifications
    - **Data Ingestion**: HTTP Event Collector (HEC) service (port 8888), Universal Syslog Adapter (UDP/TCP 514, TCP 601, TLS 6514), File Upload API with drag-and-drop interface, Multi-format processing (CSV, XML, JSON, EVTX)
    - **Agent**: Python 3.12+ with macOS Unified Logging integration, Persistent SQLite queuing, Guaranteed delivery with retry logic, Compression and batching
    - **CLI Dashboard**: Enhanced TypeScript-based terminal UI with blessed.js, granular service monitoring, collapsible panels, service control capabilities, **blessed-contrib rich dashboard with line charts, gauges, sparklines, Nerd Font support, and responsive 4K layouts**
    - **Infrastructure**: Docker Compose, Redis, Kafka (message streaming), TimescaleDB, OpenSearch
    - **Database**: TimescaleDB (PostgreSQL) with time-series optimization + Extended Normalized Schema (100+ security fields) + Continuous Aggregates for sub-second dashboard performance
    - **Performance**: TanStack Virtual for 100K+ row tables, TimescaleDB continuous aggregates (6 materialized views), Async job processing with Redis Bull queue, Specialized analytics endpoints with intelligent caching
    - **Build**: Turbopack (development), pnpm workspaces

## 2. Directory and File Structure
- **High-level directory map:**
  ```
  SecureWatch/
  ├── frontend/                  # Next.js App Router frontend
  │   ├── app/                   # App Router pages
  │   │   ├── page.tsx          # Dashboard (home page)
  │   │   ├── explorer/         # Event log browser with virtualized tables
  │   │   ├── visualizations/   # Charts and graphs
  │   │   ├── reporting/        # Report generation
  │   │   ├── settings/         # Configuration
  │   │   └── alerts/           # Alert management
  │   └── components/           # Reusable React components
  │       ├── explorer/         # EventsTable with TanStack Virtual
  │       ├── dashboard/        # Dashboard widgets
  │       └── visualization/    # Advanced visualizations
  ├── apps/                     # Microservices
  │   ├── search-api/           # Search & query service (Port 4004)
  │   ├── log-ingestion/        # Data ingestion service (Port 4002)
  │   ├── correlation-engine/   # Rules & correlation (Port 4005)
  │   ├── query-processor/      # Async job processing (Port 4008) ⭐ NEW
  │   ├── analytics-api/        # Fast dashboard APIs (Port 4009) ⭐ NEW
  │   ├── auth-service/         # Authentication (Port 4006)
  │   └── mcp-marketplace/      # MCP integration (Port 4010)
  ├── infrastructure/           # Database & infrastructure
  │   ├── database/
  │   │   ├── continuous_aggregates.sql    # Performance optimization ⭐ NEW
  │   │   └── migrations/       # Schema migrations
  │   └── kubernetes/           # K8s deployment configs
  ├── agent/                    # Mac agent for log collection
  ├── scripts/                  # Utility scripts
  ├── docs/                     # Documentation
  │   ├── PERFORMANCE_OPTIMIZATION_GUIDE.md ⭐ NEW
  │   └── DEPLOYMENT_GUIDE.md   # Updated with new services
  ├── package.json              # Dependencies and scripts
  └── README.md                 # Project README
  ```
- **Entry points:**
    - `src/app/layout.tsx`: The root layout component for the entire application.
    - `src/app/page.tsx`: The main dashboard page, serving as the primary landing page.
    - Other top-level `page.tsx` files under `src/app/*` (e.g., `src/app/explorer/page.tsx`) serve as entry points for their respective sections.

## 3. Key Concepts & Domain Knowledge
- **Core concepts:**
    - **Windows Event Log Analysis:** The project focuses on providing tools to explore, filter, and understand Windows Event Logs. This includes understanding common Event IDs, log sources, and their security implications.
    - **SIEM Concepts:** The application incorporates basic SIEM (Security Information and Event Management) ideas such as log aggregation (simulated with mock data), dashboard overviews, alert displays, and searching through log data.
    - **Incident Response:** The tools can be used to simulate how one might use event logs during security incident investigations (e.g., tracking user activity, identifying suspicious processes).
    - **Threat Hunting:** The platform can aid in learning proactive security monitoring techniques by exploring log data for anomalies or patterns that might indicate threats.
- **Domain-specific logic:**
    - The application heavily relies on understanding the structure and meaning of Windows Event IDs (e.g., `4624` for successful logon, `4625` for failed logon). Some of this data is present in `src/lib/data/windows_event_ids.json` and `docs/windows-event-id.csv`.
- **Data Source:**
    - The application now uses **live data** from a real Mac agent collecting logs from 15+ macOS sources including authentication, security events, process execution, network activity, and system logs.
    - **TimescaleDB** stores 3,000+ real log entries with **extended normalized schema (100+ security fields)** supporting threat intelligence, UEBA, compliance, and 50+ enterprise use cases.
    - **Advanced Schema Features**: Threat intelligence correlation, MITRE ATT&CK mapping, behavioral analytics, geolocation tracking, compliance frameworks (SOX, HIPAA, PCI-DSS, GDPR), and machine learning integration.
    - Mock data is maintained as fallback but the production flow uses live agent data end-to-end.
    - **CURRENT STATUS (June 2025)**: All services verified operational:
      - Mac Agent (PID 22516): ✅ Active log collection from 15+ sources
      - Log Ingestion (Port 4002): ✅ Processing 15 events per batch, 0% error rate
      - Search API (Port 4004): ✅ Connected to TimescaleDB with KQL engine
      - Correlation Engine (Port 4005): ✅ Real-time rules engine with pattern detection
      - Frontend (Port 4000): ✅ Live dashboard displaying real Mac logs with correlation interface
      - End-to-end pipeline: ✅ Mac Agent → Ingestion → TimescaleDB → Search API → Frontend
      - Correlation pipeline: ✅ Events → Correlation Engine → Rules Evaluation → Incident Generation
- **Glossary:**
    - **Event ID:** A numerical code that identifies a specific type of event in Windows logs.
    - **Log Source:** The origin of the log data (e.g., specific server, application).
    - **SIEM:** Security Information and Event Management.

## 4. How to Run, Build, and Test
- **Prerequisites:**
    - Node.js (version 18.x or later)
    - pnpm (recommended) or npm
    - Docker and Docker Compose
    - Git
- **Setup instructions:**
    1. **Clone the repository:**
       ```bash
       git clone https://github.com/itrimble/SecureWatch.git
       cd SecureWatch
       ```
    2. **Install dependencies:**
       ```bash
       pnpm install
       ```
- **Enterprise Startup (Recommended):**
    ```bash
    # Single command to start complete SIEM platform
    ./start-services.sh
    ```
    **This enterprise script automatically:**
    - ✅ Starts Docker infrastructure with health verification
    - ✅ Initializes database schema
    - ✅ Starts all services with proper dependency management
    - ✅ Runs comprehensive health checks
    - ✅ Provides real-time monitoring and auto-recovery
    - ✅ Handles graceful error recovery and service restart

- **Manual Startup (Advanced):**
    ```bash
    # 1. Start infrastructure
    docker compose -f docker-compose.dev.yml up -d
    
    # 2. Initialize database
    docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/auth_schema.sql
    
    # 3. Start services (in separate terminals)
    cd apps/search-api && pnpm run dev      # Port 4004
    cd apps/log-ingestion && pnpm run dev   # Port 4002
    cd apps/correlation-engine && pnpm run dev # Port 4005
    cd apps/query-processor && pnpm run dev # Port 4008 (NEW - Async Job Processing)
    cd apps/analytics-api && pnpm run dev   # Port 4009 (NEW - Fast Dashboard APIs)
    cd frontend && pnpm run dev             # Port 4000
    
    # 4. Start Mac agent (optional for live data)
    source agent_venv/bin/activate
    python3 agent/event_log_agent.py
    ```

- **Service Management:**
    - **Stop all services:** `./stop-services.sh`
    - **Restart services:** `./stop-services.sh && ./start-services.sh`
    - **Logs:** Available at `/tmp/{service-name}.log`

- **Build/test commands:**
    - **Production Build:** `pnpm run build`
    - **Linting:** `pnpm run lint`
    - **Unit Tests:** `pnpm run test`
    - **E2E Tests:** `pnpm run test:e2e`

- **Enterprise Health Monitoring:**
    - **Platform Health:** `curl http://localhost:4000/api/health`
    - **Search API:** `curl http://localhost:4004/health`
    - **Log Ingestion:** `curl http://localhost:4002/health`
    - **Correlation Engine:** `curl http://localhost:4005/health`
    - **Query Processor:** `curl http://localhost:4008/health` (NEW - Async Jobs)
    - **Analytics API:** `curl http://localhost:4009/health` (NEW - Fast Dashboards)
    - **Database Health:** `curl http://localhost:4002/db/health`
    - **Infrastructure Status:** `docker compose -f docker-compose.dev.yml ps`
    - **Agent Status:** `ps aux | grep event_log_agent.py`
    - **Real-time Monitoring:** Services auto-monitor and restart on failure
    - **Performance Metrics:** `curl http://localhost:4009/api/dashboard/cache-stats`
    - **Job Queue Status:** `curl http://localhost:4008/api/queue/stats`
    - **TROUBLESHOOTING NOTE**: If explorer shows static data instead of live Mac logs:
      1. Verify Mac agent is running: `ps aux | grep event_log_agent.py`
      2. Check log ingestion service: `curl http://localhost:4002/health`
      3. Check search API: `curl http://localhost:4004/health`
      4. Start frontend if down: `cd frontend && pnpm run dev`
      5. Verify end-to-end with headers: `curl -I http://localhost:4000/api/logs` (should show `x-data-source: live-backend`)

## 5. Tool and MCP Integration
- **List of enabled tools/MCPs:**
    - **Docker/Docker Compose:** Used for infrastructure management (`docker compose up -d`, health checks)
    - **Bash/Shell:** Used for running `pnpm` scripts, database operations, and container management
    - **Node.js runtime:** Required for executing the Next.js application and microservices
    - **ESLint:** Integrated for code linting (`pnpm run lint`)
    - **Database tools:** Direct PostgreSQL/TimescaleDB access via `docker exec` commands
    - **Redis CLI:** For cache operations and connectivity testing
    - **Python Virtual Environment:** For Mac agent execution (`agent_venv/`)
    - **Mac Agent:** Real-time log collection from macOS Unified Logging
    - **TimescaleDB:** Time-series database for log storage and analytics
    - **KQL Engine:** Kusto Query Language for log search and analysis
    - **Enhanced CLI Dashboard:** TypeScript-based terminal UI with service monitoring, control, and management capabilities (`cli-dashboard/`)
    - **Service Control System:** Automated service start/stop/restart with Docker and Node.js integration
    - **Enhanced EVTX Parser:** Comprehensive Windows Event Log parser with MITRE ATT&CK detection (`scripts/evtx_parser_enhanced.py`)
    - **EVTX Testing Suite:** Automated testing framework for EVTX-ATTACK-SAMPLES validation (`scripts/test_enhanced_evtx_pipeline.py`)
    - **EVTX Web Upload:** Frontend component for real-time EVTX file upload and parsing (`frontend/components/log-sources/evtx-file-upload.tsx`)
    - **Bug Tracking System:** Python-based bug tracking with JSON persistence (`scripts/bug-tracker.py`)
    - **Test Management System:** Comprehensive testing framework with unit and E2E test tracking (`scripts/test-tracker.py`)
- **Permissions and safety:**
    - **Bash/Shell:**
        - Be cautious with commands that modify or delete files (e.g., `rm`, `mv`).
        - Avoid running arbitrary scripts from untrusted sources.
        - When in doubt, ask for confirmation before executing potentially destructive commands.
    - **General:**
        - Do not commit sensitive information or credentials to the repository.
        - The project currently uses mock data, so there's minimal risk of exposing real user data from within the development environment itself.
- **Example tool commands:**
    - **Starting infrastructure:**
      ```bash
      docker compose -f docker-compose.dev.yml up -d
      ```
    - **Running the development server:**
      ```bash
      pnpm run dev
      ```
    - **Building the project:**
      ```bash
      pnpm run build
      ```
    - **Running linters:**
      ```bash
      pnpm run lint
      ```
    - **Database operations:**
      ```bash
      docker exec -i securewatch_postgres psql -U securewatch -d securewatch -c "\dt"
      ```
    - **Database schema migration:**
      ```bash
      docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/migrations/001_extend_logs_schema.sql
      ```
    - **Extended schema verification:**
      ```bash
      docker exec -i securewatch_postgres psql -U securewatch -d securewatch -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'logs'"
      ```
    - **Installing a new dependency:**
      ```bash
      pnpm add some-new-package
      ```
    - **Bug tracking operations:**
      ```bash
      python3 scripts/bug-tracker.py
      ```
    - **Test tracking operations:**
      ```bash
      python3 scripts/test-tracker.py
      ```
    - **Running tests:**
      ```bash
      pnpm run test          # Unit tests
      pnpm run test:e2e      # E2E tests
      pnpm run test:all      # All tests
      ```
    - **Enhanced CLI Dashboard operations:**
      ```bash
      ./cli-dashboard.sh enhanced                    # Start enhanced dashboard
      ./cli-dashboard.sh blessed-contrib             # Start rich widgets dashboard (NEW)
      ./cli-dashboard.sh bc --refresh 3              # Short alias with custom refresh
      ./cli-dashboard.sh status --detailed           # All services status
      ./cli-dashboard.sh health --verbose            # Detailed health check
      ./cli-dashboard.sh control start Frontend      # Start specific service
      ./cli-dashboard.sh start-all                   # Start all services
      ./cli-dashboard.sh logs --service "Search API" --lines 100  # Service logs
      ```
    - **Enhanced EVTX Parser operations:**
      ```bash
      python3 scripts/evtx_parser_enhanced.py sample.evtx          # Parse EVTX with attack detection
      python3 scripts/evtx_parser_enhanced.py sample.evtx --attack-only --output results.json  # Attack-focused analysis
      python3 scripts/test_enhanced_evtx_pipeline.py --samples-path /path/to/EVTX-ATTACK-SAMPLES  # Test against attack samples
      ```
    - **Blessed-Contrib Rich Dashboard Features (NEW):**
      - **Rich Widgets**: Line charts, gauges, sparklines, LCD displays, bar charts, tables, log streams
      - **Nerd Font Support**: Enhanced Unicode icons with graceful ASCII fallback
      - **Responsive Design**: Adaptive grid layouts scaling from 1080p to 4K terminals
      - **Interactive Controls**: F-key shortcuts, panel navigation, service management
      - **Real-time Visualizations**: CPU trends, network traffic, events per second, alerts
      - **Comprehensive Documentation**: `cli-dashboard/BLESSED_CONTRIB_DASHBOARD.md`
    - **Enhanced EVTX Parser Features (NEW):**
      - **MITRE ATT&CK Detection**: Automatic technique identification from Sysmon RuleName fields
      - **Attack Pattern Recognition**: 50+ regex patterns for malicious behavior detection  
      - **Risk Scoring Algorithm**: Intelligent threat prioritization with confidence scoring
      - **Comprehensive Sysmon Support**: Full coverage of Events 1-29 with enhanced field extraction
      - **Real-time Processing**: Configurable batch processing with SecureWatch integration
      - **Web-based Upload**: Frontend component for instant EVTX file parsing and analysis

## 6. Code Style and Contribution Guidelines
- **Formatting conventions:**
    - **ESLint:** The project is configured with ESLint (`npm run lint`) to enforce code style and catch errors. Refer to the ESLint configuration (`eslint.config.mjs` and potentially parts of `package.json`) for specific rules.
    - **TypeScript:** Follow standard TypeScript best practices for type safety and code organization.
    - **Tailwind CSS:** Adhere to utility-first principles when styling components.
    - **Naming Conventions:** Observe existing patterns in the codebase (e.g., component naming `PascalCase.tsx`, variable naming `camelCase`).
    - *(If a more specific formatter like Prettier is adopted, this section should be updated.)*
- **Branching and PR rules:**
    - Refer to the "Contributing" section in the main `README.md` file for guidelines on forking, branching (`feature/new-feature`), committing, pushing, and creating Pull Requests.
- **General Guidelines:**
    - Write clear and concise commit messages.
    - Ensure new code is adequately commented, especially for complex logic.
    - If adding new features, consider if corresponding tests are needed.

## 7. Security and Privacy Rules
- **Sensitive files and data:**
    - While real Windows Event Logs can contain sensitive information, this project currently uses **mock data** located in `lib/data/` and `src/lib/data/` (e.g., `mock_log_entries.json`). There should be no real sensitive user or system data in the repository.
    - Avoid committing any actual log files or sensitive production data to the repository.
    - Be mindful of the types of information that would be sensitive if this project were to connect to live systems (e.g., usernames, IP addresses, machine names, specific activities).
- **Secrets:**
    - As per the `README.md`, no environment variables or secrets are required for the basic functionality of this project, as it relies on mock data.
    - If the project is extended to connect to real services or APIs that require authentication, ensure that secrets (API keys, passwords, etc.) are managed securely (e.g., via environment variables, a secrets management system) and are **never** hardcoded or committed to the repository.
    - Do not add any `.env` files containing real secrets to version control. Ensure `.env` is listed in `.gitignore` if used for local development with sensitive values.
- **Tool Usage Safety:**
    - When using tools like Bash, be extremely careful with commands that could lead to data leakage or unauthorized access if the project were handling real data (e.g., `curl`, `scp`, network utilities). Since it's mock data, the risk is low, but good practices should be maintained.

## 8. Sample Prompts and Tasks
These are examples of requests that might be made for this project.

- **Code Generation & Refactoring:**
    - "Create a new React component named `EventSummaryCard` in `src/components/dashboard/` that takes `title` and `count` as props and displays them in a styled card."
    - "Refactor the `DashboardPage` component (`src/app/page.tsx`) to fetch its data from a new (hypothetical) API endpoint `/api/dashboard-summary` instead of using hardcoded content."
    - "Add a new page at `/app/threat-intel/page.tsx` that displays information from `src/lib/threat_intel/otx_feed.ts`. Include a basic table layout."
    - "Update the `TotalEventsWidget.tsx` to include a percentage change from the previous day (mock data for previous day is fine)."
    - "Convert the `LogSourceSelector.tsx` component to use `useReducer` for state management instead of multiple `useState` hooks."

- **Analysis & Understanding:**
    - "Explain the purpose of the `src/lib/data/windows_event_ids.json` file and how it's used in the application."
    - "What are the key responsibilities of the `Sidebar.tsx` and `Header.tsx` components in `src/components/layout/`?"
    - "Describe the data flow for displaying critical alerts on the dashboard."
    - "How is mock data loaded and utilized in the `RecentLogSourcesWidget.tsx`?"

- **Testing:**
    - "Write unit tests for the `src/lib/utils/exportUtils.ts` module. Ensure all functions are covered."
    - "Add a basic test case for the `CriticalAlertsWidget` component to ensure it renders correctly with mock data."

- **New Features (Conceptual):**
    - "Outline the steps to add a feature that allows users to save their filter settings in the Event Explorer (`src/app/explorer/page.tsx`)."
    - "Design a new component that visualizes event frequency over time using Recharts, similar to `EventsOverTimeChart.tsx` but for a different data aspect."

- **Tool Usage:**
    - "Run the linter and report any errors or warnings." (`npm run lint`)
    - "If I add a new dependency `some-package`, how would I install it?" (`npm install some-package`)

- **Expected outputs:**
    - For code generation, provide complete, well-formatted TypeScript/TSX code that adheres to existing project conventions.
    - For analysis, provide clear, concise explanations.
    - For new features, provide a plan or high-level design.
    - Ensure any new components or pages are integrated appropriately (e.g., added to routing if necessary, imported correctly).
