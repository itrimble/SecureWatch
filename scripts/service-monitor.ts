#!/usr/bin/env npx tsx

/**
 * Service Monitor for SecureWatch SIEM
 * Monitors service startup and health status
 */

import axios from 'axios';
import winston from 'winston';

// Service configuration
const SERVICES = [
  { name: 'Frontend', url: 'http://localhost:4000', healthPath: '/' },
  { name: 'Search API', url: 'http://localhost:4004', healthPath: '/health' },
  { name: 'Log Ingestion', url: 'http://localhost:4002', healthPath: '/health' },
  { name: 'Correlation Engine', url: 'http://localhost:4005', healthPath: '/health' },
  { name: 'Auth Service', url: 'http://localhost:4006', healthPath: '/health' },
  { name: 'Query Processor', url: 'http://localhost:4008', healthPath: '/health' },
  { name: 'Analytics API', url: 'http://localhost:4009', healthPath: '/health' },
  { name: 'MCP Marketplace', url: 'http://localhost:4010', healthPath: '/health' },
];

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: '/tmp/service-monitor.log',
      format: winston.format.json()
    })
  ],
});

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

class ServiceMonitor {
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private alertThreshold = 3; // Alert after 3 consecutive failures
  private failureCounts: Map<string, number> = new Map();

  async checkServiceHealth(service: { name: string; url: string; healthPath: string }): Promise<ServiceStatus> {
    const startTime = Date.now();
    const healthUrl = `${service.url}${service.healthPath}`;

    try {
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      const responseTime = Date.now() - startTime;

      // Reset failure count on success
      this.failureCounts.set(service.name, 0);

      return {
        name: service.name,
        url: service.url,
        status: response.status < 400 ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date()
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Increment failure count
      const currentFailures = this.failureCounts.get(service.name) || 0;
      this.failureCounts.set(service.name, currentFailures + 1);

      return {
        name: service.name,
        url: service.url,
        status: 'unhealthy',
        responseTime,
        error: error.code || error.message,
        lastCheck: new Date()
      };
    }
  }

  async checkAllServices(): Promise<ServiceStatus[]> {
    logger.info('🔍 Checking health of all services...');
    
    const results = await Promise.all(
      SERVICES.map(service => this.checkServiceHealth(service))
    );

    // Update service statuses
    results.forEach(status => {
      this.serviceStatuses.set(status.name, status);
    });

    return results;
  }

  generateHealthReport(statuses: ServiceStatus[]): void {
    const healthy = statuses.filter(s => s.status === 'healthy').length;
    const total = statuses.length;
    
    logger.info(`📊 Service Health Report: ${healthy}/${total} services healthy`);
    
    statuses.forEach(status => {
      const icon = status.status === 'healthy' ? '✅' : '❌';
      const responseTime = status.responseTime ? `(${status.responseTime}ms)` : '';
      const error = status.error ? ` - ${status.error}` : '';
      
      logger.info(`${icon} ${status.name}: ${status.status} ${responseTime}${error}`);
    });

    // Check for services that need alerts
    this.checkForAlerts(statuses);
  }

  checkForAlerts(statuses: ServiceStatus[]): void {
    statuses.forEach(status => {
      const failureCount = this.failureCounts.get(status.name) || 0;
      
      if (status.status === 'unhealthy' && failureCount >= this.alertThreshold) {
        this.sendAlert(status, failureCount);
      }
    });
  }

  sendAlert(status: ServiceStatus, failureCount: number): void {
    const message = `🚨 ALERT: ${status.name} has been unhealthy for ${failureCount} consecutive checks`;
    
    logger.error(message, {
      service: status.name,
      url: status.url,
      status: status.status,
      error: status.error,
      failureCount,
      lastCheck: status.lastCheck
    });

    // In production, this could send alerts via:
    // - Slack webhook
    // - Email
    // - PagerDuty
    // - SMS
    // - Database record for dashboard alerts
  }

  async monitorContinuously(intervalSeconds: number = 30): Promise<void> {
    logger.info(`🚀 Starting continuous service monitoring (checking every ${intervalSeconds}s)`);
    
    // Initial check
    const initialStatuses = await this.checkAllServices();
    this.generateHealthReport(initialStatuses);

    // Set up periodic monitoring
    setInterval(async () => {
      try {
        const statuses = await this.checkAllServices();
        this.generateHealthReport(statuses);
      } catch (error) {
        logger.error('Error during health check:', error);
      }
    }, intervalSeconds * 1000);
  }

  async checkStartupHealth(): Promise<boolean> {
    logger.info('🔍 Checking service startup health...');
    
    const allHealthy = true;
    const maxRetries = 10;
    const retryDelay = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`Attempt ${attempt}/${maxRetries}`);
      
      const statuses = await this.checkAllServices();
      const unhealthyServices = statuses.filter(s => s.status !== 'healthy');
      
      if (unhealthyServices.length === 0) {
        logger.info('✅ All services are healthy!');
        this.generateHealthReport(statuses);
        return true;
      }

      logger.warn(`❌ ${unhealthyServices.length} services are unhealthy:`, 
        unhealthyServices.map(s => `${s.name} (${s.error || 'unknown error'})`));

      if (attempt < maxRetries) {
        logger.info(`⏳ Waiting ${retryDelay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    logger.error('❌ Service startup health check failed after maximum retries');
    return false;
  }

  async getServiceMetrics(): Promise<any> {
    const statuses = Array.from(this.serviceStatuses.values());
    const healthy = statuses.filter(s => s.status === 'healthy').length;
    const unhealthy = statuses.filter(s => s.status === 'unhealthy').length;
    
    const averageResponseTime = statuses
      .filter(s => s.responseTime)
      .reduce((sum, s) => sum + (s.responseTime || 0), 0) / statuses.length;

    return {
      timestamp: new Date().toISOString(),
      totalServices: statuses.length,
      healthyServices: healthy,
      unhealthyServices: unhealthy,
      healthPercentage: Math.round((healthy / statuses.length) * 100),
      averageResponseTime: Math.round(averageResponseTime),
      services: statuses.map(s => ({
        name: s.name,
        status: s.status,
        responseTime: s.responseTime,
        lastCheck: s.lastCheck
      }))
    };
  }
}

// CLI interface
async function main() {
  const monitor = new ServiceMonitor();
  const command = process.argv[2] || 'check';

  switch (command) {
    case 'check':
      logger.info('🔍 Single health check...');
      const statuses = await monitor.checkAllServices();
      monitor.generateHealthReport(statuses);
      break;

    case 'startup':
      logger.info('🚀 Checking service startup health...');
      const startupOk = await monitor.checkStartupHealth();
      process.exit(startupOk ? 0 : 1);
      break;

    case 'monitor':
      const interval = parseInt(process.argv[3]) || 30;
      await monitor.monitorContinuously(interval);
      break;

    case 'metrics':
      const metrics = await monitor.getServiceMetrics();
      console.log(JSON.stringify(metrics, null, 2));
      break;

    default:
      logger.info(`
Usage: npx tsx service-monitor.ts [command] [options]

Commands:
  check              Single health check of all services
  startup            Check if all services started successfully (for CI/CD)
  monitor [interval] Continuous monitoring (default: 30s interval)
  metrics            Get service metrics in JSON format

Examples:
  npx tsx service-monitor.ts check
  npx tsx service-monitor.ts startup
  npx tsx service-monitor.ts monitor 60
  npx tsx service-monitor.ts metrics
      `);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('👋 Service monitor shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Service monitor shutting down...');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Service monitor error:', error);
    process.exit(1);
  });
}

export { ServiceMonitor };