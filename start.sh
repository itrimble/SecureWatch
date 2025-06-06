#!/bin/bash

# =============================================================================
# SecureWatch Platform - Graceful Startup Script
# =============================================================================
# This script provides graceful startup with proper dependency ordering,
# health checking, and comprehensive monitoring for the SecureWatch platform.
#
# Author: SecureWatch Team
# Version: 1.0.0
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.resilient.yml"
MAX_WAIT_TIME=300  # 5 minutes maximum wait
HEALTH_CHECK_INTERVAL=5  # Check every 5 seconds
STARTUP_LOG_FILE="/tmp/securewatch_startup_$(date +%Y%m%d_%H%M%S).log"

# Service tiers for ordered startup
TIER1_SERVICES=("postgres" "redis" "zookeeper")
TIER2_SERVICES=("kafka" "opensearch")  
TIER3_SERVICES=("log-ingestion" "search-api" "correlation-engine" "analytics-engine" "mcp-marketplace")
TIER4_SERVICES=("new-reporting-service" "new-ueba-service")
TIER5_SERVICES=("frontend")
OPTIONAL_SERVICES=("opensearch-dashboards")

# All critical services that must be healthy
CRITICAL_SERVICES=("postgres" "redis" "kafka" "opensearch" "log-ingestion" "search-api" "correlation-engine" "analytics-engine" "mcp-marketplace" "frontend")

# Service health endpoints (using functions for bash 3.2 compatibility)
get_health_endpoint() {
    case "$1" in
        "log-ingestion") echo "http://localhost:4002/health" ;;
        "search-api") echo "http://localhost:4004/health" ;;
        "correlation-engine") echo "http://localhost:4005/health" ;;
        "analytics-engine") echo "http://localhost:4003/health" ;;
        "mcp-marketplace") echo "http://localhost:4006/health" ;;
        "new-reporting-service") echo "http://localhost:4007/health" ;;
        "new-ueba-service") echo "http://localhost:4008/health" ;;
        "frontend") echo "http://localhost:4000/api/health" ;;
        *) echo "" ;;
    esac
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "============================================================================="
    echo "🚀 SecureWatch Platform - Graceful Startup"
    echo "============================================================================="
    echo -e "${NC}"
    echo -e "${CYAN}📋 Startup Configuration:${NC}"
    echo -e "   📄 Compose File: ${COMPOSE_FILE}"
    echo -e "   ⏱️  Max Wait Time: ${MAX_WAIT_TIME}s"
    echo -e "   📊 Health Check Interval: ${HEALTH_CHECK_INTERVAL}s"
    echo -e "   📝 Log File: ${STARTUP_LOG_FILE}"
    echo ""
}

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$STARTUP_LOG_FILE"
    
    case $level in
        "INFO")  echo -e "${GREEN}ℹ️  $message${NC}" ;;
        "WARN")  echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "DEBUG") echo -e "${PURPLE}🔍 $message${NC}" ;;
        *)       echo -e "${CYAN}📋 $message${NC}" ;;
    esac
}

check_prerequisites() {
    log_message "INFO" "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_message "ERROR" "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if docker-compose or docker compose is available
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        log_message "ERROR" "docker-compose is not installed or not in PATH."
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_message "ERROR" "Compose file '$COMPOSE_FILE' not found."
        exit 1
    fi
    
    # Check available disk space (at least 5GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    available_gb=$((available_space / 1024 / 1024))
    if [ $available_gb -lt 5 ]; then
        log_message "WARN" "Low disk space: ${available_gb}GB available (recommend 5GB+)"
    fi
    
    # Check available memory (at least 8GB)
    available_memory=$(free -g | awk 'NR==2{print $7}')
    if [ $available_memory -lt 4 ]; then
        log_message "WARN" "Low available memory: ${available_memory}GB (recommend 4GB+)"
    fi
    
    log_message "INFO" "Prerequisites check completed ✅"
}

cleanup_existing_containers() {
    log_message "INFO" "Cleaning up existing containers..."
    
    # Stop any running containers from previous runs
    if docker compose -f "$COMPOSE_FILE" ps -q >/dev/null 2>&1; then
        log_message "INFO" "Stopping existing containers..."
        docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    fi
    
    # Clean up any orphaned containers
    log_message "INFO" "Removing orphaned containers..."
    docker container prune -f >/dev/null 2>&1 || true
    
    log_message "INFO" "Cleanup completed ✅"
}

