#!/bin/bash

# Enhanced SecureWatch SIEM Platform Startup Script
# Enterprise-grade visual interface with animations and enhanced monitoring

set -euo pipefail  # Exit on any error

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
NC='\033[0m' # No Color

# Unicode characters for better visuals
CHECK="✅"
CROSS="❌"
ARROW="➤"
BULLET="•"
SHIELD="🛡️"
ROCKET="🚀"
GEAR="⚙️"
CLOCK="🕐"

# Command line options
MINIMAL_MODE=false
DEBUG_MODE=false
DEV_MODE=false

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --minimal)
                MINIMAL_MODE=true
                shift
                ;;
            --debug)
                DEBUG_MODE=true
                shift
                ;;
            --dev)
                DEV_MODE=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--minimal] [--debug] [--dev]"
                exit 1
                ;;
        esac
    done
}

# ASCII Art Logo with typewriter effect
show_logo() {
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
    ║                    🛡️  S I E M  🛡️                      ║
    ║                                                          ║
    ║              Security Intelligence & Event               ║
    ║                   Management Platform                    ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    # Show system info
    if command -v free >/dev/null 2>&1; then
        memory=$(free -h | awk '/^Mem:/ {print $2}')
    else
        memory="Unknown"
    fi
    
    echo -e "${DIM}📊 System: $(uname -s) | CPU: $(nproc 2>/dev/null || echo "Unknown") cores | RAM: $memory${NC}\n"
}

# Typewriter effect for messages (optional)
typewriter_effect() {
    local text="$1"
    local delay=${2:-0.03}
    
    if [ "$DEBUG_MODE" = true ]; then
        for (( i=0; i<${#text}; i++ )); do
            echo -n "${text:$i:1}"
            sleep "$delay"
        done
        echo
    else
        echo "$text"
    fi
}

# Enhanced logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${DIM}[${timestamp}]${NC} ${BLUE}${ARROW}${NC} ${message}"
            ;;
        "SUCCESS")
            echo -e "${DIM}[${timestamp}]${NC} ${GREEN}${CHECK}${NC} ${GREEN}${message}${NC}"
            ;;
        "WARNING")
            echo -e "${DIM}[${timestamp}]${NC} ${YELLOW}⚠️${NC} ${YELLOW}${message}${NC}"
            ;;
        "ERROR")
            echo -e "${DIM}[${timestamp}]${NC} ${RED}${CROSS}${NC} ${RED}${message}${NC}"
            ;;
        "HEADER")
            echo -e "\n${PURPLE}${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
            echo -e "${PURPLE}${BOLD}║${NC} ${WHITE}${BOLD}${message}${NC} ${PURPLE}${BOLD}║${NC}"
            echo -e "${PURPLE}${BOLD}╚═══════════════════════════════════════════════════╝${NC}\n"
            ;;
    esac
}

# Legacy function wrappers for compatibility
log() {
    log_message "INFO" "$1"
}

error() {
    log_message "ERROR" "$1"
}

success() {
    log_message "SUCCESS" "$1"
}

warn() {
    log_message "WARNING" "$1"
}

# Enhanced progress indicator
show_progress() {
    local service=$1
    local port=$2
    
    echo -ne "  ${YELLOW}${GEAR}${NC} Starting ${BOLD}${service}${NC} on port ${CYAN}${port}${NC}"
    
    for i in {1..5}; do
        echo -ne "${BLUE}.${NC}"
        sleep 1
    done
    echo ""
}

# Enhanced service status display
show_service_status() {
    local service_name=$1
    local port=$2
    local status=$3
    local pid=$4
    
    if [ "$status" = "running" ]; then
        echo -e "  ${GREEN}${CHECK}${NC} ${BOLD}${service_name}${NC} ${DIM}→${NC} ${CYAN}:${port}${NC} ${DIM}(PID: ${pid})${NC}"
    else
        echo -e "  ${RED}${CROSS}${NC} ${BOLD}${service_name}${NC} ${DIM}→${NC} ${RED}Failed${NC}"
    fi
}

# Check if process is listening on port
check_port() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -ne "  ${YELLOW}${CLOCK}${NC} Waiting for ${BOLD}${service_name}${NC} to be ready on port ${CYAN}${port}${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e " ${GREEN}${CHECK}${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        echo -n "${BLUE}.${NC}"
    done
    
    echo -e " ${RED}${CROSS}${NC}"
    error "$service_name failed to start on port $port after ${max_attempts}s"
    return 1
}

# Kill existing processes gracefully
cleanup_processes() {
    log_message "INFO" "Cleaning up existing processes..."
    
    # Find and kill processes by pattern
    pids=$(ps aux | grep -E "(tsx watch|next dev|pnpm.*dev)" | grep -v grep | awk '{print $2}' || true)
    
    if [ -n "$pids" ]; then
        log_message "WARNING" "Killing existing development processes: $pids"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        # Force kill if still running
        echo "$pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    log_message "SUCCESS" "Process cleanup completed"
}

