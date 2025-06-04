#!/bin/bash

# Stop all SecureWatch services gracefully

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log "Stopping SecureWatch SIEM Platform..."

# Stop services by PID files
for service in frontend search-api log-ingestion; do
    if [ -f "/tmp/${service}.pid" ]; then
        pid=$(cat "/tmp/${service}.pid")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping $service (PID: $pid)..."
            kill -TERM "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid"
            fi
        fi
        rm -f "/tmp/${service}.pid"
    fi
done

# Cleanup any remaining processes
pids=$(ps aux | grep -E "(tsx watch|next dev|pnpm.*dev)" | grep -v grep | awk '{print $2}' || true)
if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 3
    echo "$pids" | xargs kill -KILL 2>/dev/null || true
fi

# Cleanup log files
rm -f /tmp/frontend.log /tmp/search-api.log /tmp/log-ingestion.log

success "All services stopped"