start_service_tier() {
    local tier_name="$1"
    shift
    local services=("$@")
    
    if [ ${#services[@]} -eq 0 ]; then
        log_message "DEBUG" "No services in tier '$tier_name', skipping..."
        return 0
    fi
    
    log_message "INFO" "Starting $tier_name: ${services[*]}"
    
    # Start services in this tier
    for service in "${services[@]}"; do
        log_message "DEBUG" "Starting service: $service"
        if ! docker compose -f "$COMPOSE_FILE" up -d "$service" 2>>"$STARTUP_LOG_FILE"; then
            log_message "ERROR" "Failed to start service: $service"
            return 1
        fi
    done
    
    # Wait for all services in this tier to be healthy
    log_message "INFO" "Waiting for $tier_name services to become healthy..."
    wait_for_services_health "${services[@]}"
    
    log_message "INFO" "$tier_name startup completed ✅"
}

wait_for_services_health() {
    local services=("$@")
    local start_time=$(date +%s)
    local all_healthy=false
    
    while [ $all_healthy = false ]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $MAX_WAIT_TIME ]; then
            log_message "ERROR" "Timeout waiting for services to become healthy (${MAX_WAIT_TIME}s)"
            show_service_status "${services[@]}"
            return 1
        fi
        
        all_healthy=true
        for service in "${services[@]}"; do
            if ! check_service_health "$service"; then
                all_healthy=false
                break
            fi
        done
        
        if [ $all_healthy = false ]; then
            echo -ne "\r${YELLOW}⏳ Waiting for services to become healthy... (${elapsed}s)${NC}"
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    echo -e "\r${GREEN}✅ All tier services are healthy!${NC}                    "
}

check_service_health() {
    local service="$1"
    
    # First check if container is running
    if ! docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
        return 1
    fi
    
    # For services with HTTP health endpoints
    local endpoint=$(get_health_endpoint "$service")
    if [[ -n "$endpoint" ]]; then
        if curl -f -s --max-time 5 "$endpoint" >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    fi
    
    # For infrastructure services, use docker-compose health check
    local health_status=$(docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep "$service" | awk '{print $4}')
    if [[ "$health_status" == *"healthy"* ]] || [[ "$health_status" == *"Up"* ]]; then
        return 0
    fi
    
    return 1
}

show_service_status() {
    local services=("$@")
    
    log_message "INFO" "Current service status:"
    for service in "${services[@]}"; do
        local status="❌ Unhealthy"
        if check_service_health "$service"; then
            status="✅ Healthy"
        fi
        echo -e "   $service: $status"
    done
}

wait_for_all_critical_services() {
    log_message "INFO" "Performing final health check on all critical services..."
    
    local start_time=$(date +%s)
    local all_healthy=false
    
    while [ $all_healthy = false ]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $MAX_WAIT_TIME ]; then
            log_message "ERROR" "Timeout during final health check (${MAX_WAIT_TIME}s)"
            show_comprehensive_status
            return 1
        fi
        
        all_healthy=true
        local healthy_count=0
        
        for service in "${CRITICAL_SERVICES[@]}"; do
            if check_service_health "$service"; then
                ((healthy_count++))
            else
                all_healthy=false
            fi
        done
        
        if [ $all_healthy = false ]; then
            echo -ne "\r${YELLOW}⏳ Final health check... (${healthy_count}/${#CRITICAL_SERVICES[@]} healthy, ${elapsed}s)${NC}"
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    echo -e "\r${GREEN}✅ All critical services are healthy! (${#CRITICAL_SERVICES[@]}/${#CRITICAL_SERVICES[@]})${NC}                    "
}

