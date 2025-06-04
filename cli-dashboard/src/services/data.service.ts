import { ApiService } from './api.service';
import { SystemService } from './system.service';
import { DashboardData, ServiceStatus, ServiceMetrics, LogEntry, SystemHealth } from '../types';
import { DashboardConfig } from '../config/dashboard.config';

export class DataService {
  private apiService: ApiService;
  private systemService: SystemService;

  constructor(private config: DashboardConfig) {
    this.apiService = new ApiService(config.timeout);
    this.systemService = new SystemService();
  }

  async collectDashboardData(): Promise<DashboardData> {
    const startTime = Date.now();
    
    try {
      // Collect data from all sources in parallel
      const [
        services,
        metrics,
        dockerServices,
        systemResources,
        recentAlerts,
        recentLogs
      ] = await Promise.all([
        this.collectServiceStatuses(),
        this.collectServiceMetrics(),
        this.systemService.getDockerServices(this.config.dockerComposeFile),
        this.systemService.getSystemResources(),
        this.apiService.getRecentAlerts(),
        this.collectRecentLogs()
      ]);

      const collectionTime = Date.now() - startTime;
      
      // Calculate system health
      const systemHealth = this.calculateSystemHealth(services, recentAlerts);
      
      return {
        services,
        metrics,
        dockerServices,
        systemResources,
        recentAlerts,
        recentLogs,
        systemHealth,
        lastUpdated: new Date()
      };
    } catch (error) {
      // Return partial data even if some collection fails
      const emptySystemHealth: SystemHealth = {
        overall: 'critical',
        score: 0,
        summary: 'Unable to collect system health data',
        criticalIssues: 0,
        degradedServices: 0,
        totalServices: 0
      };
      
      return {
        services: [],
        metrics: [],
        dockerServices: [],
        systemResources: {
          cpu: { percentage: 0, loadAverage: [0, 0, 0] },
          memory: { totalMB: 0, usedMB: 0, freeMB: 0, percentage: 0 },
          disk: { totalGB: 0, usedGB: 0, freeGB: 0, percentage: 0 }
        },
        recentAlerts: [],
        recentLogs: [],
        systemHealth: emptySystemHealth,
        lastUpdated: new Date()
      };
    }
  }

  private async collectServiceStatuses(): Promise<ServiceStatus[]> {
    const statusPromises = this.config.services.map(service => 
      this.apiService.checkServiceHealth(service)
    );

    try {
      return await Promise.all(statusPromises);
    } catch (error) {
      // Return partial results
      const results = await Promise.allSettled(statusPromises);
      return results
        .filter((result): result is PromiseFulfilledResult<ServiceStatus> => result.status === 'fulfilled')
        .map(result => result.value);
    }
  }

  private async collectServiceMetrics(): Promise<ServiceMetrics[]> {
    const metricsPromises = this.config.services
      .filter(service => service.metricsPath)
      .map(async service => {
        const metrics = await this.apiService.getServiceMetrics(service);
        return metrics;
      });

    try {
      const results = await Promise.all(metricsPromises);
      return results.filter((metrics): metrics is ServiceMetrics => metrics !== null);
    } catch (error) {
      return [];
    }
  }

