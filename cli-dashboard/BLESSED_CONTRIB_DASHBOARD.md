# SecureWatch CLI Dashboard - Blessed-Contrib Edition

## Overview

The **Blessed-Contrib CLI Dashboard** is a sophisticated terminal-based monitoring interface for the SecureWatch SIEM platform. Built with `blessed-contrib`, it provides enterprise-grade visualization with rich widgets, responsive layouts, and Nerd Font support for an enhanced visual experience.

## Features

### 🎨 Rich Visual Components
- **Line Charts**: Real-time CPU, network traffic, and events per second trends
- **Gauges**: Memory usage, database connections, and cache hit rates
- **Sparklines**: Disk I/O and alert trend indicators
- **Bar Charts**: Query performance metrics
- **LCD Displays**: Active correlation rules and error counts
- **Donut Charts**: Cache hit/miss ratios
- **Tables**: Service status, alerts, and container resources
- **Log Stream**: Live system logs with scrolling

### 🔤 Font Enhancement
- **Nerd Font Support**: Rich Unicode icons and enhanced box-drawing characters
- **Graceful Fallback**: ASCII alternatives when Nerd Fonts are not available
- **Auto-Detection**: Automatic font capability detection with user notifications
- **Recommended Fonts**: Meslo LGS NF, JetBrains Mono Nerd Font, Fira Code Nerd Font

### 📐 Responsive Design
- **Multi-Resolution Support**: Optimized layouts for 1080p to 4K displays
- **Adaptive Grid System**: Dynamic column/row adjustments based on terminal size
- **Scalable Content**: Information density adapts to available screen real estate
- **Terminal Compatibility**: Works with any ANSI-compatible terminal

### 🎯 Interactive Controls
- **Panel Navigation**: Tab/Shift+Tab for panel switching
- **Service Control**: Start, stop, restart services directly from the dashboard
- **View Modes**: All services, critical only, or compact views
- **Help System**: Built-in interactive help with key bindings
- **Real-time Updates**: Configurable refresh intervals

## Installation & Setup

### Prerequisites
1. **Node.js 18+** with npm/pnpm
2. **Terminal with Unicode support**
3. **Recommended: Nerd Fonts** for enhanced experience

### Quick Start
```bash
# From SecureWatch root directory
./cli-dashboard.sh blessed-contrib

# Or directly with options
./cli-dashboard.sh bc --refresh 3
```

### Font Installation (Recommended)

#### macOS
```bash
# Install Meslo LGS NF (recommended)
brew tap homebrew/cask-fonts
brew install --cask font-meslo-lg-nerd-font

# Or download manually from:
# https://github.com/ryanoasis/nerd-fonts/releases/download/v3.0.2/Meslo.zip
```

#### Linux
```bash
# Ubuntu/Debian
wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.0.2/Meslo.zip
unzip Meslo.zip -d ~/.local/share/fonts/
fc-cache -fv

# Set terminal font to "MesloLGS NF"
```

#### Windows
1. Download Nerd Fonts from: https://www.nerdfonts.com/font-downloads
2. Install MesloLGS NF or similar
3. Configure Windows Terminal or WSL terminal to use the font

### Terminal Configuration
Ensure your terminal supports:
- **Unicode/UTF-8 encoding**
- **256-color support** (preferred)
- **Mouse input** (optional, for click interactions)
- **Resizing events** (for responsive layout)

## Dashboard Panels

### 1. Service Status Panel
**Location**: Top-left quadrant  
**Widget Type**: Enhanced Table  
**Features**:
- ✅ Real-time service health indicators
- 🔄 Status icons (operational, degraded, error)  
- 📊 Performance metrics (CPU, memory, response time)
- 🎯 Service categorization with icons
- 🔧 Direct service control integration

**Displayed Information**:
- Service name with category icon
- Status with colored indicators
- Health score percentage
- Response time in milliseconds  
- Memory usage in MB
- CPU usage percentage
- Available actions (start/stop/restart/logs/metrics)

### 2. Platform Metrics Panel
**Location**: Top-right and center areas  
**Widget Types**: Line Charts, LCD, Donut, Bar Charts, Gauges

#### Events Per Second Line Chart
- Real-time event ingestion trends
- 20-point sliding window
- Color-coded performance levels

