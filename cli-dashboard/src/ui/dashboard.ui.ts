import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { DashboardData, ServiceStatus, ServiceMetrics } from '../types';
import { DashboardConfig } from '../config/dashboard.config';
import moment from 'moment';

export class DashboardUI {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  private widgets: any = {};
  private currentData: DashboardData | null = null;

  constructor(private config: DashboardConfig) {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'SecureWatch SIEM Dashboard',
      fullUnicode: false,
      autoPadding: true,
      warnings: false,
      terminal: 'ansi',
      resizeTimeout: 300
    });

    this.setupLayout();
    this.setupKeyBindings();
  }

  private setupLayout() {
    // Create grid layout
    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });

    // Service Status Panel (top-left)
    this.widgets.serviceStatus = this.grid.set(0, 0, 4, 6, contrib.table, {
      keys: true,
      vi: true,
      mouse: true,
      label: ' Service Status ',
      columnSpacing: 2,
      columnWidth: [15, 12, 10, 15, 20],
      style: {
        border: { fg: 'cyan' },
        header: { fg: 'white', bold: true },
        cell: { selected: { bg: 'blue' } }
      }
    });

    // System Resources Panel (top-right)
    this.widgets.systemResources = this.grid.set(0, 6, 4, 6, contrib.table, {
      keys: true,
      vi: true,
      label: ' System Resources ',
      columnSpacing: 2,
      columnWidth: [15, 15, 15, 15],
      style: {
        border: { fg: 'green' },
        header: { fg: 'white', bold: true }
      }
    });

    // Platform Metrics Panel (middle-left)
    this.widgets.platformMetrics = this.grid.set(4, 0, 4, 6, contrib.table, {
      keys: true,
      vi: true,
      label: ' Platform Metrics ',
      columnSpacing: 2,
      columnWidth: [15, 12, 12, 12, 12],
      style: {
        border: { fg: 'yellow' },
        header: { fg: 'white', bold: true }
      }
    });

    // Docker Services Panel (middle-right)
    this.widgets.dockerServices = this.grid.set(4, 6, 4, 6, contrib.table, {
      keys: true,
      vi: true,
      label: ' Docker Infrastructure ',
      columnSpacing: 2,
      columnWidth: [20, 15, 20],
      style: {
        border: { fg: 'magenta' },
        header: { fg: 'white', bold: true }
      }
    });

    // Recent Alerts Panel (bottom-left)
    this.widgets.recentAlerts = this.grid.set(8, 0, 4, 6, contrib.table, {
      keys: true,
      vi: true,
      label: ' Recent Alerts ',
      columnSpacing: 1,
      columnWidth: [15, 10, 20, 10],
      style: {
        border: { fg: 'red' },
        header: { fg: 'white', bold: true }
      }
    });

    // Recent Logs Panel (bottom-right)
    this.widgets.recentLogs = this.grid.set(8, 6, 4, 6, contrib.log, {
      keys: true,
      vi: true,
      label: ' Recent Logs ',
      style: {
        border: { fg: 'white' },
        text: { fg: 'white' }
      },
      scrollable: true,
      alwaysScroll: true
    });

    // Status bar
    this.widgets.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      style: {
        bg: 'blue',
        fg: 'white'
      }
    });

    this.screen.append(this.widgets.statusBar);
  }

  private setupKeyBindings() {
    // Quit
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    // Refresh
    this.screen.key(['r', 'f5'], () => {
      this.updateStatusBar('Refreshing data...');
      this.screen.render();
    });

    // Help
    this.screen.key(['h', '?'], () => {
      this.showHelp();
    });

    // Focus navigation
    this.screen.key(['tab'], () => {
      this.screen.focusNext();
    });

    this.screen.key(['S-tab'], () => {
      this.screen.focusPrevious();
    });

    // Detailed view
    this.screen.key(['enter', 'space'], () => {
      this.showDetailedView();
    });
  }

  update(data: DashboardData) {
    this.currentData = data;
    
    this.updateServiceStatus(data.services);
    this.updateSystemResources(data.systemResources);
    this.updatePlatformMetrics(data.metrics);
    this.updateDockerServices(data.dockerServices);
    this.updateRecentAlerts(data.recentAlerts);
    this.updateRecentLogs(data.recentLogs);
    this.updateStatusBar(`Last updated: ${moment(data.lastUpdated).format('HH:mm:ss')} | Press 'h' for help | 'q' to quit`);
    
    this.screen.render();
  }

  private updateServiceStatus(services: ServiceStatus[]) {
    const headers = ['Service', 'Status', 'Uptime', 'Response', 'Last Check'];
    const data = services.map(service => [
      service.name,
      this.formatServiceStatus(service.status),
      this.formatUptime(service.uptime),
      service.responseTime ? `${service.responseTime}ms` : 'N/A',
      moment(service.lastChecked).format('HH:mm:ss')
    ]);

    this.widgets.serviceStatus.setData({
      headers,
      data
    });
  }

  private updateSystemResources(resources: any) {
    const headers = ['Resource', 'Used', 'Total', 'Percentage'];
    const data = [
      ['CPU', `${resources.cpu.percentage.toFixed(1)}%`, '100%', `${resources.cpu.percentage.toFixed(1)}%`],
      ['Memory', `${resources.memory.usedMB}MB`, `${resources.memory.totalMB}MB`, `${resources.memory.percentage}%`],
      ['Disk', `${resources.disk.usedGB}GB`, `${resources.disk.totalGB}GB`, `${resources.disk.percentage}%`],
      ['Load Avg', resources.cpu.loadAverage.map((l: number) => l.toFixed(2)).join(', '), '', '']
    ];

    this.widgets.systemResources.setData({
      headers,
      data
    });
  }

  private updatePlatformMetrics(metrics: ServiceMetrics[]) {
    const headers = ['Service', 'Memory', 'CPU', 'Cache', 'Redis'];
    const data = metrics.map(metric => [
      metric.name,
      metric.memory ? `${metric.memory.heapUsed}MB` : 'N/A',
      metric.cpu ? `${metric.cpu.user.toFixed(1)}ms` : 'N/A',
      metric.cache ? `${metric.cache.hitRate?.toFixed(1)}%` : 'N/A',
      metric.redis ? (metric.redis.connected ? '✓' : '✗') : 'N/A'
    ]);

    this.widgets.platformMetrics.setData({
      headers,
      data
    });
  }

  private updateDockerServices(services: any[]) {
    const headers = ['Service', 'Status', 'Ports'];
    const data = services.map(service => [
      service.name,
      this.formatDockerStatus(service.status),
      service.ports || 'N/A'
    ]);

    this.widgets.dockerServices.setData({
      headers,
      data
    });
  }

  private updateRecentAlerts(alerts: any[]) {
    const headers = ['Time', 'Severity', 'Title', 'Status'];
    const data = alerts.slice(0, 10).map(alert => [
      moment(alert.timestamp).format('HH:mm'),
      this.formatSeverity(alert.severity),
      alert.title.length > 25 ? alert.title.substring(0, 22) + '...' : alert.title,
      alert.status
    ]);

    this.widgets.recentAlerts.setData({
      headers,
      data
    });
  }

  private updateRecentLogs(logs: any[]) {
    // Clear previous logs
    this.widgets.recentLogs.setContent('');
    
    logs.slice(0, 20).forEach(log => {
      const timestamp = moment(log.timestamp).format('HH:mm:ss');
      const level = log.level.toUpperCase().padEnd(5);
      const service = log.service.padEnd(12);
      const message = log.message.length > 60 ? log.message.substring(0, 57) + '...' : log.message;
      
      const logLine = `${timestamp} ${level} ${service} ${message}`;
      this.widgets.recentLogs.log(logLine);
    });
  }

  private updateStatusBar(message: string) {
    this.widgets.statusBar.setContent(message);
  }

  private formatServiceStatus(status: string): string {
    switch (status) {
      case 'healthy': return '{green-fg}✓ Healthy{/green-fg}';
      case 'degraded': return '{yellow-fg}⚠ Degraded{/yellow-fg}';
      case 'unhealthy': return '{red-fg}✗ Unhealthy{/red-fg}';
      default: return '{gray-fg}? Unknown{/gray-fg}';
    }
  }

  private formatDockerStatus(status: string): string {
    if (status.includes('Up')) return '{green-fg}✓ Running{/green-fg}';
    if (status.includes('Exit')) return '{red-fg}✗ Stopped{/red-fg}';
    return `{yellow-fg}${status}{/yellow-fg}`;
  }

  private formatSeverity(severity: string): string {
    switch (severity) {
      case 'critical': return '{red-fg}CRIT{/red-fg}';
      case 'high': return '{red-fg}HIGH{/red-fg}';
      case 'medium': return '{yellow-fg}MED{/yellow-fg}';
      case 'low': return '{blue-fg}LOW{/blue-fg}';
      default: return severity.toUpperCase();
    }
  }

  private formatUptime(uptime?: number): string {
    if (!uptime) return 'N/A';
    
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  private showHelp() {
    const helpText = `
SecureWatch SIEM Dashboard - Keyboard Commands

Navigation:
  Tab / Shift+Tab    Navigate between panels
  Arrow Keys         Scroll within panels
  Page Up/Down       Scroll pages
  Home/End          Go to start/end

Actions:
  Enter / Space      Show detailed view
  r / F5            Refresh data
  h / ?             Show this help
  q / Escape / Ctrl+C  Quit

Panels:
  Service Status     Shows health of all SecureWatch services
  System Resources   Shows CPU, memory, disk usage
  Platform Metrics   Shows service-specific performance metrics
  Docker Services    Shows status of containerized infrastructure
  Recent Alerts      Shows latest security alerts
  Recent Logs        Shows recent log entries from all services

Color Coding:
  Green     Healthy/Running
  Yellow    Degraded/Warning
  Red       Unhealthy/Critical
  Blue      Information
  Gray      Unknown/N/A
`;

    const helpBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: helpText,
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
      vi: true
    });

    helpBox.key(['escape', 'q'], () => {
      this.screen.remove(helpBox);
      this.screen.render();
    });

    this.screen.append(helpBox);
    helpBox.focus();
    this.screen.render();
  }

  private showDetailedView() {
    // Implementation for detailed service view
    const detailBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: 'Detailed view coming soon...\n\nPress ESC to close',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    detailBox.key(['escape', 'q'], () => {
      this.screen.remove(detailBox);
      this.screen.render();
    });

    this.screen.append(detailBox);
    detailBox.focus();
    this.screen.render();
  }

  render() {
    this.screen.render();
  }

  destroy() {
    this.screen.destroy();
  }
}