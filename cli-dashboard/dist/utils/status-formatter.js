"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusFormatter = void 0;
const chalk_1 = __importDefault(require("chalk"));
const moment_1 = __importDefault(require("moment"));
/**
 * Enhanced status formatter for SecureWatch CLI Dashboard
 * Provides granular status representation with visual indicators and context
 */
class StatusFormatter {
    /**
     * Get status symbol and color for service status
     */
    static getStatusIndicator(status) {
        const indicators = {
            operational: { symbol: '●', color: 'green', label: 'OK' },
            degraded: { symbol: '!', color: 'yellow', label: 'WARN' },
            critical: { symbol: '✖', color: 'red', label: 'ERROR' },
            maintenance: { symbol: '⚙', color: 'blue', label: 'MAINT' },
            warning: { symbol: '⚠', color: 'yellow', label: 'WARN' },
            unknown: { symbol: '?', color: 'gray', label: 'UNKNOWN' }
        };
        return indicators[status] || indicators.unknown;
    }
    /**
     * Format service status with enhanced visual representation
     */
    static formatServiceStatus(service, includeDetails = true) {
        const indicator = this.getStatusIndicator(service.status);
        const statusDisplay = `[  ${indicator.label}  ]`;
        let output = `${indicator.symbol} ${service.name.padEnd(20)} ${chalk_1.default[indicator.color](statusDisplay)}`;
        if (includeDetails && service.uptime) {
            const uptime = this.formatUptime(service.uptime);
            output += ` Uptime: ${uptime}`;
        }
        // Add KPIs if available
        if (includeDetails && service.kpis) {
            const kpiDisplay = Object.entries(service.kpis)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            output += `, ${kpiDisplay}`;
        }
        // Add status duration
        if (includeDetails && service.statusDuration) {
            const duration = this.formatDuration(service.statusDuration);
            output += ` (${duration})`;
        }
        return output;
    }
    /**
     * Format service status with detailed context and troubleshooting info
     */
    static formatDetailedServiceStatus(service) {
        const lines = [];
        const indicator = this.getStatusIndicator(service.status);
        // Main status line
        lines.push(this.formatServiceStatus(service, true));
        // Add detailed context for non-operational services
        if (service.status !== 'operational') {
            // Show threshold breaches
            if (service.thresholds) {
                Object.entries(service.thresholds).forEach(([metric, threshold]) => {
                    if (threshold.current > threshold.threshold) {
                        lines.push(`                                 -> ${metric}: ${threshold.current}${threshold.unit} (threshold ${threshold.threshold}${threshold.unit})`);
                    }
                });
            }
            // Show recent error
            if (service.error) {
                const timestamp = (0, moment_1.default)(service.lastChecked).format('YYYY-MM-DD HH:mm:ss');
                lines.push(`                                 -> Last Error: ${timestamp} - "${service.error}"`);
            }
            // Show impact
            if (service.impact) {
                lines.push(`                                 -> Impact: ${service.impact}`);
            }
            // Show troubleshooting commands
            if (service.troubleshooting?.commands && service.troubleshooting.commands.length > 0) {
                lines.push(`                                 -> Run: ${service.troubleshooting.commands[0]}`);
            }
        }
        return lines;
    }
    /**
     * Format system health overview
     */
    static formatSystemHealth(health) {
        const indicator = this.getStatusIndicator(health.overall);
        const healthBar = this.createHealthBar(health.score);
        return `[ OVERALL HEALTH: ${chalk_1.default[indicator.color](health.overall.toUpperCase())} ] Score: ${health.score}% ${healthBar}\n` +
            `${health.summary} (${health.criticalIssues} critical, ${health.degradedServices}/${health.totalServices} services degraded)`;
    }
    /**
     * Format alert with enhanced context
     */
    static formatAlert(alert) {
        const severityColors = {
            critical: 'red',
            high: 'magenta',
            medium: 'yellow',
            low: 'cyan'
        };
        const color = severityColors[alert.severity] || 'white';
        const timestamp = (0, moment_1.default)(alert.timestamp).format('HH:mm:ss');
        const duration = alert.duration ? ` (${this.formatDuration(alert.duration)})` : '';
        let output = `[${chalk_1.default[color](alert.severity.toUpperCase())}] ${alert.title} (${timestamp}${duration})`;
        if (alert.affectedUsers && alert.affectedUsers > 0) {
            output += ` - Affecting ${alert.affectedUsers} users`;
        }
        return output;
    }
    /**
     * Format system resources with progress bars
     */
    static formatSystemResources(resources) {
        const lines = [];
        // CPU
        const cpuBar = this.createProgressBar(resources.cpu.percentage, 100);
        const cpuColor = resources.cpu.percentage > 80 ? 'red' : resources.cpu.percentage > 60 ? 'yellow' : 'green';
        lines.push(`CPU: ${resources.cpu.percentage}% ${chalk_1.default[cpuColor](cpuBar)}`);
        // Memory
        const memBar = this.createProgressBar(resources.memory.percentage, 100);
        const memColor = resources.memory.percentage > 85 ? 'red' : resources.memory.percentage > 70 ? 'yellow' : 'green';
        lines.push(`Mem: ${resources.memory.percentage}% ${chalk_1.default[memColor](memBar)} (${Math.round(resources.memory.usedMB / 1024)}GB/${Math.round(resources.memory.totalMB / 1024)}GB)`);
        // Disk
        const diskBar = this.createProgressBar(resources.disk.percentage, 100);
        const diskColor = resources.disk.percentage > 90 ? 'red' : resources.disk.percentage > 75 ? 'yellow' : 'green';
        lines.push(`Disk: ${resources.disk.percentage}% ${chalk_1.default[diskColor](diskBar)} (${resources.disk.freeGB}GB free)`);
        // Network (if available)
        if (resources.network) {
            lines.push(`Net I/O: In: ${resources.network.inMbps} Mbps / Out: ${resources.network.outMbps} Mbps`);
        }
        return lines;
    }
    /**
     * Create ASCII progress bar
     */
    static createProgressBar(current, max, width = 10) {
        const percentage = Math.min(current / max, 1);
        const filledWidth = Math.round(percentage * width);
        const filled = '▇'.repeat(filledWidth);
        const empty = '-'.repeat(width - filledWidth);
        return `[${filled}${empty}]`;
    }
    /**
     * Create health score bar
     */
    static createHealthBar(score) {
        const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
        const bar = this.createProgressBar(score, 100);
        return chalk_1.default[color](bar);
    }
    /**
     * Format uptime duration
     */
    static formatUptime(uptimeSeconds) {
        const duration = moment_1.default.duration(uptimeSeconds, 'seconds');
        if (duration.asDays() >= 1) {
            return `${Math.floor(duration.asDays())}d ${duration.hours()}h`;
        }
        else if (duration.asHours() >= 1) {
            return `${Math.floor(duration.asHours())}h ${duration.minutes()}m`;
        }
        else {
            return `${duration.minutes()}m ${duration.seconds()}s`;
        }
    }
    /**
     * Format general duration
     */
    static formatDuration(seconds) {
        const duration = moment_1.default.duration(seconds, 'seconds');
        if (duration.asDays() >= 1) {
            return `${Math.floor(duration.asDays())}d ago`;
        }
        else if (duration.asHours() >= 1) {
            return `${Math.floor(duration.asHours())}h ago`;
        }
        else if (duration.asMinutes() >= 1) {
            return `${Math.floor(duration.asMinutes())}m ago`;
        }
        else {
            return `${duration.seconds()}s ago`;
        }
    }
    /**
     * Format log entry with level indicators
     */
    static formatLogEntry(entry) {
        const levelColors = {
            error: 'red',
            warn: 'yellow',
            info: 'cyan',
            debug: 'gray'
        };
        const color = levelColors[entry.level] || 'white';
        const timestamp = (0, moment_1.default)(entry.timestamp).format('HH:mm:ss');
        const level = `[${entry.level.toUpperCase()}]`.padEnd(7);
        return `${timestamp} ${chalk_1.default[color](level)} ${entry.service}: ${entry.message}`;
    }
    /**
     * Generate troubleshooting suggestions for a service
     */
    static generateTroubleshootingText(service) {
        const suggestions = [];
        if (service.status === 'unknown') {
            suggestions.push(`Check if ${service.name} is running: docker ps | grep ${service.name.toLowerCase()}`);
            suggestions.push(`View logs: docker logs ${service.name.toLowerCase()}`);
        }
        else if (service.status === 'critical') {
            suggestions.push(`Restart service: docker restart ${service.name.toLowerCase()}`);
            suggestions.push(`Check recent logs: docker logs --tail 50 ${service.name.toLowerCase()}`);
        }
        else if (service.status === 'degraded') {
            suggestions.push(`Monitor performance: ./cli-dashboard.sh logs --service "${service.name}"`);
            suggestions.push(`Check system resources affecting this service`);
        }
        return suggestions;
    }
}
exports.StatusFormatter = StatusFormatter;
//# sourceMappingURL=status-formatter.js.map