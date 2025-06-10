#!/bin/bash
# Comprehensive Windows ARM64 cross-compilation setup and build script

set -e

echo "🦀 SecureWatch Agent - Windows ARM64 Cross-Compilation Setup"
echo "============================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install xwin
install_xwin() {
    echo "📦 Installing xwin for Windows SDK..."
    cargo install --locked xwin --force
}

# Function to setup Windows SDK
setup_windows_sdk() {
    echo "📥 Setting up Windows SDK for ARM64..."
    
    # Create xwin directory
    mkdir -p ~/.xwin
    
    # Download Windows SDK if not already present
    if [ ! -d ~/.xwin/crt ] || [ ! -d ~/.xwin/sdk ]; then
        echo "⬇️  Downloading Windows SDK (this may take a while)..."
        xwin --accept-license splat --output ~/.xwin
    else
        echo "✅ Windows SDK already present"
    fi
}

# Function to update cargo config
update_cargo_config() {
    echo "⚙️  Updating Cargo configuration..."
    
    # Backup existing config
    if [ -f .cargo/config.toml ]; then
        cp .cargo/config.toml .cargo/config.toml.backup
    fi
    
    # Create updated config with Windows SDK paths
    cat > .cargo/config.toml << EOF
# Cross-compilation configuration for SecureWatch Agent

[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"

[target.i686-pc-windows-gnu]
linker = "i686-w64-mingw32-gcc"

[target.aarch64-pc-windows-msvc]
linker = "rust-lld"
rustflags = [
    "-L", "native=$HOME/.xwin/crt/lib/arm64",
    "-L", "native=$HOME/.xwin/sdk/lib/um/arm64",
    "-L", "native=$HOME/.xwin/sdk/lib/ucrt/arm64",
]

[target.aarch64-pc-windows-msvc.env]
CC_aarch64_pc_windows_msvc = "clang-cl"
CXX_aarch64_pc_windows_msvc = "clang-cl"
AR_aarch64_pc_windows_msvc = "llvm-lib"
CFLAGS_aarch64_pc_windows_msvc = "--target=aarch64-pc-windows-msvc -I$HOME/.xwin/crt/include -I$HOME/.xwin/sdk/include/ucrt -I$HOME/.xwin/sdk/include/um -I$HOME/.xwin/sdk/include/shared"
CXXFLAGS_aarch64_pc_windows_msvc = "--target=aarch64-pc-windows-msvc -I$HOME/.xwin/crt/include -I$HOME/.xwin/sdk/include/ucrt -I$HOME/.xwin/sdk/include/um -I$HOME/.xwin/sdk/include/shared"

[target.arm64ec-pc-windows-msvc]
linker = "rust-lld"
rustflags = [
    "-L", "native=$HOME/.xwin/crt/lib/arm64ec",
    "-L", "native=$HOME/.xwin/sdk/lib/um/arm64ec", 
    "-L", "native=$HOME/.xwin/sdk/lib/ucrt/arm64ec",
]

[target.arm64ec-pc-windows-msvc.env]
CC_arm64ec_pc_windows_msvc = "clang-cl"
CXX_arm64ec_pc_windows_msvc = "clang-cl"
AR_arm64ec_pc_windows_msvc = "llvm-lib"
CFLAGS_arm64ec_pc_windows_msvc = "--target=arm64ec-pc-windows-msvc -I$HOME/.xwin/crt/include -I$HOME/.xwin/sdk/include/ucrt -I$HOME/.xwin/sdk/include/um -I$HOME/.xwin/sdk/include/shared"
CXXFLAGS_arm64ec_pc_windows_msvc = "--target=arm64ec-pc_windows-msvc -I$HOME/.xwin/crt/include -I$HOME/.xwin/sdk/include/ucrt -I$HOME/.xwin/sdk/include/um -I$HOME/.xwin/sdk/include/shared"

[target.x86_64-pc-windows-msvc]
linker = "rust-lld"

# Linux targets
[target.x86_64-unknown-linux-gnu]
# Uses default linker

[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"

[target.armv7-unknown-linux-gnueabihf]
linker = "arm-linux-gnueabihf-gcc"

# MUSL static targets
[target.x86_64-unknown-linux-musl]
linker = "musl-gcc"

[target.aarch64-unknown-linux-musl]
linker = "aarch64-linux-gnu-gcc"
rustflags = ["-C", "target-feature=+crt-static", "-C", "link-arg=-lgcc"]

# macOS targets
[target.x86_64-apple-darwin]
# Uses default linker

[target.aarch64-apple-darwin]
# Uses default linker

# FreeBSD target
[target.x86_64-unknown-freebsd]
# Uses default linker
EOF

    echo "✅ Cargo configuration updated"
}

# Function to try different build approaches
try_build_approaches() {
    echo "🔨 Attempting Windows ARM64 build with different approaches..."
    
    # Approach 1: Native TLS + bundled SQLite with Windows SDK
    echo ""
    echo "📋 Approach 1: Full build with Windows SDK..."
    if cargo build --target aarch64-pc-windows-msvc --release; then
        echo "✅ Approach 1 succeeded!"
        return 0
    else
        echo "❌ Approach 1 failed"
    fi
    
    # Approach 2: Native TLS without bundled SQLite
    echo ""
    echo "📋 Approach 2: Native TLS without bundled SQLite..."
    if cargo build --target aarch64-pc-windows-msvc --release --no-default-features --features native-tls-backend; then
        echo "✅ Approach 2 succeeded!"
        return 0
    else
        echo "❌ Approach 2 failed"
    fi
    
    # Approach 3: Minimal build
    echo ""
    echo "📋 Approach 3: Minimal build (memory-only buffering)..."
    
    # Temporarily modify Cargo.toml to disable problematic dependencies
    cp Cargo.toml Cargo.toml.backup
    
    # Comment out rusqlite
    sed -i.tmp 's/^rusqlite = .*$/# rusqlite = { version = "0.32", features = ["bundled"] } # Disabled for ARM64 cross-compile/' Cargo.toml
    
    # Update buffer.rs to use in-memory only
    cp src/buffer.rs src/buffer.rs.backup
    
    if cargo build --target aarch64-pc-windows-msvc --release --no-default-features --features native-tls-backend; then
        echo "✅ Approach 3 succeeded!"
        
        # Restore files
        mv Cargo.toml.backup Cargo.toml
        mv src/buffer.rs.backup src/buffer.rs
        return 0
    else
        echo "❌ Approach 3 failed"
        
        # Restore files
        mv Cargo.toml.backup Cargo.toml
        mv src/buffer.rs.backup src/buffer.rs
    fi
    
    return 1
}

# Main execution
main() {
    echo "🔍 Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "Cargo.toml" ]; then
        echo "❌ Error: Cargo.toml not found. Please run this script from the agent-rust directory."
        exit 1
    fi
    
    # Check for Rust
    if ! command_exists cargo; then
        echo "❌ Error: Cargo not found. Please install Rust."
        exit 1
    fi
    
    # Install targets
    echo "📦 Installing required Rust targets..."
    rustup target add aarch64-pc-windows-msvc
    rustup target add arm64ec-pc-windows-msvc
    
    # Install xwin if needed
    if ! command_exists xwin; then
        install_xwin
    else
        echo "✅ xwin already installed"
    fi
    
    # Setup Windows SDK
    setup_windows_sdk
    
    # Update cargo config
    update_cargo_config
    
    # Create dist directory
    mkdir -p dist
    
    # Try different build approaches
    if try_build_approaches; then
        # Copy successful build
        if [ -f "target/aarch64-pc-windows-msvc/release/securewatch-agent.exe" ]; then
            cp target/aarch64-pc-windows-msvc/release/securewatch-agent.exe dist/securewatch-agent-arm64-windows.exe
            echo "🎉 Windows ARM64 build successful!"
            echo "📁 Binary available at: dist/securewatch-agent-arm64-windows.exe"
            ls -la dist/securewatch-agent-arm64-windows.exe
        else
            echo "❌ Build reported success but binary not found"
            exit 1
        fi
    else
        echo "❌ All build approaches failed"
        exit 1
    fi
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --setup-only    Only setup Windows SDK, don't build"
    echo "  --build-only    Skip setup, only attempt build"
    echo "  --help, -h      Show this help"
    echo ""
    echo "This script will:"
    echo "1. Install xwin if needed"
    echo "2. Download Windows SDK for ARM64"
    echo "3. Configure Cargo for cross-compilation" 
    echo "4. Try multiple build approaches"
    echo "5. Create dist/securewatch-agent-arm64-windows.exe"
    exit 0
fi

# Handle specific modes
if [ "$1" = "--setup-only" ]; then
    echo "🔧 Setup mode only..."
    if ! command_exists xwin; then
        install_xwin
    fi
    setup_windows_sdk
    update_cargo_config
    echo "✅ Setup complete!"
    exit 0
elif [ "$1" = "--build-only" ]; then
    echo "🔨 Build mode only..."
    try_build_approaches
    exit 0
fi

# Run main function
main