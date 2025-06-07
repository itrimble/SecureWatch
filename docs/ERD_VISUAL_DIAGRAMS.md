# SecureWatch SIEM - Visual ERD Diagrams

**Version:** 1.7.0  
**Last Updated:** January 2025  
**Purpose:** Interactive visual diagrams for SecureWatch architecture  

## 1. Complete System Architecture

```mermaid
graph TB
    subgraph "Data Sources & Agents"
        MAC[Mac Agent<br/>Python 3.12+<br/>PID 22516]
        WIN[Windows Agent<br/>PowerShell/C#]
        LIN[Linux Agent<br/>Bash/Python]
        CLOUD[Cloud Agents<br/>AWS/Azure/GCP]
        API[API Integrations<br/>Third-party]
    end
    
    subgraph "Data Ingestion Layer"
        INGEST[Log Ingestion Service<br/>Express.js<br/>Port 4002]
        BUFFER[Buffer Manager<br/>Batching & Queuing]
        VALIDATOR[Data Validator<br/>Schema Validation]
        NORMALIZER[Log Normalizer<br/>Field Mapping]
    end
    
    subgraph "Storage & Persistence"
        TIMESCALE[(TimescaleDB<br/>PostgreSQL 15+<br/>**Extended Schema (100+ fields)**<br/>Time-series Optimization)]
        REDIS[(Redis Cache<br/>Query Results<br/>Session Storage)]
        ELASTIC[(Elasticsearch<br/>Full-text Search<br/>Log Indexing)]
        FILES[(File Storage<br/>Reports & Exports)]
    end
    
    subgraph "Processing & Analytics"
        SEARCH[Search API Service<br/>Express.js<br/>Port 4004]
        KQL[KQL Engine<br/>Query Processing<br/>Template System]
        ALERT[Alert Engine<br/>Rule Processing<br/>Notifications]
        ML[ML Analytics<br/>Anomaly Detection<br/>Threat Intelligence]
    end
    
    subgraph "Frontend Application"
        NEXT[Next.js 15 App<br/>React Components<br/>Port 4000]
        
        subgraph "UI Components"
            DASH[Dashboards<br/>Security Overview<br/>Custom Widgets]
            VIZ[Visualizations<br/>Heatmaps, Graphs<br/>Geo Maps]
            SEARCH_UI[KQL Search<br/>Query Editor<br/>Result Views]
            EXPLORER[Event Explorer<br/>Table Views<br/>Filtering]
        end
        
        subgraph "User Interface"
            AUTH_UI[Authentication<br/>Login/SSO<br/>User Profile]
            SETTINGS[Settings<br/>Configuration<br/>Admin Panel]
            REPORTS[Reporting<br/>Scheduled Reports<br/>Export Tools]
        end
    end
    
    subgraph "Infrastructure Services"
        DOCKER[Docker Compose<br/>Container Orchestration]
        KAFKA[Kafka<br/>Message Queue<br/>Event Streaming]
        MONITOR[Monitoring<br/>Health Checks<br/>Metrics]
        BACKUP[Backup Service<br/>Data Protection<br/>Recovery]
    end
    
    %% Data Flow Connections
    MAC -->|Real-time Logs| INGEST
    WIN -->|Event Logs| INGEST
    LIN -->|Syslog/Journal| INGEST
    CLOUD -->|API Calls| INGEST
    API -->|Webhook/REST| INGEST
    
    INGEST --> BUFFER
    BUFFER --> VALIDATOR
    VALIDATOR --> NORMALIZER
    NORMALIZER --> TIMESCALE
    NORMALIZER --> REDIS
    NORMALIZER --> ELASTIC
    
    TIMESCALE --> SEARCH
    REDIS --> SEARCH
    ELASTIC --> SEARCH
    SEARCH --> KQL
    KQL --> ALERT
    SEARCH --> ML
    
    SEARCH -->|API Responses| NEXT
    NEXT --> DASH
    NEXT --> VIZ
    NEXT --> SEARCH_UI
    NEXT --> EXPLORER
    NEXT --> AUTH_UI
    NEXT --> SETTINGS
    NEXT --> REPORTS
    
    %% Infrastructure Connections
    DOCKER -.->|Orchestrates| INGEST
    DOCKER -.->|Orchestrates| SEARCH
    DOCKER -.->|Orchestrates| TIMESCALE
    KAFKA -.->|Queuing| INGEST
    MONITOR -.->|Health Checks| SEARCH
    BACKUP -.->|Data Protection| TIMESCALE
    
    %% Styling
    classDef agent fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef storage fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef frontend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infra fill:#fafafa,stroke:#424242,stroke-width:2px
    
    class MAC,WIN,LIN,CLOUD,API agent
    class INGEST,SEARCH,KQL,ALERT,ML service
    class TIMESCALE,REDIS,ELASTIC,FILES storage
    class NEXT,DASH,VIZ,SEARCH_UI,EXPLORER,AUTH_UI,SETTINGS,REPORTS frontend
    class DOCKER,KAFKA,MONITOR,BACKUP infra
```

## 2. Database Schema Entity Relationships

