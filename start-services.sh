#!/bin/bash

# Enterprise-grade SIEM Platform Startup Script
# Ensures all services start reliably with proper error handling

set -euo pipefail  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if process is listening on port
check_port() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    log "Waiting for $service_name to be ready on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if lsof -i :$port >/dev/null 2>&1; then
            success "$service_name is ready on port $port"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    error "$service_name failed to start on port $port after ${max_attempts}s"
    return 1
}

# Kill existing processes gracefully
cleanup_processes() {
    log "Cleaning up existing processes..."
    
    # Find and kill processes by pattern
    pids=$(ps aux | grep -E "(tsx watch|next dev|pnpm.*dev)" | grep -v grep | awk '{print $2}' || true)
    
    if [ -n "$pids" ]; then
        warn "Killing existing development processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        # Force kill if still running
        echo "$pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    success "Process cleanup completed"
}

# Verify infrastructure is running
check_infrastructure() {
    log "Checking infrastructure services..."
    
    # Check Docker services
    if ! docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        error "Docker infrastructure not running. Starting..."
        docker compose -f docker-compose.dev.yml up -d
        sleep 10
    fi
    
    # Check database
    if ! docker exec securewatch_postgres pg_isready -U securewatch -d securewatch >/dev/null 2>&1; then
        error "Database not ready"
        return 1
    fi
    
    # Check Redis
    if ! docker exec securewatch_redis_master redis-cli -a securewatch_dev ping >/dev/null 2>&1; then
        warn "Redis authentication warning (non-critical)"
    fi
    
    success "Infrastructure verified"
}

# Start a service with error handling
start_service() {
    local service_name=$1
    local port=$2
    local start_command=$3
    local working_dir=$4
    
    log "Starting $service_name..."
    
    cd "$working_dir"
    
    # Start service in background with proper logging
    nohup bash -c "$start_command" > "/tmp/${service_name}.log" 2>&1 &
    local service_pid=$!
    
    # Give it time to initialize
    sleep 5
    
    # Check if process is still running
    if ! kill -0 $service_pid 2>/dev/null; then
        error "$service_name failed to start. Check /tmp/${service_name}.log"
        return 1
    fi
    
    # Wait for port to be ready
    if check_port $port "$service_name"; then
        success "$service_name started successfully (PID: $service_pid)"
        echo $service_pid > "/tmp/${service_name}.pid"
        return 0
    else
        kill $service_pid 2>/dev/null || true
        return 1
    fi
}

# Health check function
health_check() {
    log "Running health checks..."
    
    local failed=0
    
    # Test Search API
    if curl -s http://localhost:4004/health >/dev/null 2>&1; then
        success "Search API health check passed"
    else
        error "Search API health check failed"
        failed=1
    fi
    
    # Test Log Ingestion
    if curl -s http://localhost:4002/health >/dev/null 2>&1; then
        success "Log Ingestion health check passed"
    else
        error "Log Ingestion health check failed"
        failed=1
    fi
    
    # Test Frontend
    if curl -s http://localhost:4000 >/dev/null 2>&1; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
        failed=1
    fi
    
    if [ $failed -eq 0 ]; then
        success "All health checks passed!"
    else
        error "Some health checks failed"
        return 1
    fi
}

# Main execution
main() {
    log "Starting SecureWatch SIEM Platform..."
    
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Step 1: Cleanup
    cleanup_processes
    
    # Step 2: Infrastructure check
    if ! check_infrastructure; then
        error "Infrastructure check failed"
        exit 1
    fi
    
    # Step 3: Start services in dependency order
    log "Starting backend services..."
    
    # Start Search API
    if ! start_service "search-api" 4004 "pnpm run dev" "./apps/search-api"; then
        error "Failed to start Search API"
        exit 1
    fi
    
    # Start Log Ingestion
    if ! start_service "log-ingestion" 4002 "pnpm run dev" "./apps/log-ingestion"; then
        error "Failed to start Log Ingestion"
        exit 1
    fi
    
    # Start Frontend
    if ! start_service "frontend" 4000 "pnpm run dev" "./frontend"; then
        error "Failed to start Frontend"
        exit 1
    fi
    
    # Step 4: Health checks
    sleep 10  # Allow services to fully initialize
    
    if ! health_check; then
        error "Health checks failed"
        exit 1
    fi
    
    # Step 5: Display status
    success "🎉 SecureWatch SIEM Platform is ready!"
    echo ""
    echo "Services:"
    echo "  📊 Frontend:        http://localhost:4000"
    echo "  🔍 Search API:      http://localhost:4004"
    echo "  📥 Log Ingestion:   http://localhost:4002"
    echo "  📚 API Docs:        http://localhost:4004/api-docs"
    echo ""
    echo "Logs available at:"
    echo "  Frontend:     /tmp/frontend.log"
    echo "  Search API:   /tmp/search-api.log"
    echo "  Log Ingestion: /tmp/log-ingestion.log"
    echo ""
    echo "To stop services: ./stop-services.sh"
    
    # Monitor services
    log "Monitoring services (Ctrl+C to stop)..."
    while true; do
        sleep 30
        if ! health_check >/dev/null 2>&1; then
            warn "Health check failed, restarting services..."
            main
            break
        fi
    done
}

# Handle Ctrl+C
trap 'log "Shutting down..."; cleanup_processes; exit 0' INT

# Run main function
main "$@"