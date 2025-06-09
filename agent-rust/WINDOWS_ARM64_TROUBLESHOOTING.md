# Windows ARM64 Cross-Compilation Troubleshooting Guide

This guide provides comprehensive solutions for cross-compiling the SecureWatch Rust agent to Windows ARM64 from macOS.

## Problem Analysis

The main issues encountered during Windows ARM64 cross-compilation are:

1. **TLS Library Issues**: `aws-lc-sys` and `ring` crates require Windows C standard library headers
2. **SQLite Compilation**: `rusqlite` with bundled features requires C compilation for Windows
3. **Missing Windows SDK**: Need Windows ARM64 SDK headers for cross-compilation

## Solutions (Ranked by Effectiveness)

### Solution 1: Native TLS Backend (Recommended)

This approach switches from `rustls` to `native-tls`, which avoids the problematic `aws-lc-sys` and `ring` dependencies.

**Status**: ✅ Implemented in Cargo.toml
- Modified `reqwest` to use `native-tls` instead of `rustls-tls`
- Added feature flags for flexible TLS backend selection
- Updated `transport.rs` to handle both backends

**Benefits**:
- Eliminates C compilation dependencies from cryptographic libraries
- Uses platform-native TLS (Schannel on Windows)
- Better cross-compilation compatibility

**Build Command**:
```bash
cargo build --target aarch64-pc-windows-msvc --release --no-default-features --features native-tls-backend
```

### Solution 2: Windows SDK Setup with xwin

For cases where you need `rustls` or full C compilation support:

**Setup Script**: `setup-windows-sdk.sh`
**Comprehensive Script**: `windows-arm64-build.sh`

**Steps**:
1. Install xwin: `cargo install --locked xwin`
2. Download Windows SDK: `xwin --accept-license splat --output ~/.xwin`
3. Configure Cargo with proper library paths and compiler flags
4. Build with Windows SDK paths

**Usage**:
```bash
./windows-arm64-build.sh          # Full setup and build
./windows-arm64-build.sh --setup-only  # Just setup SDK
./windows-arm64-build.sh --build-only  # Just attempt build
```

### Solution 3: Dependency Substitution

For minimal builds without persistent storage:

1. **Disable SQLite**: Comment out `rusqlite` dependency
2. **Use Memory-Only Buffer**: Switch to `buffer_minimal.rs`
3. **Minimal Feature Set**: Build with `--no-default-features`

## Current Configuration

### Cargo.toml Features
```toml
[features]
default = ["native-tls-backend"]
native-tls-backend = ["native-tls", "reqwest/native-tls"]
rustls-backend = ["rustls", "webpki-roots", "reqwest/rustls-tls"]
```

### TLS Backend Selection
The `transport.rs` module now supports both TLS backends:
- `native-tls-backend`: Uses platform TLS (Windows Schannel)
- `rustls-backend`: Uses pure Rust TLS (may require C compilation)

### Build Scripts Updated
- `build_all_platforms.sh`: Uses native TLS for Windows ARM64
- `windows-arm64-build.sh`: Comprehensive setup and multiple build approaches

## Testing Results

### Native TLS Approach
- ✅ Eliminates `aws-lc-sys` and `ring` compilation errors
- ⚠️ Still encounters SQLite compilation issues
- 🔧 Requires either Windows SDK setup or SQLite alternatives

### Windows SDK with xwin
- ✅ Provides Windows headers for C compilation
- ⚠️ Large download (~2GB for full Windows SDK)
- 🔧 Requires proper environment variable configuration

## Recommended Workflow

1. **Quick Solution** (for immediate ARM64 binary):
   ```bash
   # Try native TLS approach first
   cargo build --target aarch64-pc-windows-msvc --release --no-default-features --features native-tls-backend
   ```

2. **Full Solution** (for production):
   ```bash
   # Use comprehensive build script
   ./windows-arm64-build.sh
   ```

3. **Fallback Solution** (minimal binary):
   ```bash
   # Use minimal configuration without persistent storage
   # Temporarily disable rusqlite in Cargo.toml
   cargo build --target aarch64-pc-windows-msvc --release --no-default-features --features native-tls-backend
   ```

## Alternative Approaches

### 1. Cross-Compilation Container
Use Docker with Windows SDK for consistent cross-compilation environment.

### 2. GitHub Actions
Set up automated builds using Windows ARM64 runners.

### 3. Native Windows Development
Develop directly on Windows ARM64 hardware or VMs.

### 4. Precompiled Dependencies
Use precompiled versions of problematic dependencies when available.

## Files Modified

- `Cargo.toml`: Added feature flags and native TLS configuration
- `src/transport.rs`: Conditional TLS backend support
- `build_all_platforms.sh`: Native TLS for Windows ARM64 builds
- `.cargo/config.toml`: Cross-compilation linker configuration
- `Cross.toml`: Cross-compilation environment variables

## Additional Resources

- [xwin GitHub Repository](https://github.com/Jake-Shadle/xwin)
- [Rust Cross-Compilation Guide](https://rust-lang.github.io/rustup/cross-compilation.html)
- [Windows ARM64 Development](https://docs.microsoft.com/en-us/windows/arm/)

## Troubleshooting Tips

1. **Clean builds**: Use `cargo clean` between attempts
2. **Check target installation**: `rustup target list --installed`
3. **Verify linker**: Ensure `rust-lld` is available
4. **Environment variables**: Check MSVC environment setup
5. **Dependency conflicts**: Review `cargo tree` output for conflicting dependencies

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| TLS Libraries | ✅ Fixed | Using native-tls backend |
| SQLite | ⚠️ Partial | Requires Windows SDK or alternatives |
| Build Scripts | ✅ Updated | Multiple approaches implemented |
| Documentation | ✅ Complete | Comprehensive troubleshooting guide |

## Next Steps

1. Test Windows SDK setup script
2. Validate ARM64 binary functionality on Windows ARM devices
3. Consider automated CI/CD pipeline for cross-compilation
4. Optimize binary size and dependencies