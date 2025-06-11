#!/bin/bash

# Enhanced SecureWatch SIEM Platform Startup Script with Infrastructure Dependencies
# Implements VisionCraft's recommendations for proper service sequencing

set -euo pipefail

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Icons
CHECK="✅"
CROSS="❌"
ARROW="➤"
CLOCK="🕐"
GEAR="⚙️"
SHIELD="🛡️"
DATABASE="🗄️"
CACHE="⚡"
SEARCH="🔍"

# Configuration
MAX_RETRIES=30
RETRY_DELAY=2
HEALTH_CHECK_INTERVAL=5

# Logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${DIM}[$timestamp]${NC} ${BLUE}${ARROW}${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${DIM}[$timestamp]${NC} ${GREEN}${CHECK}${NC} ${GREEN}$message${NC}"
            ;;
        "WARNING")
            echo -e "${DIM}[$timestamp]${NC} ${YELLOW}⚠️${NC} ${YELLOW}$message${NC}"
            ;;
        "ERROR")
            echo -e "${DIM}[$timestamp]${NC} ${RED}${CROSS}${NC} ${RED}$message${NC}"
            ;;
    esac
}

# Enhanced health check with retry logic
check_service_health() {
    local service_name=$1
    local host=${2:-localhost}
    local port=$3
    local endpoint=${4:-/health}
    local max_attempts=${5:-$MAX_RETRIES}
    
    log_message "INFO" "Checking health for $service_name on ${host}:${port}${endpoint}"
    
    for ((i=1; i<=max_attempts; i++)); do
        if curl -f -s "http://${host}:${port}${endpoint}" >/dev/null 2>&1; then
            log_message "SUCCESS" "$service_name is healthy (attempt $i/$max_attempts)"
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            echo -n "${YELLOW}${CLOCK}${NC} Waiting for $service_name (${i}/${max_attempts})..."
            sleep $RETRY_DELAY
            echo -e " ${BLUE}retrying${NC}"
        fi
    done
    
    log_message "ERROR" "$service_name health check failed after $max_attempts attempts"
    return 1
}

# Database connectivity check
check_database_connectivity() {
    local max_attempts=${1:-$MAX_RETRIES}
    
    log_message "INFO" "Checking PostgreSQL connectivity"
    
    for ((i=1; i<=max_attempts; i++)); do
        if docker exec securewatch_postgres pg_isready -U securewatch >/dev/null 2>&1; then
            log_message "SUCCESS" "PostgreSQL is ready (attempt $i/$max_attempts)"
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            echo -n "${YELLOW}${CLOCK}${NC} Waiting for PostgreSQL (${i}/${max_attempts})..."
            sleep $RETRY_DELAY
            echo -e " ${BLUE}retrying${NC}"
        fi
    done
    
    log_message "ERROR" "PostgreSQL connectivity check failed after $max_attempts attempts"
    return 1
}

# Redis connectivity check
check_redis_connectivity() {
    local max_attempts=${1:-$MAX_RETRIES}
    
    log_message "INFO" "Checking Redis connectivity"
    
    for ((i=1; i<=max_attempts; i++)); do
        # Try with password authentication first, then without
        if docker exec securewatch_redis_master redis-cli -a securewatch_dev ping 2>/dev/null | grep -q PONG >/dev/null 2>&1; then
            log_message "SUCCESS" "Redis is ready with auth (attempt $i/$max_attempts)"
            return 0
        elif docker exec securewatch_redis_master redis-cli ping 2>/dev/null | grep -q PONG >/dev/null 2>&1; then
            log_message "SUCCESS" "Redis is ready without auth (attempt $i/$max_attempts)"
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            echo -n "${YELLOW}${CLOCK}${NC} Waiting for Redis (${i}/${max_attempts})..."
            sleep $RETRY_DELAY
            echo -e " ${BLUE}retrying${NC}"
        fi
    done
    
    log_message "ERROR" "Redis connectivity check failed after $max_attempts attempts"
    return 1
}

# OpenSearch connectivity check
check_opensearch_connectivity() {
    local max_attempts=${1:-$MAX_RETRIES}
    
    log_message "INFO" "Checking OpenSearch connectivity"
    
    for ((i=1; i<=max_attempts; i++)); do
        if curl -f -s "http://localhost:9200/_cluster/health" >/dev/null 2>&1; then
            log_message "SUCCESS" "OpenSearch is ready (attempt $i/$max_attempts)"
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            echo -n "${YELLOW}${CLOCK}${NC} Waiting for OpenSearch (${i}/${max_attempts})..."
            sleep $RETRY_DELAY
            echo -e " ${BLUE}retrying${NC}"
        fi
    done
    
    log_message "ERROR" "OpenSearch connectivity check failed after $max_attempts attempts"
    return 1
}

# Start infrastructure services
start_infrastructure() {
    echo -e "\n${PURPLE}${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}${BOLD}║${NC} ${WHITE}${BOLD}STARTING INFRASTRUCTURE SERVICES${NC} ${PURPLE}${BOLD}║${NC}"
    echo -e "${PURPLE}${BOLD}╚═══════════════════════════════════════════════════╝${NC}\n"
    
    log_message "INFO" "Starting Docker infrastructure..."
    
    # Stop any existing containers
    docker compose -f docker-compose.dev.yml down >/dev/null 2>&1 || true
    
    # Start infrastructure services
    if docker compose -f docker-compose.dev.yml up -d postgres redis opensearch; then
        log_message "SUCCESS" "Infrastructure containers started"
    else
        log_message "ERROR" "Failed to start infrastructure containers"
        return 1
    fi
    
    # Wait for services to be ready with enhanced health checks
    echo -e "\n${CYAN}${BOLD}Infrastructure Health Checks:${NC}"
    echo -e "  ${DATABASE} PostgreSQL..."
    check_database_connectivity || return 1
    
    echo -e "  ${CACHE} Redis..."
    check_redis_connectivity || return 1
    
    echo -e "  ${SEARCH} OpenSearch..."
    check_opensearch_connectivity || return 1
    
    log_message "SUCCESS" "All infrastructure services are ready"
    return 0
}

# Start application services with dependencies
start_application_services() {
    echo -e "\n${PURPLE}${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}${BOLD}║${NC} ${WHITE}${BOLD}STARTING APPLICATION SERVICES${NC} ${PURPLE}${BOLD}║${NC}"
    echo -e "${PURPLE}${BOLD}╚═══════════════════════════════════════════════════╝${NC}\n"
    
    log_message "INFO" "Starting microservices with proper dependency order..."
    
    # Get the absolute path to the monorepo root using VisionCraft's recommended approach
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    MONOREPO_ROOT="$SCRIPT_DIR"
    
    log_message "INFO" "Monorepo root: $MONOREPO_ROOT"
    
    # Start services using turbo with proper concurrency
    echo -e "\n${CYAN}Starting All Services with Turbo:${NC}"
    
    log_message "INFO" "Using turbo dev with concurrency=28 for optimal performance..."
    
    # Use subshell to ensure we're in the correct directory
    (
        cd "$MONOREPO_ROOT"
        log_message "INFO" "Current directory: $(pwd)"
        
        # Start all services with turbo using our optimized concurrency
        pnpm run dev > /tmp/turbo-dev.log 2>&1 &
        TURBO_PID=$!
        echo $TURBO_PID > /tmp/turbo-dev.pid
        
        log_message "INFO" "Turbo started with PID: $TURBO_PID"
        
        # Wait a bit for turbo to initialize services
        log_message "INFO" "Waiting for turbo to initialize all services..."
        sleep 10
        
        # Check if turbo is still running
        if kill -0 $TURBO_PID 2>/dev/null; then
            log_message "SUCCESS" "Turbo is running successfully"
        else
            log_message "ERROR" "Turbo process died, check logs at /tmp/turbo-dev.log"
            return 1
        fi
    )
    
    log_message "SUCCESS" "All application services started via Turbo"
}

# Health check all services
verify_all_services() {
    echo -e "\n${PURPLE}${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}${BOLD}║${NC} ${WHITE}${BOLD}VERIFYING ALL SERVICES${NC} ${PURPLE}${BOLD}║${NC}"
    echo -e "${PURPLE}${BOLD}╚═══════════════════════════════════════════════════╝${NC}\n"
    
    local services=(
        "Frontend:localhost:4000:/"
        "Auth Service:localhost:4006:/health"
        "Search API:localhost:4004:/health"
        "Log Ingestion:localhost:4002:/health"
        "Analytics Engine:localhost:4009:/health"
        "Correlation Engine:localhost:4005:/health"
        "Query Processor:localhost:4008:/health"
    )
    
    local failed_services=0
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name host port endpoint <<< "$service_info"
        
        if check_service_health "$name" "$host" "$port" "$endpoint" 10; then
            echo -e "  ${GREEN}${CHECK}${NC} $name"
        else
            echo -e "  ${RED}${CROSS}${NC} $name"
            ((failed_services++))
        fi
    done
    
    if [ $failed_services -eq 0 ]; then
        log_message "SUCCESS" "All services are healthy and ready"
        return 0
    else
        log_message "WARNING" "$failed_services services failed health checks"
        return 1
    fi
}