```mermaid
erDiagram
    organizations {
        UUID id PK
        VARCHAR name
        VARCHAR domain
        VARCHAR subscription_tier
        INTEGER max_users
        INTEGER max_data_retention_days
        JSONB settings
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    
    users {
        UUID id PK
        UUID organization_id FK
        VARCHAR email UNIQUE
        VARCHAR username UNIQUE
        VARCHAR password_hash
        VARCHAR first_name
        VARCHAR last_name
        VARCHAR display_name
        BOOLEAN is_active
        BOOLEAN is_verified
        TIMESTAMPTZ last_login_at
        JSONB preferences
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    
    roles {
        UUID id PK
        UUID organization_id FK
        VARCHAR name
        VARCHAR display_name
        TEXT description
        BOOLEAN is_system
        INTEGER priority
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    
    permissions {
        UUID id PK
        VARCHAR resource
        VARCHAR action
        TEXT description
        BOOLEAN is_system
        TIMESTAMPTZ created_at
    }
    
    user_roles {
        UUID user_id PK,FK
        UUID role_id PK,FK
        TIMESTAMPTZ assigned_at
        TIMESTAMPTZ expires_at
        UUID assigned_by FK
    }
    
    role_permissions {
        UUID role_id PK,FK
        UUID permission_id PK,FK
        JSONB conditions
        TIMESTAMPTZ granted_at
        UUID granted_by FK
    }
    
    logs {
        UUID id PK
        TIMESTAMPTZ timestamp PARTITION_KEY
        UUID organization_id FK
        VARCHAR source_identifier
        VARCHAR source_type
        VARCHAR log_level
        TEXT message
        VARCHAR facility
        INTEGER severity
        VARCHAR hostname
        VARCHAR process_name
        INTEGER process_id
        VARCHAR user_name
        VARCHAR event_id
        VARCHAR event_category
        VARCHAR event_subcategory
        INET source_ip
        INET destination_ip
        INTEGER source_port
        INTEGER destination_port
        VARCHAR protocol
        TEXT file_path
        VARCHAR file_hash
        VARCHAR auth_user
        VARCHAR auth_domain
        VARCHAR auth_method
        VARCHAR auth_result
        JSONB attributes
        TIMESTAMPTZ ingested_at
        TIMESTAMPTZ processed_at
        BOOLEAN normalized
        BOOLEAN enriched
        TSVECTOR search_vector
    }
    
    log_metrics {
        TIMESTAMPTZ bucket PARTITION_KEY
        UUID organization_id FK
        VARCHAR source_type
        VARCHAR log_level
        VARCHAR event_category
        BIGINT count
    }
    
    alert_rules {
        UUID id PK
        UUID organization_id FK
        VARCHAR name
        TEXT description
        TEXT query
        VARCHAR condition_operator
        NUMERIC condition_value
        INTERVAL time_window
        VARCHAR severity
        BOOLEAN is_active
        UUID created_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    
    alerts {
        UUID id PK
        UUID rule_id FK
        UUID organization_id FK
        TIMESTAMPTZ triggered_at PARTITION_KEY
        TIMESTAMPTZ resolved_at
        VARCHAR severity
        VARCHAR status
        TEXT message
        JSONB query_result
        UUID acknowledged_by FK
        TIMESTAMPTZ acknowledged_at
        UUID resolved_by FK
        TEXT notes
        JSONB metadata
    }
    
    user_sessions {
        UUID id PK
        UUID user_id FK
        VARCHAR session_token UNIQUE
        VARCHAR refresh_token UNIQUE
        INET ip_address
        TEXT user_agent
        JSONB device_info
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ last_activity_at
        TIMESTAMPTZ created_at
    }
    
    auth_audit_log {
        UUID id PK
        UUID user_id FK
        UUID organization_id FK
        VARCHAR event_type
        VARCHAR event_status
        INET ip_address
        TEXT user_agent
        JSONB device_info
        TEXT error_message
        JSONB metadata
        TIMESTAMPTZ created_at
    }
    
    api_keys {
        UUID id PK
        UUID organization_id FK
        VARCHAR name
        VARCHAR key_hash UNIQUE
        VARCHAR key_prefix
        JSONB permissions
        INTEGER rate_limit
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ last_used_at
        BOOLEAN is_active
        UUID created_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
    
    %% Relationships
    organizations ||--o{ users : "has many"
    organizations ||--o{ roles : "defines"
    organizations ||--o{ logs : "owns"
    organizations ||--o{ log_metrics : "aggregates"
    organizations ||--o{ alert_rules : "configures"
    organizations ||--o{ alerts : "receives"
    organizations ||--o{ auth_audit_log : "audits"
    organizations ||--o{ api_keys : "manages"
    
    users ||--o{ user_roles : "assigned"
    users ||--o{ user_sessions : "has sessions"
    users ||--o{ auth_audit_log : "generates events"
    users ||--o{ alert_rules : "creates"
    users ||--o{ alerts : "acknowledges"
    users ||--o{ api_keys : "creates"
    
    roles ||--o{ user_roles : "assigned to users"
    roles ||--o{ role_permissions : "has permissions"
    
    permissions ||--o{ role_permissions : "granted to roles"
    
    alert_rules ||--o{ alerts : "triggers"
    
    %% TimescaleDB Hypertables
    logs ||--o{ log_metrics : "aggregated into"
```

## 3. Frontend Component Architecture

