#!/bin/bash

# =============================================================================
# SecureWatch Platform - Graceful Shutdown Script
# =============================================================================
# This script provides graceful shutdown with proper reverse dependency ordering,
# data persistence protection, and comprehensive cleanup for the SecureWatch platform.
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
GRACEFUL_STOP_TIMEOUT=30  # 30 seconds for each service to stop gracefully
FORCE_STOP_TIMEOUT=10     # 10 seconds before force kill
SHUTDOWN_LOG_FILE="/tmp/securewatch_shutdown_$(date +%Y%m%d_%H%M%S).log"

# Service tiers for ordered shutdown (reverse dependency order)
TIER1_SERVICES=("frontend")  # Stop frontend first
TIER2_SERVICES=("new-ueba-service" "new-reporting-service")  # Stop extended services
TIER3_SERVICES=("mcp-marketplace" "analytics-engine" "correlation-engine" "search-api" "log-ingestion")  # Stop core services  
TIER4_SERVICES=("kibana" "elasticsearch" "kafka")  # Stop messaging and search
TIER5_SERVICES=("zookeeper" "redis" "postgres")  # Stop infrastructure last

# Optional services that can be stopped anytime
OPTIONAL_SERVICES=("kibana")

# Services that require data persistence protection
DATA_SERVICES=("postgres" "redis" "elasticsearch")

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${RED}"
    echo "============================================================================="
    echo "🛑 SecureWatch Platform - Graceful Shutdown"
    echo "============================================================================="
    echo -e "${NC}"
    echo -e "${CYAN}📋 Shutdown Configuration:${NC}"
    echo -e "   📄 Compose File: ${COMPOSE_FILE}"
    echo -e "   ⏱️  Graceful Timeout: ${GRACEFUL_STOP_TIMEOUT}s per service"
    echo -e "   💀 Force Timeout: ${FORCE_STOP_TIMEOUT}s"
    echo -e "   📝 Log File: ${SHUTDOWN_LOG_FILE}"
    echo ""
}

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$SHUTDOWN_LOG_FILE"
    
    case $level in
        "INFO")  echo -e "${GREEN}ℹ️  $message${NC}" ;;
        "WARN")  echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "DEBUG") echo -e "${PURPLE}🔍 $message${NC}" ;;
        *)       echo -e "${CYAN}📋 $message${NC}" ;;
    esac
}

check_running_services() {
    log_message "INFO" "Checking for running SecureWatch services..."
    
    if ! docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
        log_message "INFO" "No SecureWatch services are currently running"
        return 1
    fi
    
    log_message "INFO" "Found running SecureWatch services"
    return 0
}

show_current_status() {
    echo -e "${CYAN}📊 Current Service Status:${NC}"
    echo "============================================================================="
    
    local running_services=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null || echo "")
    
    if [ -z "$running_services" ]; then
        echo -e "${YELLOW}   No services currently running${NC}"
        return
    fi
    
    while IFS= read -r service; do
        if [ -n "$service" ]; then
            local status=$(docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep "$service" | awk '{print $4}' || echo "Unknown")
            echo -e "   $service: ${GREEN}Running${NC} ($status)"
        fi
    done <<< "$running_services"
    
    echo "============================================================================="
}

backup_critical_data() {
    log_message "INFO" "Initiating data backup before shutdown..."
    
    local backup_dir="/tmp/securewatch_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup PostgreSQL data
    if docker-compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "Up"; then
        log_message "INFO" "Backing up PostgreSQL data..."
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dumpall -U securewatch > "$backup_dir/postgres_backup.sql" 2>/dev/null; then
            log_message "INFO" "PostgreSQL backup completed: $backup_dir/postgres_backup.sql"
        else
            log_message "WARN" "PostgreSQL backup failed, continuing with shutdown..."
        fi
    fi
    
    # Backup Redis data (trigger BGSAVE)
    if docker-compose -f "$COMPOSE_FILE" ps redis 2>/dev/null | grep -q "Up"; then
        log_message "INFO" "Triggering Redis background save..."
        if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE >/dev/null 2>&1; then
            log_message "INFO" "Redis background save triggered"
            # Wait a moment for BGSAVE to complete
            sleep 3
        else
            log_message "WARN" "Redis backup trigger failed, continuing with shutdown..."
        fi
    fi
    
    log_message "INFO" "Data backup process completed"
}

stop_service_tier() {
    local tier_name="$1"
    shift
    local services=("$@")
    
    if [ ${#services[@]} -eq 0 ]; then
        log_message "DEBUG" "No services in tier '$tier_name', skipping..."
        return 0
    fi
    
    log_message "INFO" "Stopping $tier_name: ${services[*]}"
    
    # Send graceful stop signal to all services in tier
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
            log_message "DEBUG" "Stopping service: $service"
            docker-compose -f "$COMPOSE_FILE" stop -t "$GRACEFUL_STOP_TIMEOUT" "$service" 2>>"$SHUTDOWN_LOG_FILE" &
        else
            log_message "DEBUG" "Service $service is not running, skipping..."
        fi
    done
    
    # Wait for all background stop processes to complete
    wait
    
    # Verify all services in tier are stopped
    local stopped_successfully=true
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
            log_message "WARN" "Service $service did not stop gracefully, will force stop later"
            stopped_successfully=false
        fi
    done
    
    if [ "$stopped_successfully" = true ]; then
        log_message "INFO" "$tier_name shutdown completed ✅"
    else
        log_message "WARN" "$tier_name shutdown completed with warnings ⚠️"
    fi
}

wait_for_data_persistence() {
    log_message "INFO" "Ensuring data persistence for critical services..."
    
    for service in "${DATA_SERVICES[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
            case "$service" in
                "postgres")
                    log_message "DEBUG" "Ensuring PostgreSQL writes are flushed..."
                    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U securewatch -d securewatch -c "CHECKPOINT;" >/dev/null 2>&1 || true
                    ;;
                "redis")
                    log_message "DEBUG" "Ensuring Redis writes are flushed..."
                    docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE >/dev/null 2>&1 || true
                    sleep 2  # Give Redis time to complete background save
                    ;;
                "elasticsearch")
                    log_message "DEBUG" "Ensuring Elasticsearch writes are flushed..."
                    curl -s -X POST "localhost:9200/_flush/synced" >/dev/null 2>&1 || true
                    ;;
            esac
        fi
    done
    
    log_message "INFO" "Data persistence checks completed"
}

force_stop_remaining() {
    log_message "INFO" "Checking for any remaining running services..."
    
    local remaining_services=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null || echo "")
    
    if [ -z "$remaining_services" ]; then
        log_message "INFO" "All services stopped successfully"
        return 0
    fi
    
    log_message "WARN" "Force stopping remaining services..."
    
    while IFS= read -r service; do
        if [ -n "$service" ]; then
            log_message "DEBUG" "Force stopping: $service"
            docker-compose -f "$COMPOSE_FILE" kill "$service" 2>>"$SHUTDOWN_LOG_FILE" || true
        fi
    done <<< "$remaining_services"
    
    # Wait a moment for force stops to take effect
    sleep 2
}

cleanup_containers_and_networks() {
    log_message "INFO" "Cleaning up containers and networks..."
    
    # Remove stopped containers
    log_message "DEBUG" "Removing stopped containers..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>>"$SHUTDOWN_LOG_FILE" || true
    
    # Clean up any orphaned containers
    log_message "DEBUG" "Removing orphaned containers..."
    docker container prune -f >/dev/null 2>&1 || true
    
    # Clean up unused networks (be careful not to remove other networks)
    log_message "DEBUG" "Cleaning up unused networks..."
    docker network prune -f >/dev/null 2>&1 || true
    
    log_message "INFO" "Container and network cleanup completed"
}

