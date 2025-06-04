#!/bin/bash

# SecureWatch CLI Dashboard Launcher
# Enhanced version with service control capabilities

set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$SCRIPT_DIR/cli-dashboard"

echo -e "${BLUE}🛡️  SecureWatch SIEM CLI Dashboard${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if CLI is built
if [ ! -d "$CLI_DIR/dist" ]; then
    echo -e "${YELLOW}Building CLI dashboard...${NC}"
    cd "$CLI_DIR"
    npm install
    npm run build
    cd "$SCRIPT_DIR"
fi

# Parse command line arguments
COMMAND=${1:-"dashboard"}
shift 2>/dev/null || true

case "$COMMAND" in
    "dashboard"|"dash")
        echo -e "${GREEN}Starting interactive dashboard...${NC}"
        echo -e "${CYAN}Tip: Use --enhanced flag for service control features${NC}"
        cd "$CLI_DIR"
        node dist/index.js dashboard "$@"
        ;;
    "enhanced"|"edash")
        echo -e "${GREEN}Starting enhanced dashboard with service controls...${NC}"
        cd "$CLI_DIR"
        node dist/index.js enhanced "$@"
        ;;
    "blessed-contrib"|"bc"|"rich")
        echo -e "${GREEN}Starting blessed-contrib dashboard with rich widgets...${NC}"
        echo -e "${CYAN}Enhanced with Nerd Font support, Line Charts, Gauges, and interactive controls${NC}"
        cd "$CLI_DIR"
        node dist/index.js blessed-contrib "$@"
        ;;
    "control")
        if [ $# -lt 2 ]; then
            echo -e "${RED}Usage: $0 control <action> <service>${NC}"
            echo "Actions: start, stop, restart"
            echo "Services: Frontend, 'Search API', 'Log Ingestion', etc."
            exit 1
        fi
        cd "$CLI_DIR"
        node dist/index.js control "$@"
        ;;
    "start-all")
        echo -e "${GREEN}Starting all SecureWatch services...${NC}"
        cd "$CLI_DIR"
        node dist/index.js start-all
        ;;
    "stop-all")
        echo -e "${YELLOW}Stopping all SecureWatch services...${NC}"
        cd "$CLI_DIR"
        node dist/index.js stop-all
        ;;
    "status")
        echo -e "${GREEN}Checking system status...${NC}"
        cd "$CLI_DIR"
        node dist/index.js status "$@"
        ;;
    "health")
        echo -e "${GREEN}Running health checks...${NC}"
        cd "$CLI_DIR"
        node dist/index.js health "$@"
        ;;
    "logs")
        echo -e "${GREEN}Showing recent logs...${NC}"
        cd "$CLI_DIR"
        node dist/index.js logs "$@"
        ;;
    "status-enhanced"|"status-ext")
        echo -e "${GREEN}Starting enhanced status display...${NC}"
        echo -e "${CYAN}Enhanced status includes troubleshooting and detailed context${NC}"
        cd "$CLI_DIR"
        node dist/index.js status-enhanced "$@"
        ;;
    "example-status")
        echo -e "${GREEN}Showing example enhanced status display...${NC}"
        cd "$CLI_DIR"
        node dist/index.js status-enhanced --example
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  dashboard, dash         Start interactive dashboard (default)"
        echo "  enhanced, edash         Start enhanced dashboard with service controls"
        echo "  blessed-contrib, bc     Start blessed-contrib dashboard with rich widgets"
        echo "  status-enhanced         Enhanced status display with troubleshooting"
        echo "  example-status          Show example enhanced status output"
        echo "  control <action> <svc>  Control services (start/stop/restart)"
        echo "  start-all               Start all SecureWatch services"
        echo "  stop-all                Stop all SecureWatch services"
        echo "  status                  Show quick status overview"
        echo "  health                  Run health checks"
        echo "  logs                    Show recent logs"
        echo "  help                    Show this help"
        echo ""
        echo "Dashboard Options:"
        echo "  --refresh N             Refresh interval in seconds (default: 5)"
        echo "  --enhanced              Use enhanced dashboard with controls"
        echo "  --blessed-contrib       Use blessed-contrib rich widgets dashboard"
        echo ""
        echo "Status Options:"
        echo "  --json                  Output in JSON format"
        echo "  --detailed              Show all services including infrastructure"
        echo ""
        echo "Health Options:"
        echo "  --verbose               Show detailed health information"
        echo ""
        echo "Logs Options:"
        echo "  --service NAME          Show logs for specific service"
        echo "  --lines N               Number of lines to show (default: 20)"
        echo "  --follow                Follow log output (tail -f)"
        echo ""
        echo "Service Control Examples:"
        echo "  $0 control start Frontend"
        echo "  $0 control stop 'Search API'"
        echo "  $0 control restart 'Log Ingestion'"
        echo ""
        echo "Enhanced Dashboard Features:"
        echo "  - Collapsible panels (press 'c' or Space)"
        echo "  - Service control (s=start, S=stop, r=restart)"
        echo "  - Live log viewing (press 'l')"
        echo "  - Service metrics (press 'm')"
        echo "  - Multiple view modes (1=all, 2=critical, 3=compact)"
        echo ""
        echo "Examples:"
        echo "  $0                              # Start standard dashboard"
        echo "  $0 enhanced                     # Start enhanced dashboard"
        echo "  $0 blessed-contrib              # Start rich widgets dashboard with Nerd Fonts"
        echo "  $0 dashboard --refresh 10       # Dashboard with 10s refresh"
        echo "  $0 status --detailed --json     # Detailed status in JSON"
        echo "  $0 logs --service 'Search API' --lines 50"
        echo "  $0 health --verbose             # Detailed health check"
        ;;
    *)
        echo -e "${YELLOW}Unknown command: $COMMAND${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac