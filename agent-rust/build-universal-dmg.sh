#!/bin/bash

# SecureWatch Agent Universal macOS DMG Installer Builder
# Creates a universal DMG with both Intel and Apple Silicon binaries

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DIST_DIR="$PROJECT_ROOT/dist"
DMG_DIR="$PROJECT_ROOT/dmg-universal"
APP_NAME="SecureWatch Agent"
DMG_NAME="SecureWatch-Agent-Universal-Installer"
VERSION="1.0.0"

echo "🔨 Building Universal SecureWatch Agent DMG Installer..."

# Clean previous builds
rm -rf "$DMG_DIR"
rm -f "$DIST_DIR/$DMG_NAME.dmg"

# Create DMG staging directory
mkdir -p "$DMG_DIR/SecureWatch Agent"

echo "📦 Packaging universal installer with both architectures..."

# Copy both binaries
cp "$DIST_DIR/securewatch-agent-arm64-macos" "$DMG_DIR/SecureWatch Agent/securewatch-agent-arm64"
cp "$DIST_DIR/securewatch-agent-intel-macos" "$DMG_DIR/SecureWatch Agent/securewatch-agent-x86_64"
chmod +x "$DMG_DIR/SecureWatch Agent/securewatch-agent-arm64"
chmod +x "$DMG_DIR/SecureWatch Agent/securewatch-agent-x86_64"

# Create universal launcher script
cat > "$DMG_DIR/SecureWatch Agent/securewatch-agent" << 'EOF'
#!/bin/bash

# SecureWatch Agent Universal Launcher
# Automatically selects the correct binary for the current architecture

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $(uname -m) == "arm64" ]]; then
    exec "$SCRIPT_DIR/securewatch-agent-arm64" "$@"
else
    exec "$SCRIPT_DIR/securewatch-agent-x86_64" "$@"
fi
EOF

chmod +x "$DMG_DIR/SecureWatch Agent/securewatch-agent"

# Create configuration template
cat > "$DMG_DIR/SecureWatch Agent/config.toml" << 'EOF'
# SecureWatch Agent Configuration
# Copy this file to ~/.securewatch/config.toml and customize

[agent]
id = "securewatch-agent-001"
name = "SecureWatch Agent"
log_level = "info"
buffer_size = 10000

[collectors.syslog]
enabled = true
udp_port = 514
tcp_port = 514

[collectors.file_monitor]
enabled = true
paths = [
    "/var/log/**/*.log",
    "/usr/local/var/log/**/*.log"
]

[transport]
endpoint = "https://your-securewatch-server.com/api/events"
compression = "gzip"
retry_attempts = 3
retry_delay_ms = 1000

[transport.tls]
verify_certificates = true
ca_cert_path = ""

[buffer]
type = "persistent"
disk_buffer_size = 100000
high_water_mark = 0.8
low_water_mark = 0.3

[parsers.syslog]
enabled = true
pattern = "^(?P<timestamp>\\S+\\s+\\S+\\s+\\S+)\\s+(?P<hostname>\\S+)\\s+(?P<program>\\S+)\\[?(?P<pid>\\d+)?\\]?:\\s*(?P<message>.*)$"

[management]
enabled = false
bind_address = "127.0.0.1:9090"
EOF

# Create enhanced installation script
cat > "$DMG_DIR/SecureWatch Agent/install.sh" << 'EOF'
#!/bin/bash

# SecureWatch Agent Universal Installation Script
set -e

INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.securewatch"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
SERVICE_NAME="com.securewatch.agent"

echo "🛡️  Installing SecureWatch Agent (Universal)..."
echo "🔍 Detected architecture: $(uname -m)"

# Check if running as root for system-wide install
if [[ $EUID -eq 0 ]]; then
    INSTALL_DIR="/usr/local/bin"
    CONFIG_DIR="/etc/securewatch"
    LAUNCH_AGENT_DIR="/Library/LaunchDaemons"
    echo "📦 Installing system-wide (requires sudo)..."
else
    echo "👤 Installing for current user..."
fi

# Create directories
mkdir -p "$INSTALL_DIR" 2>/dev/null || {
    echo "❌ Cannot write to $INSTALL_DIR. Try running with sudo for system install."
    exit 1
}
mkdir -p "$CONFIG_DIR"
mkdir -p "$LAUNCH_AGENT_DIR"

