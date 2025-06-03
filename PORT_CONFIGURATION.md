# SecureWatch Port Configuration

All services have been configured to use the 4000 port range to avoid conflicts with other applications.

## Frontend
- **Port 4000**: Next.js Frontend Application
  - Location: `/frontend`
  - Start: `npm run dev` (from frontend directory)

## Backend Microservices
- **Port 4001**: Auth Service
  - Location: `/apps/auth-service`
  - Handles: Authentication, OAuth, JWT tokens
  
- **Port 4002**: Log Ingestion Service
  - Location: `/apps/log-ingestion`
  - Handles: Log collection, parsing, normalization
  
- **Port 4003**: API Gateway (when implemented)
  - Location: `/apps/api-gateway`
  - Handles: API routing, rate limiting, request proxying
  
- **Port 4004**: Search API
  - Location: `/apps/search-api`
  - Handles: KQL queries, log search, analytics

- **Port 4005**: Analytics Engine (reserved)
  - Location: `/apps/analytics-engine`
  - Handles: Data analysis, aggregations, reporting

## Infrastructure Services (Docker)
- **Port 5432**: PostgreSQL/TimescaleDB
- **Port 6379**: Redis Master
- **Port 6380**: Redis Replica
- **Port 9092**: Kafka
- **Port 9200**: Elasticsearch
- **Port 5601**: Kibana

## Starting Services

### Option 1: Using Turbo (Monorepo)
```bash
# From project root
npm run dev  # Starts all services
```

### Option 2: Individual Services
```bash
# Frontend
cd frontend && npm run dev

# Search API
cd apps/search-api && npm run dev

# Auth Service
cd apps/auth-service && npm run dev

# Log Ingestion
cd apps/log-ingestion && npm run dev
```

### Option 3: Docker Infrastructure
```bash
# Start infrastructure services
docker-compose -f docker-compose.dev.yml up -d
```

## Environment Variables

The frontend uses `.env.local` with the following API URLs:
- `NEXT_PUBLIC_AUTH_API_URL=http://localhost:4001`
- `NEXT_PUBLIC_SEARCH_API_URL=http://localhost:4004`
- `NEXT_PUBLIC_LOG_INGESTION_URL=http://localhost:4002`
- `NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4003`