```mermaid
graph TB
    subgraph "Next.js App Router"
        LAYOUT[layout.tsx<br/>Root Layout<br/>Providers & Context]
        
        subgraph "Page Routes"
            HOME[page.tsx<br/>Main Dashboard]
            EXPLORER_PAGE[explorer/page.tsx<br/>Event Browser]
            VIZ_PAGE[visualizations/page.tsx<br/>Advanced Analytics]
            ALERTS_PAGE[alerts/page.tsx<br/>Alert Management]
            REPORTS_PAGE[reporting/page.tsx<br/>Report Generation]
            SETTINGS_PAGE[settings/page.tsx<br/>Configuration]
            AUTH_PAGE[auth/callback/route.ts<br/>Authentication]
        end
        
        subgraph "API Routes"
            LOGS_API[api/logs/route.ts<br/>Log Data Endpoint]
            HEALTH_API[api/health/route.ts<br/>Health Check]
            NOTIF_API[api/notifications/stream/route.ts<br/>Real-time Notifications]
        end
    end
    
    subgraph "Component Library"
        subgraph "Dashboard Components"
            DASH_CONTENT[dashboard-content.tsx<br/>Main Dashboard]
            CUSTOM_DASH[customizable-dashboard.tsx<br/>Drag-Drop Dashboard]
            ALERTS_DISPLAY[AlertsDisplay.tsx<br/>Alert Widgets]
            TOTAL_EVENTS[TotalEventsWidget.tsx<br/>Event Counters]
            SYSTEM_HEALTH[SystemHealthWidget.tsx<br/>Service Status]
            LOG_SOURCES[RecentLogSourcesWidget.tsx<br/>Source Activity]
        end
        
        subgraph "Exploration Components"
            EVENTS_TABLE[EventsTable.tsx<br/>Log Data Grid]
            FILTER_PANEL[FilterPanel.tsx<br/>Basic Filtering]
            ADV_FILTER[AdvancedFilterPanel.tsx<br/>Complex Filters]
            EVENT_DETAILS[EventDetailsModal.tsx<br/>Detailed View]
            GENERIC_RESULTS[GenericResultsTable.tsx<br/>Search Results]
        end
        
        subgraph "Visualization Components"
            KQL_SEARCH[kql-search-visualization.tsx<br/>KQL Query Interface]
            INTERACTIVE_HEAT[InteractiveHeatmap.tsx<br/>Heat Map Analytics]
            NETWORK_GRAPH[NetworkCorrelationGraph.tsx<br/>Network Topology]
            THREAT_MAP[ThreatGeolocationMap.tsx<br/>Geographic Threats]
            EVENT_TIMELINE[EventTimeline.tsx<br/>Time-based View]
            CHARTS[TopEventIdsBarChart.tsx<br/>Statistical Charts]
        end
        
        subgraph "Layout Components"
            HEADER[Header.tsx<br/>Navigation Bar]
            SIDEBAR[Sidebar.tsx<br/>Side Navigation]
            BREADCRUMBS[Breadcrumbs.tsx<br/>Path Navigation]
        end
        
        subgraph "UI Foundation"
            CARDS[card.tsx<br/>Content Containers]
            BUTTONS[button.tsx<br/>Interactive Elements]
            TABLES[table.tsx<br/>Data Display]
            FORMS[form.tsx<br/>Input Controls]
            DIALOGS[dialog.tsx<br/>Modal Windows]
            CHARTS_UI[chart.tsx<br/>Visualization Base]
        end
    end
    
    subgraph "State & Data Management"
        API_CLIENT[api-client.ts<br/>Backend Communication]
        SEARCH_STORE[searchStore.ts<br/>Search State]
        AUTH_CONTEXT[Authentication Context<br/>User State]
        THEME_PROVIDER[Theme Provider<br/>UI Theming]
    end
    
    subgraph "Utilities & Hooks"
        USE_DEBOUNCE[useDebounce.ts<br/>Input Optimization]
        USE_TOAST[use-toast.ts<br/>Notifications]
        EXPORT_UTILS[exportUtils.ts<br/>Data Export]
        LOGGER_UTILS[logger.ts<br/>Debugging]
    end
    
    %% Component Relationships
    LAYOUT --> HOME
    LAYOUT --> EXPLORER_PAGE
    LAYOUT --> VIZ_PAGE
    LAYOUT --> ALERTS_PAGE
    LAYOUT --> REPORTS_PAGE
    LAYOUT --> SETTINGS_PAGE
    
    HOME --> DASH_CONTENT
    HOME --> CUSTOM_DASH
    DASH_CONTENT --> ALERTS_DISPLAY
    DASH_CONTENT --> TOTAL_EVENTS
    DASH_CONTENT --> SYSTEM_HEALTH
    DASH_CONTENT --> LOG_SOURCES
    
    EXPLORER_PAGE --> EVENTS_TABLE
    EXPLORER_PAGE --> FILTER_PANEL
    EXPLORER_PAGE --> ADV_FILTER
    EXPLORER_PAGE --> EVENT_DETAILS
    
    VIZ_PAGE --> KQL_SEARCH
    VIZ_PAGE --> INTERACTIVE_HEAT
    VIZ_PAGE --> NETWORK_GRAPH
    VIZ_PAGE --> THREAT_MAP
    VIZ_PAGE --> EVENT_TIMELINE
    
    LAYOUT --> HEADER
    LAYOUT --> SIDEBAR
    LAYOUT --> BREADCRUMBS
    
    %% All components use UI foundation
    DASH_CONTENT --> CARDS
    EVENTS_TABLE --> TABLES
    KQL_SEARCH --> BUTTONS
    INTERACTIVE_HEAT --> CHARTS_UI
    
    %% Data flow
    API_CLIENT --> LOGS_API
    API_CLIENT --> HEALTH_API
    EVENTS_TABLE --> SEARCH_STORE
    KQL_SEARCH --> API_CLIENT
    
    %% Styling
    classDef page fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef component fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
    classDef ui fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef util fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    
    class HOME,EXPLORER_PAGE,VIZ_PAGE,ALERTS_PAGE,REPORTS_PAGE,SETTINGS_PAGE page
    class DASH_CONTENT,CUSTOM_DASH,EVENTS_TABLE,KQL_SEARCH,INTERACTIVE_HEAT component
    class CARDS,BUTTONS,TABLES,FORMS,DIALOGS,CHARTS_UI ui
    class API_CLIENT,SEARCH_STORE,AUTH_CONTEXT,THEME_PROVIDER data
    class USE_DEBOUNCE,USE_TOAST,EXPORT_UTILS,LOGGER_UTILS util
```

