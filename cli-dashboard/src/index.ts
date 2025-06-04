#!/usr/bin/env node

import { Command } from 'commander';
import { DataService } from './services/data.service';
import { DashboardUI } from './ui/dashboard.ui';
import { defaultConfig } from './config/dashboard.config';
import chalk from 'chalk';
import Table from 'cli-table3';

const program = new Command();

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
      const config = { ...defaultConfig };
      if (options.refresh) {
        config.refreshInterval = parseInt(options.refresh) * 1000;
      }

      console.log(chalk.blue.bold('🛡️  SecureWatch SIEM Dashboard'));
      console.log(chalk.gray('Starting dashboard...'));

      const dataService = new DataService(config);
      const ui = new DashboardUI(config);

      // Initial data load
      const initialData = await dataService.collectDashboardData();
      ui.update(initialData);

      // Set up periodic updates
      const refreshInterval = setInterval(async () => {
        try {
          const data = await dataService.collectDashboardData();
          ui.update(data);
        } catch (error) {
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
    } catch (error) {
      console.error(chalk.red('Failed to start dashboard:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show quick status of all services')
  .option('-j, --json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const dataService = new DataService(defaultConfig);
      const data = await dataService.collectDashboardData();

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log(chalk.blue.bold('\n🛡️  SecureWatch SIEM Status'));
      console.log(chalk.gray(`Last updated: ${data.lastUpdated.toISOString()}\n`));

      // Services Table
      const servicesTable = new Table({
        head: ['Service', 'Status', 'Uptime', 'Response Time'].map(h => chalk.cyan(h)),
        colWidths: [20, 15, 15, 15]
      });

      data.services.forEach(service => {
        const statusColor = service.status === 'healthy' ? chalk.green : 
                           service.status === 'degraded' ? chalk.yellow : chalk.red;
        
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
      const resourcesTable = new Table({
        head: ['Resource', 'Used', 'Total', 'Percentage'].map(h => chalk.cyan(h)),
        colWidths: [15, 15, 15, 15]
      });

      const cpu = data.systemResources.cpu;
      const memory = data.systemResources.memory;
      const disk = data.systemResources.disk;

      resourcesTable.push(
        ['CPU', `${cpu.percentage.toFixed(1)}%`, '100%', `${cpu.percentage.toFixed(1)}%`],
        ['Memory', `${memory.usedMB}MB`, `${memory.totalMB}MB`, `${memory.percentage}%`],
        ['Disk', `${disk.usedGB}GB`, `${disk.totalGB}GB`, `${disk.percentage}%`]
      );

      console.log('\nSystem Resources:');
      console.log(resourcesTable.toString());

      // Recent Alerts
      if (data.recentAlerts.length > 0) {
        console.log('\nRecent Alerts:');
        data.recentAlerts.slice(0, 5).forEach(alert => {
          const severityColor = alert.severity === 'critical' ? chalk.red :
                                alert.severity === 'high' ? chalk.red :
                                alert.severity === 'medium' ? chalk.yellow : chalk.blue;
          
          console.log(`  ${severityColor('●')} ${alert.title} (${alert.source})`);
        });
      }

    } catch (error) {
      console.error(chalk.red('Failed to get status:'), error);
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
      const dataService = new DataService(defaultConfig);
      
      if (options.service) {
        const logs = await dataService.getLogTail(options.service, parseInt(options.lines));
        console.log(chalk.blue.bold(`\n📋 Recent logs for ${options.service}:\n`));
        
        logs.forEach(log => {
          const levelColor = log.level === 'error' ? chalk.red :
                            log.level === 'warn' ? chalk.yellow :
                            log.level === 'info' ? chalk.blue : chalk.gray;
          
          console.log(`${chalk.gray(log.timestamp.toISOString())} ${levelColor(log.level.toUpperCase())} ${log.message}`);
        });
      } else {
        const data = await dataService.collectDashboardData();
        console.log(chalk.blue.bold('\n📋 Recent logs from all services:\n'));
        
        data.recentLogs.slice(0, parseInt(options.lines)).forEach(log => {
          const levelColor = log.level === 'error' ? chalk.red :
                            log.level === 'warn' ? chalk.yellow :
                            log.level === 'info' ? chalk.blue : chalk.gray;
          
          console.log(`${chalk.gray(log.timestamp.toISOString())} ${levelColor(log.level.toUpperCase())} ${chalk.cyan(log.service)} ${log.message}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('Failed to get logs:'), error);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check health of all services')
  .action(async () => {
    try {
      const dataService = new DataService(defaultConfig);
      const data = await dataService.collectDashboardData();
      
      console.log(chalk.blue.bold('\n🏥 Health Check Results:\n'));
      
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
    } catch (error) {
      console.error(chalk.red('Health check failed:'), error);
      process.exit(1);
    }
  });

function formatUptime(uptime: number): string {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

program.parse();