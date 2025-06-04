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
exports.EnhancedStatusDisplayUI = void 0;
const blessed = __importStar(require("blessed"));
const status_formatter_1 = require("../utils/status-formatter");
const chalk_1 = __importDefault(require("chalk"));
const moment_1 = __importDefault(require("moment"));
/**
 * Enhanced status display implementation matching user requirements
 * Provides comprehensive, actionable infrastructure status representation
 */
class EnhancedStatusDisplayUI {
    screen;
    container;
    currentData = null;
    constructor() {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'SecureWatch SIEM Status - Enhanced View',
            fullUnicode: true
        });
        this.setupLayout();
        this.setupKeyBindings();
    }
    setupLayout() {
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
    setupKeyBindings() {
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
    update(data) {
        this.currentData = data;
        this.render();
    }
    /**
     * Render the enhanced status display
     */
    render() {
        if (!this.currentData)
            return;
        const content = this.generateEnhancedStatusContent();
        this.container.setContent(content);
        this.screen.render();
    }
    /**
     * Generate enhanced status content matching user requirements
     */
    generateEnhancedStatusContent() {
        if (!this.currentData)
            return '';
        const lines = [];
        const timestamp = (0, moment_1.default)(this.currentData.lastUpdated).format('YYYY-MM-DD HH:mm:ss CDT');
        // Header with overall system health
        lines.push(chalk_1.default.bold.white(`SecureWatch SIEM Status (Last Updated: ${timestamp})`));
        lines.push('');
        lines.push(status_formatter_1.StatusFormatter.formatSystemHealth(this.currentData.systemHealth));
        lines.push('');
        lines.push(chalk_1.default.gray('─'.repeat(80)));
        lines.push(chalk_1.default.bold.white('SERVICE STATUS'));
        lines.push(chalk_1.default.gray('─'.repeat(80)));
        // Enhanced service status display
        this.currentData.services.forEach(service => {
            const detailedLines = status_formatter_1.StatusFormatter.formatDetailedServiceStatus(service);
            lines.push(...detailedLines);
        });
        // Add Docker services
        if (this.currentData.dockerServices.length > 0) {
            lines.push('');
            lines.push(chalk_1.default.bold.white('INFRASTRUCTURE SERVICES'));
            lines.push(chalk_1.default.gray('─'.repeat(40)));
            this.currentData.dockerServices.forEach(dockerService => {
                const status = dockerService.status.includes('Up') ? 'operational' : 'critical';
                const indicator = status_formatter_1.StatusFormatter.getStatusIndicator(status);
                const uptime = dockerService.uptime ? ` (${status_formatter_1.StatusFormatter.formatUptime(dockerService.uptime)})` : '';
                lines.push(`${indicator.symbol} ${dockerService.name.padEnd(20)} [${indicator.label}]${uptime}`);
            });
        }
        // System resources with enhanced progress bars
        lines.push('');
        lines.push(chalk_1.default.gray('─'.repeat(80)));
        lines.push(chalk_1.default.bold.white(`SYSTEM RESOURCES (Host: ${process.env.HOSTNAME || 'siem-local'})`));
        lines.push(chalk_1.default.gray('─'.repeat(80)));
        const resourceLines = status_formatter_1.StatusFormatter.formatSystemResources(this.currentData.systemResources);
        lines.push(...resourceLines);
        // Recent critical alerts
        const criticalAlerts = this.currentData.recentAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high').slice(0, 5);
        if (criticalAlerts.length > 0) {
            lines.push('');
            lines.push(chalk_1.default.gray('─'.repeat(80)));
            lines.push(chalk_1.default.bold.white('RECENT CRITICAL ALERTS (Last 15 minutes)'));
            lines.push(chalk_1.default.gray('─'.repeat(80)));
            criticalAlerts.forEach(alert => {
                lines.push(status_formatter_1.StatusFormatter.formatAlert(alert));
            });
        }
        // Recent logs with enhanced formatting
        if (this.currentData.recentLogs.length > 0) {
            lines.push('');
            lines.push(chalk_1.default.gray('─'.repeat(80)));
            lines.push(chalk_1.default.bold.white('RECENT SYSTEM EVENTS'));
            lines.push(chalk_1.default.gray('─'.repeat(80)));
            this.currentData.recentLogs.slice(0, 10).forEach(log => {
                lines.push(status_formatter_1.StatusFormatter.formatLogEntry(log));
            });
        }
        // Troubleshooting section for degraded services
        const problematicServices = this.currentData.services.filter(service => service.status !== 'operational' && service.status !== 'maintenance');
        if (problematicServices.length > 0) {
            lines.push('');
            lines.push(chalk_1.default.gray('─'.repeat(80)));
            lines.push(chalk_1.default.bold.white('TROUBLESHOOTING COMMANDS'));
            lines.push(chalk_1.default.gray('─'.repeat(80)));
            problematicServices.forEach(service => {
                const suggestions = status_formatter_1.StatusFormatter.generateTroubleshootingText(service);
                if (suggestions.length > 0) {
                    lines.push(chalk_1.default.bold.yellow(`${service.name}:`));
                    suggestions.forEach(suggestion => {
                        lines.push(`  → ${suggestion}`);
                    });
                    lines.push('');
                }
            });
        }
        // Footer with keyboard shortcuts
        lines.push('');
        lines.push(chalk_1.default.gray('─'.repeat(80)));
        lines.push(chalk_1.default.bold.white('CONTROLS'));
        lines.push(chalk_1.default.gray('─'.repeat(80)));
        lines.push('Press {bold}r{/bold} or {bold}F5{/bold} to refresh • {bold}q{/bold} or {bold}Esc{/bold} to quit');
        lines.push('');
        // Performance metrics
        const healthyServices = this.currentData.services.filter(s => s.status === 'operational').length;
        const totalServices = this.currentData.services.length;
        const uptimePercentage = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0;
        lines.push(chalk_1.default.gray(`Platform Uptime: ${uptimePercentage}% • Services: ${healthyServices}/${totalServices} operational • Last Check: ${(0, moment_1.default)().format('HH:mm:ss')}`));
        return lines.join('\n');
    }
    /**
     * Generate example status display as shown in user requirements
     */
    static generateExampleDisplay() {
        const lines = [];
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
    destroy() {
        this.screen.destroy();
    }
}
exports.EnhancedStatusDisplayUI = EnhancedStatusDisplayUI;
//# sourceMappingURL=enhanced-status-display.ui.js.map