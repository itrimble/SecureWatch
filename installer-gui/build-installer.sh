#!/bin/bash

# SecureWatch Agent GUI Installer Builder
# Creates cross-platform GUI installers for macOS and Windows

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
UI_DIR="$PROJECT_ROOT/ui"
DIST_DIR="$PROJECT_ROOT/dist"

echo "🔨 Building SecureWatch Agent GUI Installer..."

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed"
    exit 1
fi

# Install UI dependencies
echo "📦 Installing UI dependencies..."
cd "$UI_DIR"
npm install

# Build UI
echo "🏗️  Building UI..."
npm run build

# Return to project root
cd "$PROJECT_ROOT"

# Check if Rust is available
if ! command -v cargo &> /dev/null && ! command -v /Users/ian/.cargo/bin/cargo &> /dev/null; then
    echo "❌ Rust/Cargo is required but not installed"
    exit 1
fi

# Use Rust from either PATH or ~/.cargo/bin
if command -v cargo &> /dev/null; then
    CARGO_CMD="cargo"
else
    CARGO_CMD="/Users/ian/.cargo/bin/cargo"
fi

# Build the installer
echo "🦀 Building Tauri installer..."

# Install tauri-cli if not available
if ! command -v tauri &> /dev/null && ! command -v ~/.cargo/bin/tauri &> /dev/null; then
    echo "📥 Installing Tauri CLI..."
    $CARGO_CMD install tauri-cli
fi

# Use tauri from either PATH or ~/.cargo/bin
if command -v tauri &> /dev/null; then
    TAURI_CMD="tauri"
else
    TAURI_CMD="$HOME/.cargo/bin/tauri"
fi

# Build for current platform
echo "🔧 Building installer for $(uname -s)..."
$TAURI_CMD build

# Copy built artifacts
echo "📋 Copying build artifacts..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ -d "src-tauri/target/release/bundle/dmg" ]; then
        cp src-tauri/target/release/bundle/dmg/*.dmg "$DIST_DIR/" 2>/dev/null || true
    fi
    if [ -d "src-tauri/target/release/bundle/macos" ]; then
        cp -r src-tauri/target/release/bundle/macos/*.app "$DIST_DIR/" 2>/dev/null || true
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    if [ -d "src-tauri/target/release/bundle/msi" ]; then
        cp src-tauri/target/release/bundle/msi/*.msi "$DIST_DIR/" 2>/dev/null || true
    fi
    if [ -d "src-tauri/target/release/bundle/nsis" ]; then
        cp src-tauri/target/release/bundle/nsis/*.exe "$DIST_DIR/" 2>/dev/null || true
    fi
fi

echo "✅ GUI installer build complete!"
echo "📦 Artifacts available in: $DIST_DIR"

# List built files
if [ "$(ls -A $DIST_DIR)" ]; then
    echo "📋 Built files:"
    ls -la "$DIST_DIR"
else
    echo "⚠️  No installer files found. Check the build output above for errors."
fi

echo ""
echo "🚀 SecureWatch Agent GUI Installer ready for distribution!"
EOF