show_comprehensive_status() {
    echo ""
    echo -e "${BLUE}📊 Comprehensive Service Status:${NC}"
    echo "============================================================================="
    
    local healthy_count=0
    local total_count=0
    
    for tier_name in "Infrastructure (Tier 1)" "Messaging (Tier 2)" "Core Services (Tier 3)" "Extended Services (Tier 4)" "Frontend (Tier 5)"; do
        local services=()
        case "$tier_name" in
            "Infrastructure (Tier 1)") services=("${TIER1_SERVICES[@]}") ;;
            "Messaging (Tier 2)") services=("${TIER2_SERVICES[@]}") ;;
            "Core Services (Tier 3)") services=("${TIER3_SERVICES[@]}") ;;
            "Extended Services (Tier 4)") services=("${TIER4_SERVICES[@]}") ;;
            "Frontend (Tier 5)") services=("${TIER5_SERVICES[@]}") ;;
        esac
        
        if [ ${#services[@]} -gt 0 ]; then
            echo -e "${CYAN}$tier_name:${NC}"
            for service in "${services[@]}"; do
                local status="❌ Unhealthy"
                local endpoint=""
                if check_service_health "$service"; then
                    status="✅ Healthy"
                    ((healthy_count++))
                fi
                ((total_count++))
                
                local endpoint_url=$(get_health_endpoint "$service")
                if [[ -n "$endpoint_url" ]]; then
                    endpoint=" ($endpoint_url)"
                fi
                
                echo -e "   $service: $status$endpoint"
            done
            echo ""
        fi
    done
    
    echo "============================================================================="
    echo -e "${GREEN}📊 Overall Status: $healthy_count/$total_count services healthy${NC}"
}

show_startup_summary() {
    echo ""
    echo -e "${GREEN}"
    echo "============================================================================="
    echo "🎉 SecureWatch Platform Startup Complete!"
    echo "============================================================================="
    echo -e "${NC}"
    
    echo -e "${CYAN}🌐 Service Endpoints:${NC}"
    echo -e "   🎯 Frontend:              http://localhost:4000"
    echo -e "   🔍 Search API:            http://localhost:4004"
    echo -e "   🔄 Correlation Engine:    http://localhost:4005"
    echo -e "   📊 Analytics Engine:      http://localhost:4003"
    echo -e "   📦 MCP Marketplace:       http://localhost:4006"
    echo -e "   📋 Reporting Service:     http://localhost:4007"
    echo -e "   🤖 UEBA Service:          http://localhost:4008"
    echo -e "   🔧 Log Ingestion:         http://localhost:4002"
    echo ""
    
    echo -e "${CYAN}🗄️  Infrastructure:${NC}"
    echo -e "   🐘 PostgreSQL:            localhost:5432"
    echo -e "   🟥 Redis:                 localhost:6379"
    echo -e "   🔄 Kafka:                 localhost:9092"
    echo -e "   🔍 OpenSearch:            localhost:9200"
    echo -e "   📊 OpenSearch Dashboards: http://localhost:5601"
    echo ""
    
    echo -e "${CYAN}📊 Health Monitoring:${NC}"
    echo -e "   📋 View all service health: curl http://localhost:4000/api/health"
    echo -e "   📝 Startup log: $STARTUP_LOG_FILE"
    echo ""
    
    echo -e "${YELLOW}🛠️  Management Commands:${NC}"
    echo -e "   📊 Check status:   docker compose -f $COMPOSE_FILE ps"
    echo -e "   📝 View logs:      docker compose -f $COMPOSE_FILE logs -f [service]"
    echo -e "   🛑 Stop platform:  ./stop.sh"
    echo ""
    
    echo -e "${GREEN}✅ Platform is ready for use!${NC}"
    echo "============================================================================="
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Initialize log file
    echo "SecureWatch Platform Startup Log - $(date)" > "$STARTUP_LOG_FILE"
    
    print_header
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Cleanup
    cleanup_existing_containers
    
    # Step 3: Start services in tiers
    echo ""
    echo -e "${BLUE}🚀 Starting services in dependency order...${NC}"
    echo ""
    
    start_service_tier "Infrastructure (Tier 1)" "${TIER1_SERVICES[@]}" || exit 1
    start_service_tier "Messaging (Tier 2)" "${TIER2_SERVICES[@]}" || exit 1
    start_service_tier "Core Services (Tier 3)" "${TIER3_SERVICES[@]}" || exit 1
    start_service_tier "Extended Services (Tier 4)" "${TIER4_SERVICES[@]}" || exit 1
    start_service_tier "Frontend (Tier 5)" "${TIER5_SERVICES[@]}" || exit 1
    
    # Step 4: Start optional services (non-blocking)
    if [ ${#OPTIONAL_SERVICES[@]} -gt 0 ]; then
        log_message "INFO" "Starting optional services: ${OPTIONAL_SERVICES[*]}"
        for service in "${OPTIONAL_SERVICES[@]}"; do
            docker compose -f "$COMPOSE_FILE" up -d "$service" 2>>"$STARTUP_LOG_FILE" || true
        done
    fi
    
    # Step 5: Final comprehensive health check
    wait_for_all_critical_services || exit 1
    
    # Step 6: Show final status
    show_comprehensive_status
    
    # Step 7: Show startup summary
    show_startup_summary
    
    log_message "INFO" "SecureWatch platform startup completed successfully"
}

# Handle interruption gracefully
trap 'echo -e "\n${RED}🛑 Startup interrupted by user${NC}"; exit 130' INT

# Run main function
main "$@"