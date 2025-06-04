#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const data_service_1 = require("./services/data.service");
const dashboard_ui_1 = require("./ui/dashboard.ui");
const dashboard_config_1 = require("./config/dashboard.config");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const program = new commander_1.Command();
program
    .name('securewatch-cli')
    .description('SecureWatch SIEM CLI Dashboard for administrators and engineers')
    .version('1.0.0');
program
    .command('dashboard')
    .alias('dash')
    .description('Start the interactive dashboard')
    .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '5')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (options) => {
    try {
        const config = { ...dashboard_config_1.defaultConfig };
        if (options.refresh) {
            config.refreshInterval = parseInt(options.refresh) * 1000;
        }
        console.log(chalk_1.default.blue.bold('🛡️  SecureWatch SIEM Dashboard'));
        console.log(chalk_1.default.gray('Starting dashboard...'));
        const dataService = new data_service_1.DataService(config);
        const ui = new dashboard_ui_1.DashboardUI(config);
        // Initial data load
        const initialData = await dataService.collectDashboardData();
        ui.update(initialData);
        // Set up periodic updates
        const refreshInterval = setInterval(async () => {
            try {
                const data = await dataService.collectDashboardData();
                ui.update(data);
            }
            catch (error) {
                console.error('Failed to update dashboard data:', error);
            }
        }, config.refreshInterval);
        // Cleanup on exit
        process.on('SIGINT', () => {
            clearInterval(refreshInterval);
            ui.destroy();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            clearInterval(refreshInterval);
            ui.destroy();
            process.exit(0);
        });
        ui.render();
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to start dashboard:'), error);
        process.exit(1);
    }
});
program
    .command('status')
    .description('Show quick status of all services')
    .option('-j, --json', 'Output in JSON format')
    .action(async (options) => {
    try {
        const dataService = new data_service_1.DataService(dashboard_config_1.defaultConfig);
        const data = await dataService.collectDashboardData();
        if (options.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        console.log(chalk_1.default.blue.bold('\n🛡️  SecureWatch SIEM Status'));
        console.log(chalk_1.default.gray(`Last updated: ${data.lastUpdated.toISOString()}\n`));
        // Services Table
        const servicesTable = new cli_table3_1.default({
            head: ['Service', 'Status', 'Uptime', 'Response Time'].map(h => chalk_1.default.cyan(h)),
            colWidths: [20, 15, 15, 15]
        });
        data.services.forEach(service => {
            const statusColor = service.status === 'healthy' ? chalk_1.default.green :
                service.status === 'degraded' ? chalk_1.default.yellow : chalk_1.default.red;
            servicesTable.push([
                service.name,
                statusColor(service.status),
                service.uptime ? formatUptime(service.uptime) : 'N/A',
                service.responseTime ? `${service.responseTime}ms` : 'N/A'
            ]);
        });
        console.log('Services:');
        console.log(servicesTable.toString());
        // System Resources
        const resourcesTable = new cli_table3_1.default({
            head: ['Resource', 'Used', 'Total', 'Percentage'].map(h => chalk_1.default.cyan(h)),
            colWidths: [15, 15, 15, 15]
        });
        const cpu = data.systemResources.cpu;
        const memory = data.systemResources.memory;
        const disk = data.systemResources.disk;
        resourcesTable.push(['CPU', `${cpu.percentage.toFixed(1)}%`, '100%', `${cpu.percentage.toFixed(1)}%`], ['Memory', `${memory.usedMB}MB`, `${memory.totalMB}MB`, `${memory.percentage}%`], ['Disk', `${disk.usedGB}GB`, `${disk.totalGB}GB`, `${disk.percentage}%`]);
        console.log('\nSystem Resources:');
        console.log(resourcesTable.toString());
        // Recent Alerts
        if (data.recentAlerts.length > 0) {
            console.log('\nRecent Alerts:');
            data.recentAlerts.slice(0, 5).forEach(alert => {
                const severityColor = alert.severity === 'critical' ? chalk_1.default.red :
                    alert.severity === 'high' ? chalk_1.default.red :
                        alert.severity === 'medium' ? chalk_1.default.yellow : chalk_1.default.blue;
                console.log(`  ${severityColor('●')} ${alert.title} (${alert.source})`);
            });
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to get status:'), error);
        process.exit(1);
    }
});
program
    .command('logs')
    .description('Show recent logs from services')
    .option('-s, --service <name>', 'Show logs for specific service')
    .option('-n, --lines <number>', 'Number of lines to show', '20')
    .action(async (options) => {
    try {
        const dataService = new data_service_1.DataService(dashboard_config_1.defaultConfig);
        if (options.service) {
            const logs = await dataService.getLogTail(options.service, parseInt(options.lines));
            console.log(chalk_1.default.blue.bold(`\n📋 Recent logs for ${options.service}:\n`));
            logs.forEach(log => {
                const levelColor = log.level === 'error' ? chalk_1.default.red :
                    log.level === 'warn' ? chalk_1.default.yellow :
                        log.level === 'info' ? chalk_1.default.blue : chalk_1.default.gray;
                console.log(`${chalk_1.default.gray(log.timestamp.toISOString())} ${levelColor(log.level.toUpperCase())} ${log.message}`);
            });
        }
        else {
            const data = await dataService.collectDashboardData();
            console.log(chalk_1.default.blue.bold('\n📋 Recent logs from all services:\n'));
            data.recentLogs.slice(0, parseInt(options.lines)).forEach(log => {
                const levelColor = log.level === 'error' ? chalk_1.default.red :
                    log.level === 'warn' ? chalk_1.default.yellow :
                        log.level === 'info' ? chalk_1.default.blue : chalk_1.default.gray;
                console.log(`${chalk_1.default.gray(log.timestamp.toISOString())} ${levelColor(log.level.toUpperCase())} ${chalk_1.default.cyan(log.service)} ${log.message}`);
            });
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to get logs:'), error);
        process.exit(1);
    }
});
program
    .command('health')
    .description('Check health of all services')
    .action(async () => {
    try {
        const dataService = new data_service_1.DataService(dashboard_config_1.defaultConfig);
        const data = await dataService.collectDashboardData();
        console.log(chalk_1.default.blue.bold('\n🏥 Health Check Results:\n'));
        let allHealthy = true;
        data.services.forEach(service => {
            const statusIcon = service.status === 'healthy' ? '✅' :
                service.status === 'degraded' ? '⚠️' : '❌';
            console.log(`${statusIcon} ${service.name}: ${service.status}`);
            if (service.status !== 'healthy') {
                allHealthy = false;
                if (service.error) {
                    console.log(`   Error: ${service.error}`);
                }
            }
        });
        console.log(`\n${allHealthy ? '✅' : '❌'} Overall Status: ${allHealthy ? 'All systems operational' : 'Some issues detected'}`);
        process.exit(allHealthy ? 0 : 1);
    }
    catch (error) {
        console.error(chalk_1.default.red('Health check failed:'), error);
        process.exit(1);
    }
});
function formatUptime(uptime) {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    else {
        return `${minutes}m`;
    }
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Uncaught Exception:'), error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Unhandled Rejection at:'), promise, chalk_1.default.red('reason:'), reason);
    process.exit(1);
});
program.parse();
//# sourceMappingURL=index.js.map