## 4. Data Flow & API Communication

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🌐 Frontend<br/>(Next.js)
    participant SearchAPI as 🔍 Search API<br/>(Port 4004)
    participant KQL as ⚙️ KQL Engine
    participant Cache as 💾 Redis Cache
    participant DB as 🗄️ TimescaleDB
    participant Agent as 🤖 Mac Agent
    participant Ingestion as 📥 Log Ingestion<br/>(Port 4002)
    
    Note over User,Ingestion: Real-time Data Collection
    Agent->>Ingestion: POST /api/ingest<br/>Live log events
    Ingestion->>DB: INSERT normalized logs
    Ingestion->>Cache: Update metrics cache
    
    Note over User,Ingestion: User Interaction & Query
    User->>Frontend: Open Dashboard
    Frontend->>SearchAPI: GET /api/v1/search/logs
    SearchAPI->>Cache: Check cached results
    alt Cache Hit
        Cache-->>SearchAPI: Return cached data
    else Cache Miss
        SearchAPI->>DB: SQL Query
        DB-->>SearchAPI: Result set
        SearchAPI->>Cache: Store results
    end
    SearchAPI-->>Frontend: JSON Response
    Frontend-->>User: Render Dashboard
    
    Note over User,Ingestion: KQL Search Flow
    User->>Frontend: Enter KQL Query
    Frontend->>SearchAPI: POST /api/v1/search/execute
    SearchAPI->>KQL: Parse KQL Query
    KQL->>KQL: Validate & Optimize
    KQL->>DB: Execute SQL Translation
    DB-->>KQL: Query Results
    KQL-->>SearchAPI: Formatted Results
    SearchAPI->>Cache: Cache query results
    SearchAPI-->>Frontend: Query Response
    Frontend-->>User: Visualization Update
    
    Note over User,Ingestion: Real-time Updates
    loop Every 30 seconds
        Agent->>Ingestion: Batch log events
        Ingestion->>DB: Store new logs
        Ingestion->>Frontend: WebSocket notification
        Frontend->>User: Update live widgets
    end
    
    Note over User,Ingestion: Health Monitoring
    Frontend->>SearchAPI: GET /health
    SearchAPI->>DB: SELECT 1
    SearchAPI->>Cache: PING
    SearchAPI-->>Frontend: Health Status
    Frontend->>Ingestion: GET /health
    Ingestion->>DB: Health Query
    Ingestion-->>Frontend: Service Status
```

## 5. Service Dependencies & Infrastructure

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/HAProxy<br/>Load Balancer<br/>SSL Termination]
    end
    
    subgraph "Application Layer"
        subgraph "Frontend Cluster"
            FE1[Frontend-1<br/>Next.js<br/>Port 4000]
            FE2[Frontend-2<br/>Next.js<br/>Port 4000]
            FE3[Frontend-3<br/>Next.js<br/>Port 4002]
        end
        
        subgraph "API Gateway"
            GW[API Gateway<br/>Rate Limiting<br/>Authentication]
        end
        
        subgraph "Backend Services"
            subgraph "Search Service Cluster"
                SA1[Search-API-1<br/>Port 4004]
                SA2[Search-API-2<br/>Port 4005]
                SA3[Search-API-3<br/>Port 4006]
            end
            
            subgraph "Ingestion Service Cluster"
                IN1[Ingestion-1<br/>Port 4002]
                IN2[Ingestion-2<br/>Port 4002]
            end
            
            subgraph "Specialized Services"
                AUTH[Auth Service<br/>JWT/OAuth<br/>Port 4006]
                ALERT[Alert Service<br/>Rule Engine<br/>Port 4008]
                REPORT[Report Service<br/>Scheduler<br/>Port 4009]
            end
        end
    end
    
    subgraph "Data Layer"
        subgraph "Primary Storage"
            subgraph "TimescaleDB Cluster"
                DB1[(TimescaleDB-Primary<br/>Read/Write<br/>Port 5432)]
                DB2[(TimescaleDB-Replica-1<br/>Read Only<br/>Port 5433)]
                DB3[(TimescaleDB-Replica-2<br/>Read Only<br/>Port 5434)]
            end
        end
        
        subgraph "Cache Layer"
            subgraph "Redis Cluster"
                R1[(Redis-Master<br/>Port 6379)]
                R2[(Redis-Slave-1<br/>Port 6380)]
                R3[(Redis-Slave-2<br/>Port 6381)]
            end
        end
        
        subgraph "Search Engine"
            E1[(Elasticsearch-1<br/>Master<br/>Port 9200)]
            E2[(Elasticsearch-2<br/>Data<br/>Port 9201)]
            E3[(Elasticsearch-3<br/>Data<br/>Port 9202)]
        end
    end
    
    subgraph "Message Queue"
        subgraph "Kafka Cluster"
            K1[Kafka-1<br/>Broker<br/>Port 9092]
            K2[Kafka-2<br/>Broker<br/>Port 9093]
            K3[Kafka-3<br/>Broker<br/>Port 9094]
            ZK[Zookeeper<br/>Coordination<br/>Port 2181]
        end
    end
    
    subgraph "Monitoring & Observability"
        PROM[Prometheus<br/>Metrics Collection<br/>Port 9090]
        GRAF[Grafana<br/>Dashboards<br/>Port 3000]
        JAEGER[Jaeger<br/>Distributed Tracing<br/>Port 16686]
        ALERT_MGR[AlertManager<br/>Alert Routing<br/>Port 9093]
    end
    
    subgraph "External Data Sources"
        AGENTS[Agent Network<br/>Mac/Windows/Linux<br/>Cloud APIs]
        THREAT_INTEL[Threat Intelligence<br/>External Feeds<br/>OSINT Sources]
    end
    
    %% Load Balancer Connections
    LB --> FE1
    LB --> FE2
    LB --> FE3
    
    %% Frontend to API Gateway
    FE1 --> GW
    FE2 --> GW
    FE3 --> GW
    
    %% API Gateway to Services
    GW --> SA1
    GW --> SA2
    GW --> SA3
    GW --> IN1
    GW --> IN2
    GW --> AUTH
    GW --> ALERT
    GW --> REPORT
    
    %% Service to Database Connections
    SA1 --> DB1
    SA2 --> DB2
    SA3 --> DB3
    IN1 --> DB1
    IN2 --> DB1
    AUTH --> DB1
    
    %% Cache Connections
    SA1 --> R1
    SA2 --> R2
    SA3 --> R3
    AUTH --> R1
    
    %% Search Engine Connections
    SA1 --> E1
    SA2 --> E2
    SA3 --> E3
    
    %% Database Replication
    DB1 --> DB2
    DB1 --> DB3
    
    %% Redis Replication
    R1 --> R2
    R1 --> R3
    
    %% Kafka Connections
    IN1 --> K1
    IN2 --> K2
    ALERT --> K3
    K1 --> ZK
    K2 --> ZK
    K3 --> ZK
    
    %% External Connections
    AGENTS --> IN1
    AGENTS --> IN2
    THREAT_INTEL --> SA1
    
    %% Monitoring Connections
    PROM -.-> FE1
    PROM -.-> SA1
    PROM -.-> IN1
    PROM -.-> DB1
    GRAF -.-> PROM
    JAEGER -.-> SA1
    ALERT_MGR -.-> PROM
    
    %% Styling
    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef database fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef cache fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef monitoring fill:#fafafa,stroke:#424242,stroke-width:2px
    classDef external fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class FE1,FE2,FE3,LB frontend
    class SA1,SA2,SA3,IN1,IN2,AUTH,ALERT,REPORT,GW backend
    class DB1,DB2,DB3,E1,E2,E3 database
    class R1,R2,R3,K1,K2,K3,ZK cache
    class PROM,GRAF,JAEGER,ALERT_MGR monitoring
    class AGENTS,THREAT_INTEL external
```