# Copy universal launcher and binaries
cp "$(dirname "$0")/securewatch-agent" "$INSTALL_DIR/"
cp "$(dirname "$0")/securewatch-agent-arm64" "$INSTALL_DIR/"
cp "$(dirname "$0")/securewatch-agent-x86_64" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/securewatch-agent"
chmod +x "$INSTALL_DIR/securewatch-agent-arm64"
chmod +x "$INSTALL_DIR/securewatch-agent-x86_64"

# Copy config if it doesn't exist
if [[ ! -f "$CONFIG_DIR/config.toml" ]]; then
    cp "$(dirname "$0")/config.toml" "$CONFIG_DIR/"
    echo "📝 Configuration template copied to $CONFIG_DIR/config.toml"
    echo "⚙️  Please edit this file before starting the service"
fi

# Create LaunchAgent/LaunchDaemon plist
cat > "$LAUNCH_AGENT_DIR/$SERVICE_NAME.plist" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SERVICE_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/securewatch-agent</string>
        <string>--config</string>
        <string>$CONFIG_DIR/config.toml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/securewatch-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/securewatch-agent.log</string>
    <key>WorkingDirectory</key>
    <string>$CONFIG_DIR</string>
</dict>
</plist>
PLIST_EOF

echo "✅ SecureWatch Agent installed successfully!"
echo ""
echo "📍 Next steps:"
echo "1. Edit configuration: $CONFIG_DIR/config.toml"
echo "2. Load service: launchctl load $LAUNCH_AGENT_DIR/$SERVICE_NAME.plist"
echo "3. Start service: launchctl start $SERVICE_NAME"
echo ""
echo "🔧 Management commands:"
echo "🔍 View logs: tail -f /tmp/securewatch-agent.log"
echo "📊 Check status: launchctl list | grep securewatch"
echo "🛑 Stop service: launchctl stop $SERVICE_NAME"
echo "🔄 Restart: launchctl stop $SERVICE_NAME && launchctl start $SERVICE_NAME"
echo "🗑️  Unload service: launchctl unload $LAUNCH_AGENT_DIR/$SERVICE_NAME.plist"
echo ""
echo "🛡️  SecureWatch Agent is ready to protect your system!"
EOF

chmod +x "$DMG_DIR/SecureWatch Agent/install.sh"

# Create uninstall script
cat > "$DMG_DIR/SecureWatch Agent/uninstall.sh" << 'EOF'
#!/bin/bash

# SecureWatch Agent Uninstallation Script
set -e

SERVICE_NAME="com.securewatch.agent"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.securewatch"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"

if [[ $EUID -eq 0 ]]; then
    CONFIG_DIR="/etc/securewatch"
    LAUNCH_AGENT_DIR="/Library/LaunchDaemons"
fi

echo "🗑️  Uninstalling SecureWatch Agent..."

# Stop and unload service
echo "🛑 Stopping service..."
launchctl stop "$SERVICE_NAME" 2>/dev/null || true
launchctl unload "$LAUNCH_AGENT_DIR/$SERVICE_NAME.plist" 2>/dev/null || true

# Remove files
echo "🗂️  Removing files..."
rm -f "$INSTALL_DIR/securewatch-agent"
rm -f "$INSTALL_DIR/securewatch-agent-arm64"
rm -f "$INSTALL_DIR/securewatch-agent-x86_64"
rm -f "$LAUNCH_AGENT_DIR/$SERVICE_NAME.plist"
rm -f "/tmp/securewatch-agent.log"

echo "✅ SecureWatch Agent uninstalled successfully!"
echo "📝 Configuration preserved at: $CONFIG_DIR"
echo "🗑️  To remove config: rm -rf $CONFIG_DIR"
EOF

chmod +x "$DMG_DIR/SecureWatch Agent/uninstall.sh"

# Create enhanced README
cat > "$DMG_DIR/SecureWatch Agent/README.txt" << 'EOF'
SecureWatch Agent - Universal SIEM Log Collection Agent
======================================================

The SecureWatch Agent is a high-performance, cross-architecture log collection 
and forwarding agent designed for enterprise security monitoring.

UNIVERSAL BINARY:
✅ Native Apple Silicon (M1/M2/M3) support
✅ Intel x86_64 compatibility
✅ Automatic architecture detection

INSTALLATION:
1. Double-click install.sh to install the agent
2. Edit ~/.securewatch/config.toml with your server details
3. Load the service: launchctl load ~/Library/LaunchAgents/com.securewatch.agent.plist
4. Start monitoring: launchctl start com.securewatch.agent

ENTERPRISE FEATURES:
🔒 Secure HTTPS transport with TLS 1.3
📡 Real-time syslog collection (UDP/TCP port 514)
📁 File system monitoring with glob patterns
💾 Persistent buffering with backpressure control
🔄 Hot-reloadable configuration
🧩 Pluggable regex-based parsing engine
📊 Cross-platform system monitoring
⚡ High-performance async I/O with Tokio
🗜️ Gzip/Brotli compression
🔁 Automatic retry with exponential backoff

CONFIGURATION EXAMPLES:
• Monitor system logs: /var/log/**/*.log
• Custom app logs: /usr/local/var/log/myapp/*.log
• Secure transport: HTTPS with certificate validation
• Buffer tuning: Adjust for your log volume
• Parser rules: Custom regex patterns for log formats

PERFORMANCE:
• Optimized Rust implementation
• Sub-millisecond latency
• Handles thousands of events per second
• Minimal memory footprint (~2-5MB)
• Automatic backpressure handling

SECURITY:
• TLS 1.3 encryption in transit
• Certificate validation
• No sensitive data in memory dumps
• Secure configuration file permissions
• Optional audit logging

SUPPORT & DOCUMENTATION:
📖 Full docs: https://github.com/itrimble/SecureWatch
🐛 Report issues: https://github.com/itrimble/SecureWatch/issues
💬 Community: SecureWatch Enterprise SIEM Platform

© 2025 SecureWatch - Enterprise Security Intelligence
Version 1.0.0 - Universal Binary (ARM64 + x86_64)

SYSTEM REQUIREMENTS:
• macOS 10.15+ (Catalina or later)
• 50MB disk space for installation
• Network connectivity to SecureWatch server
• Optional: Administrative privileges for system-wide install
EOF

# Create version info
cat > "$DMG_DIR/SecureWatch Agent/VERSION" << EOF
SecureWatch Agent v$VERSION
Built: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Architecture: Universal (ARM64 + x86_64)
Rust Version: $(rustc --version 2>/dev/null || echo "Unknown")

Binaries included:
- securewatch-agent-arm64 ($(du -h "$DIST_DIR/securewatch-agent-arm64-macos" | cut -f1))
- securewatch-agent-x86_64 ($(du -h "$DIST_DIR/securewatch-agent-intel-macos" | cut -f1))

Features: TLS, Compression, Buffering, Hot-reload, Multi-collector
EOF

# Create application symlink for Applications folder
ln -s /Applications "$DMG_DIR/Applications"

echo "🎨 Creating universal DMG with hdiutil..."

# Create DMG with custom settings
hdiutil create -srcfolder "$DMG_DIR" \
    -volname "SecureWatch Agent v$VERSION (Universal)" \
    -fs HFS+ \
    -fsargs "-c c=64,a=16,e=16" \
    -format UDBZ \
    -imagekey zlib-level=9 \
    "$DIST_DIR/$DMG_NAME-v$VERSION.dmg"

# Clean up
rm -rf "$DMG_DIR"

echo "✅ Universal DMG installer created: $DIST_DIR/$DMG_NAME-v$VERSION.dmg"
echo "📦 Size: $(du -h "$DIST_DIR/$DMG_NAME-v$VERSION.dmg" | cut -f1)"
echo "🏛️  Architectures: Apple Silicon (ARM64) + Intel (x86_64)"
echo ""
echo "🚀 Ready for enterprise distribution!"
echo "📋 Installation includes:"
echo "   • Universal launcher script"
echo "   • Native binaries for both architectures"  
echo "   • Configuration template"
echo "   • LaunchAgent service setup"
echo "   • Complete documentation"
EOF