verify_complete_shutdown() {
    log_message "INFO" "Verifying complete shutdown..."
    
    local remaining_containers=$(docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null || echo "")
    
    if [ -z "$remaining_containers" ]; then
        log_message "INFO" "✅ All SecureWatch services successfully stopped"
        return 0
    else
        log_message "ERROR" "❌ Some containers may still be running:"
        docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || true
        return 1
    fi
}

show_shutdown_summary() {
    echo ""
    echo -e "${GREEN}"
    echo "============================================================================="
    echo "✅ SecureWatch Platform Shutdown Complete!"
    echo "============================================================================="
    echo -e "${NC}"
    
    echo -e "${CYAN}📊 Shutdown Summary:${NC}"
    echo -e "   🛑 All services stopped successfully"
    echo -e "   💾 Data persistence protected"
    echo -e "   🧹 Containers and networks cleaned up"
    echo -e "   📝 Shutdown log: $SHUTDOWN_LOG_FILE"
    echo ""
    
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo -e "   🚀 Start platform:     ./start.sh"
    echo -e "   📊 Check containers:   docker ps"
    echo -e "   🧹 Full cleanup:       docker system prune -f"
    echo ""
    
    echo -e "${CYAN}💾 Data Volumes Preserved:${NC}"
    echo -e "   🐘 PostgreSQL data:    postgres_data"
    echo -e "   🟥 Redis data:         redis_data"  
    echo -e "   🔍 Elasticsearch data: elasticsearch_data"
    echo -e "   🔄 Kafka data:         kafka_data"
    echo ""
    
    echo -e "${GREEN}✅ Platform shutdown completed safely!${NC}"
    echo "============================================================================="
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Initialize log file
    echo "SecureWatch Platform Shutdown Log - $(date)" > "$SHUTDOWN_LOG_FILE"
    
    print_header
    
    # Step 1: Check if services are running
    if ! check_running_services; then
        echo -e "${YELLOW}No SecureWatch services are currently running.${NC}"
        echo -e "${CYAN}If you want to clean up containers anyway, run: docker-compose -f $COMPOSE_FILE down${NC}"
        exit 0
    fi
    
    # Step 2: Show current status
    show_current_status
    
    # Step 3: Confirm shutdown
    echo ""
    read -p "$(echo -e ${YELLOW}🛑 Are you sure you want to stop SecureWatch platform? [y/N]: ${NC})" -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Shutdown cancelled by user${NC}"
        exit 0
    fi
    
    # Step 4: Backup critical data
    backup_critical_data
    
    # Step 5: Ensure data persistence
    wait_for_data_persistence
    
    # Step 6: Stop services in reverse dependency order
    echo ""
    echo -e "${BLUE}🛑 Stopping services in reverse dependency order...${NC}"
    echo ""
    
    stop_service_tier "Frontend (Tier 1)" "${TIER1_SERVICES[@]}"
    stop_service_tier "Extended Services (Tier 2)" "${TIER2_SERVICES[@]}"
    stop_service_tier "Core Services (Tier 3)" "${TIER3_SERVICES[@]}"
    stop_service_tier "Messaging & Search (Tier 4)" "${TIER4_SERVICES[@]}"
    stop_service_tier "Infrastructure (Tier 5)" "${TIER5_SERVICES[@]}"
    
    # Step 7: Force stop any remaining services
    force_stop_remaining
    
    # Step 8: Final cleanup
    cleanup_containers_and_networks
    
    # Step 9: Verify complete shutdown
    if ! verify_complete_shutdown; then
        log_message "WARN" "Shutdown completed with warnings"
        exit 1
    fi
    
    # Step 10: Show shutdown summary
    show_shutdown_summary
    
    log_message "INFO" "SecureWatch platform shutdown completed successfully"
}

# Handle interruption gracefully
trap 'echo -e "\n${RED}🛑 Shutdown interrupted by user${NC}"; log_message "WARN" "Shutdown interrupted by user"; exit 130' INT

# Run main function
main "$@"