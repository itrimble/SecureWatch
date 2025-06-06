# SecureWatch SIEM Platform - Developer Makefile
# Simplified commands for managing the complex Docker environment
# Usage: make <command> [options]

.PHONY: help up down restart logs status clean install build test health dev minimal debug

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BOLD := \033[1m
RESET := \033[0m

# Variables
COMPOSE_FILE := docker-compose.dev.yml
COMPOSE_CMD := docker compose -f $(COMPOSE_FILE)
LOG_TAIL := 50

##@ 🚀 Main Commands

help: ## Show this help message
	@echo "$(CYAN)$(BOLD)SecureWatch SIEM Platform - Developer Commands$(RESET)"
	@echo "$(YELLOW)Enterprise-grade SIEM with simplified Docker management$(RESET)\n"
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(CYAN)<target>$(RESET)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5) }' $(MAKEFILE_LIST)

up: ## 🚀 Start all SecureWatch services with enhanced interface
	@echo "$(GREEN)$(BOLD)🚀 Starting SecureWatch SIEM Platform...$(RESET)"
	@./start-services.sh

minimal: ## ⚡ Start only core services (minimal mode)
	@echo "$(GREEN)$(BOLD)⚡ Starting SecureWatch in minimal mode...$(RESET)"
	@./start-services.sh --minimal

debug: ## 🐛 Start with debug mode and live dashboard
	@echo "$(GREEN)$(BOLD)🐛 Starting SecureWatch in debug mode...$(RESET)"
	@./start-services.sh --debug

dev: ## 🛠️ Start in development mode
	@echo "$(GREEN)$(BOLD)🛠️ Starting SecureWatch in development mode...$(RESET)"
	@./start-services.sh --dev

down: ## 🛑 Stop all SecureWatch services gracefully
	@echo "$(YELLOW)$(BOLD)🛑 Stopping SecureWatch SIEM Platform...$(RESET)"
	@./stop-services.sh

##@ 🔧 Service Management

restart: ## 🔄 Restart specific service (usage: make restart s=service-name)
	@if [ -z "$(s)" ]; then \
		echo "$(RED)Error: Please specify service name. Usage: make restart s=service-name$(RESET)"; \
		echo "$(CYAN)Available services: frontend, search-api, log-ingestion, auth-service, query-processor, analytics-api, correlation-engine, mcp-marketplace$(RESET)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)$(BOLD)🔄 Restarting $(s)...$(RESET)"
	@if [ -f "/tmp/$(s).pid" ]; then \
		pid=$$(cat "/tmp/$(s).pid"); \
		if kill -0 $$pid 2>/dev/null; then \
			echo "$(YELLOW)Stopping $(s) (PID: $$pid)...$(RESET)"; \
			kill -TERM $$pid; \
			sleep 3; \
			if kill -0 $$pid 2>/dev/null; then kill -KILL $$pid; fi; \
		fi; \
		rm -f "/tmp/$(s).pid"; \
	fi
	@echo "$(GREEN)✅ $(s) restart complete$(RESET)"

status: ## 📊 Check status of all services
	@echo "$(CYAN)$(BOLD)📊 SecureWatch Service Status$(RESET)"
	@echo "$(CYAN)════════════════════════════════════════$(RESET)"
	@services="frontend:4000 search-api:4004 log-ingestion:4002 auth-service:4006 query-processor:4008 analytics-api:4009 correlation-engine:4005 mcp-marketplace:4010"; \
	for service in $$services; do \
		name=$$(echo $$service | cut -d':' -f1); \
		port=$$(echo $$service | cut -d':' -f2); \
		if lsof -i :$$port >/dev/null 2>&1; then \
			echo "$(GREEN)✅ $$name$(RESET) → $(CYAN):$$port$(RESET)"; \
		else \
			echo "$(RED)❌ $$name$(RESET) → $(RED):$$port (not running)$(RESET)"; \
		fi; \
	done

health: ## 🏥 Run comprehensive health checks
	@echo "$(CYAN)$(BOLD)🏥 Running Health Checks$(RESET)"
	@echo "$(CYAN)════════════════════════════════════════$(RESET)"
	@services="frontend:4000:/ search-api:4004:/health log-ingestion:4002:/health auth-service:4006:/health query-processor:4008:/health analytics-api:4009:/health correlation-engine:4005:/health mcp-marketplace:4010:/health"; \
	for service in $$services; do \
		name=$$(echo $$service | cut -d':' -f1); \
		port=$$(echo $$service | cut -d':' -f2); \
		endpoint=$$(echo $$service | cut -d':' -f3); \
		printf "$(YELLOW)🕐$(RESET) Testing $$name..."; \
		if curl -s "http://localhost:$$port$$endpoint" >/dev/null 2>&1; then \
			echo " $(GREEN)✅$(RESET)"; \
		else \
			echo " $(RED)❌$(RESET)"; \
		fi; \
	done

##@ 📋 Logs & Monitoring

logs: ## 📋 View logs from all services
	@echo "$(CYAN)$(BOLD)📋 SecureWatch Service Logs$(RESET)"
	@echo "$(CYAN)════════════════════════════════════════$(RESET)"
	@$(COMPOSE_CMD) logs --tail=$(LOG_TAIL) --follow

