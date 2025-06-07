# Makefile for SecureWatch SIEM Platform Documentation

# Configuration
SPHINXOPTS    ?= -W --keep-going
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = .
BUILDDIR      = _build
VENV          = .venv
PYTHON        = python3

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

## Help
help: ## Show this help message
	@echo "$(GREEN)SecureWatch Documentation Build System$(NC)"
	@echo "======================================="
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

## Setup and Installation
install: ## Install documentation dependencies
	@echo "$(YELLOW)Installing documentation dependencies...$(NC)"
	@if [ ! -d "$(VENV)" ]; then \
		$(PYTHON) -m venv $(VENV); \
	fi
	@$(VENV)/bin/pip install --upgrade pip
	@$(VENV)/bin/pip install -r requirements.txt
	@echo "$(GREEN)✓ Dependencies installed successfully$(NC)"

install-dev: install ## Install development dependencies
	@echo "$(YELLOW)Installing development dependencies...$(NC)"
	@$(VENV)/bin/pip install sphinx-autobuild watchdog
	@echo "$(GREEN)✓ Development dependencies installed$(NC)"

## Building Documentation
html: ## Build HTML documentation
	@echo "$(YELLOW)Building HTML documentation...$(NC)"
	@$(VENV)/bin/$(SPHINXBUILD) -b html "$(SOURCEDIR)" "$(BUILDDIR)/html" $(SPHINXOPTS)
	@echo "$(GREEN)✓ HTML documentation built successfully$(NC)"
	@echo "Open $(BUILDDIR)/html/index.html in your browser"

clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILDDIR)
	@echo "$(GREEN)✓ Build artifacts cleaned$(NC)"

clean-all: clean ## Clean build artifacts and virtual environment
	@echo "$(YELLOW)Cleaning all artifacts including virtual environment...$(NC)"
	@rm -rf $(VENV)
	@echo "$(GREEN)✓ All artifacts cleaned$(NC)"

## Development
serve: html ## Build and serve documentation locally
	@echo "$(YELLOW)Serving documentation at http://localhost:8000$(NC)"
	@cd $(BUILDDIR)/html && $(PYTHON) -m http.server 8000

livehtml: install-dev ## Build and serve with auto-reload on changes
	@echo "$(YELLOW)Starting live documentation server...$(NC)"
	@echo "$(GREEN)Documentation will auto-reload on changes$(NC)"
	@echo "$(GREEN)Available at: http://localhost:8000$(NC)"
	@$(VENV)/bin/sphinx-autobuild "$(SOURCEDIR)" "$(BUILDDIR)/html" $(SPHINXOPTS) \
		--host 0.0.0.0 --port 8000 \
		--watch ../README.md \
		--watch ../CHANGELOG.md \
		--ignore "*.tmp" \
		--ignore "*~"

## Quality Checks
check: ## Check documentation for errors
	@echo "$(YELLOW)Checking documentation for errors...$(NC)"
	@$(VENV)/bin/$(SPHINXBUILD) -b html "$(SOURCEDIR)" "$(BUILDDIR)/html" -W --keep-going
	@echo "$(GREEN)✓ Documentation check completed$(NC)"

linkcheck: ## Check external links
	@echo "$(YELLOW)Checking external links...$(NC)"
	@$(VENV)/bin/$(SPHINXBUILD) -b linkcheck "$(SOURCEDIR)" "$(BUILDDIR)/linkcheck" $(SPHINXOPTS)
	@echo "$(GREEN)✓ Link check completed$(NC)"

spelling: ## Check spelling (requires sphinxcontrib-spelling)
	@echo "$(YELLOW)Checking spelling...$(NC)"
	@$(VENV)/bin/pip install sphinxcontrib-spelling pyenchant
	@$(VENV)/bin/$(SPHINXBUILD) -b spelling "$(SOURCEDIR)" "$(BUILDDIR)/spelling" $(SPHINXOPTS)
	@echo "$(GREEN)✓ Spelling check completed$(NC)"

## Publishing
pdf: ## Build PDF documentation
	@echo "$(YELLOW)Building PDF documentation...$(NC)"
	@$(VENV)/bin/$(SPHINXBUILD) -b latex "$(SOURCEDIR)" "$(BUILDDIR)/latex" $(SPHINXOPTS)
	@make -C $(BUILDDIR)/latex all-pdf
	@echo "$(GREEN)✓ PDF built: $(BUILDDIR)/latex/securewatch.pdf$(NC)"

epub: ## Build EPUB documentation
	@echo "$(YELLOW)Building EPUB documentation...$(NC)"
	@$(VENV)/bin/$(SPHINXBUILD) -b epub "$(SOURCEDIR)" "$(BUILDDIR)/epub" $(SPHINXOPTS)
	@echo "$(GREEN)✓ EPUB built: $(BUILDDIR)/epub/securewatch.epub$(NC)"

## ReadTheDocs Integration
rtd-build: ## Build documentation like ReadTheDocs
	@echo "$(YELLOW)Building documentation using ReadTheDocs configuration...$(NC)"
	@$(VENV)/bin/$(SPHINXBUILD) -b html "$(SOURCEDIR)" "$(BUILDDIR)/html" \
		-D html_theme=furo \
		-D html_title="SecureWatch SIEM Platform" \
		-W --keep-going
	@echo "$(GREEN)✓ ReadTheDocs-style build completed$(NC)"

rtd-test: install ## Test ReadTheDocs build locally
	@echo "$(YELLOW)Testing ReadTheDocs configuration...$(NC)"
	@$(VENV)/bin/pip install -r requirements.txt
	@make rtd-build
	@echo "$(GREEN)✓ ReadTheDocs test completed successfully$(NC)"

## Utilities
stats: ## Show documentation statistics
	@echo "$(YELLOW)Documentation Statistics:$(NC)"
	@echo "Total files: $$(find . -name '*.md' -o -name '*.rst' | wc -l)"
	@echo "Total lines: $$(find . -name '*.md' -o -name '*.rst' | xargs wc -l | tail -1)"
	@if [ -d "$(BUILDDIR)" ]; then \
		echo "Build size: $$(du -sh $(BUILDDIR) | cut -f1)"; \
	fi

open: ## Open built documentation in browser
	@if [ -f "$(BUILDDIR)/html/index.html" ]; then \
		echo "$(GREEN)Opening documentation in browser...$(NC)"; \
		open "$(BUILDDIR)/html/index.html" || xdg-open "$(BUILDDIR)/html/index.html" || echo "Please open $(BUILDDIR)/html/index.html manually"; \
	else \
		echo "$(RED)Documentation not built yet. Run 'make html' first.$(NC)"; \
	fi

## Special Sphinx targets
.PHONY: help Makefile install install-dev html clean clean-all serve livehtml check linkcheck spelling pdf epub rtd-build rtd-test stats open

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(VENV)/bin/$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
