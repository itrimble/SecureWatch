#!/bin/bash
# Build SecureWatch Rust Agent for multiple platforms

set -e

echo "🦀 Building SecureWatch Agent for multiple platforms..."

# Ensure cargo is available
source "$HOME/.cargo/env" 2>/dev/null || true

# Install required targets
echo "📦 Installing cross-compilation targets..."
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin  
rustup target add aarch64-apple-darwin
rustup target add x86_64-unknown-linux-gnu

# Create output directory
mkdir -p dist

echo "🏗️  Building for current platform (release)..."
cargo build --release
cp target/release/securewatch-agent dist/securewatch-agent-$(uname -m)-$(uname -s | tr '[:upper:]' '[:lower:]')

echo "🏗️  Building for additional platforms..."

# macOS Intel (if not current platform)
if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" != "x86_64" ]]; then
    echo "Building for macOS Intel..."
    cargo build --target x86_64-apple-darwin --release
    cp target/x86_64-apple-darwin/release/securewatch-agent dist/securewatch-agent-x86_64-macos
fi

# macOS ARM (if not current platform) 
if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" != "arm64" ]]; then
    echo "Building for macOS ARM..."
    cargo build --target aarch64-apple-darwin --release
    cp target/aarch64-apple-darwin/release/securewatch-agent dist/securewatch-agent-arm64-macos
fi

# Windows (cross-compile)
if command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
    echo "Building for Windows..."
    cargo build --target x86_64-pc-windows-msvc --release
    cp target/x86_64-pc-windows-msvc/release/securewatch-agent.exe dist/securewatch-agent-x86_64-windows.exe
else
    echo "⚠️  Windows cross-compilation tools not available, skipping Windows build"
fi

# Linux (cross-compile if not current platform)
if [[ "$(uname -s)" != "Linux" ]]; then
    if command -v x86_64-linux-gnu-gcc >/dev/null 2>&1; then
        echo "Building for Linux..."
        cargo build --target x86_64-unknown-linux-gnu --release
        cp target/x86_64-unknown-linux-gnu/release/securewatch-agent dist/securewatch-agent-x86_64-linux
    else
        echo "⚠️  Linux cross-compilation tools not available, skipping Linux build"
    fi
fi

echo "✅ Build complete! Binaries available in dist/"
ls -la dist/
echo ""
echo "📊 Binary sizes:"
du -h dist/*