logs-service: ## 📋 View logs from specific service (usage: make logs-service s=service-name)
	@if [ -z "$(s)" ]; then \
		echo "$(RED)Error: Please specify service name. Usage: make logs-service s=service-name$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)$(BOLD)📋 Logs for $(s)$(RESET)"
	@if [ -f "/tmp/$(s).log" ]; then \
		tail -f "/tmp/$(s).log"; \
	else \
		echo "$(RED)Log file not found: /tmp/$(s).log$(RESET)"; \
	fi

dashboard: ## 📊 Show live dashboard (interactive)
	@echo "$(CYAN)$(BOLD)📊 SecureWatch Live Dashboard$(RESET)"
	@echo "$(RED)🔴 LIVE MONITORING$(RESET) - Press Ctrl+C to exit"
	@while true; do \
		clear; \
		echo "$(CYAN)$(BOLD)📊 SecureWatch Live Dashboard$(RESET)"; \
		echo "$(CYAN)════════════════════════════════════════$(RESET)"; \
		echo "$(BOLD)System Status:$(RESET)"; \
		echo "  • Uptime: $$(uptime | awk '{print $$3}' | sed 's/,//')"; \
		echo "  • Load: $$(uptime | awk -F'load average:' '{print $$2}')"; \
		if command -v free >/dev/null 2>&1; then \
			echo "  • Memory: $$(free -h | awk '/^Mem:/ {printf "%s/%s (%.1f%%)", $$3, $$2, ($$3/$$2)*100}')"; \
		fi; \
		echo ""; \
		echo "$(BOLD)Service Health:$(RESET)"; \
		services="frontend:4000 search-api:4004 log-ingestion:4002 auth-service:4006 query-processor:4008 analytics-api:4009 correlation-engine:4005 mcp-marketplace:4010"; \
		for service in $$services; do \
			name=$$(echo $$service | cut -d':' -f1); \
			port=$$(echo $$service | cut -d':' -f2); \
			if lsof -i :$$port >/dev/null 2>&1; then \
				echo "  $(GREEN)✅$(RESET) $$name ($(CYAN):$$port$(RESET))"; \
			else \
				echo "  $(RED)❌$(RESET) $$name ($(CYAN):$$port$(RESET))"; \
			fi; \
		done; \
		echo ""; \
		echo "$(YELLOW)$$(date '+%Y-%m-%d %H:%M:%S') - Next update in 5s$(RESET)"; \
		sleep 5; \
	done

##@ 🏗️ Infrastructure

infra-up: ## 🏗️ Start only infrastructure services (database, redis, opensearch)
	@echo "$(GREEN)$(BOLD)🏗️ Starting infrastructure services...$(RESET)"
	@$(COMPOSE_CMD) up -d postgres redis opensearch

infra-down: ## 🏗️ Stop infrastructure services
	@echo "$(YELLOW)$(BOLD)🏗️ Stopping infrastructure services...$(RESET)"
	@$(COMPOSE_CMD) down postgres redis opensearch

infra-reset: ## 🔄 Reset infrastructure (WARNING: destroys data)
	@echo "$(RED)$(BOLD)⚠️  WARNING: This will destroy all data!$(RESET)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@$(COMPOSE_CMD) down -v
	@docker system prune -f
	@echo "$(GREEN)✅ Infrastructure reset complete$(RESET)"

##@ 🧹 Cleanup & Maintenance

clean: ## 🧹 Clean up containers, networks, and volumes
	@echo "$(YELLOW)$(BOLD)🧹 Cleaning up Docker resources...$(RESET)"
	@$(COMPOSE_CMD) down -v --remove-orphans
	@docker system prune -f
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