## 6. Security & Authentication Flow

```mermaid
graph TB
    subgraph "Authentication Sources"
        LOCAL[Local Authentication<br/>Username/Password]
        SSO[Single Sign-On<br/>SAML/OAuth]
        LDAP[LDAP/Active Directory<br/>Enterprise Integration]
        MFA[Multi-Factor Auth<br/>TOTP/WebAuthn]
    end
    
    subgraph "Authentication Service"
        AUTH_SVC[Authentication Service<br/>JWT Token Management]
        subgraph "Auth Components"
            TOKEN_GEN[Token Generator<br/>JWT/Refresh Tokens]
            TOKEN_VAL[Token Validator<br/>Signature Verification]
            SESSION_MGR[Session Manager<br/>Active Sessions]
            AUDIT_LOG[Audit Logger<br/>Auth Events]
        end
    end
    
    subgraph "Authorization Layer"
        RBAC[Role-Based Access Control<br/>Permission Matrix]
        subgraph "RBAC Components"
            ROLE_MGR[Role Manager<br/>User Role Assignment]
            PERM_CHK[Permission Checker<br/>Resource Access]
            ORG_ISO[Organization Isolation<br/>Multi-tenant Security]
        end
    end
    
    subgraph "API Security"
        API_GW[API Gateway<br/>Security Enforcement]
        subgraph "Security Middleware"
            RATE_LIMIT[Rate Limiting<br/>Request Throttling]
            INPUT_VAL[Input Validation<br/>XSS/Injection Prevention]
            CORS_HDL[CORS Handler<br/>Cross-Origin Security]
            SEC_HDRS[Security Headers<br/>HSTS/CSP/X-Frame]
        end
    end
    
    subgraph "Data Security"
        ENCRYPT[Data Encryption<br/>At Rest & In Transit]
        subgraph "Encryption Components"
            TLS_SSL[TLS/SSL<br/>Transport Security]
            DB_ENCRYPT[Database Encryption<br/>Field-level Security]
            KEY_MGR[Key Management<br/>Rotation & Storage]
            SENSITIVE[Sensitive Data<br/>PII/PHI Protection]
        end
    end
    
    subgraph "Compliance & Monitoring"
        COMPLIANCE[Compliance Framework<br/>SOC2/GDPR/HIPAA]
        subgraph "Compliance Components"
            AUDIT_TRAIL[Audit Trail<br/>Activity Logging]
            DATA_RETENTION[Data Retention<br/>Policy Enforcement]
            ACCESS_LOG[Access Logging<br/>User Activity]
            INCIDENT_RSP[Incident Response<br/>Security Events]
        end
    end
    
    %% Authentication Flow
    LOCAL --> AUTH_SVC
    SSO --> AUTH_SVC
    LDAP --> AUTH_SVC
    MFA --> AUTH_SVC
    
    AUTH_SVC --> TOKEN_GEN
    AUTH_SVC --> TOKEN_VAL
    AUTH_SVC --> SESSION_MGR
    AUTH_SVC --> AUDIT_LOG
    
    %% Authorization Flow
    TOKEN_VAL --> RBAC
    RBAC --> ROLE_MGR
    RBAC --> PERM_CHK
    RBAC --> ORG_ISO
    
    %% API Security Flow
    PERM_CHK --> API_GW
    API_GW --> RATE_LIMIT
    API_GW --> INPUT_VAL
    API_GW --> CORS_HDL
    API_GW --> SEC_HDRS
    
    %% Data Security Flow
    API_GW --> ENCRYPT
    ENCRYPT --> TLS_SSL
    ENCRYPT --> DB_ENCRYPT
    ENCRYPT --> KEY_MGR
    ENCRYPT --> SENSITIVE
    
    %% Compliance Flow
    AUDIT_LOG --> COMPLIANCE
    ACCESS_LOG --> COMPLIANCE
    COMPLIANCE --> AUDIT_TRAIL
    COMPLIANCE --> DATA_RETENTION
    COMPLIANCE --> ACCESS_LOG
    COMPLIANCE --> INCIDENT_RSP
    
    %% Cross-cutting Concerns
    SESSION_MGR -.-> ACCESS_LOG
    PERM_CHK -.-> AUDIT_TRAIL
    RATE_LIMIT -.-> INCIDENT_RSP
    
    %% Styling
    classDef auth fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef authz fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef security fill:#fce4ec,stroke:#ad1457,stroke-width:2px
    classDef encryption fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef compliance fill:#f1f8e9,stroke:#2e7d32,stroke-width:2px
    
    class LOCAL,SSO,LDAP,MFA,AUTH_SVC,TOKEN_GEN,TOKEN_VAL,SESSION_MGR,AUDIT_LOG auth
    class RBAC,ROLE_MGR,PERM_CHK,ORG_ISO authz
    class API_GW,RATE_LIMIT,INPUT_VAL,CORS_HDL,SEC_HDRS security
    class ENCRYPT,TLS_SSL,DB_ENCRYPT,KEY_MGR,SENSITIVE encryption
    class COMPLIANCE,AUDIT_TRAIL,DATA_RETENTION,ACCESS_LOG,INCIDENT_RSP compliance
```

## 7. Performance & Scaling Architecture

