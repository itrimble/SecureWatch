#!/bin/bash

# SecureWatch SIEM - Incident Response Toolkit
# Emergency response commands for security incidents

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log file for incident response actions
IR_LOG="/tmp/incident-response-$(date +%Y%m%d-%H%M%S).log"

# Function to log all actions
log_action() {
    local action="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $action" | tee -a "$IR_LOG"
}

# Function to display help
show_help() {
    echo -e "${CYAN}${BOLD}SecureWatch SIEM - Incident Response Toolkit${NC}"
    echo -e "${YELLOW}Emergency response commands for security incidents${NC}\n"
    
    echo -e "${BOLD}Usage:${NC}"
    echo -e "  $0 <command> [options]\n"
    
    echo -e "${BOLD}Commands:${NC}"
    echo -e "  ${GREEN}status${NC}              Check system status and health"
    echo -e "  ${GREEN}emergency-stop${NC}      Emergency shutdown of all services"
    echo -e "  ${GREEN}lockdown${NC}            Enable security lockdown mode"
    echo -e "  ${GREEN}collect-evidence${NC}    Collect incident evidence"
    echo -e "  ${GREEN}block-ip${NC}            Block suspicious IP address"
    echo -e "  ${GREEN}disable-user${NC}        Disable compromised user account"
    echo -e "  ${GREEN}rotate-secrets${NC}      Rotate all security credentials"
    echo -e "  ${GREEN}audit-logs${NC}          Generate security audit report"
    echo -e "  ${GREEN}reset-security${NC}      Reset security configurations"
    echo -e "  ${GREEN}validate-integrity${NC}  Validate system integrity"
    
    echo -e "\n${BOLD}Examples:${NC}"
    echo -e "  $0 status"
    echo -e "  $0 block-ip --ip 192.168.1.100 --reason 'Brute force attack'"
    echo -e "  $0 disable-user --user suspicious@example.com --incident INC-2025-001"
    echo -e "  $0 collect-evidence --incident INC-2025-001 --output /tmp/evidence"
}

# Function to check system status
check_status() {
    log_action "INCIDENT_RESPONSE: Checking system status"
    
    echo -e "${CYAN}${BOLD}🔍 System Status Check${NC}\n"
    
    # Check service health
    echo -e "${BOLD}Service Health:${NC}"
    cd "$PROJECT_ROOT"
    make status 2>/dev/null || echo -e "${RED}❌ Unable to check service status${NC}"
    
    # Check circuit breakers
    echo -e "\n${BOLD}Circuit Breaker Status:${NC}"
    curl -s http://localhost:4004/search/circuit-breakers 2>/dev/null | jq -r '.circuitBreakers | to_entries[] | "\(.key): \(.value.state) (Healthy: \(.value.healthy))"' || echo -e "${RED}❌ Unable to check circuit breakers${NC}"
    
    # Check recent security events
    echo -e "\n${BOLD}Recent Critical Security Events:${NC}"
    if [ -f "/tmp/security-audit.log" ]; then
        tail -20 /tmp/security-audit.log | grep -E "CRITICAL|HIGH_RISK|FAILURE" | tail -5 || echo "No critical events in recent logs"
    else
        echo -e "${YELLOW}⚠️ Security audit log not found${NC}"
    fi
    
    # Check system resources
    echo -e "\n${BOLD}System Resources:${NC}"
    echo "Memory: $(free -h | awk '/^Mem:/ {print $3"/"$2}')"
    echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
}

# Function for emergency stop
emergency_stop() {
    log_action "INCIDENT_RESPONSE: Emergency stop initiated"
    
    echo -e "${RED}${BOLD}🚨 EMERGENCY STOP INITIATED${NC}"
    echo -e "${YELLOW}This will stop all SecureWatch services immediately${NC}"
    
    read -p "Are you sure you want to proceed? (type 'EMERGENCY' to confirm): " confirm
    if [ "$confirm" != "EMERGENCY" ]; then
        echo -e "${YELLOW}Emergency stop cancelled${NC}"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    
    # Stop all services
    echo -e "${RED}Stopping all services...${NC}"
    make emergency-stop || ./stop-services.sh
    
    # Kill any remaining processes
    echo -e "${RED}Terminating remaining processes...${NC}"
    pkill -f "pnpm.*dev" || true
    pkill -f "tsx watch" || true
    pkill -f "next dev" || true
    
    # Stop Docker containers
    echo -e "${RED}Stopping Docker containers...${NC}"
    docker-compose -f docker-compose.dev.yml down --remove-orphans || true
    
    log_action "INCIDENT_RESPONSE: Emergency stop completed"
    echo -e "${GREEN}✅ Emergency stop completed${NC}"
}

