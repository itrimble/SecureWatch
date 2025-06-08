#!/bin/bash
# Cross-platform build script for SecureWatch Agent

set -euo pipefail

TARGETS=(
    "x86_64-pc-windows-msvc"
    "x86_64-pc-windows-gnu"
    "i686-pc-windows-msvc"
    "aarch64-pc-windows-msvc"
    "x86_64-apple-darwin"
    "aarch64-apple-darwin" 
    "x86_64-unknown-linux-gnu"
    "aarch64-unknown-linux-gnu"
    "x86_64-unknown-linux-musl"
    "aarch64-unknown-linux-musl"
    "armv7-unknown-linux-gnueabihf"
    "i686-unknown-linux-gnu"
    "x86_64-unknown-freebsd"
)

VERSION=${1:-"dev"}
OUTPUT_DIR="dist"

echo "🦀 Building SecureWatch Agent v${VERSION} for all platforms..."

# Clean and prepare
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Install targets
echo "📦 Installing Rust targets..."
for target in "${TARGETS[@]}"; do
    echo "  - ${target}"
    rustup target add "${target}"
done

# Build for each target
echo ""
echo "🔨 Building executables..."
for target in "${TARGETS[@]}"; do
    echo ""
    echo "🎯 Building for: ${target}"
    
    # Set target-specific configurations
    case "${target}" in
        *windows*)
            EXECUTABLE_NAME="securewatch-agent.exe"
            ARCHIVE_EXT="zip"
            ;;
        *)
            EXECUTABLE_NAME="securewatch-agent"
            ARCHIVE_EXT="tar.gz"
            ;;
    esac
    
    # Build with error handling
    if cargo build --release --target "${target}"; then
        echo "✅ Build successful for ${target}"
        
        # Package
        PACKAGE_NAME="securewatch-agent-${VERSION}-${target}"
        mkdir -p "${OUTPUT_DIR}/${PACKAGE_NAME}"
        
        cp "target/${target}/release/${EXECUTABLE_NAME}" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
        
        # Copy config and docs if they exist
        if [ -f "agent.toml.example" ]; then
            cp "agent.toml.example" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
        fi
        if [ -f "README.md" ]; then
            cp "README.md" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
        fi
        if [ -f "../LICENSE" ]; then
            cp "../LICENSE" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
        fi
        
        # Create archive
        cd "${OUTPUT_DIR}"
        if [[ "${ARCHIVE_EXT}" == "zip" ]]; then
            zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}"
        else
            tar -czf "${PACKAGE_NAME}.tar.gz" "${PACKAGE_NAME}"
        fi
        rm -rf "${PACKAGE_NAME}"
        cd ..
        
        echo "📦 Created: ${OUTPUT_DIR}/${PACKAGE_NAME}.${ARCHIVE_EXT}"
    else
        echo "❌ Build failed for ${target}"
        continue
    fi
done

# Generate checksums
echo ""
echo "🔐 Generating checksums..."
cd "${OUTPUT_DIR}"
find . -name "*.zip" -o -name "*.tar.gz" | while read file; do
    sha256sum "$file" > "$file.sha256"
    echo "  ✅ ${file}.sha256"
done
cd ..

# Display results
echo ""
echo "🎉 Build completed!"
echo ""
echo "📊 Build Results:"
find "${OUTPUT_DIR}" -name "*.zip" -o -name "*.tar.gz" | while read file; do
    size=$(ls -lh "$file" | awk '{print $5}')
    echo "  📦 $(basename "$file") - ${size}"
done

echo ""
echo "📁 All artifacts are in the ${OUTPUT_DIR}/ directory"
echo ""
echo "🚀 Quick test command:"
echo "  ./dist/securewatch-agent-${VERSION}-$(rustc --version --verbose | grep host | cut -d' ' -f2)/securewatch-agent --help"