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
exports.EnhancedDashboardUI = void 0;
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const moment_1 = __importDefault(require("moment"));
const control_service_1 = require("../services/control.service");
class EnhancedDashboardUI {
    config;
    screen;
    grid;
    widgets = {};
    currentData = null;
    controlService;
    panelStates = new Map();
    activePanel = 'microservices';
    selectedServiceIndex = 0;
    // Service categories for organization
    serviceCategories = {
        microservices: [
            'Frontend', 'Search API', 'Log Ingestion',
            'Correlation Engine', 'Analytics Engine', 'Auth Service',
            'API Gateway'
        ],
        infrastructure: [
            'PostgreSQL', 'Redis', 'Kafka', 'Zookeeper',
            'Elasticsearch', 'Kibana'
        ],
        monitoring: [
            'Prometheus', 'Grafana', 'Jaeger', 'AlertManager'
        ],
        agent: [
            'Mac Agent', 'Windows Agent', 'Linux Agent'
        ]
    };
    constructor(config) {
        this.config = config;
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'SecureWatch SIEM Dashboard - Enhanced',
            fullUnicode: false,
            autoPadding: true,
            warnings: false,
            terminal: 'ansi',
            resizeTimeout: 300
        });
        this.controlService = new control_service_1.ServiceControlService();
        this.initializePanelStates();
        this.setupLayout();
        this.setupKeyBindings();
    }
    initializePanelStates() {
        // Initialize panel states with default values
        this.panelStates.set('microservices', { collapsed: false, height: 6, row: 0 });
        this.panelStates.set('infrastructure', { collapsed: false, height: 4, row: 6 });
        this.panelStates.set('system', { collapsed: false, height: 3, row: 10 });
        this.panelStates.set('alerts', { collapsed: false, height: 4, row: 13 });
        this.panelStates.set('logs', { collapsed: false, height: 5, row: 17 });
    }
    setupLayout() {
        // Create a more dynamic grid layout
        this.grid = new contrib.grid({
            rows: 24,
            cols: 12,
            screen: this.screen
        });
        // Top status bar with system overview
        this.widgets.topBar = blessed.box({
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
            }
        });
        // Microservices Panel (collapsible)
        this.createMicroservicesPanel();
        // Infrastructure Services Panel (collapsible)
        this.createInfrastructurePanel();
        // System Resources Panel (collapsible)
        this.createSystemResourcesPanel();
        // Alerts Panel (collapsible)
        this.createAlertsPanel();
        // Logs Panel (collapsible)
        this.createLogsPanel();
        // Service Control Panel (right side)
        this.createServiceControlPanel();
        // Bottom status bar
        this.widgets.bottomBar = blessed.box({
            bottom: 0,
            left: 0,
            width: '100%',
            height: 2,
            content: '',
            tags: true,
            style: {
                bg: 'black',
                fg: 'white'
            }
        });
        this.screen.append(this.widgets.topBar);
        this.screen.append(this.widgets.bottomBar);
    }
    createMicroservicesPanel() {
        this.widgets.microservicesPanel = this.grid.set(3, 0, 5, 8, contrib.table, {
            keys: true,
            vi: true,
            mouse: true,
            label: ' Microservices [Space to collapse] ',
            columnSpacing: 2,
            columnWidth: [20, 12, 10, 15, 15, 10],
            style: {
                border: { fg: 'white' },
                header: { fg: 'white', bold: true },
                cell: {
                    selected: { bg: 'white', fg: 'black' },
                    hover: { bg: 'gray' }
                }
            },
            scrollbar: {
                style: {
                    bg: 'blue'
                }
            }
        });
    }
    createInfrastructurePanel() {
        this.widgets.infrastructurePanel = this.grid.set(8, 0, 4, 8, contrib.table, {
            keys: true,
            vi: true,
            mouse: true,
            label: ' Infrastructure Services [Space to collapse] ',
            columnSpacing: 2,
            columnWidth: [20, 12, 15, 15, 10],
            style: {
                border: { fg: 'white' },
                header: { fg: 'white', bold: true },
                cell: {
                    selected: { bg: 'white', fg: 'black' },
                    hover: { bg: 'gray' }
                }
            }
        });
    }
    createSystemResourcesPanel() {
        this.widgets.systemResourcesPanel = this.grid.set(12, 0, 3, 8, contrib.gauge, {
            label: ' System Resources [Space to collapse] ',
            gaugeSpacing: 1,
            gaugeHeight: 1,
            style: {
                border: { fg: 'white' }
            }
        });
    }
    createAlertsPanel() {
        this.widgets.alertsPanel = this.grid.set(15, 0, 4, 8, contrib.table, {
            keys: true,
            vi: true,
            label: ' Recent Alerts [Space to collapse] ',
            columnSpacing: 1,
            columnWidth: [15, 10, 30, 10],
            style: {
                border: { fg: 'white' },
                header: { fg: 'white', bold: true },
                cell: {
                    selected: { bg: 'white', fg: 'black' },
                    hover: { bg: 'gray' }
                }
            }
        });
    }
    createLogsPanel() {
        this.widgets.logsPanel = this.grid.set(19, 0, 3, 8, contrib.log, {
            keys: true,
            vi: true,
            label: ' Live Logs [Space to collapse] ',
            style: {
                border: { fg: 'white' },
                text: { fg: 'white' }
            },
            scrollable: true,
            alwaysScroll: true,
            bufferLength: 100
        });
    }
    createServiceControlPanel() {
        // Service details
        this.widgets.serviceDetails = this.grid.set(3, 8, 8, 4, blessed.box, {
            label: ' Service Details ',
            content: 'Select a service to view details',
            tags: true,
            style: {
                border: { fg: 'white' }
            },
            scrollable: true
        });
        // Service controls
        this.widgets.serviceControls = this.grid.set(11, 8, 4, 4, blessed.box, {
            label: ' Service Controls ',
            content: '',
            tags: true,
            style: {
                border: { fg: 'white' }
            }
        });
        // Quick actions
        this.widgets.quickActions = this.grid.set(15, 8, 4, 4, blessed.box, {
            label: ' Quick Actions ',
            content: '',
            tags: true,
            style: {
                border: { fg: 'white' }
            }
        });
        this.updateControlPanels();
    }
    setupKeyBindings() {
        // Quit
        this.screen.key(['escape', 'q', 'C-c'], () => {
            process.exit(0);
        });
        // Tab between panels
        this.screen.key(['tab'], () => {
            this.focusNextPanel();
        });
        this.screen.key(['S-tab'], () => {
            this.focusPreviousPanel();
        });
        // Collapse/expand current panel
        this.screen.key(['c', 'space'], () => {
            this.togglePanelCollapse();
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
        // Refresh
        this.screen.key(['f5', 'R'], () => {
            this.updateBottomBar('Refreshing data...');
            this.screen.render();
        });
        // Help
        this.screen.key(['h', '?'], () => {
            this.showEnhancedHelp();
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
        // Service logs
        this.screen.key(['l'], () => {
            this.showServiceLogs();
        });
        // Service metrics
        this.screen.key(['m'], () => {
            this.showServiceMetrics();
        });
    }
    focusNextPanel() {
        const panels = ['microservices', 'infrastructure', 'system', 'alerts', 'logs'];
        const currentIndex = panels.indexOf(this.activePanel);
        this.activePanel = panels[(currentIndex + 1) % panels.length];
        this.highlightActivePanel();
    }
    focusPreviousPanel() {
        const panels = ['microservices', 'infrastructure', 'system', 'alerts', 'logs'];
        const currentIndex = panels.indexOf(this.activePanel);
        this.activePanel = panels[currentIndex === 0 ? panels.length - 1 : currentIndex - 1];
        this.highlightActivePanel();
    }
    togglePanelCollapse() {
        const state = this.panelStates.get(this.activePanel);
        if (state) {
            state.collapsed = !state.collapsed;
            this.reorganizeLayout();
        }
    }
    highlightActivePanel() {
        try {
            // Reset all panel borders and labels to normal state
            const panelInfo = {
                'microservicesPanel': ' Microservices [Space to collapse] ',
                'infrastructurePanel': ' Infrastructure Services [Space to collapse] ',
                'systemResourcesPanel': ' System Resources [Space to collapse] ',
                'alertsPanel': ' Recent Alerts [Space to collapse] ',
                'logsPanel': ' Live Logs [Space to collapse] '
            };
            Object.keys(this.widgets).forEach(key => {
                try {
                    if (this.widgets[key]?.style?.border) {
                        this.widgets[key].style.border.bold = false;
                        this.widgets[key].style.border.fg = 'white';
                        this.widgets[key].style.border.bg = 'black';
                        this.widgets[key].style.border.type = 'line';
                    }
                    // Reset labels
                    if (panelInfo[key] && this.widgets[key]?.setLabel) {
                        this.widgets[key].setLabel(panelInfo[key]);
                    }
                }
                catch (error) {
                    // Skip this widget if there's an error
                    console.debug(`Skipping widget ${key}:`, error);
                }
            });
            // Highlight active panel with distinct visual markers
            const panelMap = {
                'microservices': 'microservicesPanel',
                'infrastructure': 'infrastructurePanel',
                'system': 'systemResourcesPanel',
                'alerts': 'alertsPanel',
                'logs': 'logsPanel'
            };
            const activeWidget = this.widgets[panelMap[this.activePanel]];
            if (activeWidget) {
                try {
                    if (activeWidget.style?.border) {
                        // Make active panel very visible with thick border and bright color
                        activeWidget.style.border.bold = true;
                        activeWidget.style.border.fg = 'black';
                        activeWidget.style.border.bg = 'white';
                        activeWidget.style.border.type = 'heavy';
                    }
                    // Update the label to show it's active
                    const panelLabels = {
                        'microservicesPanel': ' Microservices [Space to collapse] ',
                        'infrastructurePanel': ' Infrastructure Services [Space to collapse] ',
                        'systemResourcesPanel': ' System Resources [Space to collapse] ',
                        'alertsPanel': ' Recent Alerts [Space to collapse] ',
                        'logsPanel': ' Live Logs [Space to collapse] '
                    };
                    const originalLabel = panelLabels[panelMap[this.activePanel]];
                    if (originalLabel && activeWidget.setLabel) {
                        activeWidget.setLabel(`*** ACTIVE *** ${originalLabel} *** ACTIVE ***`);
                    }
                    if (activeWidget.focus) {
                        activeWidget.focus();
                    }
                }
                catch (error) {
                    console.debug('Error highlighting active panel:', error);
                }
            }
            // Update bottom bar with clear navigation instructions
            this.updateBottomBar(`🔍 ACTIVE: ${this.activePanel.toUpperCase()} | Tab: Next Panel | Space: Toggle Collapse | ↑↓: Navigate | q: Quit`);
            this.screen.render();
        }
        catch (error) {
            console.error('Error in highlightActivePanel:', error);
            // Fallback: just update bottom bar
            this.updateBottomBar(`Navigation: Tab=Next Panel | Space=Collapse | q=Quit`);
            this.screen.render();
        }
    }
    reorganizeLayout() {
        // Reorganize panels based on collapsed states
        let currentRow = 3;
        const panels = ['microservices', 'infrastructure', 'system', 'alerts', 'logs'];
        panels.forEach(panelName => {
            const state = this.panelStates.get(panelName);
            const widget = this.widgets[`${panelName}Panel`];
            if (state && widget) {
                if (state.collapsed) {
                    // Show only title bar when collapsed
                    widget.height = 3;
                }
                else {
                    // Restore original height
                    widget.height = state.height + 2; // +2 for borders
                }
                widget.top = currentRow;
                currentRow += widget.height;
            }
        });
        this.screen.render();
    }
    navigateServices(direction) {
        const allServices = [
            ...this.serviceCategories.microservices,
            ...this.serviceCategories.infrastructure
        ];
        this.selectedServiceIndex = Math.max(0, Math.min(allServices.length - 1, this.selectedServiceIndex + direction));
        this.updateServiceDetails(allServices[this.selectedServiceIndex]);
    }
    updateServiceDetails(serviceName) {
        const service = this.currentData?.services.find(s => s.name === serviceName);
        if (service) {
            const details = `
{bold}${serviceName}{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{bold}Status:{/bold} ${this.formatServiceStatus(service.status)}
{bold}Health:{/bold} ${service.healthScore || 'N/A'}%
{bold}Uptime:{/bold} ${this.formatUptime(service.uptime)}
{bold}Response Time:{/bold} ${service.responseTime || 'N/A'}ms
{bold}Last Check:{/bold} ${(0, moment_1.default)(service.lastChecked).format('HH:mm:ss')}

{bold}Endpoints:{/bold}
• Health: ${service.healthEndpoint || 'N/A'}
• Metrics: ${service.metricsEndpoint || 'N/A'}

{bold}Configuration:{/bold}
• Port: ${service.port || 'N/A'}
• Version: ${service.version || 'N/A'}
• Environment: ${service.environment || 'development'}

{bold}Dependencies:{/bold}
${service.dependencies?.join('\n') || 'None'}
`;
            this.widgets.serviceDetails.setContent(details);
            this.screen.render();
        }
    }
    async startSelectedService() {
        const allServices = [...this.serviceCategories.microservices, ...this.serviceCategories.infrastructure];
        const serviceName = allServices[this.selectedServiceIndex];
        this.updateBottomBar(`Starting ${serviceName}...`);
        try {
            await this.controlService.startService(serviceName);
            this.updateBottomBar(`✓ ${serviceName} started successfully`);
        }
        catch (error) {
            this.updateBottomBar(`✗ Failed to start ${serviceName}: ${error}`);
        }
    }
    async stopSelectedService() {
        const allServices = [...this.serviceCategories.microservices, ...this.serviceCategories.infrastructure];
        const serviceName = allServices[this.selectedServiceIndex];
        this.updateBottomBar(`Stopping ${serviceName}...`);
        try {
            await this.controlService.stopService(serviceName);
            this.updateBottomBar(`✓ ${serviceName} stopped successfully`);
        }
        catch (error) {
            this.updateBottomBar(`✗ Failed to stop ${serviceName}: ${error}`);
        }
    }
    async restartSelectedService() {
        const allServices = [...this.serviceCategories.microservices, ...this.serviceCategories.infrastructure];
        const serviceName = allServices[this.selectedServiceIndex];
        this.updateBottomBar(`Restarting ${serviceName}...`);
        try {
            await this.controlService.restartService(serviceName);
            this.updateBottomBar(`✓ ${serviceName} restarted successfully`);
        }
        catch (error) {
            this.updateBottomBar(`✗ Failed to restart ${serviceName}: ${error}`);
        }
    }
    updateControlPanels() {
        // Update service controls
        const controlsContent = `
{bold}Service Actions:{/bold}
━━━━━━━━━━━━━━━━━
{green-fg}[s]{/green-fg} Start Service
{red-fg}[S]{/red-fg} Stop Service
{yellow-fg}[r]{/yellow-fg} Restart Service
{blue-fg}[l]{/blue-fg} View Logs
{cyan-fg}[m]{/cyan-fg} View Metrics

{bold}Navigation:{/bold}
━━━━━━━━━━━━━━━━━
[↑/k] Previous Service
[↓/j] Next Service
[Tab] Next Panel
[c] Collapse/Expand
`;
        this.widgets.serviceControls.setContent(controlsContent);
        // Update quick actions
        const quickActionsContent = `
{bold}Quick Actions:{/bold}
━━━━━━━━━━━━━━━━━
{green-fg}[F1]{/green-fg} Start All
{red-fg}[F2]{/red-fg} Stop All
{yellow-fg}[F3]{/yellow-fg} Restart All
{blue-fg}[F4]{/blue-fg} Health Check

{bold}View Modes:{/bold}
━━━━━━━━━━━━━━━━━
[1] All Services
[2] Critical Only
[3] Compact View
`;
        this.widgets.quickActions.setContent(quickActionsContent);
    }
    setViewMode(mode) {
        // Implement different view modes
        this.updateBottomBar(`View mode: ${mode}`);
        // Additional logic to filter/reorganize display based on mode
    }
    showServiceLogs() {
        const allServices = [...this.serviceCategories.microservices, ...this.serviceCategories.infrastructure];
        const serviceName = allServices[this.selectedServiceIndex];
        const logViewer = blessed.box({
            top: 'center',
            left: 'center',
            width: '90%',
            height: '90%',
            content: `Loading logs for ${serviceName}...`,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'cyan'
                }
            },
            scrollable: true,
            alwaysScroll: true,
            keys: true,
            vi: true,
            label: ` ${serviceName} Logs `
        });
        logViewer.key(['escape', 'q'], () => {
            this.screen.remove(logViewer);
            this.screen.render();
        });
        this.screen.append(logViewer);
        logViewer.focus();
        this.screen.render();
        // Load actual logs
        this.controlService.getServiceLogs(serviceName, 100).then(logs => {
            logViewer.setContent(logs.join('\n'));
            this.screen.render();
        });
    }
    showServiceMetrics() {
        const allServices = [...this.serviceCategories.microservices, ...this.serviceCategories.infrastructure];
        const serviceName = allServices[this.selectedServiceIndex];
        // Create metrics visualization panel
        const metricsViewer = blessed.box({
            top: 'center',
            left: 'center',
            width: '80%',
            height: '80%',
            content: `Loading metrics for ${serviceName}...`,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'green'
                }
            },
            label: ` ${serviceName} Metrics `
        });
        metricsViewer.key(['escape', 'q'], () => {
            this.screen.remove(metricsViewer);
            this.screen.render();
        });
        this.screen.append(metricsViewer);
        metricsViewer.focus();
        this.screen.render();
    }
    update(data) {
        this.currentData = data;
        this.updateTopBar(data);
        this.updateMicroservices(data.services);
        this.updateInfrastructure(data.dockerServices);
        this.updateSystemResources(data.systemResources);
        this.updateAlerts(data.recentAlerts);
        this.updateLogs(data.recentLogs);
        this.updateBottomBar(`Last updated: ${(0, moment_1.default)(data.lastUpdated).format('HH:mm:ss')} | Active Panel: ${this.activePanel} | Press 'h' for help`);
        this.screen.render();
    }
    updateTopBar(data) {
        const operationalServices = data.services.filter(s => s.status === 'operational').length;
        const totalServices = data.services.length;
        const overallHealth = (operationalServices / totalServices) * 100;
        const topBarContent = `
{center}{bold}SecureWatch SIEM Platform Monitor{/bold}{/center}
{center}Services: {green-fg}${operationalServices}{/green-fg}/${totalServices} | Health: ${this.getHealthColor(overallHealth)}${overallHealth.toFixed(0)}%{/} | Alerts: {red-fg}${data.recentAlerts.filter(a => a.severity === 'critical').length}{/red-fg} Critical | Mode: ${this.activePanel}{/center}
`;
        this.widgets.topBar.setContent(topBarContent);
    }
    updateMicroservices(services) {
        const microservices = services.filter(s => this.serviceCategories.microservices.includes(s.name));
        const headers = ['Service', 'Status', 'Health', 'Response', 'Memory', 'Actions'];
        const data = microservices.map((service, index) => {
            const isSelected = this.selectedServiceIndex === index;
            return [
                isSelected ? `→ ${service.name}` : `  ${service.name}`,
                this.formatServiceStatus(service.status),
                `${service.healthScore || 0}%`,
                service.responseTime ? `${service.responseTime}ms` : 'N/A',
                service.memory ? `${service.memory}MB` : 'N/A',
                '[s/S/r]'
            ];
        });
        this.widgets.microservicesPanel.setData({
            headers,
            data
        });
    }
    updateInfrastructure(services) {
        const headers = ['Service', 'Status', 'Ports', 'Health', 'Uptime'];
        const data = services.map(service => [
            service.name,
            this.formatDockerStatus(service.status),
            service.ports || 'N/A',
            service.health || 'N/A',
            this.formatUptime(service.uptime)
        ]);
        this.widgets.infrastructurePanel.setData({
            headers,
            data
        });
    }
    updateSystemResources(resources) {
        const gaugeData = [
            { label: 'CPU', percent: resources.cpu.percentage },
            { label: 'Memory', percent: resources.memory.percentage },
            { label: 'Disk', percent: resources.disk.percentage }
        ];
        this.widgets.systemResourcesPanel.setData(gaugeData);
    }
    updateAlerts(alerts) {
        const headers = ['Time', 'Severity', 'Alert', 'Status'];
        const data = alerts.slice(0, 20).map(alert => [
            (0, moment_1.default)(alert.timestamp).format('HH:mm:ss'),
            this.formatSeverity(alert.severity),
            alert.title.length > 30 ? alert.title.substring(0, 27) + '...' : alert.title,
            alert.status
        ]);
        this.widgets.alertsPanel.setData({
            headers,
            data
        });
    }
    updateLogs(logs) {
        this.widgets.logsPanel.setContent('');
        logs.slice(0, 50).forEach(log => {
            const timestamp = (0, moment_1.default)(log.timestamp).format('HH:mm:ss');
            const level = this.formatLogLevel(log.level);
            const service = log.service.padEnd(15);
            const message = log.message.length > 80 ? log.message.substring(0, 77) + '...' : log.message;
            const logLine = `${timestamp} ${level} ${service} ${message}`;
            this.widgets.logsPanel.log(logLine);
        });
    }
    updateBottomBar(message) {
        this.widgets.bottomBar.setContent(`{center}${message}{/center}`);
    }
    formatServiceStatus(status) {
        switch (status) {
            case 'operational': return '{white-fg}✓ Healthy{/white-fg}';
            case 'degraded': return '{gray-fg}! Degraded{/gray-fg}';
            case 'unoperational': return '{white-bg}{black-fg} ✗ Failed {/black-fg}{/white-bg}';
            default: return '{gray-fg}? Unknown{/gray-fg}';
        }
    }
    formatDockerStatus(status) {
        if (status.includes('Up'))
            return '{white-fg}▶ Running{/white-fg}';
        if (status.includes('Exit'))
            return '{white-bg}{black-fg} ■ Stopped {/black-fg}{/white-bg}';
        if (status.includes('Paused'))
            return '{gray-fg}⏸ Paused{/gray-fg}';
        return `{gray-fg}? ${status}{/gray-fg}`;
    }
    formatSeverity(severity) {
        switch (severity) {
            case 'critical': return '{white-bg}{black-fg} !!! CRITICAL !!! {/black-fg}{/white-bg}';
            case 'high': return '{white-fg}▓ HIGH{/white-fg}';
            case 'medium': return '{gray-fg}▒ MEDIUM{/gray-fg}';
            case 'low': return '{gray-fg}░ LOW{/gray-fg}';
            default: return severity.toUpperCase();
        }
    }
    formatLogLevel(level) {
        switch (level.toLowerCase()) {
            case 'error': return '{white-bg}{black-fg}[ERROR]{/black-fg}{/white-bg}';
            case 'warn': return '{white-fg}[WARN ]{/white-fg}';
            case 'info': return '{gray-fg}[INFO ]{/gray-fg}';
            case 'debug': return '{gray-fg}[DEBUG]{/gray-fg}';
            default: return `[${level.toUpperCase().padEnd(5)}]`;
        }
    }
    formatUptime(uptime) {
        if (!uptime)
            return 'N/A';
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        else {
            return `${minutes}m`;
        }
    }
    getHealthColor(percentage) {
        if (percentage >= 90)
            return '{green-fg}';
        if (percentage >= 70)
            return '{yellow-fg}';
        return '{red-fg}';
    }
    showEnhancedHelp() {
        const helpText = `
{center}{bold}SecureWatch SIEM Dashboard - Enhanced Help{/bold}{/center}

{bold}Navigation & Controls:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}Tab / Shift+Tab{/white-fg}     Navigate between panels
  {white-fg}↑/↓ or k/j{/white-fg}          Navigate services within panel
  {white-fg}←/→{/white-fg}                 Scroll horizontally in tables
  {white-fg}PgUp/PgDn{/white-fg}           Page through long lists
  {white-fg}Home/End{/white-fg}            Jump to start/end of list
  {white-fg}Space{/white-fg}               Collapse/Expand current panel

{bold}Service Management:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}s{/white-fg}                   Start selected service
  {white-fg}S (Shift+s){/white-fg}         Stop selected service
  {white-fg}r{/white-fg}                   Restart selected service
  {white-fg}l{/white-fg}                   View service logs
  {white-fg}m{/white-fg}                   View service metrics
  {white-fg}d{/white-fg}                   View detailed service info

{bold}Quick Actions:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}F1{/white-fg}                  Start all services
  {white-fg}F2{/white-fg}                  Stop all services
  {white-fg}F3{/white-fg}                  Restart all services
  {white-fg}F4{/white-fg}                  Run health check on all services
  {white-fg}F5 or R{/white-fg}             Refresh dashboard data

{bold}View Modes:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}1{/white-fg}                   All services view
  {white-fg}2{/white-fg}                   Critical services only
  {white-fg}3{/white-fg}                   Compact view

{bold}Other Commands:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}h or ?{/white-fg}              Show this help
  {white-fg}q or ESC or Ctrl+C{/white-fg}  Quit dashboard

{bold}Service Categories:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}Microservices:{/white-fg}      Frontend, APIs, Engines
  {white-fg}Infrastructure:{/white-fg}     Database, Cache, Queue, Search
  {white-fg}Monitoring:{/white-fg}         Prometheus, Grafana, Jaeger
  {white-fg}Agents:{/white-fg}             Platform-specific collectors

{bold}Status Indicators:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}✓ Healthy{/white-fg}           Service running normally
  {gray-fg}! Degraded{/gray-fg}          Service experiencing issues
  {white-bg}{black-fg} ✗ Failed {/black-fg}{/white-bg}         Service down or critical
  {gray-fg}? Unknown{/gray-fg}           Status cannot be determined

{bold}Alert Severities:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-bg}{black-fg} !!! CRITICAL !!! {/black-fg}{/white-bg}  Immediate action required
  {white-fg}▓ HIGH{/white-fg}              High priority issue
  {gray-fg}▒ MEDIUM{/gray-fg}            Moderate priority
  {gray-fg}░ LOW{/gray-fg}               Informational

Press any key to close this help...
`;
        const helpBox = blessed.box({
            top: 'center',
            left: 'center',
            width: '90%',
            height: '90%',
            content: helpText,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                border: {
                    fg: 'cyan'
                },
                bg: 'black'
            },
            scrollable: true,
            alwaysScroll: true,
            keys: true,
            vi: true,
            label: ' Help - Enhanced Dashboard '
        });
        helpBox.key(['escape', 'q', 'enter', 'space'], () => {
            this.screen.remove(helpBox);
            this.screen.render();
        });
        this.screen.append(helpBox);
        helpBox.focus();
        this.screen.render();
    }
    render() {
        try {
            // Initialize active panel highlighting on first render
            this.highlightActivePanel();
            this.screen.render();
        }
        catch (error) {
            console.error('Error rendering dashboard:', error);
            // Fallback: render without highlighting
            this.screen.render();
        }
    }
    destroy() {
        this.screen.destroy();
    }
}
exports.EnhancedDashboardUI = EnhancedDashboardUI;
//# sourceMappingURL=enhanced-dashboard.ui.js.map