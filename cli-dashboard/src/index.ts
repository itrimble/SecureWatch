#!/usr/bin/env node

import { Command } from 'commander';
import { DataService } from './services/data.service';
import { DashboardUI } from './ui/dashboard.ui';
import { EnhancedDashboardUI } from './ui/enhanced-dashboard.ui';
import { ServiceControlService } from './services/control.service';
import { defaultConfig } from './config/dashboard.config';
import chalk from 'chalk';
import Table from 'cli-table3';

const program = new Command();

program
  .name('securewatch-cli')
  .description('SecureWatch SIEM CLI Dashboard for administrators and engineers')
  .version('2.0.0');

program
  .command('dashboard')
  .alias('dash')
  .description('Start the interactive dashboard')
  .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '5')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-e, --enhanced', 'Use enhanced dashboard with service controls')
  .action(async (options) => {
    try {
      const config = { ...defaultConfig };
      if (options.refresh) {
        config.refreshInterval = parseInt(options.refresh) * 1000;
      }

      console.log(chalk.blue.bold('🛡️  SecureWatch SIEM Dashboard'));
      console.log(chalk.gray('Starting dashboard...'));

      const dataService = new DataService(config);
      
      // Use enhanced dashboard if flag is set
      const ui = options.enhanced 
        ? new EnhancedDashboardUI(config) 
        : new DashboardUI(config);

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
  .command('enhanced')
  .description('Start the enhanced dashboard with service controls')
  .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '5')
  .action(async (options) => {
    // Shortcut to launch enhanced dashboard directly
    const dashCommand = program.commands.find(cmd => cmd.name() === 'dashboard');
    if (dashCommand) {
      await dashCommand.parseAsync(['', '', '--enhanced', '--refresh', options.refresh || '5'], { from: 'user' });
    }
  });

program
  .command('control <action> <service>')
  .description('Control services (start/stop/restart)')
  .action(async (action, service) => {
    try {
      const controlService = new ServiceControlService();
      
      console.log(chalk.blue(`${action}ing ${service}...`));
      
      let result;
      switch (action) {
        case 'start':
          result = await controlService.startService(service);
          break;
        case 'stop':
          result = await controlService.stopService(service);
          break;
        case 'restart':
          result = await controlService.restartService(service);
          break;
        default:
          console.error(chalk.red(`Unknown action: ${action}. Use start/stop/restart`));
          process.exit(1);
      }
      
      if (result.success) {
        console.log(chalk.green(`✓ ${result.message}`));
        if (result.output) {
          console.log(chalk.gray(result.output));
        }
      } else {
        console.error(chalk.red(`✗ ${result.message}`));
        if (result.output) {
          console.error(chalk.gray(result.output));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Control command failed:'), error);
      process.exit(1);
    }
  });

program
  .command('start-all')
  .description('Start all SecureWatch services')
  .action(async () => {
    try {
      const controlService = new ServiceControlService();
      
      console.log(chalk.blue.bold('Starting all SecureWatch services...'));
      
      const results = await controlService.startAllServices();
      
      results.forEach(result => {
        if (result.success) {
          console.log(chalk.green(`✓ ${result.message}`));
        } else {
          console.log(chalk.red(`✗ ${result.message}`));
        }
      });
      
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        console.log(chalk.green.bold('\n✓ All services started successfully'));
      } else {
        console.log(chalk.yellow.bold('\n⚠ Some services failed to start'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Failed to start services:'), error);
      process.exit(1);
    }
  });

program
  .command('stop-all')
  .description('Stop all SecureWatch services')
  .action(async () => {
    try {
      const controlService = new ServiceControlService();
      
      console.log(chalk.blue.bold('Stopping all SecureWatch services...'));
      
      const results = await controlService.stopAllServices();
      
      results.forEach(result => {
        if (result.success) {
          console.log(chalk.green(`✓ ${result.message}`));
        } else {
          console.log(chalk.red(`✗ ${result.message}`));
        }
      });
      
      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        console.log(chalk.green.bold('\n✓ All services stopped successfully'));
      } else {
        console.log(chalk.yellow.bold('\n⚠ Some services failed to stop'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to stop services:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show quick status of all services')
  .option('-j, --json', 'Output in JSON format')
  .option('-d, --detailed', 'Show detailed status including all services')
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
        head: ['Service', 'Status', 'Uptime', 'Response Time', 'Port'].map(h => chalk.cyan(h)),
        colWidths: [25, 15, 15, 15, 10]
      });

      // Include all services if detailed flag is set
      if (options.detailed) {
        // Show microservices
        data.services.forEach(service => {
          const statusColor = service.status === 'healthy' ? chalk.green : 
                             service.status === 'degraded' ? chalk.yellow : chalk.red;
          
          servicesTable.push([
            service.name,
            statusColor(service.status || 'unknown'),
            service.uptime ? formatUptime(service.uptime) : 'N/A',
            service.responseTime ? `${service.responseTime}ms` : 'N/A',
            service.port?.toString() || 'N/A'
          ]);
        });

        // Show Docker services
        data.dockerServices.forEach(service => {
          const statusColor = service.status.includes('Up') ? chalk.green : chalk.red;
          
          servicesTable.push([
            service.name,
            statusColor(service.status),
            service.uptime ? formatUptime(service.uptime) : 'N/A',
            'N/A', // Docker services don't have response time
            service.port?.toString() || 'N/A'
          ]);
        });
      } else {
        // Show only microservices
        data.services.forEach(service => {
          const statusColor = service.status === 'healthy' ? chalk.green : 
                             service.status === 'degraded' ? chalk.yellow : chalk.red;
          
          servicesTable.push([
            service.name,
            statusColor(service.status || 'unknown'),
            service.uptime ? formatUptime(service.uptime) : 'N/A',
            service.responseTime ? `${service.responseTime}ms` : 'N/A',
            service.port?.toString() || 'N/A'
          ]);
        });
      }

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

      // Quick summary
      const healthyMicroservices = data.services.filter(s => s.status === 'healthy').length;
      const totalMicroservices = data.services.length;
      const healthyInfrastructure = data.dockerServices.filter(s => s.status.includes('Up')).length;
      const totalInfrastructure = data.dockerServices.length;
      
      if (options.detailed) {
        const totalHealthy = healthyMicroservices + healthyInfrastructure;
        const total = totalMicroservices + totalInfrastructure;
        const healthPercentage = (totalHealthy / total) * 100;
        console.log(`\nOverall Health: ${getHealthColor(healthPercentage)(healthPercentage.toFixed(0) + '%')} (${totalHealthy}/${total} services healthy)`);
      } else {
        const healthPercentage = (healthyMicroservices / totalMicroservices) * 100;
        console.log(`\nOverall Health: ${getHealthColor(healthPercentage)(healthPercentage.toFixed(0) + '%')} (${healthyMicroservices}/${totalMicroservices} services healthy)`);
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
  .option('-f, --follow', 'Follow log output (tail -f)')
  .action(async (options) => {
    try {
      if (options.service && options.follow) {
        // Use control service for following specific service logs
        const controlService = new ServiceControlService();
        console.log(chalk.blue.bold(`\n📋 Following logs for ${options.service}:\n`));
        console.log(chalk.gray('Press Ctrl+C to stop...\n'));
        
        // This would need to be implemented with a proper tail follow mechanism
        const logs = await controlService.getServiceLogs(options.service, parseInt(options.lines));
        logs.forEach(line => console.log(line));
        
        // Keep process alive for follow mode
        process.stdin.resume();
      } else {
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
      }
    } catch (error) {
      console.error(chalk.red('Failed to get logs:'), error);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check health of all services')
  .option('-v, --verbose', 'Show detailed health information')
  .action(async (options) => {
    try {
      const dataService = new DataService(defaultConfig);
      const controlService = new ServiceControlService();
      const data = await dataService.collectDashboardData();
      
      console.log(chalk.blue.bold('\n🏥 Health Check Results:\n'));
      
      // Check all services including Docker
      const allServices = new Map();
      
      // Add microservices
      data.services.forEach(service => {
        allServices.set(service.name, {
          status: service.status,
          error: service.error,
          responseTime: service.responseTime,
          uptime: service.uptime
        });
      });
      
      // Add Docker services
      if (options.verbose) {
        const dockerHealth = await controlService.healthCheckAll();
        dockerHealth.forEach((isHealthy, serviceName) => {
          if (!allServices.has(serviceName)) {
            allServices.set(serviceName, {
              status: isHealthy ? 'healthy' : 'unhealthy',
              error: isHealthy ? null : 'Service not running'
            });
          }
        });
      }
      
      let allHealthy = true;
      allServices.forEach((service, name) => {
        const statusIcon = service.status === 'healthy' ? '✅' :
                          service.status === 'degraded' ? '⚠️' : '❌';
        
        console.log(`${statusIcon} ${name}: ${service.status}`);
        
        if (options.verbose && service.status === 'healthy') {
          if (service.responseTime) {
            console.log(`   Response time: ${service.responseTime}ms`);
          }
          if (service.uptime) {
            console.log(`   Uptime: ${formatUptime(service.uptime)}`);
          }
        }
        
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
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function getHealthColor(percentage: number) {
  if (percentage >= 90) return chalk.green;
  if (percentage >= 70) return chalk.yellow;
  return chalk.red;
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