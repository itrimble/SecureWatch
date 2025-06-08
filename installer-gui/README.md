# SecureWatch Agent GUI Installer

Professional cross-platform GUI installer for SecureWatch Agent, inspired by enterprise installer design patterns (Splunk, etc.).

## Features

- **Professional UI Design**: Multi-step wizard interface matching enterprise software standards
- **Cross-Platform**: Supports macOS (DMG/App) and Windows (MSI/EXE) 
- **Real-time Progress**: Live installation progress with detailed status updates
- **Configuration Management**: Interactive configuration of agent settings
- **Service Integration**: Automatic system service installation and management
- **Error Handling**: Comprehensive error reporting and recovery options
- **System Requirements**: Automated system compatibility checking

## Architecture

### Frontend (React + TypeScript)
- **React 18**: Modern component-based UI framework
- **TypeScript**: Type-safe development with excellent IDE support
- **Vite**: Fast build tool and development server
- **Lucide React**: Professional icon library
- **CSS3**: Custom styling matching Splunk installer aesthetic

### Backend (Rust + Tauri)
- **Tauri 2.0**: Secure native app framework with web frontend
- **Tokio**: Async runtime for non-blocking operations
- **Cross-platform APIs**: File system, process management, system info
- **Secure Communication**: Type-safe frontend-backend messaging

## Installation Steps

1. **Welcome**: System requirements validation and introduction
2. **License Agreement**: Legal terms acceptance with full license text
3. **Configuration**: Installation path, server endpoint, and service options
4. **Installation**: Real-time progress with detailed status updates
5. **Complete**: Success confirmation and next steps guidance

## Build Requirements

### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **Node.js 18+**: For UI build process
- **Rust 1.70+**: For Tauri backend compilation
- **Admin Privileges**: For system-wide installation capabilities

### Windows
- **Visual Studio Build Tools**: MSVC compiler for Rust
- **Node.js 18+**: For UI build process  
- **Rust 1.70+**: For Tauri backend compilation
- **WebView2**: Modern web engine (auto-installed on Windows 11)

## Building

```bash
# Install dependencies and build
cd installer-gui
./build-installer.sh

# Output artifacts in dist/
# macOS: .dmg and .app files
# Windows: .msi and .exe files
```

## Development

```bash
# Start development server
cd ui
npm install
npm run dev

# In another terminal, start Tauri dev mode
cd ../
cargo tauri dev
```

## Professional Design Elements

The installer UI incorporates enterprise software design patterns:

- **Left Navigation Sidebar**: Step progress with visual indicators
- **Professional Color Scheme**: Blue gradient header with clean white content
- **Typography**: System fonts with proper hierarchy and spacing
- **Form Controls**: Consistent styling across all input elements
- **Progress Indicators**: Real-time progress bars and status messages
- **Error Handling**: Clear error states with recovery options
- **Responsive Layout**: Adapts to different screen sizes and orientations

## Security Features

- **Signed Binaries**: Code signing for trusted installation (requires certificates)
- **Privilege Escalation**: Proper admin privilege handling per platform
- **Secure Defaults**: Safe configuration defaults and validation
- **Input Sanitization**: All user inputs validated and sanitized
- **Audit Trail**: Installation actions logged for compliance

## Distribution

The built installers can be distributed via:

- **Direct Download**: Host DMG/MSI files on web server
- **Package Managers**: Homebrew (macOS), Chocolatey (Windows)
- **Enterprise Deployment**: Group Policy (Windows), Munki (macOS)
- **Cloud Storage**: S3, Azure Blob, Google Cloud Storage

## Maintenance

- **Auto-Updates**: Framework ready for update checking (optional)
- **Telemetry**: Usage analytics collection (opt-in)
- **Error Reporting**: Crash dump collection for debugging
- **Remote Configuration**: Dynamic configuration updates