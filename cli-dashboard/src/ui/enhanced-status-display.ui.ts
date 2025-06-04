import * as blessed from 'blessed';
import { DashboardData, ServiceStatus } from '../types';
import { StatusFormatter } from '../utils/status-formatter';
import chalk from 'chalk';
import moment from 'moment';

/**
 * Enhanced status display implementation matching user requirements
 * Provides comprehensive, actionable infrastructure status representation
 */
export class EnhancedStatusDisplayUI {
  private screen: blessed.Widgets.Screen;
  private container!: blessed.Widgets.BoxElement;
  private currentData: DashboardData | null = null;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'SecureWatch SIEM Status - Enhanced View',
      fullUnicode: true
    });

    this.setupLayout();
    this.setupKeyBindings();
  }

  private setupLayout() {
    this.container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      content: '',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'gray'
        },
        style: {
          inverse: true
        }
      },
      style: {
        bg: 'black',
        fg: 'white'
      },
      keys: true,
      vi: true
    });
  }

  private setupKeyBindings() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key(['r', 'f5'], () => {
      if (this.currentData) {
        this.render();
      }
    });

    this.container.focus();
  }

  /**
   * Update display with new data
   */
  update(data: DashboardData): void {
    this.currentData = data;
    this.render();
  }

  /**
   * Render the enhanced status display
   */
  render(): void {
    if (!this.currentData) return;

    const content = this.generateEnhancedStatusContent();
    this.container.setContent(content);
    this.screen.render();
  }

  /**
   * Generate enhanced status content matching user requirements
   */
  private generateEnhancedStatusContent(): string {
    if (!this.currentData) return '';

    const lines: string[] = [];
    const timestamp = moment(this.currentData.lastUpdated).format('YYYY-MM-DD HH:mm:ss CDT');

    // Header with overall system health
    lines.push(chalk.bold.white(`SecureWatch SIEM Status (Last Updated: ${timestamp})`));
    lines.push('');
    lines.push(StatusFormatter.formatSystemHealth(this.currentData.systemHealth));
    lines.push('');
    lines.push(chalk.gray('─'.repeat(80)));
    lines.push(chalk.bold.white('SERVICE STATUS'));
    lines.push(chalk.gray('─'.repeat(80)));

    // Enhanced service status display
    this.currentData.services.forEach(service => {
      const detailedLines = StatusFormatter.formatDetailedServiceStatus(service);
      lines.push(...detailedLines);
    });

    // Add Docker services
    if (this.currentData.dockerServices.length > 0) {
      lines.push('');
      lines.push(chalk.bold.white('INFRASTRUCTURE SERVICES'));
      lines.push(chalk.gray('─'.repeat(40)));
      
      this.currentData.dockerServices.forEach(dockerService => {
        const status = dockerService.status.includes('Up') ? 'operational' : 'critical';
        const indicator = StatusFormatter.getStatusIndicator(status);
        const uptime = dockerService.uptime ? ` (${StatusFormatter.formatUptime(dockerService.uptime)})` : '';
        lines.push(`${indicator.symbol} ${dockerService.name.padEnd(20)} [${indicator.label}]${uptime}`);
      });
    }

    // System resources with enhanced progress bars
    lines.push('');
    lines.push(chalk.gray('─'.repeat(80)));
    lines.push(chalk.bold.white(`SYSTEM RESOURCES (Host: ${process.env.HOSTNAME || 'siem-local'})`));
    lines.push(chalk.gray('─'.repeat(80)));
    
    const resourceLines = StatusFormatter.formatSystemResources(this.currentData.systemResources);
    lines.push(...resourceLines);

    // Recent critical alerts
    const criticalAlerts = this.currentData.recentAlerts.filter(alert => 
      alert.severity === 'critical' || alert.severity === 'high'
    ).slice(0, 5);

    if (criticalAlerts.length > 0) {
      lines.push('');
      lines.push(chalk.gray('─'.repeat(80)));
      lines.push(chalk.bold.white('RECENT CRITICAL ALERTS (Last 15 minutes)'));
      lines.push(chalk.gray('─'.repeat(80)));
      
      criticalAlerts.forEach(alert => {
        lines.push(StatusFormatter.formatAlert(alert));
      });
    }

    // Recent logs with enhanced formatting
    if (this.currentData.recentLogs.length > 0) {
      lines.push('');
      lines.push(chalk.gray('─'.repeat(80)));
      lines.push(chalk.bold.white('RECENT SYSTEM EVENTS'));
      lines.push(chalk.gray('─'.repeat(80)));
      
      this.currentData.recentLogs.slice(0, 10).forEach(log => {
        lines.push(StatusFormatter.formatLogEntry(log));
      });
    }

    // Troubleshooting section for degraded services
    const problematicServices = this.currentData.services.filter(service => 
      service.status !== 'operational' && service.status !== 'maintenance'
    );

    if (problematicServices.length > 0) {
      lines.push('');
      lines.push(chalk.gray('─'.repeat(80)));
      lines.push(chalk.bold.white('TROUBLESHOOTING COMMANDS'));
      lines.push(chalk.gray('─'.repeat(80)));
      
      problematicServices.forEach(service => {
        const suggestions = StatusFormatter.generateTroubleshootingText(service);
        if (suggestions.length > 0) {
          lines.push(chalk.bold.yellow(`${service.name}:`));
          suggestions.forEach(suggestion => {
            lines.push(`  → ${suggestion}`);
          });
          lines.push('');
        }
      });
    }

    // Footer with keyboard shortcuts
    lines.push('');
    lines.push(chalk.gray('─'.repeat(80)));
    lines.push(chalk.bold.white('CONTROLS'));
    lines.push(chalk.gray('─'.repeat(80)));
    lines.push('Press {bold}r{/bold} or {bold}F5{/bold} to refresh • {bold}q{/bold} or {bold}Esc{/bold} to quit');
    lines.push('');

    // Performance metrics
    const healthyServices = this.currentData.services.filter(s => s.status === 'operational').length;
    const totalServices = this.currentData.services.length;
    const uptimePercentage = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;
    
    lines.push(chalk.gray(`Platform Uptime: ${uptimePercentage}% • Services: ${healthyServices}/${totalServices} operational • Last Check: ${moment().format('HH:mm:ss')}`));

    return lines.join('\n');
  }

  /**
   * Generate example status display as shown in user requirements
   */
  static generateExampleDisplay(): string {
    const lines: string[] = [];
    
    lines.push('SecureWatch SIEM Status (Last Updated: 2025-06-04 14:00:00 CDT)');
    lines.push('');
    lines.push('[ OVERALL HEALTH: DEGRADED ]');
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('SERVICE STATUS');
    lines.push('─'.repeat(70));
    lines.push('◎ Log Ingestion        [  OK  ]  Uptime: 7d 12h, EPS: 1,850 (Avg: 1,700)');
    lines.push('! Correlation Engine   [ WARN ]  Uptime: 7d 11h, Alerts/min: 5 (since 13:55)');
    lines.push('                                 -> Rule evaluation latency high (150ms, threshold 100ms)');
    lines.push('◎ KQL Analytics Engine [  OK  ]  Uptime: 7d 12h, Avg Query Time: 80ms');
    lines.push('◎ Search API           [  OK  ]  Uptime: 7d 12h, Concurrent Queries: 12');
    lines.push('✖ Auth Service         [ ERROR ] Uptime: 0d 0h 5m, Error: DB Connection Failed');
    lines.push('                                 -> Last Error: 2025-06-04 13:58:15 - "FATAL: password authentication failed"');
    lines.push('? Database             [ UNKNOWN ] Status unconfirmed. Possible network issue.');
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('SYSTEM RESOURCES (Host: siem-prod-01)');
    lines.push('─'.repeat(70));
    lines.push('CPU: 75% [▇▇▇-------] | Mem: 85% [▇▇▇▇▇▇▇---] (34GB/40GB) | Disk: 92% [▇▇▇▇▇▇▇▇▇-]');
    lines.push('Net I/O: In: 250 Mbps / Out: 80 Mbps');
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('RECENT CRITICAL ALERTS (Last 15 minutes)');
    lines.push('─'.repeat(70));
    lines.push('[CRITICAL] Brute Force Detected on User \'admin\' from 192.168.1.10 (5 attempts)');
    lines.push('[CRITICAL] Auth Service Database Connection Failed');
    lines.push('[HIGH] Unusual Data Transfer from Endpoint \'HR-WS-007\' to External IP');

    return lines.join('\n');
  }

  destroy(): void {
    this.screen.destroy();
  }
}