#### Active Correlation Rules (LCD)
- 4-digit LED-style display
- Current count of active rules
- Updates from Correlation Engine

#### Cache Hit Rate (Donut Chart)
- Visual percentage representation
- Hit vs. Miss breakdown
- Performance color coding

#### Query Performance (Bar Chart)
- SQL query type performance
- SELECT, WHERE, JOIN, GROUP, ORDER operations
- Response time in milliseconds

#### Database Connections (Gauge)
- Connection pool utilization
- Real-time capacity monitoring
- Warning thresholds

#### Storage Utilization (Stacked Bar)
- Logs, Indices, Cache, Temp storage
- Multi-category visualization
- Capacity planning indicators

### 3. System Resources Panel
**Location**: Lower-left quadrant  
**Widget Types**: Line Charts, Gauges, Sparklines

#### CPU Utilization Line Chart
- Historical CPU usage trends
- 20-point sliding window
- Performance threshold indicators

#### Memory Usage Gauge
- Real-time memory consumption
- Visual percentage indicator
- Color-coded warning levels

#### Disk I/O Sparkline
- Compact trend visualization
- Read/write activity patterns
- Performance spike detection

#### Network Traffic Line Chart
- Inbound/outbound traffic
- Dual-series visualization
- Bandwidth utilization trends

#### Container Resources Table
- Docker container statistics
- CPU, Memory, Disk per container
- Resource allocation monitoring

### 4. Recent Activity Panel  
**Location**: Bottom section  
**Widget Types**: Tables, LCD, Sparklines, Log Stream

#### Critical Alerts Table
- Last 10 critical security alerts
- Timestamp, severity, description
- Color-coded severity indicators
- Source system identification

#### Error Count LCD
- Hourly error accumulation
- 3-digit LED-style display
- Threshold-based alerting

#### Alert Trend Sparkline
- Compact alert frequency trends
- Pattern recognition indicators
- Anomaly detection visual cues

#### Live Log Stream
- Real-time system log feed
- Scrollable log history (200 lines)
- Severity-based color coding
- Automatic log rotation

### 5. Interactive Control Panel
**Location**: Right side  
**Widget Type**: Rich Text Boxes

#### Service Control & Details
- Selected service information
- Real-time status updates
- Control action buttons
- Performance metrics display

#### Quick Actions & Navigation
- F-key shortcuts reference
- Navigation instructions
- View mode controls
- Help system access

## Key Bindings & Controls

### Navigation
| Key | Action |
|-----|--------|
| `Tab` | Focus next panel |
| `Shift+Tab` | Focus previous panel |
| `↑/↓` or `j/k` | Navigate services |
| `Space` | Toggle compact mode |
| `1/2/3` | Switch view modes |

### Service Controls
| Key | Action |
|-----|--------|
| `s` | Start selected service |
| `S` | Stop selected service |
| `r` | Restart selected service |
| `l` | Show service logs |
| `m` | Show service metrics |
| `d` | Show service details |

### Quick Actions (F-Keys)
| Key | Action |
|-----|--------|
| `F1` | Start all services |
| `F2` | Stop all services |
| `F3` | Restart all services |
| `F4` | Run health check |
| `F5` | Refresh data |

### Information & Help
| Key | Action |
|-----|--------|
| `h` or `?` | Show help dialog |
| `f` | Show font information |
| `q` or `Ctrl+C` | Quit dashboard |

## Usage Examples

### Basic Launch
```bash
# Start with default settings (5-second refresh)
./cli-dashboard.sh blessed-contrib
```

### Custom Refresh Rate
```bash
# Update every 2 seconds for high-frequency monitoring
./cli-dashboard.sh bc --refresh 2
```

### Direct Node.js Execution
```bash
# From cli-dashboard directory
npm run build
node dist/index.js blessed-contrib --refresh 10
```

### Integration with Scripts
```bash
#!/bin/bash
# Auto-launch monitoring dashboard
cd /path/to/SecureWatch
./cli-dashboard.sh blessed-contrib --refresh 5 &
DASHBOARD_PID=$!

# Run monitoring session
sleep 300  # Monitor for 5 minutes

# Cleanup
kill $DASHBOARD_PID
```

## Troubleshooting

### Font Issues
**Problem**: Broken characters or incorrect symbols  
**Solution**:
1. Install a Nerd Font (see Installation section)
2. Configure terminal to use the Nerd Font
3. Verify with: `./cli-dashboard.sh bc` then press `f` for font info