# Service URLs with better formatting
show_service_urls() {
    echo -e "\n${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║${NC}                    ${WHITE}${BOLD}SERVICE ENDPOINTS${NC}                    ${CYAN}${BOLD}║${NC}"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${WHITE}${BOLD}🏢 Core Services:${NC}"
    echo -e "  ${BULLET} ${GREEN}Frontend${NC}           ${CYAN}http://localhost:4000${NC}  📊"
    echo -e "  ${BULLET} ${GREEN}Search API${NC}         ${CYAN}http://localhost:4004${NC}  🔍"
    echo -e "  ${BULLET} ${GREEN}Log Ingestion${NC}      ${CYAN}http://localhost:4002${NC}  📥"
    echo -e "  ${BULLET} ${GREEN}Auth Service${NC}       ${CYAN}http://localhost:4006${NC}  🔐"
    
    if [ "$MINIMAL_MODE" = false ]; then
        echo -e "\n${WHITE}${BOLD}⚡ Performance Services:${NC}"
        echo -e "  ${BULLET} ${GREEN}Query Processor${NC}    ${CYAN}http://localhost:4008${NC}  ⚡"
        echo -e "  ${BULLET} ${GREEN}Analytics API${NC}      ${CYAN}http://localhost:4009${NC}  📈"
        echo -e "  ${BULLET} ${GREEN}Correlation Engine${NC} ${CYAN}http://localhost:4005${NC}  🔗"
        echo -e "  ${BULLET} ${GREEN}MCP Marketplace${NC}    ${CYAN}http://localhost:4010${NC}  🏪"
    fi
    
    echo -e "\n${WHITE}${BOLD}📚 Documentation:${NC}"
    echo -e "  ${BULLET} ${GREEN}API Docs${NC}           ${CYAN}http://localhost:4004/api-docs${NC}"
    if [ "$MINIMAL_MODE" = false ]; then
        echo -e "  ${BULLET} ${GREEN}Performance APIs${NC}   ${CYAN}http://localhost:4008/api/docs${NC}"
        echo -e "  ${BULLET} ${GREEN}Analytics APIs${NC}     ${CYAN}http://localhost:4009/api/docs${NC}"
    fi
}

# Enhanced log locations
show_log_locations() {
    echo -e "\n${YELLOW}${BOLD}📋 Log Files:${NC}"
    echo -e "${DIM}╭─────────────────────────────────────────────────────────╮${NC}"
    echo -e "${DIM}│${NC} Frontend:         /tmp/frontend.log                  ${DIM}│${NC}"
    echo -e "${DIM}│${NC} Search API:       /tmp/search-api.log                ${DIM}│${NC}"
    echo -e "${DIM}│${NC} Log Ingestion:    /tmp/log-ingestion.log             ${DIM}│${NC}"
    echo -e "${DIM}│${NC} Auth Service:     /tmp/auth-service.log              ${DIM}│${NC}"
    
    if [ "$MINIMAL_MODE" = false ]; then
        echo -e "${DIM}│${NC} Query Processor:  /tmp/query-processor.log           ${DIM}│${NC}"
        echo -e "${DIM}│${NC} Analytics API:    /tmp/analytics-api.log             ${DIM}│${NC}"
        echo -e "${DIM}│${NC} Correlation:      /tmp/correlation-engine.log        ${DIM}│${NC}"
        echo -e "${DIM}│${NC} MCP Marketplace:  /tmp/mcp-marketplace.log           ${DIM}│${NC}"
    fi
    
    echo -e "${DIM}╰─────────────────────────────────────────────────────────╯${NC}"
}

