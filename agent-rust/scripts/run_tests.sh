#!/bin/bash

# Comprehensive test runner for SecureWatch Agent
# This script runs all tests including unit tests, integration tests, and benchmarks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}SecureWatch Agent Test Runner${NC}"
echo "=============================="
echo "Project root: $PROJECT_ROOT"
echo

cd "$PROJECT_ROOT"

# Function to print section headers
print_section() {
    echo
    echo -e "${BLUE}$1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

# Function to run a command with status reporting
run_with_status() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${YELLOW}Running: $description${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✓ $description completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ $description failed${NC}"
        return 1
    fi
}

# Check if cargo is available
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: cargo is not installed or not in PATH${NC}"
    exit 1
fi

# Parse command line arguments
UNIT_TESTS=true
INTEGRATION_TESTS=true
BENCHMARKS=false
COVERAGE=false
FEATURE_TESTS=true
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            INTEGRATION_TESTS=false
            BENCHMARKS=false
            shift
            ;;
        --integration-only)
            UNIT_TESTS=false
            BENCHMARKS=false
            shift
            ;;
        --benchmarks)
            BENCHMARKS=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --no-features)
            FEATURE_TESTS=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --unit-only       Run only unit tests"
            echo "  --integration-only Run only integration tests"
            echo "  --benchmarks      Run performance benchmarks"
            echo "  --coverage        Generate code coverage report"
            echo "  --no-features     Skip feature-specific tests"
            echo "  --verbose, -v     Verbose output"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Set verbose flag for cargo commands
CARGO_VERBOSE=""
if [[ "$VERBOSE" == "true" ]]; then
    CARGO_VERBOSE="--verbose"
fi

# Check and install dependencies if needed
print_section "Dependency Check"
run_with_status "cargo check $CARGO_VERBOSE" "Checking dependencies"

# Run clippy for code quality
print_section "Code Quality Check"
run_with_status "cargo clippy $CARGO_VERBOSE -- -D warnings" "Running clippy lints"

# Format check
run_with_status "cargo fmt -- --check" "Checking code formatting"

# Unit tests
if [[ "$UNIT_TESTS" == "true" ]]; then
    print_section "Unit Tests"
    
    # Run tests with default features
    run_with_status "cargo test $CARGO_VERBOSE --lib --bins" "Running unit tests (default features)"
    
    # Run tests with specific feature combinations if requested
    if [[ "$FEATURE_TESTS" == "true" ]]; then
        run_with_status "cargo test $CARGO_VERBOSE --lib --no-default-features --features native-tls-backend" "Running unit tests (native-tls only)"
        run_with_status "cargo test $CARGO_VERBOSE --lib --no-default-features --features rustls-backend" "Running unit tests (rustls only)"
        run_with_status "cargo test $CARGO_VERBOSE --lib --no-default-features --features minimal" "Running unit tests (minimal features)"
        
        # Test with persistent storage
        if [[ -n "${SQLITE_AVAILABLE:-}" ]] || command -v sqlite3 &> /dev/null; then
            run_with_status "cargo test $CARGO_VERBOSE --lib --features persistent-storage" "Running unit tests (with persistent storage)"
        else
            echo -e "${YELLOW}⚠ Skipping persistent storage tests (SQLite not available)${NC}"
        fi
    fi
fi

# Integration tests
if [[ "$INTEGRATION_TESTS" == "true" ]]; then
    print_section "Integration Tests"
    
    # Ensure test dependencies are available
    if ! command -v docker &> /dev/null && [[ -z "${SKIP_DOCKER_TESTS:-}" ]]; then
        echo -e "${YELLOW}⚠ Docker not available, some integration tests may be skipped${NC}"
        export SKIP_DOCKER_TESTS=1
    fi
    
    run_with_status "cargo test $CARGO_VERBOSE --test '*'" "Running integration tests"
fi

# Documentation tests
print_section "Documentation Tests"
run_with_status "cargo test $CARGO_VERBOSE --doc" "Running documentation tests"

# Example tests
if [[ -d "examples" ]]; then
    print_section "Example Tests"
    run_with_status "cargo test $CARGO_VERBOSE --examples" "Running example tests"
fi

# Performance benchmarks
if [[ "$BENCHMARKS" == "true" ]]; then
    print_section "Performance Benchmarks"
    
    if ! command -v cargo-criterion &> /dev/null; then
        echo -e "${YELLOW}Installing cargo-criterion for benchmarks...${NC}"
        cargo install cargo-criterion
    fi
    
    run_with_status "cargo criterion" "Running performance benchmarks"
    
    echo -e "${GREEN}Benchmark results available in target/criterion/report/index.html${NC}"
fi

# Code coverage
if [[ "$COVERAGE" == "true" ]]; then
    print_section "Code Coverage"
    
    if ! command -v cargo-tarpaulin &> /dev/null; then
        echo -e "${YELLOW}Installing cargo-tarpaulin for coverage...${NC}"
        cargo install cargo-tarpaulin
    fi
    
    run_with_status "cargo tarpaulin --out Html --output-dir target/coverage" "Generating code coverage report"
    
    echo -e "${GREEN}Coverage report available in target/coverage/tarpaulin-report.html${NC}"
fi

# Security audit
print_section "Security Audit"
if ! command -v cargo-audit &> /dev/null; then
    echo -e "${YELLOW}Installing cargo-audit for security checks...${NC}"
    cargo install cargo-audit
fi

run_with_status "cargo audit" "Running security audit"

# Memory leak detection (if valgrind is available)
if command -v valgrind &> /dev/null && [[ "${RUN_VALGRIND:-}" == "1" ]]; then
    print_section "Memory Leak Detection"
    
    echo -e "${YELLOW}Building test binary for valgrind...${NC}"
    cargo build --tests
    
    TEST_BINARY=$(find target/debug/deps -name "securewatch_agent-*" -type f -executable | head -1)
    if [[ -n "$TEST_BINARY" ]]; then
        run_with_status "valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes $TEST_BINARY" "Running valgrind memory check"
    else
        echo -e "${YELLOW}⚠ Could not find test binary for valgrind${NC}"
    fi
fi

# Test summary
print_section "Test Summary"

echo -e "${GREEN}✓ All requested tests completed successfully!${NC}"
echo
echo "Test coverage:"
echo "- Unit tests: $(if [[ "$UNIT_TESTS" == "true" ]]; then echo "✓"; else echo "○"; fi)"
echo "- Integration tests: $(if [[ "$INTEGRATION_TESTS" == "true" ]]; then echo "✓"; else echo "○"; fi)"
echo "- Documentation tests: ✓"
echo "- Code quality checks: ✓"
echo "- Security audit: ✓"
echo "- Benchmarks: $(if [[ "$BENCHMARKS" == "true" ]]; then echo "✓"; else echo "○"; fi)"
echo "- Coverage report: $(if [[ "$COVERAGE" == "true" ]]; then echo "✓"; else echo "○"; fi)"

echo
echo -e "${GREEN}Testing complete! 🎉${NC}"