### Terminal Compatibility
**Problem**: Layout issues or rendering problems  
**Solution**:
1. Ensure terminal supports ANSI escape sequences
2. Set `TERM=xterm-256color` for best compatibility
3. Use terminal size ≥ 80x24 characters

### Performance Issues
**Problem**: High CPU usage or slow updates  
**Solution**:
1. Increase refresh interval: `--refresh 10`
2. Use compact view mode (press `3`)
3. Close other terminal applications

### Data Connection Issues
**Problem**: No data or connection errors  
**Solution**:
1. Verify SecureWatch services are running
2. Check network connectivity to APIs
3. Review service logs for authentication issues

## Architecture & Technical Details

### Widget Architecture
- **blessed-contrib**: Rich terminal widget library
- **blessed**: Core terminal interface framework
- **Grid Layout System**: Responsive 12-16 column grid
- **Event-Driven Updates**: Real-time data binding
- **Memory Management**: Automatic cleanup and garbage collection

### Data Flow
1. **Data Service**: Collects metrics from SecureWatch APIs
2. **UI Manager**: Processes data for widget consumption
3. **Widget Renderers**: Update individual components
4. **Screen Manager**: Orchestrates full-screen updates
5. **Input Handler**: Manages keyboard/mouse interactions

### Performance Optimizations
- **Sliding Window Data**: Maintains only recent historical data
- **Selective Updates**: Only redraws changed widgets
- **Throttled Rendering**: Prevents excessive screen updates
- **Memory Pooling**: Reuses data structures for efficiency

### Responsive Design Logic
```typescript
// Terminal size detection and grid adjustment
const { width, height } = this.screen;
const is4K = width >= 200 || height >= 60;
const isLarge = width >= 120 || height >= 40;

// Dynamic grid sizing
const gridRows = is4K ? 32 : isLarge ? 28 : 24;
const gridCols = is4K ? 16 : isLarge ? 14 : 12;
```

## Customization

### Color Schemes
Modify widget colors in `blessed-contrib-dashboard.ui.ts`:
```typescript
style: {
  border: { fg: 'cyan' },     // Border color
  text: { fg: 'white' },      // Text color
  bg: 'black'                 // Background color
}
```

### Refresh Intervals
Adjust update frequencies:
```typescript
// Fast updates for critical systems
config.refreshInterval = 1000;  // 1 second

// Standard monitoring
config.refreshInterval = 5000;  // 5 seconds

// Low-impact monitoring  
config.refreshInterval = 30000; // 30 seconds
```

### Widget Layout Modifications
Customize grid positions in `createPlatformMetricsPanel()`:
```typescript
// Move widget to different grid position
this.widgets.epsChart = this.grid.set(row, col, height, width, contrib.line, options);
```

## Integration with SecureWatch

### API Endpoints
The dashboard connects to these SecureWatch APIs:
- **Health Checks**: `GET /health` on each service port
- **Metrics**: `GET /metrics` for performance data
- **Logs**: `GET /logs` for recent log entries
- **Control**: `POST /control` for service management

### Service Discovery
Automatic detection of:
- **Microservices**: Node.js services on configured ports
- **Docker Services**: Container status via Docker API
- **System Resources**: OS-level metrics via system calls

### Security Considerations
- **Read-Only Access**: Dashboard uses read-only API endpoints
- **Local Network**: Designed for local/internal network access
- **No Credential Storage**: Relies on network-level security
- **Audit Logging**: All control actions are logged

## Future Enhancements

### Planned Features
- **Custom Dashboards**: User-configurable panel layouts
- **Alert Management**: Interactive alert acknowledgment
- **Historical Analytics**: Extended time-series analysis
- **Export Capabilities**: Dashboard snapshots and reports
- **Plugin System**: Custom widget development framework

### Integration Roadmap
- **SIEM Correlation**: Direct integration with correlation engine
- **Threat Intelligence**: Real-time threat feed visualization
- **Compliance Reporting**: Automated compliance dashboard views
- **Mobile Companion**: Lightweight mobile dashboard version

---

**Support**: For issues or questions, refer to the main SecureWatch documentation or contact the development team.

**Version**: 2.0.0 - Blessed-Contrib Enhanced Edition  
**Last Updated**: June 2025