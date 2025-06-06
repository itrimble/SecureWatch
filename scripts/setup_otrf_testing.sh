#!/bin/bash

# OTRF Security Datasets Testing Setup Script
# This script prepares the environment for comprehensive OTRF testing

set -e

echo "🚀 Setting up OTRF Security Datasets testing environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

# Check if we're in the SecureWatch directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the SecureWatch root directory"
    exit 1
fi

print_status "Found SecureWatch project structure"

# Install Python dependencies for OTRF testing
echo -e "\n${YELLOW}📦 Installing Python dependencies...${NC}"

if command -v python3 &> /dev/null; then
    print_status "Python 3 found"
else
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Install required Python packages
python3 -m pip install --user aiohttp requests asyncio

# Check if pip packages were installed successfully
if python3 -c "import aiohttp, requests, asyncio" 2>/dev/null; then
    print_status "Python dependencies installed successfully"
else
    print_error "Failed to install Python dependencies"
    exit 1
fi

# Download OTRF Security-Datasets if not already present
OTRF_PATH="/tmp/Security-Datasets"

if [ -d "$OTRF_PATH" ]; then
    print_warning "OTRF datasets already exist at $OTRF_PATH"
    read -p "Do you want to update them? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "\n${YELLOW}🔄 Updating OTRF Security-Datasets...${NC}"
        cd "$OTRF_PATH"
        git pull origin main
        cd - > /dev/null
        print_status "OTRF datasets updated"
    fi
else
    echo -e "\n${YELLOW}📥 Downloading OTRF Security-Datasets...${NC}"
    git clone https://github.com/OTRF/Security-Datasets.git "$OTRF_PATH"
    print_status "OTRF datasets downloaded to $OTRF_PATH"
fi

# Check dataset size and structure
echo -e "\n${YELLOW}📊 Analyzing OTRF datasets...${NC}"

