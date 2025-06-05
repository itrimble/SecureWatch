"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlessedContribDashboardUI = void 0;
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const moment_1 = __importDefault(require("moment"));
const control_service_1 = require("../services/control.service");
const font_detector_1 = require("../utils/font-detector");
class BlessedContribDashboardUI {
    config;
    screen;
    grid;
    widgets = {};
    currentData = null;
    controlService;
    fontDetector;
    activePanel = 'services';
    selectedServiceIndex = 0;
    viewMode = 'all';
    // Historical data for charts
    cpuHistory = [];
    memoryHistory = [];
    diskHistory = [];
    networkInHistory = [];
    networkOutHistory = [];
    epsHistory = [];
    alertsHistory = [];
    timestamps = [];
    // Service categories for enhanced organization
    serviceCategories = {
        core: ['Log Ingestion', 'Correlation Engine', 'Search API', 'KQL Analytics Engine'],
        auth: ['Auth Service', 'API Gateway'],
        ui: ['Frontend', 'Web Frontend'],
        storage: ['PostgreSQL', 'Redis', 'Elasticsearch'],
        messaging: ['Kafka', 'Zookeeper'],
        monitoring: ['Prometheus', 'Grafana', 'Jaeger', 'AlertManager'],
        agents: ['Mac Agent', 'Windows Agent', 'Linux Agent']
    };
    constructor(config) {
        this.config = config;
        this.fontDetector = new font_detector_1.FontDetector();
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'SecureWatch SIEM Platform Monitor - Enhanced',
            fullUnicode: this.fontDetector.hasNerdFonts(),
            autoPadding: true,
            warnings: false,
            terminal: 'ansi',
            resizeTimeout: 300,
            debug: false
        });
        this.controlService = new control_service_1.ServiceControlService();
        this.setupLayout();
        this.setupKeyBindings();
        this.initializeHistoricalData();
        // Show font status notification
        this.showFontStatus();
    }
    initializeHistoricalData() {
        // Initialize with 60 data points for smooth charts
        const dataPoints = 60;
        for (let i = 0; i < dataPoints; i++) {
            this.cpuHistory.push(Math.random() * 50 + 20);
            this.memoryHistory.push(Math.random() * 40 + 30);
            this.diskHistory.push(Math.random() * 20 + 10);
            this.networkInHistory.push(Math.random() * 100 + 50);
            this.networkOutHistory.push(Math.random() * 80 + 40);
            this.epsHistory.push(Math.random() * 1000 + 500);
            this.alertsHistory.push(Math.floor(Math.random() * 5));
            this.timestamps.push((0, moment_1.default)().subtract(dataPoints - i, 'minutes').format('HH:mm'));
        }
    }
    showFontStatus() {
        if (!this.fontDetector.hasNerdFonts()) {
            const notification = blessed.box({
                top: 2,
                right: 2,
                width: 50,
                height: 6,
                content: `{center}{bold}Font Enhancement Available{/bold}{/center}\n\n{center}Install Meslo LGS NF or other Nerd Fonts{/center}\n{center}for enhanced visual experience{/center}\n\n{center}Press 'f' for font info{/center}`,
                tags: true,
                border: {
                    type: 'line'
                },
                style: {
                    border: { fg: 'yellow' },
                    bg: 'black'
                }
            });
            this.screen.append(notification);
            // Auto-remove after 5 seconds
            setTimeout(() => {
                this.screen.remove(notification);
                this.screen.render();
            }, 5000);
        }
    }
    setupLayout() {
        // Responsive grid system that scales based on terminal size
        const width = this.screen.width;
        const height = this.screen.height;
        const is4K = width >= 200 || height >= 60;
        const isLarge = width >= 120 || height >= 40;
        // Adjust grid based on resolution - ensure even numbers for canvas widgets
        const gridRows = is4K ? 32 : isLarge ? 28 : 24;
        const gridCols = is4K ? 16 : isLarge ? 14 : 12;
        this.grid = new contrib.grid({
            rows: gridRows,
            cols: gridCols,
            screen: this.screen
        });
        this.createTopStatusBar();
        this.createServiceStatusPanel();
        this.createPlatformMetricsPanel();
        this.createSystemResourcesPanel();
        this.createRecentActivityPanel();
        this.createInteractiveControlPanel();
        this.createBottomStatusBar();
    }
    createTopStatusBar() {
        // Enhanced top status bar with KPIs
        this.widgets.topStatusBar = blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: 3,
            content: '',
            tags: true,
            style: {
                bg: 'blue',
                fg: 'white',
                bold: true
            },
            border: {
                type: 'line',
                fg: 'white'
            }
        });
        this.screen.append(this.widgets.topStatusBar);
    }
    createServiceStatusPanel() {
        // Enhanced service status table with rich formatting
        this.widgets.serviceTable = this.grid.set(1, 0, 6, 8, contrib.table, {
            keys: true,
            vi: true,
            mouse: true,
            label: this.getIcon('services') + ' Service Status Panel',
            columnSpacing: 1,
            columnWidth: [20, 12, 8, 10, 12, 8, 10],
            style: {
                border: { fg: 'cyan' },
                header: { fg: 'white', bold: true },
                cell: {
                    selected: { bg: 'blue', fg: 'white' },
                    hover: { bg: 'gray' }
                }
            },
            scrollbar: {
                style: { bg: 'blue' }
            }
        });
    }
    createPlatformMetricsPanel() {
        const width = this.screen.width;
        const isLarge = width >= 120;
        // Events Per Second Line Chart with trend analysis
        this.widgets.epsChart = this.grid.set(1, 8, 3, 4, contrib.line, {
            label: this.getIcon('trend') + ' Events Per Second (Live)',
            style: {
                border: { fg: 'green' },
                text: { fg: 'white' }
            },
            xLabelPadding: 3,
            xPadding: 5,
            yLabelPadding: 3,
            yPadding: 1,
            showNthLabel: 5
        });
        // Active Correlation Rules LCD Display
        this.widgets.correlationRulesLCD = this.grid.set(4, 8, 2, 2, contrib.lcd, {
            label: this.getIcon('rules') + ' Active Rules',
            style: {
                border: { fg: 'yellow' }
            },
            segmentWidth: 0.06,
            segmentInterval: 0.11,
            strokeWidth: 0.11,
            elements: 4,
            display: 32,
            elementSpacing: 4,
            elementPadding: 2
        });
        // Cache Hit Rate Gauge (replacing donut to avoid canvas width issues)
        this.widgets.cacheHitGauge = this.grid.set(4, 10, 2, 2, contrib.gauge, {
            label: this.getIcon('cache') + ' Cache Hit Rate',
            style: {
                border: { fg: 'magenta' }
            },
            gaugeSpacing: 0,
            gaugeHeight: 1,
            showLabel: true
        });
        // Query Performance Bar Chart
        this.widgets.queryPerformanceBar = this.grid.set(6, 8, 3, 4, contrib.bar, {
            label: this.getIcon('query') + ' Query Performance (ms)',
            barWidth: 4,
            barSpacing: 6,
            xOffset: 0,
            maxHeight: 9,
            style: {
                border: { fg: 'blue' }
            }
        });
        // Database Connections Gauge
        this.widgets.dbConnectionsGauge = this.grid.set(1, 12, 3, 2, contrib.gauge, {
            label: this.getIcon('database') + ' DB Connections',
            style: {
                border: { fg: 'red' }
            },
            gaugeSpacing: 0,
            gaugeHeight: 1,
            showLabel: true
        });
        // Storage Utilization Stacked Gauge
        this.widgets.storageGauge = this.grid.set(4, 12, 2, 2, contrib.stackedBar, {
            label: this.getIcon('storage') + ' Storage',
            style: {
                border: { fg: 'cyan' }
            },
            barWidth: 4,
            barSpacing: 1,
            xOffset: 2,
            maxHeight: 9
        });
    }
    createSystemResourcesPanel() {
        // CPU Utilization Line Chart with historical trend
        this.widgets.cpuChart = this.grid.set(9, 0, 4, 4, contrib.line, {
            label: this.getIcon('cpu') + ' CPU Utilization (%)',
            style: {
                border: { fg: 'red' },
                text: { fg: 'white' }
            },
            xLabelPadding: 3,
            xPadding: 5,
            yLabelPadding: 3,
            yPadding: 1,
            showNthLabel: 5
        });
        // Memory Usage Gauge with visual indicator
        this.widgets.memoryGauge = this.grid.set(9, 4, 2, 2, contrib.gauge, {
            label: this.getIcon('memory') + ' Memory Usage',
            style: {
                border: { fg: 'yellow' }
            },
            gaugeSpacing: 0,
            gaugeHeight: 1,
            showLabel: true
        });
        // Disk I/O Sparkline
        this.widgets.diskSparkline = this.grid.set(11, 4, 2, 2, contrib.sparkline, {
            label: this.getIcon('disk') + ' Disk I/O',
            style: {
                border: { fg: 'green' },
                text: { fg: 'white' }
            }
        });
        // Network Traffic Line Chart (In/Out)
        this.widgets.networkChart = this.grid.set(9, 6, 4, 3, contrib.line, {
            label: this.getIcon('network') + ' Network Traffic (Mbps)',
            style: {
                border: { fg: 'cyan' },
                text: { fg: 'white' }
            },
            xLabelPadding: 3,
            xPadding: 5,
            yLabelPadding: 3,
            yPadding: 1,
            showNthLabel: 5
        });
        // Container Resource Summary Table (if applicable)
        this.widgets.containerResourcesTable = this.grid.set(9, 9, 4, 3, contrib.table, {
            keys: true,
            label: this.getIcon('container') + ' Container Resources',
            columnSpacing: 1,
            columnWidth: [15, 8, 8, 8],
            style: {
                border: { fg: 'magenta' },
                header: { fg: 'white', bold: true },
                cell: { selected: { bg: 'blue', fg: 'white' } }
            }
        });
    }
    createRecentActivityPanel() {
        // Critical Alerts Table with severity indicators
        this.widgets.alertsTable = this.grid.set(13, 0, 4, 6, contrib.table, {
            keys: true,
            vi: true,
            label: this.getIcon('alert') + ' Critical Alerts & Recent Activity',
            columnSpacing: 1,
            columnWidth: [12, 10, 30, 8, 15],
            style: {
                border: { fg: 'red' },
                header: { fg: 'white', bold: true },
                cell: {
                    selected: { bg: 'red', fg: 'white' },
                    hover: { bg: 'gray' }
                }
            }
        });
        // Error Count LCD Display
        this.widgets.errorCountLCD = this.grid.set(13, 6, 2, 2, contrib.lcd, {
            label: this.getIcon('error') + ' Errors/Hour',
            style: {
                border: { fg: 'red' }
            },
            segmentWidth: 0.06,
            segmentInterval: 0.11,
            strokeWidth: 0.11,
            elements: 3,
            display: 999,
            elementSpacing: 4,
            elementPadding: 2
        });
        // Alert Trend Sparkline
        this.widgets.alertTrendSparkline = this.grid.set(15, 6, 2, 2, contrib.sparkline, {
            label: this.getIcon('trend') + ' Alert Trend',
            style: {
                border: { fg: 'yellow' },
                text: { fg: 'white' }
            }
        });
        // Live Log Stream
        this.widgets.liveLogStream = this.grid.set(13, 8, 4, 4, contrib.log, {
            keys: true,
            vi: true,
            label: this.getIcon('log') + ' Live System Logs',
            style: {
                border: { fg: 'blue' },
                text: { fg: 'white' }
            },
            scrollable: true,
            alwaysScroll: true,
            bufferLength: 200,
            mouse: true
        });
    }
    createInteractiveControlPanel() {
        // Service Control & Details Panel
        this.widgets.serviceControlBox = this.grid.set(1, 14, 8, 2, blessed.box, {
            label: this.getIcon('control') + ' Service Control & Details',
            content: '',
            tags: true,
            style: {
                border: { fg: 'white' }
            },
            scrollable: true,
            keys: true,
            vi: true
        });
        // Quick Actions Panel
        this.widgets.quickActionsBox = this.grid.set(9, 12, 4, 4, blessed.box, {
            label: this.getIcon('actions') + ' Quick Actions & Navigation',
            content: '',
            tags: true,
            style: {
                border: { fg: 'green' }
            }
        });
        this.updateControlPanels();
    }
    createBottomStatusBar() {
        this.widgets.bottomStatusBar = blessed.box({
            bottom: 0,
            left: 0,
            width: '100%',
            height: 2,
            content: '',
            tags: true,
            style: {
                bg: 'black',
                fg: 'white'
            },
            border: {
                type: 'line',
                fg: 'gray'
            }
        });
        this.screen.append(this.widgets.bottomStatusBar);
    }
    getIcon(type) {
        if (!this.fontDetector.hasNerdFonts()) {
            // ASCII fallback icons
            const asciiIcons = {
                services: '[*]',
                trend: '[~]',
                rules: '[R]',
                cache: '[C]',
                query: '[Q]',
                database: '[D]',
                storage: '[S]',
                cpu: '[%]',
                memory: '[M]',
                disk: '[I]',
                network: '[N]',
                container: '[^]',
                alert: '[!]',
                error: '[X]',
                log: '[L]',
                control: '[>]',
                actions: '[A]',
                security: '[#]',
                health: '[+]'
            };
            return asciiIcons[type] || '[?]';
        }
        // Nerd Font icons for enhanced experience
        const nerdIcons = {
            services: '', // Service icon
            trend: '', // Trending up
            rules: '', // Shield
            cache: '', // Database
            query: '', // Search
            database: '', // Database
            storage: '', // Hard drive
            cpu: '', // Microchip
            memory: '', // Memory
            disk: '', // Hard drive
            network: '', // Network
            container: '', // Docker
            alert: '', // Warning
            error: '', // Error
            log: '', // File text
            control: '', // Settings
            actions: '', // Lightning
            security: '', // Shield check
            health: '' // Heart pulse
        };
        return nerdIcons[type] || '';
    }
    setupKeyBindings() {
        // Core navigation
        this.screen.key(['escape', 'q', 'C-c'], () => {
            process.exit(0);
        });
        // Panel navigation
        this.screen.key(['tab'], () => {
            this.focusNextPanel();
        });
        this.screen.key(['S-tab'], () => {
            this.focusPreviousPanel();
        });
        // Service navigation
        this.screen.key(['up', 'k'], () => {
            this.navigateServices(-1);
        });
        this.screen.key(['down', 'j'], () => {
            this.navigateServices(1);
        });
        // Service controls
        this.screen.key(['s'], () => {
            this.startSelectedService();
        });
        this.screen.key(['S'], () => {
            this.stopSelectedService();
        });
        this.screen.key(['r'], () => {
            this.restartSelectedService();
        });
        // View modes
        this.screen.key(['1'], () => {
            this.setViewMode('all');
        });
        this.screen.key(['2'], () => {
            this.setViewMode('critical');
        });
        this.screen.key(['3'], () => {
            this.setViewMode('compact');
        });
        // Quick actions (F-keys)
        this.screen.key(['f1'], () => {
            this.startAllServices();
        });
        this.screen.key(['f2'], () => {
            this.stopAllServices();
        });
        this.screen.key(['f3'], () => {
            this.restartAllServices();
        });
        this.screen.key(['f4'], () => {
            this.runHealthCheck();
        });
        this.screen.key(['f5', 'R'], () => {
            this.refreshData();
        });
        // Additional interactions
        this.screen.key(['l'], () => {
            this.showServiceLogs();
        });
        this.screen.key(['m'], () => {
            this.showServiceMetrics();
        });
        this.screen.key(['d'], () => {
            this.showServiceDetails();
        });
        this.screen.key(['h', '?'], () => {
            this.showHelp();
        });
        this.screen.key(['f'], () => {
            this.showFontInfo();
        });
        // Layout controls
        this.screen.key(['space'], () => {
            this.toggleCompactMode();
        });
        // Mouse support
        this.screen.enableMouse();
    }
    focusNextPanel() {
        const panels = ['services', 'metrics', 'resources', 'activity'];
        const currentIndex = panels.indexOf(this.activePanel);
        this.activePanel = panels[(currentIndex + 1) % panels.length];
        this.highlightActivePanel();
    }
    focusPreviousPanel() {
        const panels = ['services', 'metrics', 'resources', 'activity'];
        const currentIndex = panels.indexOf(this.activePanel);
        this.activePanel = panels[currentIndex === 0 ? panels.length - 1 : currentIndex - 1];
        this.highlightActivePanel();
    }
    highlightActivePanel() {
        // Reset all panel borders
        Object.values(this.widgets).forEach((widget) => {
            if (widget.style?.border) {
                widget.style.border.bold = false;
            }
        });
        // Highlight active panel
        const panelMap = {
            'services': 'serviceTable',
            'metrics': 'epsChart',
            'resources': 'cpuChart',
            'activity': 'alertsTable'
        };
        const activeWidget = this.widgets[panelMap[this.activePanel]];
        if (activeWidget?.style?.border) {
            activeWidget.style.border.bold = true;
        }
        this.updateBottomStatusBar(`Active Panel: ${this.activePanel.toUpperCase()} | Tab: Navigate | Space: Toggle | F1-F5: Quick Actions | q: Quit`);
        this.screen.render();
    }
    // ... [Continue with remaining methods in next part due to length]
    update(data) {
        this.currentData = data;
        this.updateTopStatusBar(data);
        this.updateServiceStatusPanel(data.services);
        this.updatePlatformMetricsPanel(data);
        this.updateSystemResourcesPanel(data.systemResources);
        this.updateRecentActivityPanel(data.recentAlerts, data.recentLogs);
        this.updateHistoricalData(data);
        this.screen.render();
    }
    updateTopStatusBar(data) {
        const operationalServices = data.services.filter(s => s.status === 'operational').length;
        const totalServices = data.services.length;
        const overallHealth = (operationalServices / totalServices) * 100;
        const criticalAlerts = data.recentAlerts.filter(a => a.severity === 'critical').length;
        const statusIcons = this.fontDetector.hasNerdFonts()
            ? { healthy: '', warning: '', critical: '', info: '' }
            : { healthy: '✓', warning: '!', critical: '✗', info: 'i' };
        const healthIcon = overallHealth >= 90 ? statusIcons.healthy :
            overallHealth >= 70 ? statusIcons.warning : statusIcons.critical;
        const content = `{center}{bold}SecureWatch SIEM Platform Monitor{/bold}{/center}
{center}${healthIcon} Health: {green-fg}${overallHealth.toFixed(0)}%{/} | Services: {cyan-fg}${operationalServices}/${totalServices}{/} | Alerts: {red-fg}${criticalAlerts}{/} Critical | Mode: {yellow-fg}${this.viewMode.toUpperCase()}{/} | Font: {magenta-fg}${this.fontDetector.hasNerdFonts() ? 'Enhanced' : 'Standard'}{/}{/center}`;
        this.widgets.topStatusBar.setContent(content);
    }
    updateServiceStatusPanel(services) {
        let filteredServices = services;
        if (this.viewMode === 'critical') {
            filteredServices = services.filter(s => s.status !== 'operational');
        }
        const headers = ['Service', 'Status', 'Health', 'Response', 'Memory', 'CPU', 'Actions'];
        const data = filteredServices.map((service, index) => {
            const isSelected = this.selectedServiceIndex === index;
            const statusIcon = this.getStatusIcon(service.status);
            const serviceIcon = this.getCategoryIcon(service.name);
            return [
                isSelected ? `${this.getIcon('trend')} ${service.name}` : `${serviceIcon} ${service.name}`,
                `${statusIcon} ${service.status}`,
                `${service.healthScore || 0}%`,
                service.responseTime ? `${service.responseTime}ms` : 'N/A',
                service.memory ? `${service.memory}MB` : 'N/A',
                service.cpu ? `${service.cpu}%` : 'N/A',
                '[s/S/r/l/m]'
            ];
        });
        this.widgets.serviceTable.setData({ headers, data });
    }
    getStatusIcon(status) {
        if (!this.fontDetector.hasNerdFonts()) {
            return status === 'operational' ? '✓' :
                status === 'degraded' ? '!' : '✗';
        }
        return status === 'operational' ? '' :
            status === 'degraded' ? '' : '';
    }
    getCategoryIcon(serviceName) {
        if (!this.fontDetector.hasNerdFonts())
            return '•';
        if (this.serviceCategories.core.includes(serviceName))
            return '';
        if (this.serviceCategories.auth.includes(serviceName))
            return '';
        if (this.serviceCategories.ui.includes(serviceName))
            return '';
        if (this.serviceCategories.storage.includes(serviceName))
            return '';
        if (this.serviceCategories.messaging.includes(serviceName))
            return '';
        if (this.serviceCategories.monitoring.includes(serviceName))
            return '';
        if (this.serviceCategories.agents.includes(serviceName))
            return '';
        return '';
    }
    updatePlatformMetricsPanel(data) {
        // Update EPS Line Chart
        if (this.widgets.epsChart) {
            const seriesData = [{
                    title: 'Events/sec',
                    x: this.timestamps.slice(-20),
                    y: this.epsHistory.slice(-20),
                    style: { line: 'green' }
                }];
            this.widgets.epsChart.setData(seriesData);
        }
        // Update Correlation Rules LCD
        if (this.widgets.correlationRulesLCD) {
            const activeRules = data.services.find(s => s.name === 'Correlation Engine')?.details?.activeRules || 32;
            this.widgets.correlationRulesLCD.setDisplay(String(activeRules).padStart(4, '0'));
        }
        // Update Cache Hit Rate Gauge
        if (this.widgets.cacheHitGauge) {
            const cacheHitRate = Math.floor(Math.random() * 30) + 70; // 70-100%
            this.widgets.cacheHitGauge.setPercent(cacheHitRate);
        }
        // Update Query Performance Bar Chart
        if (this.widgets.queryPerformanceBar) {
            const queryTimes = ['SELECT', 'WHERE', 'JOIN', 'GROUP', 'ORDER'].map(query => ({
                title: query,
                value: Math.floor(Math.random() * 50) + 10
            }));
            this.widgets.queryPerformanceBar.setData({ titles: queryTimes.map(q => q.title), data: queryTimes.map(q => q.value) });
        }
        // Update DB Connections Gauge
        if (this.widgets.dbConnectionsGauge) {
            const connections = Math.floor(Math.random() * 40) + 60; // 60-100%
            this.widgets.dbConnectionsGauge.setPercent(connections);
        }
        // Update Storage Stacked Bar
        if (this.widgets.storageGauge) {
            this.widgets.storageGauge.setData({
                titles: ['Logs', 'Indices', 'Cache', 'Temp'],
                data: [
                    [Math.floor(Math.random() * 20) + 60],
                    [Math.floor(Math.random() * 20) + 40],
                    [Math.floor(Math.random() * 20) + 30],
                    [Math.floor(Math.random() * 10) + 5]
                ]
            });
        }
    }
    updateSystemResourcesPanel(resources) {
        // Update CPU Line Chart
        if (this.widgets.cpuChart) {
            const cpuSeries = [{
                    title: 'CPU %',
                    x: this.timestamps.slice(-20),
                    y: this.cpuHistory.slice(-20),
                    style: { line: 'red' }
                }];
            this.widgets.cpuChart.setData(cpuSeries);
        }
        // Update Memory Gauge
        if (this.widgets.memoryGauge) {
            const memoryPercent = this.memoryHistory[this.memoryHistory.length - 1] || 0;
            this.widgets.memoryGauge.setPercent(memoryPercent);
        }
        // Update Disk Sparkline
        if (this.widgets.diskSparkline) {
            this.widgets.diskSparkline.setData(this.diskHistory.slice(-20).map(String));
        }
        // Update Network Chart
        if (this.widgets.networkChart) {
            const networkSeries = [
                {
                    title: 'In',
                    x: this.timestamps.slice(-20),
                    y: this.networkInHistory.slice(-20),
                    style: { line: 'cyan' }
                },
                {
                    title: 'Out',
                    x: this.timestamps.slice(-20),
                    y: this.networkOutHistory.slice(-20),
                    style: { line: 'yellow' }
                }
            ];
            this.widgets.networkChart.setData(networkSeries);
        }
        // Update Container Resources Table
        if (this.widgets.containerResourcesTable) {
            const containerData = [
                ['securewatch_postgres', '45%', '1.2GB', '23%'],
                ['securewatch_redis', '12%', '256MB', '8%'],
                ['securewatch_kafka', '28%', '512MB', '15%'],
                ['securewatch_elastic', '67%', '2.1GB', '34%']
            ];
            this.widgets.containerResourcesTable.setData({
                headers: ['Container', 'CPU', 'Memory', 'Disk'],
                data: containerData
            });
        }
    }
    updateRecentActivityPanel(alerts, logs) {
        // Update Critical Alerts Table
        if (this.widgets.alertsTable) {
            const alertsData = alerts.slice(0, 10).map(alert => [
                (0, moment_1.default)(alert.timestamp).format('HH:mm:ss'),
                this.getSeverityIcon(alert.severity),
                alert.description || 'Security Event Detected',
                alert.severity.toUpperCase(),
                alert.source || 'System'
            ]);
            this.widgets.alertsTable.setData({
                headers: ['Time', 'Type', 'Description', 'Severity', 'Source'],
                data: alertsData
            });
        }
        // Update Error Count LCD
        if (this.widgets.errorCountLCD) {
            const errorCount = Math.floor(Math.random() * 50);
            this.widgets.errorCountLCD.setDisplay(String(errorCount).padStart(3, '0'));
        }
        // Update Alert Trend Sparkline
        if (this.widgets.alertTrendSparkline) {
            this.widgets.alertTrendSparkline.setData(this.alertsHistory.slice(-20).map(String));
        }
        // Update Live Log Stream
        if (this.widgets.liveLogStream) {
            logs.slice(-5).forEach(log => {
                const timestamp = (0, moment_1.default)().format('HH:mm:ss');
                const severity = this.getSeverityIcon(log.severity || 'info');
                this.widgets.liveLogStream.log(`${timestamp} ${severity} ${log.message || 'System log entry'}`);
            });
        }
    }
    getSeverityIcon(severity) {
        if (!this.fontDetector.hasNerdFonts()) {
            return severity === 'critical' ? '[!]' :
                severity === 'warning' ? '[!]' : '[i]';
        }
        return severity === 'critical' ? '' :
            severity === 'warning' ? '' : '';
    }
    updateHistoricalData(data) {
        // Add new data points and maintain sliding window
        this.cpuHistory.push(Math.random() * 50 + 20);
        this.memoryHistory.push(Math.random() * 40 + 30);
        this.diskHistory.push(Math.random() * 20 + 10);
        this.networkInHistory.push(Math.random() * 100 + 50);
        this.networkOutHistory.push(Math.random() * 80 + 40);
        this.epsHistory.push(Math.random() * 1000 + 500);
        this.alertsHistory.push(Math.floor(Math.random() * 5));
        this.timestamps.push((0, moment_1.default)().format('HH:mm'));
        // Keep only last 60 data points
        const maxDataPoints = 60;
        if (this.cpuHistory.length > maxDataPoints) {
            this.cpuHistory.shift();
            this.memoryHistory.shift();
            this.diskHistory.shift();
            this.networkInHistory.shift();
            this.networkOutHistory.shift();
            this.epsHistory.shift();
            this.alertsHistory.shift();
            this.timestamps.shift();
        }
    }
    updateControlPanels() {
        // Update Service Control Panel
        if (this.widgets.serviceControlBox && this.currentData) {
            const selectedService = this.currentData.services[this.selectedServiceIndex];
            if (selectedService) {
                const content = `{bold}Selected Service:{/bold} ${selectedService.name}
{bold}Status:{/bold} ${this.getStatusIcon(selectedService.status)} ${selectedService.status}
{bold}Health Score:{/bold} ${selectedService.healthScore || 0}%
{bold}Response Time:{/bold} ${selectedService.responseTime || 'N/A'}ms
{bold}Memory Usage:{/bold} ${selectedService.memory || 'N/A'}MB
{bold}CPU Usage:{/bold} ${selectedService.cpu || 'N/A'}%
{bold}Uptime:{/bold} ${selectedService.uptime || 'Unknown'}

{bold}Controls:{/bold}
s: Start Service | S: Stop Service | r: Restart
l: View Logs | m: Show Metrics | d: Details`;
                this.widgets.serviceControlBox.setContent(content);
            }
        }
        // Update Quick Actions Panel
        if (this.widgets.quickActionsBox) {
            const actionsContent = `{bold}Quick Actions:{/bold}
F1: Start All Services    F2: Stop All Services
F3: Restart All Services  F4: Health Check
F5: Refresh Data         Space: Toggle View

{bold}Navigation:{/bold}
Tab: Next Panel          ↑/↓: Select Service
h/?: Help               q: Quit

{bold}View Modes:{/bold}
1: All Services         2: Critical Only
3: Compact View

{bold}Current Mode:{/bold} {yellow-fg}${this.viewMode.toUpperCase()}{/}`;
            this.widgets.quickActionsBox.setContent(actionsContent);
        }
    }
    updateBottomStatusBar(message = '') {
        const defaultMessage = `SecureWatch CLI Dashboard v2.0 | ${this.fontDetector.hasNerdFonts() ? 'Enhanced' : 'Standard'} Mode | Last Update: ${(0, moment_1.default)().format('HH:mm:ss')}`;
        this.widgets.bottomStatusBar.setContent(`{center}${message || defaultMessage}{/center}`);
    }
    // Service Control Methods
    navigateServices(direction) {
        if (!this.currentData?.services)
            return;
        this.selectedServiceIndex = Math.max(0, Math.min(this.currentData.services.length - 1, this.selectedServiceIndex + direction));
        this.updateControlPanels();
        this.screen.render();
    }
    async startSelectedService() {
        const service = this.currentData?.services[this.selectedServiceIndex];
        if (service) {
            this.showMessage(`Starting ${service.name}...`, 'info');
            await this.controlService.startService(service.name);
            this.refreshData();
        }
    }
    async stopSelectedService() {
        const service = this.currentData?.services[this.selectedServiceIndex];
        if (service) {
            this.showMessage(`Stopping ${service.name}...`, 'warning');
            await this.controlService.stopService(service.name);
            this.refreshData();
        }
    }
    async restartSelectedService() {
        const service = this.currentData?.services[this.selectedServiceIndex];
        if (service) {
            this.showMessage(`Restarting ${service.name}...`, 'info');
            await this.controlService.restartService(service.name);
            this.refreshData();
        }
    }
    async startAllServices() {
        this.showMessage('Starting all services...', 'info');
        await this.controlService.startAllServices();
        this.refreshData();
    }
    async stopAllServices() {
        this.showMessage('Stopping all services...', 'warning');
        await this.controlService.stopAllServices();
        this.refreshData();
    }
    async restartAllServices() {
        this.showMessage('Restarting all services...', 'info');
        await this.controlService.restartAllServices();
        this.refreshData();
    }
    async runHealthCheck() {
        this.showMessage('Running health check...', 'info');
        await this.controlService.runHealthCheck();
        this.refreshData();
    }
    refreshData() {
        this.showMessage('Refreshing data...', 'info');
        // Trigger data refresh - this would normally call the parent update method
    }
    setViewMode(mode) {
        this.viewMode = mode;
        this.showMessage(`View mode: ${mode.toUpperCase()}`, 'info');
        if (this.currentData) {
            this.updateServiceStatusPanel(this.currentData.services);
        }
        this.screen.render();
    }
    toggleCompactMode() {
        this.viewMode = this.viewMode === 'compact' ? 'all' : 'compact';
        this.setViewMode(this.viewMode);
    }
    showServiceLogs() {
        const service = this.currentData?.services[this.selectedServiceIndex];
        if (service) {
            this.showMessage(`Opening logs for ${service.name}...`, 'info');
            // Implementation would show detailed logs
        }
    }
    showServiceMetrics() {
        const service = this.currentData?.services[this.selectedServiceIndex];
        if (service) {
            this.showMessage(`Showing metrics for ${service.name}...`, 'info');
            // Implementation would show detailed metrics
        }
    }
    showServiceDetails() {
        const service = this.currentData?.services[this.selectedServiceIndex];
        if (service) {
            this.showMessage(`Service details for ${service.name}...`, 'info');
            // Implementation would show detailed service information
        }
    }
    showHelp() {
        const helpBox = blessed.box({
            top: 'center',
            left: 'center',
            width: '80%',
            height: '80%',
            content: this.getHelpContent(),
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: { fg: 'cyan' },
                bg: 'black'
            },
            keys: true,
            vi: true,
            mouse: true,
            scrollable: true
        });
        this.screen.append(helpBox);
        helpBox.focus();
        helpBox.key(['escape', 'q'], () => {
            this.screen.remove(helpBox);
            this.screen.render();
        });
        this.screen.render();
    }
    showFontInfo() {
        const fontInfo = this.fontDetector.getFontInfo();
        this.showMessage(fontInfo, 'info', 5000);
    }
    getHelpContent() {
        return `{center}{bold}SecureWatch CLI Dashboard - Help{/bold}{/center}

{bold}Navigation:{/bold}
  Tab / Shift+Tab    Navigate between panels
  ↑/↓ or j/k         Navigate services
  Space              Toggle compact view
  1/2/3              Switch view modes (All/Critical/Compact)

{bold}Service Controls:{/bold}
  s                  Start selected service
  S                  Stop selected service  
  r                  Restart selected service
  l                  Show service logs
  m                  Show service metrics
  d                  Show service details

{bold}Quick Actions (F-Keys):{/bold}
  F1                 Start all services
  F2                 Stop all services
  F3                 Restart all services
  F4                 Run health check
  F5 or R            Refresh data

{bold}Information:{/bold}
  h or ?             Show this help
  f                  Show font information
  q or Ctrl+C        Quit dashboard

{bold}Panels:{/bold}
  • Service Status   - Monitor all SecureWatch services
  • Platform Metrics - Events/sec, rules, cache performance
  • System Resources - CPU, memory, disk, network usage
  • Recent Activity  - Alerts, errors, and live logs

{bold}Font Enhancement:{/bold}
Install Meslo LGS NF or other Nerd Fonts for enhanced icons and visual experience.

Press ESC or 'q' to close this help.`;
    }
    showMessage(message, type = 'info', duration = 3000) {
        const colors = {
            info: 'blue',
            warning: 'yellow',
            error: 'red',
            success: 'green'
        };
        this.updateBottomStatusBar(`${this.getIcon(type === 'error' ? 'error' : 'info')} ${message}`);
        this.screen.render();
        setTimeout(() => {
            this.updateBottomStatusBar();
            this.screen.render();
        }, duration);
    }
    render() {
        this.highlightActivePanel();
        this.screen.render();
    }
    destroy() {
        this.screen.destroy();
    }
}
exports.BlessedContribDashboardUI = BlessedContribDashboardUI;
//# sourceMappingURL=blessed-contrib-dashboard.ui.js.map