```mermaid
graph TB
    subgraph "Traffic Management"
        CDN[Content Delivery Network<br/>Static Asset Caching]
        LB[Load Balancer<br/>SSL/TLS Termination<br/>Health Checks]
        subgraph "Load Balancing Strategies"
            RR[Round Robin<br/>Equal Distribution]
            WRR[Weighted Round Robin<br/>Capacity-based]
            LC[Least Connections<br/>Performance-based]
            GEO[Geographic Routing<br/>Latency Optimization]
        end
    end
    
    subgraph "Auto-Scaling Groups"
        subgraph "Frontend Scaling"
            FE_ASG[Frontend Auto-Scale<br/>Min: 2, Max: 10<br/>CPU/Memory Triggers]
            FE_INST[Frontend Instances<br/>Stateless Design<br/>Session Affinity]
        end
        
        subgraph "API Scaling"
            API_ASG[API Auto-Scale<br/>Min: 3, Max: 20<br/>Request Rate Triggers]
            API_INST[API Instances<br/>Horizontal Scaling<br/>Connection Pooling]
        end
        
        subgraph "Worker Scaling"
            WORKER_ASG[Worker Auto-Scale<br/>Min: 2, Max: 15<br/>Queue Depth Triggers]
            WORKER_INST[Worker Instances<br/>Background Processing<br/>Job Distribution]
        end
    end
    
    subgraph "Caching Layers"
        subgraph "Application Cache"
            APP_CACHE[Application Cache<br/>In-Memory Store<br/>LRU Eviction]
            QUERY_CACHE[Query Result Cache<br/>Redis Cluster<br/>TTL-based]
            SESSION_CACHE[Session Cache<br/>Distributed Sessions<br/>High Availability]
        end
        
        subgraph "Database Cache"
            DB_CACHE[Database Query Cache<br/>Connection Pooling<br/>Prepared Statements]
            AGG_CACHE[Aggregation Cache<br/>Pre-computed Results<br/>Scheduled Refresh]
            TS_CACHE[Time-Series Cache<br/>Hot Data Access<br/>Sliding Window]
        end
    end
    
    subgraph "Database Optimization"
        subgraph "TimescaleDB Performance"
            HYPERTABLE[Hypertables<br/>Time-based Partitioning<br/>Automatic Chunking]
            COMPRESSION[Data Compression<br/>Columnar Storage<br/>Space Optimization]
            CONTINUOUS_AGG[Continuous Aggregates<br/>Real-time Rollups<br/>Materialized Views]
            RETENTION[Data Retention<br/>Automated Cleanup<br/>Lifecycle Management]
        end
        
        subgraph "Read Replicas"
            PRIMARY[Primary Database<br/>Write Operations<br/>ACID Compliance]
            READ_REPLICA_1[Read Replica 1<br/>Analytics Queries<br/>Reporting Load]
            READ_REPLICA_2[Read Replica 2<br/>Dashboard Queries<br/>User Interface Load]
            READ_REPLICA_3[Read Replica 3<br/>Search Operations<br/>Full-text Queries]
        end
    end
    
    subgraph "Message Queue Scaling"
        subgraph "Kafka Cluster"
            KAFKA_BROKER_1[Kafka Broker 1<br/>Partition Leader<br/>High Throughput]
            KAFKA_BROKER_2[Kafka Broker 2<br/>Partition Replica<br/>Fault Tolerance]
            KAFKA_BROKER_3[Kafka Broker 3<br/>Partition Replica<br/>Load Distribution]
        end
        
        subgraph "Topic Strategy"
            LOG_TOPIC[Log Events Topic<br/>Partitioned by Source<br/>Retention: 7 days]
            ALERT_TOPIC[Alert Events Topic<br/>Partitioned by Severity<br/>Retention: 30 days]
            METRIC_TOPIC[Metrics Topic<br/>Partitioned by Type<br/>Retention: 24 hours]
        end
    end
    
    subgraph "Performance Monitoring"
        subgraph "Metrics Collection"
            APP_METRICS[Application Metrics<br/>Response Time<br/>Error Rates<br/>Throughput]
            SYS_METRICS[System Metrics<br/>CPU/Memory Usage<br/>Disk I/O<br/>Network Traffic]
            DB_METRICS[Database Metrics<br/>Query Performance<br/>Connection Pools<br/>Lock Statistics]
        end
        
        subgraph "Alerting & Response"
            ALERT_RULES[Alert Rules<br/>Threshold-based<br/>ML Anomaly Detection]
            AUTO_SCALING[Auto-scaling Actions<br/>Instance Management<br/>Resource Allocation]
            INCIDENT_MGT[Incident Management<br/>Escalation Policies<br/>Response Automation]
        end
    end
    
    %% Traffic Flow
    CDN --> LB
    LB --> RR
    LB --> WRR
    LB --> LC
    LB --> GEO
    
    %% Auto-scaling Connections
    FE_ASG --> FE_INST
    API_ASG --> API_INST
    WORKER_ASG --> WORKER_INST
    
    %% Cache Relationships
    APP_CACHE --> QUERY_CACHE
    QUERY_CACHE --> SESSION_CACHE
    DB_CACHE --> AGG_CACHE
    AGG_CACHE --> TS_CACHE
    
    %% Database Optimization
    HYPERTABLE --> COMPRESSION
    COMPRESSION --> CONTINUOUS_AGG
    CONTINUOUS_AGG --> RETENTION
    PRIMARY --> READ_REPLICA_1
    PRIMARY --> READ_REPLICA_2
    PRIMARY --> READ_REPLICA_3
    
    %% Kafka Scaling
    KAFKA_BROKER_1 --> LOG_TOPIC
    KAFKA_BROKER_2 --> ALERT_TOPIC
    KAFKA_BROKER_3 --> METRIC_TOPIC
    
    %% Monitoring Flow
    APP_METRICS --> ALERT_RULES
    SYS_METRICS --> ALERT_RULES
    DB_METRICS --> ALERT_RULES
    ALERT_RULES --> AUTO_SCALING
    AUTO_SCALING --> INCIDENT_MGT
    
    %% Cross-layer Dependencies
    FE_INST -.-> QUERY_CACHE
    API_INST -.-> DB_CACHE
    WORKER_INST -.-> KAFKA_BROKER_1
    
    %% Styling
    classDef traffic fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef scaling fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef database fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef queue fill:#fafafa,stroke:#424242,stroke-width:2px
    classDef monitoring fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class CDN,LB,RR,WRR,LC,GEO traffic
    class FE_ASG,FE_INST,API_ASG,API_INST,WORKER_ASG,WORKER_INST scaling
    class APP_CACHE,QUERY_CACHE,SESSION_CACHE,DB_CACHE,AGG_CACHE,TS_CACHE cache
    class HYPERTABLE,COMPRESSION,CONTINUOUS_AGG,RETENTION,PRIMARY,READ_REPLICA_1,READ_REPLICA_2,READ_REPLICA_3 database
    class KAFKA_BROKER_1,KAFKA_BROKER_2,KAFKA_BROKER_3,LOG_TOPIC,ALERT_TOPIC,METRIC_TOPIC queue
    class APP_METRICS,SYS_METRICS,DB_METRICS,ALERT_RULES,AUTO_SCALING,INCIDENT_MGT monitoring
```