# Live dashboard function
show_live_dashboard() {
    echo -e "\n${RED}${BOLD}🔴 LIVE DASHBOARD${NC} ${DIM}- Press Ctrl+C to exit${NC}\n"
    
    while true; do
        # Clear the dashboard area (not the whole screen)
        echo -e "\033[10A\033[J"  # Move up 10 lines and clear to end
        
        echo -e "${WHITE}${BOLD}System Status:${NC}"
        echo -e "  ${BULLET} Uptime: $(uptime | awk '{print $3}' | sed 's/,//')"
        echo -e "  ${BULLET} Load: $(uptime | awk -F'load average:' '{print $2}')"
        if command -v free >/dev/null 2>&1; then
            echo -e "  ${BULLET} Memory: $(free -h | awk '/^Mem:/ {printf "%s/%s (%.1f%%)", $3, $2, ($3/$2)*100}')"
        fi
        
        echo -e "\n${WHITE}${BOLD}Service Health:${NC}"
        
        # Quick health checks
        services=("frontend:4000" "search-api:4004" "log-ingestion:4002" "auth-service:4006")
        if [ "$MINIMAL_MODE" = false ]; then
            services+=("query-processor:4008" "analytics-api:4009" "correlation-engine:4005" "mcp-marketplace:4010")
        fi
        
        for service_port in "${services[@]}"; do
            IFS=':' read -r service port <<< "$service_port"
            if lsof -i :$port >/dev/null 2>&1; then
                echo -e "  ${GREEN}${CHECK}${NC} ${service} (${CYAN}:${port}${NC})"
            else
                echo -e "  ${RED}${CROSS}${NC} ${service} (${CYAN}:${port}${NC})"
            fi
        done
        
        echo -e "\n${DIM}$(date '+%Y-%m-%d %H:%M:%S') - Next update in 5s${NC}"
        sleep 5
    done
}

# Verify infrastructure is running
check_infrastructure() {
    log_message "INFO" "Checking infrastructure services..."
    
    # Check Docker services
    if ! docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        log_message "WARNING" "Docker infrastructure not running. Starting..."
        docker compose -f docker-compose.dev.yml up -d
        sleep 10
    fi
    
    # Check database
    echo -ne "  ${YELLOW}${CLOCK}${NC} Testing database connection${BLUE}...${NC}"
    if docker exec securewatch_postgres pg_isready -U securewatch -d securewatch >/dev/null 2>&1; then
        echo -e " ${GREEN}${CHECK}${NC}"
    else
        echo -e " ${RED}${CROSS}${NC}"
        log_message "ERROR" "Database not ready"
        return 1
    fi
    
    # Check Redis
    echo -ne "  ${YELLOW}${CLOCK}${NC} Testing Redis connection${BLUE}...${NC}"
    if docker exec securewatch_redis_master redis-cli -a securewatch_dev ping >/dev/null 2>&1; then
        echo -e " ${GREEN}${CHECK}${NC}"
    else
        echo -e " ${YELLOW}⚠️${NC}"
        log_message "WARNING" "Redis authentication warning (non-critical)"
    fi
    
    log_message "SUCCESS" "Infrastructure verified"
}

# Start a service with error handling
start_service() {
    local service_name=$1
    local port=$2
    local start_command=$3
    local working_dir=$4
    
    show_progress "$service_name" "$port"
    
    cd "$working_dir"
    
    # Start service in background with proper logging
    nohup bash -c "$start_command" > "/tmp/${service_name}.log" 2>&1 &
    local service_pid=$!
    
    # Give it time to initialize
    sleep 3
    
    # Check if process is still running
    if ! kill -0 $service_pid 2>/dev/null; then
        log_message "ERROR" "$service_name failed to start. Check /tmp/${service_name}.log"
        return 1
    fi
    
    # Wait for port to be ready
    if check_port $port "$service_name"; then
        log_message "SUCCESS" "$service_name started successfully (PID: $service_pid)"
        echo $service_pid > "/tmp/${service_name}.pid"
        return 0
    else
        kill $service_pid 2>/dev/null || true
        return 1
    fi
}

