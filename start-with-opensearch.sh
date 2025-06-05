#!/bin/bash

# SecureWatch Platform Startup Script with OpenSearch Integration
# This script starts all services including OpenSearch for hybrid architecture

set -e

echo "🚀 Starting SecureWatch Platform with OpenSearch Integration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a service is healthy
check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "Checking $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" $url | grep -q "200\|401"; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e " ${RED}✗${NC}"
    return 1
}

# Create network if it doesn't exist
echo "Creating Docker network..."
docker network create securewatch_network 2>/dev/null || true

# Start infrastructure services with OpenSearch
echo -e "\n${YELLOW}Starting infrastructure services with OpenSearch...${NC}"
docker-compose -f docker-compose.dev.yml -f docker-compose.opensearch.yml up -d \
    postgres redis kafka zookeeper elasticsearch kibana \
    opensearch-node1 opensearch-node2 opensearch-dashboards

# Wait for services to be healthy
echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check PostgreSQL
check_service "PostgreSQL" "http://localhost:5432" || true

# Check Redis
check_service "Redis" "http://localhost:6379" || true

# Check Kafka
check_service "Kafka" "http://localhost:9092" || true

# Check OpenSearch
echo -e "\n${YELLOW}Waiting for OpenSearch cluster to be ready...${NC}"
sleep 30  # OpenSearch takes longer to start
check_service "OpenSearch" "https://localhost:9200" || true

# Check OpenSearch Dashboards
check_service "OpenSearch Dashboards" "http://localhost:5601" || true

# Initialize database schema
echo -e "\n${YELLOW}Initializing database schema...${NC}"
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/auth_schema.sql 2>/dev/null || true
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/logs_schema.sql 2>/dev/null || true
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/extended_schema.sql 2>/dev/null || true
docker exec -i securewatch_postgres psql -U securewatch -d securewatch < infrastructure/database/correlation_schema.sql 2>/dev/null || true

# Create OpenSearch index
echo -e "\n${YELLOW}Creating OpenSearch index...${NC}"
curl -k -u admin:admin -X PUT "https://localhost:9200/securewatch-logs" \
    -H 'Content-Type: application/json' \
    -d @infrastructure/opensearch/config/index-template.json 2>/dev/null || true

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# Build packages
echo -e "\n${YELLOW}Building packages...${NC}"
pnpm run build:packages

# Start microservices
echo -e "\n${YELLOW}Starting microservices...${NC}"

# Create log directories
mkdir -p /tmp/securewatch/logs

# Start services with OpenSearch support
echo "Starting Search API with OpenSearch support..."
cd apps/search-api && USE_OPENSEARCH=true pnpm run dev > /tmp/securewatch/logs/search-api.log 2>&1 &
SEARCH_API_PID=$!

echo "Starting Log Ingestion with dual-write support..."
cd ../log-ingestion && USE_OPENSEARCH=true pnpm run dev > /tmp/securewatch/logs/log-ingestion.log 2>&1 &
LOG_INGESTION_PID=$!

echo "Starting Correlation Engine..."
cd ../correlation-engine && pnpm run dev > /tmp/securewatch/logs/correlation-engine.log 2>&1 &
CORRELATION_ENGINE_PID=$!

cd ../..

# Start Frontend
echo -e "\n${YELLOW}Starting Frontend with OpenSearch integration...${NC}"
cd frontend && \
    NEXT_PUBLIC_OPENSEARCH_DASHBOARDS_URL=http://localhost:5601 \
    NEXT_PUBLIC_OPENSEARCH_DASHBOARDS_HOSTS=localhost:5601 \
    USE_OPENSEARCH=true \
    pnpm run dev > /tmp/securewatch/logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd ..

# Wait for services to start
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service health
echo -e "\n${YELLOW}Checking service health...${NC}"
check_service "Search API" "http://localhost:4004/health"
check_service "Log Ingestion" "http://localhost:4002/health"
check_service "Correlation Engine" "http://localhost:4005/health"
check_service "Frontend" "http://localhost:4000"

# Display status
echo -e "\n${GREEN}✅ SecureWatch Platform with OpenSearch is running!${NC}"
echo -e "\n📊 Access points:"
echo "  - Frontend: http://localhost:4000"
echo "  - OpenSearch Dashboards: http://localhost:5601 (admin/admin)"
echo "  - OpenSearch API: https://localhost:9200 (admin/admin)"
echo "  - Kibana (legacy): http://localhost:5601"
echo "  - Search API: http://localhost:4004"
echo "  - Log Ingestion: http://localhost:4002"
echo "  - Correlation Engine: http://localhost:4005"

echo -e "\n📝 Logs available at: /tmp/securewatch/logs/"

echo -e "\n${YELLOW}To start the Mac agent:${NC}"
echo "  source agent_venv/bin/activate"
echo "  python3 agent/event_log_agent.py"

echo -e "\n${YELLOW}To stop all services:${NC}"
echo "  ./stop-services.sh"
echo "  docker-compose -f docker-compose.dev.yml -f docker-compose.opensearch.yml down"

echo -e "\n🎯 ${GREEN}Platform ready for hybrid PostgreSQL + OpenSearch operations!${NC}"

# Keep script running
wait