## 8. Real-time Data Pipeline

```mermaid
graph LR
    subgraph "Data Sources"
        MAC_AGENT[Mac Agent<br/>PID 22516<br/>15+ Sources]
        WIN_AGENT[Windows Agent<br/>Event Logs]
        CLOUD_API[Cloud APIs<br/>AWS/Azure/GCP]
        SYSLOG[Syslog Sources<br/>Network Devices]
    end
    
    subgraph "Collection Layer"
        COLLECTORS[Log Collectors<br/>Protocol Adapters]
        BUFFERS[Buffer Management<br/>Batching & Queuing]
        VALIDATORS[Data Validation<br/>Schema Compliance]
    end
    
    subgraph "Processing Pipeline"
        NORMALIZERS[Data Normalizers<br/>Field Mapping]
        ENRICHERS[Data Enrichers<br/>Context Addition]
        CLASSIFIERS[Event Classifiers<br/>Category Assignment]
        INDEXERS[Search Indexers<br/>Full-text Preparation]
    end
    
    subgraph "Storage Systems"
        TIMESCALE_WRITE[TimescaleDB<br/>Write Operations<br/>Hypertables]
        REDIS_CACHE[Redis Cache<br/>Hot Data Access<br/>Metrics Storage]
        ELASTICSEARCH[Elasticsearch<br/>Search Index<br/>Full-text Queries]
    end
    
    subgraph "Real-time Services"
        STREAM_PROC[Stream Processors<br/>Real-time Analytics]
        ALERT_ENGINE[Alert Engine<br/>Rule Evaluation]
        NOTIF_SVC[Notification Service<br/>Real-time Updates]
        DASHBOARD_FEED[Dashboard Feed<br/>Live Widgets]
    end
    
    subgraph "Consumer Applications"
        FRONTEND_DASH[Frontend Dashboard<br/>Live Updates]
        API_ENDPOINTS[API Endpoints<br/>Query Interface]
        ALERT_UI[Alert Interface<br/>Real-time Alerts]
        EXPORT_SVC[Export Services<br/>Data Analysis]
    end
    
    %% Data Flow
    MAC_AGENT -->|JSON Events| COLLECTORS
    WIN_AGENT -->|Event Logs| COLLECTORS
    CLOUD_API -->|API Payloads| COLLECTORS
    SYSLOG -->|Syslog Messages| COLLECTORS
    
    COLLECTORS --> BUFFERS
    BUFFERS --> VALIDATORS
    VALIDATORS --> NORMALIZERS
    
    NORMALIZERS --> ENRICHERS
    ENRICHERS --> CLASSIFIERS
    CLASSIFIERS --> INDEXERS
    
    INDEXERS --> TIMESCALE_WRITE
    INDEXERS --> REDIS_CACHE
    INDEXERS --> ELASTICSEARCH
    
    TIMESCALE_WRITE --> STREAM_PROC
    REDIS_CACHE --> STREAM_PROC
    STREAM_PROC --> ALERT_ENGINE
    ALERT_ENGINE --> NOTIF_SVC
    NOTIF_SVC --> DASHBOARD_FEED
    
    DASHBOARD_FEED --> FRONTEND_DASH
    TIMESCALE_WRITE --> API_ENDPOINTS
    ALERT_ENGINE --> ALERT_UI
    ELASTICSEARCH --> EXPORT_SVC
    
    %% Performance Indicators
    MAC_AGENT -.->|15 events/batch| COLLECTORS
    BUFFERS -.->|0% error rate| VALIDATORS
    TIMESCALE_WRITE -.->|3,000+ entries| REDIS_CACHE
    FRONTEND_DASH -.->|Live updates| DASHBOARD_FEED
    
    %% Styling
    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef collect fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef process fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef storage fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef realtime fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef consumer fill:#f1f8e9,stroke:#388e3c,stroke-width:2px
    
    class MAC_AGENT,WIN_AGENT,CLOUD_API,SYSLOG source
    class COLLECTORS,BUFFERS,VALIDATORS collect
    class NORMALIZERS,ENRICHERS,CLASSIFIERS,INDEXERS process
    class TIMESCALE_WRITE,REDIS_CACHE,ELASTICSEARCH storage
    class STREAM_PROC,ALERT_ENGINE,NOTIF_SVC,DASHBOARD_FEED realtime
    class FRONTEND_DASH,API_ENDPOINTS,ALERT_UI,EXPORT_SVC consumer
```

---

## 4. Extended Normalized Schema - Entity Relationship

