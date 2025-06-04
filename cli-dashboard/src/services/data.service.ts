import { ApiService } from './api.service';
import { SystemService } from './system.service';
import { DashboardData, ServiceStatus, ServiceMetrics, LogEntry } from '../types';
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
      
      return {
        services,
        metrics,
        dockerServices,
        systemResources,
        recentAlerts,
        recentLogs,
        lastUpdated: new Date()
      };
    } catch (error) {
      // Return partial data even if some collection fails
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
}