ATOMIC_COUNT=$(find "$OTRF_PATH/datasets/atomic" -name "*.zip" 2>/dev/null | wc -l)
COMPOUND_COUNT=$(find "$OTRF_PATH/datasets/compound" -name "*.zip" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$OTRF_PATH" 2>/dev/null | cut -f1)

print_status "Found $ATOMIC_COUNT atomic datasets"
print_status "Found $COMPOUND_COUNT compound datasets"
print_status "Total size: $TOTAL_SIZE"

# Make test scripts executable
echo -e "\n${YELLOW}🔧 Setting up test scripts...${NC}"

chmod +x scripts/otrf_data_ingester.py
chmod +x scripts/test_kql_with_otrf.py
chmod +x scripts/test_correlation_with_otrf.py
chmod +x scripts/run_comprehensive_otrf_tests.py

print_status "Test scripts made executable"

# Check SecureWatch services
echo -e "\n${YELLOW}🔍 Checking SecureWatch services...${NC}"

services=(
    "http://localhost:4000:Frontend"
    "http://localhost:4002:Log Ingestion"
    "http://localhost:4004:Search API"
    "http://localhost:4005:Correlation Engine"
)

all_services_running=true

for service in "${services[@]}"; do
    url=$(echo "$service" | cut -d':' -f1-2)
    name=$(echo "$service" | cut -d':' -f3)
    
    if curl -s --max-time 5 "$url/health" > /dev/null 2>&1 || curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        print_status "$name service is running"
    else
        print_warning "$name service is not responding at $url"
        all_services_running=false
    fi
done

if [ "$all_services_running" = false ]; then
    print_warning "Some services are not running. Start them with: ./start-services.sh"
fi

# Create test configuration file
echo -e "\n${YELLOW}📝 Creating test configuration...${NC}"

cat > otrf_test_config.json << EOF
{
    "otrf_datasets_path": "$OTRF_PATH",
    "securewatch_services": {
        "frontend": "http://localhost:4000",
        "search_api": "http://localhost:4004",
        "log_ingestion": "http://localhost:4002",
        "correlation_engine": "http://localhost:4005"
    },
    "test_settings": {
        "max_datasets_quick_test": 5,
        "max_datasets_full_test": null,
        "batch_size": 100,
        "parallel_execution": true
    },
    "dataset_filters": {
        "platforms": ["windows"],
        "techniques": ["T1003", "T1059", "T1055", "T1021"],
        "max_size_mb": 50
    }
}
EOF

print_status "Test configuration saved to otrf_test_config.json"

# Create quick test runner script
echo -e "\n${YELLOW}🚀 Creating quick test runner...${NC}"

cat > run_quick_otrf_test.sh << 'EOF'
#!/bin/bash

echo "🚀 Running quick OTRF test (limited datasets)..."

python3 scripts/run_comprehensive_otrf_tests.py \
    --max-datasets 5 \
    --otrf-path /tmp/Security-Datasets \
    --securewatch-url http://localhost:4000

echo "✅ Quick test completed!"
EOF

chmod +x run_quick_otrf_test.sh
print_status "Quick test runner created: ./run_quick_otrf_test.sh"

# Create full test runner script
cat > run_full_otrf_test.sh << 'EOF'
#!/bin/bash

echo "🚀 Running comprehensive OTRF test (all datasets)..."

python3 scripts/run_comprehensive_otrf_tests.py \
    --otrf-path /tmp/Security-Datasets \
    --securewatch-url http://localhost:4000 \
    --parallel

echo "✅ Comprehensive test completed!"
EOF

chmod +x run_full_otrf_test.sh
print_status "Full test runner created: ./run_full_otrf_test.sh"

# Check disk space
echo -e "\n${YELLOW}💾 Checking disk space...${NC}"

AVAILABLE_GB=$(df /tmp | awk 'NR==2 {print int($4/1024/1024)}')

if [ "$AVAILABLE_GB" -lt 5 ]; then
    print_warning "Low disk space: ${AVAILABLE_GB}GB available (recommend 5GB+)"
else
    print_status "Sufficient disk space: ${AVAILABLE_GB}GB available"
fi

# Generate usage instructions
echo -e "\n${YELLOW}📋 Generating usage instructions...${NC}"

cat > OTRF_TESTING_GUIDE.md << 'EOF'
# OTRF Security Datasets Testing Guide

## Quick Start

### 1. Run Quick Test (5 datasets)
```bash
./run_quick_otrf_test.sh
```

### 2. Run Full Test (all datasets)
```bash
./run_full_otrf_test.sh
```

### 3. Run Individual Components

#### Data Ingestion Only
```bash
python3 scripts/otrf_data_ingester.py --max-datasets 10
```

#### KQL Testing Only
```bash
python3 scripts/test_kql_with_otrf.py
```

#### Correlation Testing Only
```bash
python3 scripts/test_correlation_with_otrf.py
```

## Advanced Usage

### Custom Dataset Filtering
```bash
python3 scripts/run_comprehensive_otrf_tests.py \
    --max-datasets 20 \
    --skip-phases analytics platform
```

### Specific Attack Scenarios
```bash
# Test only credential access scenarios
python3 scripts/otrf_data_ingester.py \
    --otrf-path /tmp/Security-Datasets \
    --techniques T1003 T1558 T1550
```

## Test Reports

Test reports are saved with timestamps:
- `comprehensive_otrf_test_report_YYYYMMDD_HHMMSS.json`
- `kql_otrf_test_report_YYYYMMDD_HHMMSS.json`
- `correlation_otrf_test_report_YYYYMMDD_HHMMSS.json`
- `otrf_test_report_YYYYMMDD_HHMMSS.json`

## Troubleshooting

### Services Not Running
```bash
./start-services.sh
```

### OpenSearch Integration
```bash
./start-with-opensearch.sh
```

### Clear Test Data
```bash
curl -X DELETE http://localhost:4002/api/logs/otrf_dataset
```

## Dataset Information

- **Location**: `/tmp/Security-Datasets`
- **Atomic Datasets**: Individual attack techniques
- **Compound Datasets**: Complex attack scenarios (APT29, Log4Shell, etc.)
- **Platforms**: Windows, Linux, AWS
- **Size**: ~2GB total

## Expected Results

- **Data Ingestion**: 80%+ success rate
- **KQL Testing**: 90%+ query success rate  
- **Correlation Testing**: 70%+ detection rate
- **Platform Health**: 85%+ overall score

EOF

print_status "Usage guide created: OTRF_TESTING_GUIDE.md"

# Final summary
echo -e "\n" + "="*60
echo -e "${GREEN}🎉 OTRF Security Datasets testing setup completed!${NC}"
echo "="*60
echo -e "📂 OTRF Datasets: $OTRF_PATH"
echo -e "📊 Atomic Datasets: $ATOMIC_COUNT"
echo -e "📊 Compound Datasets: $COMPOUND_COUNT"
echo -e "💾 Total Size: $TOTAL_SIZE"
echo -e "📋 Configuration: otrf_test_config.json"
echo -e "📖 Guide: OTRF_TESTING_GUIDE.md"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Ensure SecureWatch services are running: ${GREEN}./start-services.sh${NC}"
echo -e "2. Run quick test: ${GREEN}./run_quick_otrf_test.sh${NC}"
echo -e "3. Run full test: ${GREEN}./run_full_otrf_test.sh${NC}"
echo ""
echo -e "${GREEN}Happy Testing! 🔐${NC}"