```mermaid
erDiagram
    ORGANIZATIONS {
        uuid id PK
        varchar name
        varchar domain
        varchar subscription_tier
        jsonb settings
        timestamptz created_at
    }

    LOGS {
        uuid id PK
        timestamptz timestamp PK
        uuid organization_id FK
        varchar source_identifier
        varchar source_type
        varchar log_level
        text message
        
        %% Threat Intelligence Fields
        varchar threat_indicator
        varchar threat_category
        numeric threat_confidence
        varchar threat_source
        timestamptz threat_ttl
        
        %% Identity & Access Management
        varchar principal_type
        varchar principal_id
        varchar credential_type
        varchar session_id
        varchar authentication_protocol
        boolean privilege_escalation
        varchar access_level
        text_array group_membership
        
        %% Device & Asset Management
        varchar device_id
        varchar device_type
        varchar device_os
        varchar device_manufacturer
        boolean device_compliance
        numeric device_risk_score
        varchar asset_criticality
        varchar asset_owner
        
        %% Network Security
        varchar network_zone
        varchar traffic_direction
        inet source_ip
        inet destination_ip
        integer source_port
        integer destination_port
        varchar protocol
        varchar dns_query
        varchar http_method
        integer http_status_code
        varchar url_domain
        varchar ssl_validation_status
        
        %% Endpoint Security
        text process_command_line
        integer process_parent_id
        varchar process_parent_name
        boolean process_elevated
        varchar file_operation
        varchar file_hash
        bigint file_size
        varchar file_permissions
        text registry_key
        
        %% Email Security
        varchar email_sender
        varchar_array email_recipient
        text email_subject
        integer email_attachment_count
        varchar_array email_attachment_hashes
        numeric email_phishing_score
        
        %% Cloud Security
        varchar cloud_provider
        varchar cloud_region
        varchar cloud_account_id
        varchar cloud_service
        varchar cloud_api_call
        
        %% Application Security
        varchar vulnerability_id
        varchar vulnerability_severity
        numeric vulnerability_score
        boolean exploit_detected
        
        %% Compliance & Audit
        varchar compliance_framework
        varchar audit_event_type
        boolean policy_violation
        varchar data_classification
        boolean sensitive_data_detected
        
        %% Machine Learning
        numeric anomaly_score
        numeric risk_score
        numeric confidence_score
        varchar model_version
        jsonb feature_vector
        
        %% Behavioral Analytics
        numeric user_risk_score
        boolean behavior_anomaly
        varchar peer_group
        boolean time_anomaly
        
        %% Geolocation
        varchar geo_country
        varchar geo_city
        numeric geo_latitude
        numeric geo_longitude
        varchar geo_isp
        
        %% Advanced Threats
        varchar attack_technique
        varchar attack_tactic
        varchar kill_chain_phase
        boolean c2_communication
        boolean lateral_movement
        boolean data_exfiltration
        
        %% Incident Response
        varchar incident_id
        varchar case_id
        boolean evidence_collected
        
        %% Custom Fields
        text custom_field_1
        text custom_field_2
        text custom_field_3
        text_array custom_tags
        
        %% Processing metadata
        timestamptz ingested_at
        boolean normalized
        boolean enriched
        tsvector search_vector
    }

    THREAT_INTELLIGENCE {
        uuid id PK
        varchar indicator
        varchar indicator_type
        varchar threat_type
        numeric confidence
        varchar severity
        varchar source
        text description
        text_array tags
        timestamptz first_seen
        timestamptz last_seen
        boolean active
        jsonb metadata
        timestamptz created_at
    }

    USERS {
        uuid id PK
        varchar email
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar role
        jsonb preferences
        boolean is_active
        timestamptz last_login
    }

    ALERT_RULES {
        uuid id PK
        uuid organization_id FK
        varchar name
        text description
        text query
        varchar condition_operator
        numeric condition_value
        interval time_window
        varchar severity
        boolean is_active
        uuid created_by FK
        timestamptz created_at
    }

    ALERTS {
        uuid id PK
        uuid rule_id FK
        uuid organization_id FK
        timestamptz triggered_at
        timestamptz resolved_at
        varchar severity
        varchar status
        text message
        jsonb query_result
        uuid acknowledged_by FK
        text notes
    }

    %% Specialized Views
    AUTHENTICATION_EVENTS {
        uuid id PK
        timestamptz timestamp
        varchar auth_user
        varchar auth_result
        inet source_ip
        varchar device_id
        varchar session_id
        boolean privilege_escalation
        numeric user_risk_score
        boolean behavior_anomaly
    }

    NETWORK_SECURITY_EVENTS {
        uuid id PK
        timestamptz timestamp
        inet source_ip
        inet destination_ip
        varchar network_zone
        varchar threat_indicator
        varchar dns_query
        varchar http_method
    }

    THREAT_DETECTION_EVENTS {
        uuid id PK
        timestamptz timestamp
        varchar threat_indicator
        varchar attack_technique
        numeric anomaly_score
        boolean c2_communication
        boolean lateral_movement
    }

    %% Relationships
    ORGANIZATIONS ||--o{ LOGS : "contains"
    ORGANIZATIONS ||--o{ USERS : "has"
    ORGANIZATIONS ||--o{ ALERT_RULES : "defines"
    ORGANIZATIONS ||--o{ ALERTS : "manages"
    
    USERS ||--o{ ALERT_RULES : "creates"
    USERS ||--o{ ALERTS : "acknowledges"
    
    ALERT_RULES ||--o{ ALERTS : "triggers"
    
    LOGS ||--o{ THREAT_INTELLIGENCE : "correlates"
    
    %% Views derive from LOGS
    LOGS ||--o{ AUTHENTICATION_EVENTS : "filtered_view"
    LOGS ||--o{ NETWORK_SECURITY_EVENTS : "filtered_view"
    LOGS ||--o{ THREAT_DETECTION_EVENTS : "filtered_view"
```

**Document Version:** 1.7.0  
**Last Updated:** January 2025  
**Companion to:** [Entity Relationship Diagram](./ENTITY_RELATIONSHIP_DIAGRAM.md)

These visual diagrams provide interactive Mermaid representations of the SecureWatch SIEM architecture, showing relationships between components, data flows, and system dependencies. Use these diagrams for architectural planning, system understanding, and documentation purposes.