  private async collectRecentLogs(): Promise<LogEntry[]> {
    const logPromises = Object.entries(this.config.logPaths).map(async ([service, path]) => {
      const logs = await this.systemService.getRecentLogs(path, 5);
      return logs;
    });

    try {
      const results = await Promise.all(logPromises);
      return results
        .flat()
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20); // Keep only the 20 most recent logs
    } catch (error) {
      return [];
    }
  }

  async getDetailedServiceInfo(serviceName: string): Promise<any> {
    const service = this.config.services.find(s => s.name === serviceName);
    if (!service) {
      return null;
    }

    try {
      const [status, metrics, processInfo] = await Promise.all([
        this.apiService.checkServiceHealth(service),
        this.apiService.getServiceMetrics(service),
        this.systemService.getProcessInfo(service.port)
      ]);

      return {
        service: service.name,
        url: service.url,
        port: service.port,
        status,
        metrics,
        process: processInfo
      };
    } catch (error) {
      return {
        service: serviceName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async restartService(serviceName: string): Promise<{ success: boolean; message: string }> {
    // This would require proper service management implementation
    // For now, return a warning that this is not implemented
    return {
      success: false,
      message: 'Service restart is not implemented in this version. Please use the appropriate service management tools.'
    };
  }

  async getLogTail(serviceName: string, lines: number = 50): Promise<LogEntry[]> {
    const logPath = this.config.logPaths[serviceName];
    if (!logPath) {
      return [];
    }

    return this.systemService.getRecentLogs(logPath, lines);
  }

  /**
   * Calculate overall system health based on service statuses and alerts
   */
  private calculateSystemHealth(services: ServiceStatus[], alerts: any[]): SystemHealth {
    const totalServices = services.length;
    const criticalServices = services.filter(s => s.status === 'critical').length;
    const degradedServices = services.filter(s => s.status === 'degraded' || s.status === 'warning').length;
    const operationalServices = services.filter(s => s.status === 'operational').length;
    const unknownServices = services.filter(s => s.status === 'unknown').length;
    
    // Count critical alerts from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const criticalAlerts = alerts.filter(alert => 
      alert.severity === 'critical' && 
      alert.timestamp > oneHourAgo &&
      alert.status === 'active'
    ).length;
    
    // Calculate health score (0-100)
    let score = 100;
    
    // Penalize for critical services (heavy penalty)
    score -= criticalServices * 30;
    
    // Penalize for degraded services (moderate penalty)
    score -= degradedServices * 15;
    
    // Penalize for unknown services (light penalty)
    score -= unknownServices * 10;
    
    // Penalize for critical alerts
    score -= criticalAlerts * 5;
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    // Determine overall status
    let overall: SystemHealth['overall'];
    let summary: string;
    
    if (criticalServices > 0 || criticalAlerts >= 3) {
      overall = 'critical';
      summary = `${criticalServices} critical services, immediate attention required`;
    } else if (degradedServices > totalServices * 0.3 || criticalAlerts > 0) {
      overall = 'degraded';
      summary = `${degradedServices} services experiencing issues`;
    } else if (unknownServices > totalServices * 0.2) {
      overall = 'degraded';
      summary = `${unknownServices} services status unknown`;
    } else if (services.some(s => s.status === 'maintenance')) {
      overall = 'maintenance';
      summary = 'Scheduled maintenance in progress';
    } else {
      overall = 'operational';
      summary = 'All systems operating normally';
    }
    
    return {
      overall,
      score,
      summary,
      criticalIssues: criticalServices + criticalAlerts,
      degradedServices,
      totalServices
    };
  }

  /**
   * Enhanced service status detection with contextual information
   */
  private enhanceServiceStatus(baseStatus: ServiceStatus): ServiceStatus {
    // Add enhanced fields based on service type and current status
    const enhanced: ServiceStatus = {
      ...baseStatus,
      statusDuration: this.calculateStatusDuration(baseStatus),
      kpis: this.generateServiceKPIs(baseStatus),
      thresholds: this.getServiceThresholds(baseStatus),
      troubleshooting: this.generateTroubleshootingInfo(baseStatus),
      recentEvents: [] // Would be populated from recent logs/events
    };
    
    return enhanced;
  }

  private calculateStatusDuration(service: ServiceStatus): number {
    // This would require storing previous status history
    // For now, return a placeholder based on last check time
    return Math.floor((Date.now() - service.lastChecked.getTime()) / 1000);
  }

  private generateServiceKPIs(service: ServiceStatus): { [key: string]: string | number } {
    const kpis: { [key: string]: string | number } = {};
    
    // Add service-specific KPIs based on service name
    switch (service.name.toLowerCase()) {
      case 'search api':
        kpis['Queries/sec'] = Math.floor(Math.random() * 50) + 10;
        kpis['Avg Latency'] = `${Math.floor(Math.random() * 100) + 20}ms`;
        break;
      case 'log ingestion':
        kpis['Events/sec'] = Math.floor(Math.random() * 2000) + 500;
        kpis['Buffer Size'] = `${Math.floor(Math.random() * 1000)}KB`;
        break;
      case 'correlation engine':
        kpis['Rules/min'] = Math.floor(Math.random() * 100) + 20;
        kpis['Incidents'] = Math.floor(Math.random() * 10);
        break;
    }
    
    if (service.responseTime) {
      kpis['Response Time'] = `${service.responseTime}ms`;
    }
    
    return kpis;
  }

  private getServiceThresholds(service: ServiceStatus): { [metric: string]: { current: number; threshold: number; unit: string } } {
    const thresholds: { [metric: string]: { current: number; threshold: number; unit: string } } = {};
    
    // Add common thresholds
    if (service.responseTime && service.responseTime > 1000) {
      thresholds['Response Time'] = {
        current: service.responseTime,
        threshold: 1000,
        unit: 'ms'
      };
    }
    
    if (service.memory && service.memory > 512) {
      thresholds['Memory Usage'] = {
        current: service.memory,
        threshold: 512,
        unit: 'MB'
      };
    }
    
    return thresholds;
  }

  private generateTroubleshootingInfo(service: ServiceStatus): { commands?: string[]; logFiles?: string[]; dashboardLinks?: string[] } {
    const commands: string[] = [];
    const logFiles: string[] = [];
    
    // Generate service-specific troubleshooting commands
    if (service.status !== 'operational') {
      commands.push(`docker logs ${service.name.toLowerCase().replace(/\s+/g, '-')}`);
      commands.push(`curl -I http://localhost:${service.port || 'PORT'}/health`);
      
      if (service.status === 'critical') {
        commands.push(`docker restart ${service.name.toLowerCase().replace(/\s+/g, '-')}`);
      }
    }
    
    // Add log file paths
    logFiles.push(`/tmp/${service.name.toLowerCase().replace(/\s+/g, '-')}.log`);
    
    return {
      commands,
      logFiles
    };
  }
}