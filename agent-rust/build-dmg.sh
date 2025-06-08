#!/bin/bash

# SecureWatch Agent macOS DMG Installer Builder
# Builds a professional DMG installer for macOS deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
DIST_DIR="$PROJECT_ROOT/dist"
DMG_DIR="$PROJECT_ROOT/dmg-build"
APP_NAME="SecureWatch Agent"
DMG_NAME="SecureWatch-Agent-Installer"
VERSION="1.0.0"

echo "🔨 Building SecureWatch Agent DMG Installer..."

# Clean previous builds
rm -rf "$DMG_DIR"
rm -f "$DIST_DIR/$DMG_NAME.dmg"

# Create DMG staging directory
mkdir -p "$DMG_DIR/SecureWatch Agent"

# Detect architecture and copy appropriate binary
if [[ $(uname -m) == "arm64" ]]; then
    BINARY_NAME="securewatch-agent-arm64-macos"
    ARCH="Apple Silicon"
else
    BINARY_NAME="securewatch-agent-x86_64-macos"
    ARCH="Intel"
fi

echo "📦 Packaging for $ARCH architecture..."

# Copy binary and make executable
cp "$DIST_DIR/$BINARY_NAME" "$DMG_DIR/SecureWatch Agent/securewatch-agent"
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

# Create installation script
cat > "$DMG_DIR/SecureWatch Agent/install.sh" << 'EOF'
#!/bin/bash

# SecureWatch Agent Installation Script
set -e

INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="$HOME/.securewatch"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
SERVICE_NAME="com.securewatch.agent"

echo "🛡️  Installing SecureWatch Agent..."

# Check if running as root for system-wide install
if [[ $EUID -eq 0 ]]; then
    INSTALL_DIR="/usr/local/bin"
    CONFIG_DIR="/etc/securewatch"
    LAUNCH_AGENT_DIR="/Library/LaunchDaemons"
    echo "Installing system-wide (requires sudo)..."
else
    echo "Installing for current user..."
fi

# Create directories
mkdir -p "$INSTALL_DIR" 2>/dev/null || {
    echo "❌ Cannot write to $INSTALL_DIR. Try running with sudo for system install."
    exit 1
}
mkdir -p "$CONFIG_DIR"
mkdir -p "$LAUNCH_AGENT_DIR"

# Copy binary
cp "$(dirname "$0")/securewatch-agent" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/securewatch-agent"

# Copy config if it doesn't exist
if [[ ! -f "$CONFIG_DIR/config.toml" ]]; then
    cp "$(dirname "$0")/config.toml" "$CONFIG_DIR/"
    echo "📝 Configuration template copied to $CONFIG_DIR/config.toml"
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
echo "🔍 View logs: tail -f /tmp/securewatch-agent.log"
echo "🛑 Stop service: launchctl stop $SERVICE_NAME"
echo "🗑️  Unload service: launchctl unload $LAUNCH_AGENT_DIR/$SERVICE_NAME.plist"
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
launchctl stop "$SERVICE_NAME" 2>/dev/null || true
launchctl unload "$LAUNCH_AGENT_DIR/$SERVICE_NAME.plist" 2>/dev/null || true

# Remove files
rm -f "$INSTALL_DIR/securewatch-agent"
rm -f "$LAUNCH_AGENT_DIR/$SERVICE_NAME.plist"
rm -f "/tmp/securewatch-agent.log"

echo "✅ SecureWatch Agent uninstalled successfully!"
echo "📝 Configuration preserved at: $CONFIG_DIR"
echo "🗑️  To remove config: rm -rf $CONFIG_DIR"
EOF

chmod +x "$DMG_DIR/SecureWatch Agent/uninstall.sh"

# Create README
cat > "$DMG_DIR/SecureWatch Agent/README.txt" << 'EOF'
SecureWatch Agent - SIEM Log Collection Agent
============================================

The SecureWatch Agent is a high-performance log collection and forwarding 
agent designed for enterprise security monitoring.

INSTALLATION:
1. Double-click install.sh to install the agent
2. Edit ~/.securewatch/config.toml with your settings
3. Load the service with: launchctl load ~/Library/LaunchAgents/com.securewatch.agent.plist

FEATURES:
• Real-time syslog collection (UDP/TCP port 514)
• File system monitoring with glob patterns
• Secure HTTPS transport with TLS 1.3
• Persistent buffering with backpressure control
• Hot-reloadable configuration
• Pluggable parsing engine
• Cross-platform system monitoring

CONFIGURATION:
Edit config.toml to set:
- Your SecureWatch server endpoint
- Log collection paths
- Transport security settings
- Buffer and performance tuning

SUPPORT:
Documentation: https://github.com/itrimble/SecureWatch
Issues: https://github.com/itrimble/SecureWatch/issues

© 2025 SecureWatch - Enterprise SIEM Platform

# Create application symlink for Applications folder
ln -s /Applications "$DMG_DIR/Applications"

echo "🎨 Creating DMG with hdiutil..."

# Create DMG
hdiutil create -srcfolder "$DMG_DIR" \
    -volname "SecureWatch Agent v$VERSION" \
    -fs HFS+ \
    -fsargs "-c c=64,a=16,e=16" \
    -format UDBZ \
    -imagekey zlib-level=9 \
    "$DIST_DIR/$DMG_NAME-v$VERSION-$ARCH.dmg"

# Clean up
rm -rf "$DMG_DIR"

echo "✅ DMG installer created: $DIST_DIR/$DMG_NAME-v$VERSION-$ARCH.dmg"
echo "📦 Size: $(du -h "$DIST_DIR/$DMG_NAME-v$VERSION-$ARCH.dmg" | cut -f1)"
echo ""
echo "🚀 Ready for distribution!"
EOF