# Show service URLs
show_service_urls() {
    echo -e "\n${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║${NC}                    ${WHITE}${BOLD}SERVICE ENDPOINTS${NC}                    ${CYAN}${BOLD}║${NC}"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${WHITE}${BOLD}🏢 Core Services:${NC}"
    echo -e "  • ${GREEN}Frontend${NC}           ${CYAN}http://localhost:4000${NC}  📊"
    echo -e "  • ${GREEN}Auth Service${NC}       ${CYAN}http://localhost:4006${NC}  🔐"
    echo -e "  • ${GREEN}Search API${NC}         ${CYAN}http://localhost:4004${NC}  🔍"
    echo -e "  • ${GREEN}Log Ingestion${NC}      ${CYAN}http://localhost:4002${NC}  📥"
    echo -e ""
    echo -e "${WHITE}${BOLD}⚡ Analytics Services:${NC}"
    echo -e "  • ${GREEN}Analytics Engine${NC}   ${CYAN}http://localhost:4009${NC}  📈"
    echo -e "  • ${GREEN}Correlation Engine${NC} ${CYAN}http://localhost:4005${NC}  🔗"
    echo -e "  • ${GREEN}Query Processor${NC}    ${CYAN}http://localhost:4008${NC}  ⚡"
    echo -e ""
    echo -e "${WHITE}${BOLD}📊 Infrastructure:${NC}"
    echo -e "  • ${GREEN}PostgreSQL${NC}         ${CYAN}localhost:5432${NC}       🗄️"
    echo -e "  • ${GREEN}Redis${NC}              ${CYAN}localhost:6379${NC}       ⚡"
    echo -e "  • ${GREEN}OpenSearch${NC}         ${CYAN}localhost:9200${NC}       🔍"
}

# Main execution
main() {
    # Clear screen and show banner
    clear
    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║    ██████╗ ███████╗ ██████╗██╗   ██╗██████╗ ███████╗    ║
    ║   ██╔════╝ ██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝    ║
    ║   ███████╗ █████╗  ██║     ██║   ██║██████╔╝█████╗      ║
    ║   ╚════██║ ██╔══╝  ██║     ██║   ██║██╔══██╗██╔══╝      ║
    ║   ███████║ ███████╗╚██████╗╚██████╔╝██║  ██║███████╗    ║
    ║   ╚══════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ║
    ║                                                          ║
    ║   ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗           ║
    ║   ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║           ║
    ║   ██║ █╗ ██║███████║   ██║   ██║     ███████║           ║
    ║   ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║           ║
    ║   ╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║           ║
    ║    ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝           ║
    ║                                                          ║
    ║              🛡️  ENHANCED STARTUP WITH                   ║
    ║              INFRASTRUCTURE DEPENDENCIES                 ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log_message "INFO" "Starting SecureWatch SIEM Platform with enhanced dependency management..."
    
    # Stage 1: Infrastructure
    if ! start_infrastructure; then
        log_message "ERROR" "Infrastructure startup failed"
        exit 1
    fi
    
    # Stage 2: Applications
    if ! start_application_services; then
        log_message "ERROR" "Application services startup failed"
        exit 1
    fi
    
    # Stage 3: Verification
    log_message "INFO" "Waiting for all services to stabilize..."
    sleep 10
    
    if verify_all_services; then
        echo -e "\n${GREEN}${BOLD}${CHECK} SecureWatch SIEM Platform started successfully!${NC}\n"
        show_service_urls
        
        echo -e "\n${YELLOW}${BOLD}📋 Next Steps:${NC}"
        echo -e "  1. Open ${CYAN}http://localhost:4000${NC} in your browser"
        echo -e "  2. Monitor services: ${CYAN}./cli-dashboard.sh${NC}"
        echo -e "  3. View logs: ${CYAN}make logs${NC}"
        echo -e "  4. Stop services: ${CYAN}./stop-services.sh${NC}"
        
    else
        log_message "WARNING" "Some services may not be fully ready. Check individual service logs."
        show_service_urls
    fi
}

# Execute main function
main "$@"