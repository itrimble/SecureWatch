#!/bin/bash

# SecureWatch CLI Dashboard Launcher
# Quick access to the CLI dashboard from the project root

set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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
        cd "$CLI_DIR"
        node dist/index.js dashboard "$@"
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
    "help"|"-h"|"--help")
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  dashboard, dash    Start interactive dashboard (default)"
        echo "  status            Show quick status overview"
        echo "  health            Run health checks"
        echo "  logs              Show recent logs"
        echo "  help              Show this help"
        echo ""
        echo "Dashboard Options:"
        echo "  --refresh N       Refresh interval in seconds (default: 5)"
        echo ""
        echo "Status Options:"
        echo "  --json           Output in JSON format"
        echo ""
        echo "Logs Options:"
        echo "  --service NAME   Show logs for specific service"
        echo "  --lines N        Number of lines to show (default: 20)"
        echo ""
        echo "Examples:"
        echo "  $0                          # Start dashboard"
        echo "  $0 dashboard --refresh 10   # Dashboard with 10s refresh"
        echo "  $0 status --json           # Status in JSON"
        echo "  $0 logs --service search-api --lines 50"
        ;;
    *)
        echo -e "${YELLOW}Unknown command: $COMMAND${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac