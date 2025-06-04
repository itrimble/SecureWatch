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
            fullUnicode: true
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
        this.widgets.microservicesPanel = this.grid.set(3, 0, 6, 8, contrib.table, {
            keys: true,
            vi: true,
            mouse: true,
            label: ' Microservices [Tab to collapse] ',
            columnSpacing: 2,
            columnWidth: [20, 12, 10, 15, 15, 10],
            style: {
                border: { fg: 'cyan' },
                header: { fg: 'white', bold: true },
                cell: {
                    selected: { bg: 'blue', fg: 'white' },
                    hover: { bg: 'magenta' }
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
        this.widgets.infrastructurePanel = this.grid.set(9, 0, 4, 8, contrib.table, {
            keys: true,
            vi: true,
            mouse: true,
            label: ' Infrastructure Services [Tab to collapse] ',
            columnSpacing: 2,
            columnWidth: [20, 12, 15, 15, 10],
            style: {
                border: { fg: 'green' },
                header: { fg: 'white', bold: true },
                cell: { selected: { bg: 'blue' } }
            }
        });
    }
    createSystemResourcesPanel() {
        this.widgets.systemResourcesPanel = this.grid.set(13, 0, 3, 8, contrib.gauge, {
            label: ' System Resources [Tab to collapse] ',
            gaugeSpacing: 1,
            gaugeHeight: 1,
            style: {
                border: { fg: 'yellow' }
            }
        });
    }
    createAlertsPanel() {
        this.widgets.alertsPanel = this.grid.set(16, 0, 4, 8, contrib.table, {
            keys: true,
            vi: true,
            label: ' Recent Alerts [Tab to collapse] ',
            columnSpacing: 1,
            columnWidth: [15, 10, 30, 10],
            style: {
                border: { fg: 'red' },
                header: { fg: 'white', bold: true }
            }
        });
    }
    createLogsPanel() {
        this.widgets.logsPanel = this.grid.set(20, 0, 4, 8, contrib.log, {
            keys: true,
            vi: true,
            label: ' Live Logs [Tab to collapse] ',
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
                border: { fg: 'magenta' }
            },
            scrollable: true
        });
        // Service controls
        this.widgets.serviceControls = this.grid.set(11, 8, 5, 4, blessed.box, {
            label: ' Service Controls ',
            content: '',
            tags: true,
            style: {
                border: { fg: 'cyan' }
            }
        });
        // Quick actions
        this.widgets.quickActions = this.grid.set(16, 8, 4, 4, blessed.box, {
            label: ' Quick Actions ',
            content: '',
            tags: true,
            style: {
                border: { fg: 'yellow' }
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
        // Update panel borders to show active state
        Object.keys(this.widgets).forEach(key => {
            if (this.widgets[key].style && this.widgets[key].style.border) {
                this.widgets[key].style.border.bold = false;
            }
        });
        const activeWidget = this.widgets[`${this.activePanel}Panel`];
        if (activeWidget && activeWidget.style) {
            activeWidget.style.border.bold = true;
        }
        this.screen.render();
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
        const healthyServices = data.services.filter(s => s.status === 'healthy').length;
        const totalServices = data.services.length;
        const overallHealth = (healthyServices / totalServices) * 100;
        const topBarContent = `
{center}{bold}SecureWatch SIEM Platform Monitor{/bold}{/center}
{center}Services: {green-fg}${healthyServices}{/green-fg}/${totalServices} | Health: ${this.getHealthColor(overallHealth)}${overallHealth.toFixed(0)}%{/} | Alerts: {red-fg}${data.recentAlerts.filter(a => a.severity === 'critical').length}{/red-fg} Critical | Mode: ${this.activePanel}{/center}
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
            case 'healthy': return '{green-fg}● Healthy{/green-fg}';
            case 'degraded': return '{yellow-fg}● Degraded{/yellow-fg}';
            case 'unhealthy': return '{red-fg}● Unhealthy{/red-fg}';
            default: return '{gray-fg}● Unknown{/gray-fg}';
        }
    }
    formatDockerStatus(status) {
        if (status.includes('Up'))
            return '{green-fg}● Running{/green-fg}';
        if (status.includes('Exit'))
            return '{red-fg}● Stopped{/red-fg}';
        if (status.includes('Paused'))
            return '{yellow-fg}● Paused{/yellow-fg}';
        return `{gray-fg}● ${status}{/gray-fg}`;
    }
    formatSeverity(severity) {
        switch (severity) {
            case 'critical': return '{red-fg}█ CRIT{/red-fg}';
            case 'high': return '{red-fg}▓ HIGH{/red-fg}';
            case 'medium': return '{yellow-fg}▒ MED{/yellow-fg}';
            case 'low': return '{blue-fg}░ LOW{/blue-fg}';
            default: return severity.toUpperCase();
        }
    }
    formatLogLevel(level) {
        switch (level.toLowerCase()) {
            case 'error': return '{red-fg}[ERROR]{/red-fg}';
            case 'warn': return '{yellow-fg}[WARN ]{/yellow-fg}';
            case 'info': return '{green-fg}[INFO ]{/green-fg}';
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
  {cyan-fg}Tab / Shift+Tab{/cyan-fg}     Navigate between panels
  {cyan-fg}↑/↓ or k/j{/cyan-fg}          Navigate services within panel
  {cyan-fg}←/→{/cyan-fg}                 Scroll horizontally in tables
  {cyan-fg}PgUp/PgDn{/cyan-fg}           Page through long lists
  {cyan-fg}Home/End{/cyan-fg}            Jump to start/end of list
  {cyan-fg}c or Space{/cyan-fg}          Collapse/Expand current panel

{bold}Service Management:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {green-fg}s{/green-fg}                   Start selected service
  {red-fg}S (Shift+s){/red-fg}         Stop selected service
  {yellow-fg}r{/yellow-fg}                   Restart selected service
  {blue-fg}l{/blue-fg}                   View service logs
  {cyan-fg}m{/cyan-fg}                   View service metrics
  {magenta-fg}d{/magenta-fg}                   View detailed service info

{bold}Quick Actions:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {green-fg}F1{/green-fg}                  Start all services
  {red-fg}F2{/red-fg}                  Stop all services
  {yellow-fg}F3{/yellow-fg}                  Restart all services
  {blue-fg}F4{/blue-fg}                  Run health check on all services
  {cyan-fg}F5 or R{/cyan-fg}             Refresh dashboard data

{bold}View Modes:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {white-fg}1{/white-fg}                   All services view
  {red-fg}2{/red-fg}                   Critical services only
  {blue-fg}3{/blue-fg}                   Compact view

{bold}Other Commands:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {yellow-fg}h or ?{/yellow-fg}              Show this help
  {red-fg}q or ESC or Ctrl+C{/red-fg}  Quit dashboard

{bold}Service Categories:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {cyan-fg}Microservices:{/cyan-fg}      Frontend, APIs, Engines
  {green-fg}Infrastructure:{/green-fg}     Database, Cache, Queue, Search
  {yellow-fg}Monitoring:{/yellow-fg}         Prometheus, Grafana, Jaeger
  {magenta-fg}Agents:{/magenta-fg}             Platform-specific collectors

{bold}Status Indicators:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {green-fg}● Healthy{/green-fg}           Service running normally
  {yellow-fg}● Degraded{/yellow-fg}          Service experiencing issues
  {red-fg}● Unhealthy{/red-fg}         Service down or critical
  {gray-fg}● Unknown{/gray-fg}           Status cannot be determined

{bold}Alert Severities:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {red-fg}█ CRITICAL{/red-fg}          Immediate action required
  {red-fg}▓ HIGH{/red-fg}              High priority issue
  {yellow-fg}▒ MEDIUM{/yellow-fg}            Moderate priority
  {blue-fg}░ LOW{/blue-fg}               Informational

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
        this.screen.render();
    }
    destroy() {
        this.screen.destroy();
    }
}
exports.EnhancedDashboardUI = EnhancedDashboardUI;
//# sourceMappingURL=enhanced-dashboard.ui.js.map