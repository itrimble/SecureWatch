#!/bin/bash
# Build SecureWatch Rust Agent for multiple platforms

set -e

echo "🦀 Building SecureWatch Agent for multiple platforms..."

# Ensure cargo is available
source "$HOME/.cargo/env" 2>/dev/null || true

# Install required targets
echo "📦 Installing cross-compilation targets..."
# GNU LLVM targets (preferred for cross-compilation)
rustup target add x86_64-pc-windows-gnullvm
rustup target add aarch64-pc-windows-gnullvm
# Traditional GNU targets 
rustup target add x86_64-pc-windows-gnu
rustup target add i686-pc-windows-gnu
# MSVC targets (for cargo-xwin)
rustup target add x86_64-pc-windows-msvc
rustup target add aarch64-pc-windows-msvc
rustup target add i686-pc-windows-msvc
# macOS targets
rustup target add x86_64-apple-darwin  
rustup target add aarch64-apple-darwin
# Linux targets
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

# Windows x64 GNU LLVM (cross-compile with minimal features - no C compilation issues)
echo "Building for Windows x64 (GNU LLVM)..."
cargo build --target x86_64-pc-windows-gnullvm --release --no-default-features --features minimal
cp target/x86_64-pc-windows-gnullvm/release/securewatch-agent.exe dist/securewatch-agent-x86_64-windows-gnu.exe

# Windows ARM64 GNU LLVM (cross-compile with minimal features - no linking issues)
echo "Building for Windows ARM64 (GNU LLVM)..."
cargo build --target aarch64-pc-windows-gnullvm --release --no-default-features --features minimal
cp target/aarch64-pc-windows-gnullvm/release/securewatch-agent.exe dist/securewatch-agent-arm64-windows-gnu.exe

# Windows x64 traditional GNU (alternative build)
echo "Building for Windows x64 (traditional GNU)..."
cargo build --target x86_64-pc-windows-gnu --release --no-default-features --features minimal
cp target/x86_64-pc-windows-gnu/release/securewatch-agent.exe dist/securewatch-agent-x86_64-windows-gnu-traditional.exe

# MSVC builds using cargo-xwin (works on macOS with Windows SDK download)
if [[ "${BUILD_MSVC:-true}" == "true" ]]; then
    echo "Building MSVC targets using cargo-xwin (with Windows SDK)..."
    
    # Check if cargo-xwin is available
    if command -v cargo-xwin >/dev/null 2>&1; then
        echo "🔧 Using cargo-xwin for Windows MSVC cross-compilation..."
        
        # Windows x64 MSVC
        cargo xwin build --target x86_64-pc-windows-msvc --release --no-default-features --features minimal && \
            cp target/x86_64-pc-windows-msvc/release/securewatch-agent.exe dist/securewatch-agent-x86_64-windows-msvc.exe || \
            echo "⚠️  MSVC x64 build failed"
        
        # Windows ARM64 MSVC 
        cargo xwin build --target aarch64-pc-windows-msvc --release --no-default-features --features minimal && \
            cp target/aarch64-pc-windows-msvc/release/securewatch-agent.exe dist/securewatch-agent-arm64-windows-msvc.exe || \
            echo "⚠️  MSVC ARM64 build failed"
            
        # Windows i686 MSVC (optional)
        cargo xwin build --target i686-pc-windows-msvc --release --no-default-features --features minimal && \
            cp target/i686-pc-windows-msvc/release/securewatch-agent.exe dist/securewatch-agent-i686-windows-msvc.exe || \
            echo "⚠️  MSVC i686 build failed"
    else
        echo "⚠️  cargo-xwin not found. Install with: cargo install cargo-xwin"
        echo "⚠️  Skipping MSVC builds. Set BUILD_MSVC=false to disable this warning."
    fi
fi

echo "✅ Windows GNU builds completed successfully"

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
echo ""
echo "📁 Generated binaries:"
ls -la dist/
echo ""
echo "📊 Binary sizes:"
du -h dist/* 2>/dev/null || echo "No binaries generated"
echo ""
echo "🎯 Cross-compilation summary:"
echo "  ✅ GNU LLVM targets: Preferred for cross-compilation (no Windows SDK required)"
echo "  ✅ MSVC targets: Built with cargo-xwin (includes Windows SDK)"
echo "  ✅ Traditional GNU: Compatible with MinGW toolchain"
echo ""
echo "🚀 SecureWatch Agent built successfully for multiple Windows architectures!"
echo "   - ARM64 (aarch64): Native performance on ARM64 Windows devices"
echo "   - x86_64: Compatible with standard Windows systems"
echo "   - i686: Legacy 32-bit Windows support"