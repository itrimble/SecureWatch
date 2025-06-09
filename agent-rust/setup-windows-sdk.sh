#!/bin/bash
# Setup Windows SDK for ARM64 cross-compilation

set -e

echo "🔧 Setting up Windows SDK for ARM64 cross-compilation..."

# Install xwin if not present
if ! command -v xwin >/dev/null 2>&1; then
    echo "📦 Installing xwin..."
    cargo install --locked xwin
fi

# Create xwin directory
mkdir -p ~/.xwin

# Download Windows SDK with ARM64 support
echo "📥 Downloading Windows SDK and libraries..."
xwin --accept-license splat --output ~/.xwin

# Setup environment variables for cargo
export XWIN_ARCH=aarch64
export XWIN_SDK_VERSION=10.0.26100
export XWIN_VARIANT=desktop

# Update cargo config for Windows ARM64
cat > .cargo/config.toml << 'EOF'
# Cross-compilation configuration for SecureWatch Agent

[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"

[target.i686-pc-windows-gnu]
linker = "i686-w64-mingw32-gcc"

[target.aarch64-pc-windows-msvc]
linker = "rust-lld"
rustflags = [
    "-L", "native=/Users/$USER/.xwin/crt/lib/arm64",
    "-L", "native=/Users/$USER/.xwin/sdk/lib/um/arm64",
    "-L", "native=/Users/$USER/.xwin/sdk/lib/ucrt/arm64",
]

[target.aarch64-pc-windows-msvc.env]
CC_aarch64_pc_windows_msvc = "clang-cl"
CXX_aarch64_pc_windows_msvc = "clang-cl"
AR_aarch64_pc_windows_msvc = "llvm-lib"
CFLAGS_aarch64_pc_windows_msvc = "--target=aarch64-pc-windows-msvc -I/Users/$USER/.xwin/crt/include -I/Users/$USER/.xwin/sdk/include/ucrt -I/Users/$USER/.xwin/sdk/include/um -I/Users/$USER/.xwin/sdk/include/shared"

[target.arm64ec-pc-windows-msvc]
linker = "rust-lld"
rustflags = [
    "-L", "native=/Users/$USER/.xwin/crt/lib/arm64ec",
    "-L", "native=/Users/$USER/.xwin/sdk/lib/um/arm64ec",
    "-L", "native=/Users/$USER/.xwin/sdk/lib/ucrt/arm64ec",
]

[target.arm64ec-pc-windows-msvc.env]
CC_arm64ec_pc_windows_msvc = "clang-cl"
CXX_arm64ec_pc_windows_msvc = "clang-cl"
AR_arm64ec_pc_windows_msvc = "llvm-lib"
CFLAGS_arm64ec_pc_windows_msvc = "--target=arm64ec-pc-windows-msvc -I/Users/$USER/.xwin/crt/include -I/Users/$USER/.xwin/sdk/include/ucrt -I/Users/$USER/.xwin/sdk/include/um -I/Users/$USER/.xwin/sdk/include/shared"

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

echo "✅ Windows SDK setup complete!"
echo ""
echo "🔨 To build for Windows ARM64:"
echo "   cargo build --target aarch64-pc-windows-msvc --release"
echo ""
echo "📁 SDK installed at: ~/.xwin"
echo "⚙️  Cargo config updated with proper library paths"