clean-logs: ## 🧹 Clean up log files
	@echo "$(YELLOW)$(BOLD)🧹 Cleaning up log files...$(RESET)"
	@rm -f /tmp/*.log /tmp/*.pid
	@echo "$(GREEN)✅ Log cleanup complete$(RESTART)"

ps: ## 📦 Show running containers
	@echo "$(CYAN)$(BOLD)📦 Running Containers$(RESET)"
	@$(COMPOSE_CMD) ps

images: ## 🖼️ Show Docker images
	@echo "$(CYAN)$(BOLD)🖼️ Docker Images$(RESET)"
	@docker images | grep -E "(securewatch|postgres|redis|opensearch)"

##@ 📦 Development

install: ## 📦 Install all dependencies
	@echo "$(GREEN)$(BOLD)📦 Installing dependencies...$(RESET)"
	@pnpm install
	@echo "$(GREEN)✅ Dependencies installed$(RESET)"

build: ## 🏗️ Build all services
	@echo "$(GREEN)$(BOLD)🏗️ Building services...$(RESET)"
	@pnpm run build
	@echo "$(GREEN)✅ Build complete$(RESET)"

test: ## 🧪 Run tests
	@echo "$(GREEN)$(BOLD)🧪 Running tests...$(RESET)"
	@pnpm run test
	@echo "$(GREEN)✅ Tests complete$(RESET)"

lint: ## 🔍 Run linting
	@echo "$(GREEN)$(BOLD)🔍 Running linting...$(RESET)"
	@pnpm run lint
	@echo "$(GREEN)✅ Linting complete$(RESET)"

format: ## ✨ Format code
	@echo "$(GREEN)$(BOLD)✨ Formatting code...$(RESET)"
	@pnpm run format
	@echo "$(GREEN)✅ Formatting complete$(RESET)"

##@ 🔗 Quick Links

urls: ## 🔗 Show all service URLs
	@echo "$(CYAN)$(BOLD)🔗 SecureWatch Service URLs$(RESET)"
	@echo "$(CYAN)════════════════════════════════════════$(RESET)"
	@echo "$(BOLD)Core Services:$(RESET)"
	@echo "  • Frontend:           $(CYAN)http://localhost:4000$(RESET)  📊"
	@echo "  • Search API:         $(CYAN)http://localhost:4004$(RESET)  🔍"
	@echo "  • Log Ingestion:      $(CYAN)http://localhost:4002$(RESET)  📥"
	@echo "  • Auth Service:       $(CYAN)http://localhost:4006$(RESET)  🔐"
	@echo ""
	@echo "$(BOLD)Performance Services:$(RESET)"
	@echo "  • Query Processor:    $(CYAN)http://localhost:4008$(RESET)  ⚡"
	@echo "  • Analytics API:      $(CYAN)http://localhost:4009$(RESET)  📈"
	@echo "  • Correlation Engine: $(CYAN)http://localhost:4005$(RESET)  🔗"
	@echo "  • MCP Marketplace:    $(CYAN)http://localhost:4010$(RESET)  🏪"
	@echo ""
	@echo "$(BOLD)Documentation:$(RESET)"
	@echo "  • API Docs:           $(CYAN)http://localhost:4004/api-docs$(RESET)"
	@echo "  • Performance APIs:   $(CYAN)http://localhost:4008/api/docs$(RESET)"
	@echo "  • Analytics APIs:     $(CYAN)http://localhost:4009/api/docs$(RESET)"

##@ 🚨 Emergency

emergency-stop: ## 🚨 Emergency stop - kill all processes
	@echo "$(RED)$(BOLD)🚨 EMERGENCY STOP - Killing all processes$(RESET)"
	@pkill -f "pnpm.*dev" || true
	@pkill -f "tsx watch" || true
	@pkill -f "next dev" || true
	@$(COMPOSE_CMD) down --remove-orphans
	@echo "$(GREEN)✅ Emergency stop complete$(RESET)"

emergency-reset: ## 🚨 Emergency reset - nuclear option
	@echo "$(RED)$(BOLD)🚨 EMERGENCY RESET - This will destroy everything!$(RESET)"
	@read -p "Are you absolutely sure? Type 'RESET' to continue: " confirm && [ "$$confirm" = "RESET" ] || exit 1
	@make emergency-stop
	@docker system prune -af
	@docker volume prune -f
	@rm -f /tmp/*.log /tmp/*.pid
	@echo "$(GREEN)✅ Emergency reset complete$(RESET)"

##@ ℹ️ Information

version: ## ℹ️ Show version information
	@echo "$(CYAN)$(BOLD)SecureWatch SIEM Platform$(RESET)"
	@echo "$(YELLOW)Version: 1.12.0$(RESET)"
	@echo "$(YELLOW)Date: June 6, 2025$(RESET)"
	@echo "$(YELLOW)Node.js: $$(node --version 2>/dev/null || echo 'Not installed')$(RESET)"
	@echo "$(YELLOW)Docker: $$(docker --version 2>/dev/null || echo 'Not installed')$(RESET)"
	@echo "$(YELLOW)pnpm: $$(pnpm --version 2>/dev/null || echo 'Not installed')$(RESET)"

##@ 📚 Examples

examples: ## 📚 Show usage examples
	@echo "$(CYAN)$(BOLD)📚 SecureWatch Usage Examples$(RESET)"
	@echo "$(CYAN)════════════════════════════════════════$(RESET)"
	@echo "$(BOLD)Basic Usage:$(RESET)"
	@echo "  make up                    # Start all services"
	@echo "  make down                  # Stop all services"
	@echo "  make status                # Check service status"
	@echo ""
	@echo "$(BOLD)Development:$(RESET)"
	@echo "  make minimal               # Start core services only"
	@echo "  make debug                 # Start with debug mode"
	@echo "  make restart s=frontend    # Restart specific service"
	@echo "  make logs-service s=auth   # View specific service logs"
	@echo ""
	@echo "$(BOLD)Monitoring:$(RESET)"
	@echo "  make health                # Run health checks"
	@echo "  make dashboard             # Live dashboard"
	@echo "  make logs                  # View all logs"
	@echo ""
	@echo "$(BOLD)Maintenance:$(RESET)"
	@echo "  make clean                 # Clean up resources"
	@echo "  make infra-reset           # Reset infrastructure"
	@echo "  make emergency-stop        # Emergency stop"