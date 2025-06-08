# SecureWatch Rust Agent

A high-performance, enterprise-grade SIEM agent built with Rust and Tokio for secure log collection, processing, and forwarding.

## 🚀 Features

### Core Capabilities
- **Multi-Protocol Collection**: Syslog (UDP/TCP), Windows Event Logs, File Monitoring
- **Secure Transport**: HTTPS with TLS 1.3, compression (gzip/brotli), retry logic
- **Pluggable Parsing**: Regex-based parsers with field mapping and hot-reload
- **Persistent Buffering**: SQLite-backed storage with intelligent backpressure
- **Configuration Hot-Reload**: Live configuration updates without service restarts
- **Remote Management**: gRPC API for monitoring and control

### Enterprise Features
- **Cross-Platform**: Windows, macOS, Linux (x86_64, ARM64)
- **Resource Monitoring**: CPU, memory usage tracking with configurable limits
- **Health Checks**: Automated system health monitoring and alerting
- **Statistics**: Real-time performance metrics and throughput reporting
- **Graceful Shutdown**: Coordinated component termination with data preservation

## 📦 Installation

### Pre-built Binaries
Download from the releases page for your platform:
- `securewatch-agent-windows-x64.exe`
- `securewatch-agent-macos-intel`
- `securewatch-agent-macos-arm64`
- `securewatch-agent-linux-x64`

### Build from Source
```bash
# Clone the repository
git clone https://github.com/securewatch/agent-rust.git
cd agent-rust

# Build for your platform
cargo build --release

# Cross-compile for all platforms (requires targets)
./build-all-targets.sh
```

## ⚙️ Configuration

Copy the example configuration and customize:
```bash
cp agent.toml.example agent.toml
```

### Essential Configuration
```toml
[agent]
name = "securewatch-agent"
heartbeat_interval = 30
max_memory_mb = 512

[transport]
server_url = "https://your-securewatch-server.com/ingest"
api_key = "your-api-key"
tls_verify = true
compression = true

[collectors.syslog]
enabled = true
bind_address = "0.0.0.0"
port = 514
protocol = "udp"
```

## 🏃 Usage

### Basic Operation
```bash
# Start with default configuration
./securewatch-agent

# Use custom config file
./securewatch-agent --config /path/to/agent.toml

# Validate configuration
./securewatch-agent --validate-config

# Debug mode
./securewatch-agent --log-level debug
```

## 📊 Monitoring

### Remote Management API
The agent exposes a gRPC management API (default: `127.0.0.1:9090`):

```bash
# Get health status
grpcurl -plaintext -H "authorization: Bearer securewatch-token" \
  127.0.0.1:9090 agent_management.AgentManagement/GetHealth

# Get performance metrics
grpcurl -plaintext -H "authorization: Bearer securewatch-token" \
  127.0.0.1:9090 agent_management.AgentManagement/GetMetrics
```

## 🔧 Architecture

### Component Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    SecureWatch Agent                       │
├─────────────────────────────────────────────────────────────┤
│  Collectors  │  Parsing   │   Buffer   │  Transport        │
│              │  Engine    │            │                   │
│ ┌─────────┐  │ ┌────────┐ │ ┌────────┐ │ ┌───────────────┐ │
│ │ Syslog  │  │ │ Regex  │ │ │Memory  │ │ │ HTTPS/TLS     │ │
│ │ File    │──┼─│ Parser │─┼─│ +      │─┼─│ + Compression │ │
│ │ Windows │  │ │ Custom │ │ │SQLite  │ │ │ + Retry       │ │
│ └─────────┘  │ └────────┘ │ └────────┘ │ └───────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Management API (gRPC)                         │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Security

### Authentication
- API key-based authentication for transport
- Optional token authentication for management API
- TLS 1.3 encryption for all network communications

### Network Security
- Configurable TLS certificate validation
- Compressed payload transmission
- Connection pooling and rate limiting

## 📈 Performance

### Benchmarks
- **Throughput**: 100,000+ events/second sustained
- **Memory**: <100MB typical usage (configurable limits)
- **CPU**: <5% on modern hardware under normal load
- **Latency**: <10ms average event processing time

## 🐛 Troubleshooting

### Debug Mode
Enable comprehensive logging:
```bash
# Environment variable
export RUST_LOG=securewatch_agent=debug

# Command line
./securewatch-agent --log-level debug
```

## 📄 License

This project is licensed under the MIT License.

---

**SecureWatch Agent** - Enterprise Security Intelligence Collection