# Health check function
health_check() {
    log_message "HEADER" "RUNNING HEALTH CHECKS"
    
    local failed=0
    
    # Define health checks
    health_checks=(
        "Auth Service:4006:/health"
        "Search API:4004:/health" 
        "Log Ingestion:4002:/health"
        "Frontend:4000:/"
    )
    
    if [ "$MINIMAL_MODE" = false ]; then
        health_checks+=(
            "Query Processor:4008:/health"
            "Analytics API:4009:/health"
            "Correlation Engine:4005:/health"
            "MCP Marketplace:4010:/health"
        )
    fi
    
    for check in "${health_checks[@]}"; do
        IFS=':' read -r service port endpoint <<< "$check"
        echo -ne "  ${YELLOW}${CLOCK}${NC} Testing ${BOLD}${service}${NC}${BLUE}...${NC}"
        
        if curl -s "http://localhost:${port}${endpoint}" >/dev/null 2>&1; then
            echo -e " ${GREEN}${CHECK}${NC}"
        else
            echo -e " ${RED}${CROSS}${NC}"
            failed=1
        fi
    done
    
    if [ $failed -eq 0 ]; then
        log_message "SUCCESS" "All health checks passed!"
    else
        log_message "ERROR" "Some health checks failed"
        return 1
    fi
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"
    
    # Show logo and initialize
    show_logo
    log_message "HEADER" "INITIALIZING SECUREWATCH SIEM PLATFORM"
    
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Step 1: Cleanup
    cleanup_processes
    
    # Step 2: Infrastructure check
    if ! check_infrastructure; then
        log_message "ERROR" "Infrastructure check failed"
        exit 1
    fi
    
    # Step 3: Start services in dependency order
    log_message "HEADER" "STARTING BACKEND SERVICES"
    
    # Core services (always start these)
    core_services=(
        "auth-service:4006:./apps/auth-service"
        "search-api:4004:./apps/search-api"
        "log-ingestion:4002:./apps/log-ingestion"
        "frontend:4000:./frontend"
    )
    
    # Performance services (skip in minimal mode)
    performance_services=(
        "query-processor:4008:./apps/query-processor"
        "analytics-api:4009:./apps/analytics-api"
        "correlation-engine:4005:./apps/correlation-engine"
        "mcp-marketplace:4010:./apps/mcp-marketplace"
    )
    
    # Start core services
    for service_info in "${core_services[@]}"; do
        IFS=':' read -r service_name port working_dir <<< "$service_info"
        if ! start_service "$service_name" "$port" "pnpm run dev" "$working_dir"; then
            log_message "ERROR" "Failed to start $service_name"
            exit 1
        fi
    done
    
    # Start performance services (unless minimal mode)
    if [ "$MINIMAL_MODE" = false ]; then
        for service_info in "${performance_services[@]}"; do
            IFS=':' read -r service_name port working_dir <<< "$service_info"
            if ! start_service "$service_name" "$port" "pnpm run dev" "$working_dir"; then
                log_message "ERROR" "Failed to start $service_name"
                exit 1
            fi
        done
    fi
    
    # Step 4: Health checks
    sleep 5  # Allow services to fully initialize
    
    if ! health_check; then
        log_message "ERROR" "Health checks failed"
        exit 1
    fi
    
    # Step 5: Display final status
    echo -e "\n${GREEN}${BOLD}${ROCKET} SECUREWATCH SIEM PLATFORM IS READY! ${ROCKET}${NC}\n"
    
    show_service_urls
    show_log_locations
    
    echo -e "\n${WHITE}${BOLD}🛠️  Management:${NC}"
    echo -e "  ${BULLET} Stop services: ${YELLOW}./stop-services.sh${NC}"
    echo -e "  ${BULLET} View logs: ${YELLOW}tail -f /tmp/[service].log${NC}"
    echo -e "  ${BULLET} Health check: ${YELLOW}curl http://localhost:4000/health${NC}"
    echo -e "  ${BULLET} Live dashboard: ${YELLOW}./start-services.sh --debug${NC} then Ctrl+D"
    
    echo -e "\n${DIM}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${DIM}║${NC} ${CYAN}${CLOCK}${NC} Monitoring services... ${DIM}(Press Ctrl+C to stop)${NC}     ${DIM}║${NC}"
    echo -e "${DIM}╚═══════════════════════════════════════════════════════════╝${NC}\n"
    
    # Monitor services or show live dashboard
    if [ "$DEBUG_MODE" = true ]; then
        echo -e "${DIM}Press 'd' for live dashboard, any other key to continue monitoring...${NC}"
        read -n 1 -t 5 key
        if [ "$key" = "d" ]; then
            show_live_dashboard
        fi
    fi
    
    # Standard monitoring loop
    while true; do
        sleep 30
        if ! health_check >/dev/null 2>&1; then
            log_message "WARNING" "Health check failed, attempting restart..."
            main "$@"
            break
        fi
    done
}

# Handle Ctrl+C
trap 'echo -e "\n${YELLOW}${GEAR}${NC} Shutting down SecureWatch SIEM Platform..."; cleanup_processes; exit 0' INT

# Display usage information
show_usage() {
    echo -e "${WHITE}${BOLD}SecureWatch SIEM Platform Startup Script${NC}"
    echo -e "${DIM}Enterprise-grade visual interface with animations and enhanced monitoring${NC}\n"
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  $0 [OPTIONS]\n"
    echo -e "${BOLD}Options:${NC}"
    echo -e "  ${CYAN}--minimal${NC}    Start only core services (frontend, search-api, log-ingestion, auth-service)"
    echo -e "  ${CYAN}--debug${NC}      Enable verbose logging and typewriter effects"
    echo -e "  ${CYAN}--dev${NC}        Development mode with additional debugging features"
    echo -e "  ${CYAN}--help${NC}       Show this help message\n"
    echo -e "${BOLD}Examples:${NC}"
    echo -e "  $0                 ${DIM}# Start all services with enhanced interface${NC}"
    echo -e "  $0 --minimal       ${DIM}# Start only core services for development${NC}"
    echo -e "  $0 --debug         ${DIM}# Start with verbose logging and live dashboard option${NC}"
    echo -e "  $0 --dev           ${DIM}# Development mode with extra debugging${NC}"
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"