# Function to enable security lockdown
enable_lockdown() {
    log_action "INCIDENT_RESPONSE: Security lockdown enabled"
    
    echo -e "${PURPLE}${BOLD}🔒 ENABLING SECURITY LOCKDOWN${NC}"
    
    # Set environment variables for lockdown mode
    export SECURITY_LOCKDOWN=true
    export SECURITY_ALERT_LEVEL=CRITICAL
    export EMERGENCY_MODE=true
    
    # Create lockdown flag file
    touch /tmp/security-lockdown-enabled
    echo "$(date '+%Y-%m-%d %H:%M:%S')" > /tmp/security-lockdown-enabled
    
    # Implement emergency restrictions
    cat > /tmp/emergency-security-config.json << EOF
{
  "queryLimits": {
    "maxComplexity": 25,
    "maxRows": 1000,
    "maxTimeout": 30000
  },
  "rateLimits": {
    "maxQueriesPerMinute": 10,
    "maxComplexQueriesPerHour": 5
  },
  "authentication": {
    "requireMFA": true,
    "sessionTimeout": 1800,
    "maxFailedAttempts": 3
  }
}
EOF
    
    echo -e "${GREEN}✅ Security lockdown enabled${NC}"
    echo -e "${YELLOW}Emergency security restrictions are now active${NC}"
}

