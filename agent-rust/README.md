# SecureWatch Agent

High-performance SIEM agent built with Rust and Tokio for the SecureWatch platform.

## Features

🦀 **High Performance** - Built with Rust for memory safety and speed  
⚡ **Async I/O** - Tokio-powered async runtime for maximum throughput  
🔒 **Secure Transport** - TLS encryption with certificate validation  
📊 **Multiple Collectors** - Syslog, Windows Event Log, File monitoring  
🎯 **Cross-Platform** - Windows, macOS, Linux, FreeBSD support  
📈 **Auto-Scaling** - Intelligent buffering and batch processing  
🛡️ **Enterprise Ready** - Health monitoring and graceful shutdown  

## Quick Start

### 1. Download

Download the latest release for your platform:

```bash
# Linux x64
curl -L https://github.com/securewatch/agent/releases/latest/download/securewatch-agent-linux-x64.tar.gz | tar xz

# Windows x64 (PowerShell)
Invoke-WebRequest https://github.com/securewatch/agent/releases/latest/download/securewatch-agent-windows-x64.zip -OutFile agent.zip
Expand-Archive agent.zip

# macOS (Homebrew)
brew install securewatch/tap/securewatch-agent
```

### 2. Configure

Copy the example configuration:

```bash
cp agent.toml.example agent.toml
```

Edit `agent.toml` with your SecureWatch server details:

```toml
[transport]
server_url = "https://your-securewatch-server.com"
api_key = "your-api-key"

[collectors.syslog]
enabled = true
port = 514
```

### 3. Run

```bash
# Start the agent
./securewatch-agent --config agent.toml

# Run in daemon mode
./securewatch-agent --config agent.toml --daemon

# Validate configuration
./securewatch-agent --config agent.toml --validate-config
```

## Configuration

The agent uses TOML configuration with the following sections:

### Agent Settings

```toml
[agent]
name = "my-agent"
heartbeat_interval = 30
max_memory_mb = 512
max_cpu_percent = 50.0
```

### Transport Configuration

```toml
[transport]
server_url = "https://api.securewatch.local"
api_key = "your-api-key"
tls_verify = true
compression = true
batch_size = 100
```

### Collectors

#### Syslog Collector

```toml
[collectors.syslog]
enabled = true
bind_address = "0.0.0.0"
port = 514
protocol = "udp"  # or "tcp"
```

#### Windows Event Log Collector

```toml
[collectors.windows_event]
enabled = true
channels = ["System", "Security", "Application"]
batch_size = 50
```

#### File Monitor Collector

```toml
[collectors.file_monitor]
enabled = true
paths = ["/var/log/*.log"]
patterns = ["*.log"]
recursive = true
```

## Building from Source

### Prerequisites

- Rust 1.70+ with Cargo
- Cross-compilation tools (for multi-platform builds)

### Build Commands

```bash
# Build for current platform
cargo build --release

# Build for all supported platforms
./build-all-targets.sh

# Build for specific target
cargo build --release --target x86_64-pc-windows-msvc
```

### Cross-Compilation Setup

#### Windows Targets (from macOS/Linux)

```bash
# Install MinGW for Windows cross-compilation
brew install mingw-w64  # macOS
sudo apt install mingw-w64  # Ubuntu

# Add Windows targets
rustup target add x86_64-pc-windows-gnu
rustup target add x86_64-pc-windows-msvc
```

#### Linux Targets

```bash
# Install cross-compilation tools
sudo apt install gcc-multilib gcc-aarch64-linux-gnu

# Add Linux targets
rustup target add x86_64-unknown-linux-musl
rustup target add aarch64-unknown-linux-gnu
```

## Running as a Service

### Linux (systemd)

Create `/etc/systemd/system/securewatch-agent.service`:

```ini
[Unit]
Description=SecureWatch Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/securewatch-agent --config /etc/securewatch/agent.toml
Restart=always
User=securewatch
Group=securewatch

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable securewatch-agent
sudo systemctl start securewatch-agent
```

### Windows Service

```powershell
# Install as Windows service
sc create "SecureWatch Agent" binPath= "C:\Program Files\SecureWatch\securewatch-agent.exe --config C:\Program Files\SecureWatch\agent.toml" start= auto

# Start service
sc start "SecureWatch Agent"
```

### macOS (launchd)

Create `/Library/LaunchDaemons/com.securewatch.agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.securewatch.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/securewatch-agent</string>
        <string>--config</string>
        <string>/usr/local/etc/securewatch/agent.toml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

```bash
sudo launchctl load /Library/LaunchDaemons/com.securewatch.agent.plist
```

## Monitoring and Troubleshooting

### Health Checks

The agent provides built-in health monitoring:

```bash
# Check agent status
curl http://localhost:8080/health

# View runtime statistics
curl http://localhost:8080/stats
```

### Log Levels

Set log level via environment variable or command line:

```bash
# Environment variable
export RUST_LOG=debug
./securewatch-agent

# Command line
./securewatch-agent --log-level debug
```

### Performance Tuning

#### Memory Usage

```toml
[buffer]
max_events = 10000      # Reduce for lower memory usage
max_size_mb = 100       # Maximum buffer size in MB

[agent]
max_memory_mb = 512     # Alert threshold
```

#### CPU Usage

```toml
[transport]
batch_size = 100        # Larger batches = less CPU overhead
batch_timeout = 5       # Balance between latency and throughput
```

## Security

### TLS Configuration

```toml
[transport]
tls_verify = true       # Always verify certificates in production

[security]
ca_certificates = ["/path/to/ca.pem"]  # Custom CA certificates
```

### Certificate Authentication

```toml
[security]
certificate_path = "/path/to/client.pem"
private_key_path = "/path/to/client.key"
```

## License

MIT License - see LICENSE file for details.

## Support

- 📖 Documentation: https://docs.securewatch.com
- 🐛 Issues: https://github.com/securewatch/agent/issues
- 💬 Community: https://community.securewatch.com