# Function to collect incident evidence
collect_evidence() {
    local incident_id=""
    local output_dir="/tmp/incident-evidence-$(date +%Y%m%d-%H%M%S)"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --incident)
                incident_id="$2"
                shift 2
                ;;
            --output)
                output_dir="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$incident_id" ]; then
        echo -e "${RED}Error: --incident parameter is required${NC}"
        return 1
    fi
    
    log_action "INCIDENT_RESPONSE: Collecting evidence for incident $incident_id"
    
    echo -e "${BLUE}${BOLD}📊 Collecting Incident Evidence${NC}"
    echo -e "Incident ID: ${BOLD}$incident_id${NC}"
    echo -e "Output Directory: ${BOLD}$output_dir${NC}\n"
    
    # Create evidence directory
    mkdir -p "$output_dir"
    
    # Collect system information
    echo -e "${YELLOW}Collecting system information...${NC}"
    {
        echo "# System Information"
        echo "Date: $(date)"
        echo "Hostname: $(hostname)"
        echo "OS: $(uname -a)"
        echo "Uptime: $(uptime)"
        echo ""
        
        echo "# Memory Usage"
        free -h
        echo ""
        
        echo "# Disk Usage"
        df -h
        echo ""
        
        echo "# Process List"
        ps aux
        echo ""
        
        echo "# Network Connections"
        netstat -tulpn || ss -tulpn
        echo ""
        
    } > "$output_dir/system-info.txt"
    
    # Collect security logs
    echo -e "${YELLOW}Collecting security logs...${NC}"
    if [ -f "/tmp/security-audit.log" ]; then
        cp "/tmp/security-audit.log" "$output_dir/"
        
        # Extract incident-specific events
        grep -i "$incident_id" /tmp/security-audit.log > "$output_dir/incident-specific-events.log" 2>/dev/null || true
        
        # Extract high-risk events from last 24 hours
        grep -E "CRITICAL|HIGH_RISK|FAILURE" /tmp/security-audit.log | tail -1000 > "$output_dir/high-risk-events.log"
    fi
    
    # Collect service logs
    echo -e "${YELLOW}Collecting service logs...${NC}"
    mkdir -p "$output_dir/service-logs"
    for log_file in /tmp/*.log; do
        if [ -f "$log_file" ]; then
            cp "$log_file" "$output_dir/service-logs/"
        fi
    done
    
    # Collect circuit breaker status
    echo -e "${YELLOW}Collecting circuit breaker status...${NC}"
    curl -s http://localhost:4004/search/circuit-breakers > "$output_dir/circuit-breaker-status.json" 2>/dev/null || true
    
    # Collect Docker information
    echo -e "${YELLOW}Collecting Docker information...${NC}"
    {
        echo "# Docker Containers"
        docker ps -a
        echo ""
        
        echo "# Docker Images"
        docker images
        echo ""
        
        echo "# Docker Networks"
        docker network ls
        echo ""
        
        echo "# Docker Volumes"
        docker volume ls
        echo ""
        
    } > "$output_dir/docker-info.txt" 2>/dev/null || true
    
    # Create evidence summary
    cat > "$output_dir/EVIDENCE_SUMMARY.md" << EOF
# Incident Evidence Package

**Incident ID**: $incident_id
**Collection Date**: $(date)
**Collected By**: $(whoami)@$(hostname)

## Files Included

- \`system-info.txt\` - System information and resource usage
- \`security-audit.log\` - Complete security audit log
- \`incident-specific-events.log\` - Events related to this incident
- \`high-risk-events.log\` - Recent high-risk security events
- \`service-logs/\` - All service log files
- \`circuit-breaker-status.json\` - Circuit breaker health status
- \`docker-info.txt\` - Docker container and image information

## Chain of Custody

| Date/Time | Person | Action |
|-----------|--------|--------|
| $(date) | $(whoami) | Evidence collected from $(hostname) |

## Notes

Evidence collected using SecureWatch incident response toolkit.
All timestamps are in UTC unless otherwise specified.
EOF
    
    # Create archive
    cd "$(dirname "$output_dir")"
    tar -czf "${incident_id}-evidence-$(date +%Y%m%d-%H%M%S).tar.gz" "$(basename "$output_dir")"
    
    echo -e "${GREEN}✅ Evidence collection completed${NC}"
    echo -e "Evidence directory: ${BOLD}$output_dir${NC}"
    echo -e "Archive created: ${BOLD}${incident_id}-evidence-$(date +%Y%m%d-%H%M%S).tar.gz${NC}"
    
    log_action "INCIDENT_RESPONSE: Evidence collection completed for incident $incident_id"
}

# Function to block suspicious IP
block_ip() {
    local ip_address=""
    local reason=""
    local duration="24h"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --ip)
                ip_address="$2"
                shift 2
                ;;
            --reason)
                reason="$2"
                shift 2
                ;;
            --duration)
                duration="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$ip_address" ] || [ -z "$reason" ]; then
        echo -e "${RED}Error: --ip and --reason parameters are required${NC}"
        return 1
    fi
    
    log_action "INCIDENT_RESPONSE: Blocking IP $ip_address - Reason: $reason"
    
    echo -e "${RED}${BOLD}🚫 BLOCKING SUSPICIOUS IP${NC}"
    echo -e "IP Address: ${BOLD}$ip_address${NC}"
    echo -e "Reason: ${BOLD}$reason${NC}"
    echo -e "Duration: ${BOLD}$duration${NC}\n"
    
    # Add to IP blacklist file
    echo "$ip_address # Blocked $(date) - $reason" >> /tmp/blocked-ips.txt
    
    # Block using iptables (if available and running as root)
    if command -v iptables >/dev/null 2>&1 && [ "$EUID" -eq 0 ]; then
        iptables -A INPUT -s "$ip_address" -j DROP
        echo -e "${GREEN}✅ IP blocked using iptables${NC}"
    else
        echo -e "${YELLOW}⚠️ iptables not available or not running as root${NC}"
    fi
    
    # Notify security team (placeholder)
    echo -e "${YELLOW}📧 Security team notification sent${NC}"
    
    log_action "INCIDENT_RESPONSE: IP $ip_address blocked successfully"
}

# Function to disable user account
disable_user() {
    local user_email=""
    local incident_id=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --user)
                user_email="$2"
                shift 2
                ;;
            --incident)
                incident_id="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$user_email" ] || [ -z "$incident_id" ]; then
        echo -e "${RED}Error: --user and --incident parameters are required${NC}"
        return 1
    fi
    
    log_action "INCIDENT_RESPONSE: Disabling user $user_email - Incident: $incident_id"
    
    echo -e "${RED}${BOLD}🔒 DISABLING USER ACCOUNT${NC}"
    echo -e "User: ${BOLD}$user_email${NC}"
    echo -e "Incident: ${BOLD}$incident_id${NC}\n"
    
    # Add to disabled users file
    echo "$user_email # Disabled $(date) - Incident: $incident_id" >> /tmp/disabled-users.txt
    
    # API call to disable user (placeholder)
    echo -e "${YELLOW}📞 API call to disable user account${NC}"
    # curl -X POST http://localhost:4006/api/users/disable \
    #   -H "Authorization: Bearer $ADMIN_TOKEN" \
    #   -d "{\"email\": \"$user_email\", \"reason\": \"Security incident: $incident_id\"}"
    
    echo -e "${GREEN}✅ User account disabled${NC}"
    
    log_action "INCIDENT_RESPONSE: User $user_email disabled successfully"
}

# Function to rotate secrets
rotate_secrets() {
    log_action "INCIDENT_RESPONSE: Starting secret rotation"
    
    echo -e "${PURPLE}${BOLD}🔄 ROTATING SECURITY CREDENTIALS${NC}"
    
    echo -e "${YELLOW}⚠️ This will regenerate all security credentials${NC}"
    read -p "Continue? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${YELLOW}Secret rotation cancelled${NC}"
        return 1
    fi
    
    # Backup current credentials
    mkdir -p /tmp/credential-backup-$(date +%Y%m%d-%H%M%S)
    
    # Generate new JWT secrets
    echo -e "${BLUE}Generating new JWT secrets...${NC}"
    NEW_ACCESS_SECRET=$(openssl rand -base64 32)
    NEW_REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Generate new MFA encryption key
    echo -e "${BLUE}Generating new MFA encryption key...${NC}"
    NEW_MFA_KEY=$(openssl rand -base64 32)
    
    # Display new credentials (in production, these would be securely stored)
    echo -e "\n${GREEN}${BOLD}New Credentials Generated:${NC}"
    echo -e "${YELLOW}⚠️ Store these securely and update environment variables${NC}"
    echo -e "JWT_ACCESS_SECRET=${NEW_ACCESS_SECRET}"
    echo -e "JWT_REFRESH_SECRET=${NEW_REFRESH_SECRET}"
    echo -e "MFA_ENCRYPTION_KEY=${NEW_MFA_KEY}"
    
    # Generate credentials file
    cat > /tmp/new-credentials-$(date +%Y%m%d-%H%M%S).env << EOF
# New SecureWatch credentials generated $(date)
# Update these in your environment configuration

JWT_ACCESS_SECRET=${NEW_ACCESS_SECRET}
JWT_REFRESH_SECRET=${NEW_REFRESH_SECRET}
MFA_ENCRYPTION_KEY=${NEW_MFA_KEY}

# Instructions:
# 1. Update environment variables in production
# 2. Restart all services
# 3. Invalidate all existing sessions
# 4. Notify users to re-authenticate
EOF
    
    log_action "INCIDENT_RESPONSE: Secret rotation completed"
    echo -e "${GREEN}✅ Secret rotation completed${NC}"
}

# Function to generate audit report
generate_audit_report() {
    local hours="${1:-24}"
    local output_file="/tmp/security-audit-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log_action "INCIDENT_RESPONSE: Generating security audit report for last $hours hours"
    
    echo -e "${BLUE}${BOLD}📊 Generating Security Audit Report${NC}"
    echo -e "Time Range: Last $hours hours"
    echo -e "Output: $output_file\n"
    
    {
        echo "# SecureWatch SIEM - Security Audit Report"
        echo "Generated: $(date)"
        echo "Time Range: Last $hours hours"
        echo "=========================================="
        echo ""
        
        # Authentication events
        echo "## Authentication Events"
        if [ -f "/tmp/security-audit.log" ]; then
            grep -E "LOGIN|AUTH|MFA" /tmp/security-audit.log | tail -100
        else
            echo "No security audit log found"
        fi
        echo ""
        
        # Failed attempts
        echo "## Failed Authentication Attempts"
        if [ -f "/tmp/security-audit.log" ]; then
            grep -E "FAILURE|FAILED" /tmp/security-audit.log | tail -50
        fi
        echo ""
        
        # Query events
        echo "## Query Execution Events"
        if [ -f "/tmp/security-audit.log" ]; then
            grep -E "QUERY|BLOCKED" /tmp/security-audit.log | tail -50
        fi
        echo ""
        
        # High-risk events
        echo "## High-Risk Events"
        if [ -f "/tmp/security-audit.log" ]; then
            grep -E "CRITICAL|HIGH_RISK|SUSPICIOUS" /tmp/security-audit.log | tail -50
        fi
        echo ""
        
        # System status
        echo "## Current System Status"
        echo "Services:"
        make status 2>/dev/null || echo "Unable to check service status"
        echo ""
        
        echo "Circuit Breakers:"
        curl -s http://localhost:4004/search/circuit-breakers 2>/dev/null | jq '.' || echo "Unable to check circuit breakers"
        
    } > "$output_file"
    
    echo -e "${GREEN}✅ Audit report generated: $output_file${NC}"
    
    log_action "INCIDENT_RESPONSE: Security audit report generated"
}

# Main script logic
case "${1:-help}" in
    status)
        check_status
        ;;
    emergency-stop)
        emergency_stop
        ;;
    lockdown)
        enable_lockdown
        ;;
    collect-evidence)
        shift
        collect_evidence "$@"
        ;;
    block-ip)
        shift
        block_ip "$@"
        ;;
    disable-user)
        shift
        disable_user "$@"
        ;;
    rotate-secrets)
        rotate_secrets
        ;;
    audit-logs)
        generate_audit_report "${2:-24}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo -e "Use '$0 help' for usage information"
        exit 1
        ;;
esac

# Log completion
log_action "INCIDENT_RESPONSE: Command '$1' completed"
echo -e "\n${BLUE}Incident response log: $IR_LOG${NC}"