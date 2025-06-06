import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface ServiceControlResult {
  success: boolean;
  message: string;
  output?: string;
}

export class ServiceControlService {
  private projectRoot: string;
  private servicesConfig: Map<string, ServiceConfig> = new Map();

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../..');
    this.initializeServiceConfigs();
  }

  private initializeServiceConfigs() {
    // Microservices configuration
    this.servicesConfig.set('Frontend', {
      type: 'node',
      path: 'frontend',
      startCommand: 'pnpm run dev',
      stopCommand: 'pkill -f "next dev" || true',
      port: 4000,
      dockerName: null
    });

    this.servicesConfig.set('Search API', {
      type: 'node',
      path: 'apps/search-api',
      startCommand: 'pnpm run dev',
      stopCommand: 'lsof -ti:4004 | xargs kill -9 || true',
      port: 4004,
      dockerName: null
    });

    this.servicesConfig.set('Log Ingestion', {
      type: 'node',
      path: 'apps/log-ingestion',
      startCommand: 'pnpm run dev',
      stopCommand: 'lsof -ti:4002 | xargs kill -9 || true',
      port: 4002,
      dockerName: null
    });

    this.servicesConfig.set('Correlation Engine', {
      type: 'docker',
      path: 'apps/correlation-engine',
      startCommand: 'docker start securewatch_correlation_engine',
      stopCommand: 'docker stop securewatch_correlation_engine',
      restartCommand: 'docker restart securewatch_correlation_engine',
      port: 4005,
      dockerName: 'securewatch_correlation_engine'
    });

    this.servicesConfig.set('Analytics Engine', {
      type: 'docker',
      path: 'apps/analytics-engine',
      startCommand: 'docker start securewatch_analytics_engine',
      stopCommand: 'docker stop securewatch_analytics_engine',
      restartCommand: 'docker restart securewatch_analytics_engine',
      port: 4006,
      dockerName: 'securewatch_analytics_engine'
    });

    this.servicesConfig.set('Auth Service', {
      type: 'node',
      path: 'apps/auth-service',
      startCommand: 'pnpm run dev',
      stopCommand: 'lsof -ti:4001 | xargs kill -9 || true',
      port: 4001,
      dockerName: null
    });

    this.servicesConfig.set('API Gateway', {
      type: 'node',
      path: 'apps/api-gateway',
      startCommand: 'pnpm run dev',
      stopCommand: 'lsof -ti:4003 | xargs kill -9 || true',
      port: 4003,
      dockerName: null
    });

    // Infrastructure services
    this.servicesConfig.set('PostgreSQL', {
      type: 'docker',
      dockerName: 'securewatch_postgres',
      startCommand: 'docker start securewatch_postgres',
      stopCommand: 'docker stop securewatch_postgres',
      restartCommand: 'docker restart securewatch_postgres',
      port: 5432
    });

    this.servicesConfig.set('Redis', {
      type: 'docker',
      dockerName: 'securewatch_redis',
      startCommand: 'docker start securewatch_redis',
      stopCommand: 'docker stop securewatch_redis',
      restartCommand: 'docker restart securewatch_redis',
      port: 6379
    });

    this.servicesConfig.set('Kafka', {
      type: 'docker',
      dockerName: 'securewatch_kafka',
      startCommand: 'docker start securewatch_kafka',
      stopCommand: 'docker stop securewatch_kafka',
      restartCommand: 'docker restart securewatch_kafka',
      port: 9092
    });

    this.servicesConfig.set('Zookeeper', {
      type: 'docker',
      dockerName: 'securewatch_zookeeper',
      startCommand: 'docker start securewatch_zookeeper',
      stopCommand: 'docker stop securewatch_zookeeper',
      restartCommand: 'docker restart securewatch_zookeeper',
      port: 2181
    });

    this.servicesConfig.set('Elasticsearch', {
      type: 'docker',
      dockerName: 'securewatch_elasticsearch',
      startCommand: 'docker start securewatch_elasticsearch',
      stopCommand: 'docker stop securewatch_elasticsearch',
      restartCommand: 'docker restart securewatch_elasticsearch',
      port: 9200
    });

    this.servicesConfig.set('Kibana', {
      type: 'docker',
      dockerName: 'securewatch_kibana',
      startCommand: 'docker start securewatch_kibana',
      stopCommand: 'docker stop securewatch_kibana',
      restartCommand: 'docker restart securewatch_kibana',
      port: 5601
    });

    // Agent configurations
    this.servicesConfig.set('Mac Agent', {
      type: 'python',
      path: 'agent',
      startCommand: 'source agent_venv/bin/activate && python3 event_log_agent.py &',
      stopCommand: 'pkill -f event_log_agent.py || true',
      port: null,
      dockerName: null
    });
  }

  async startService(serviceName: string): Promise<ServiceControlResult> {
    const config = this.servicesConfig.get(serviceName);
    if (!config) {
      return { success: false, message: `Unknown service: ${serviceName}` };
    }

    try {
      if (config.type === 'docker') {
        const { stdout } = await execAsync(config.startCommand);
        return { success: true, message: `Started ${serviceName}`, output: stdout };
      } else if (config.type === 'node') {
        // For Node.js services, we need to start them in background
        const servicePath = path.join(this.projectRoot, config.path!);
        
        // Check if directory exists
        if (!fs.existsSync(servicePath)) {
          return { success: false, message: `Service directory not found: ${servicePath}` };
        }

        // Start service using nohup to run in background
        const command = `cd ${servicePath} && nohup ${config.startCommand} > /tmp/${serviceName.replace(/ /g, '_')}.log 2>&1 &`;
        const { stdout } = await execAsync(command);
        
        // Give it a moment to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { success: true, message: `Started ${serviceName}`, output: stdout };
      } else if (config.type === 'python') {
        const servicePath = path.join(this.projectRoot, config.path!);
        const command = `cd ${servicePath} && ${config.startCommand}`;
        const { stdout } = await execAsync(command);
        return { success: true, message: `Started ${serviceName}`, output: stdout };
      }

      return { success: false, message: `Unsupported service type: ${config.type}` };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Failed to start ${serviceName}: ${error.message}`,
        output: error.stderr || error.stdout
      };
    }
  }

  async stopService(serviceName: string): Promise<ServiceControlResult> {
    const config = this.servicesConfig.get(serviceName);
    if (!config) {
      return { success: false, message: `Unknown service: ${serviceName}` };
    }

    try {
      const { stdout } = await execAsync(config.stopCommand);
      return { success: true, message: `Stopped ${serviceName}`, output: stdout };
    } catch (error: any) {
      // Some stop commands may "fail" if service is already stopped
      if (error.message.includes('No such process') || error.message.includes('not found')) {
        return { success: true, message: `${serviceName} already stopped` };
      }
      return { 
        success: false, 
        message: `Failed to stop ${serviceName}: ${error.message}`,
        output: error.stderr || error.stdout
      };
    }
  }

  async restartService(serviceName: string): Promise<ServiceControlResult> {
    const config = this.servicesConfig.get(serviceName);
    if (!config) {
      return { success: false, message: `Unknown service: ${serviceName}` };
    }

    try {
      if (config.restartCommand) {
        // Use dedicated restart command if available (for Docker)
        const { stdout } = await execAsync(config.restartCommand);
        return { success: true, message: `Restarted ${serviceName}`, output: stdout };
      } else {
        // Stop then start
        await this.stopService(serviceName);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        const result = await this.startService(serviceName);
        return { ...result, message: `Restarted ${serviceName}` };
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: `Failed to restart ${serviceName}: ${error.message}`,
        output: error.stderr || error.stdout
      };
    }
  }

  async getServiceLogs(serviceName: string, lines: number = 50): Promise<string[]> {
    const config = this.servicesConfig.get(serviceName);
    if (!config) {
      return [`Unknown service: ${serviceName}`];
    }

    try {
      if (config.type === 'docker') {
        const { stdout } = await execAsync(`docker logs --tail ${lines} ${config.dockerName}`);
        return stdout.split('\n').filter(line => line.trim());
      } else if (config.type === 'node' || config.type === 'python') {
        const logFile = `/tmp/${serviceName.replace(/ /g, '_')}.log`;
        if (fs.existsSync(logFile)) {
          const { stdout } = await execAsync(`tail -n ${lines} ${logFile}`);
          return stdout.split('\n').filter(line => line.trim());
        } else {
          return [`No log file found for ${serviceName}`];
        }
      }
      return [`No logs available for ${serviceName}`];
    } catch (error: any) {
      return [`Error fetching logs: ${error.message}`];
    }
  }

  async getServiceStatus(serviceName: string): Promise<string> {
    const config = this.servicesConfig.get(serviceName);
    if (!config) {
      return 'unknown';
    }

    try {
      if (config.type === 'docker') {
        const { stdout } = await execAsync(`docker ps -a --filter name=${config.dockerName} --format "{{.Status}}"`);
        if (stdout.includes('Up')) return 'running';
        if (stdout.includes('Exited')) return 'stopped';
        return 'unknown';
      } else if (config.port) {
        // Check if port is in use
        try {
          await execAsync(`lsof -i:${config.port}`);
          return 'running';
        } catch {
          return 'stopped';
        }
      }
      return 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  async startAllServices(): Promise<ServiceControlResult[]> {
    try {
      // Use the new resilient startup script
      const { stdout, stderr } = await execAsync(`cd ${this.projectRoot} && ./start.sh`);
      return [{
        success: true,
        message: 'Platform started using resilient startup system',
        output: stdout
      }];
    } catch (error: any) {
      return [{
        success: false,
        message: `Failed to start platform: ${error.message}`,
        output: error.stderr || error.stdout
      }];
    }
  }

  async stopAllServices(): Promise<ServiceControlResult[]> {
    try {
      // Use the new resilient shutdown script
      const { stdout, stderr } = await execAsync(`cd ${this.projectRoot} && echo "y" | ./stop.sh`);
      return [{
        success: true,
        message: 'Platform stopped using resilient shutdown system',
        output: stdout
      }];
    } catch (error: any) {
      return [{
        success: false,
        message: `Failed to stop platform: ${error.message}`,
        output: error.stderr || error.stdout
      }];
    }
  }

  async startResilientPlatform(): Promise<ServiceControlResult> {
    try {
      const { stdout, stderr } = await execAsync(`cd ${this.projectRoot} && ./start.sh`);
      return {
        success: true,
        message: 'SecureWatch platform started with resilient infrastructure',
        output: stdout
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Resilient startup failed: ${error.message}`,
        output: error.stderr || error.stdout
      };
    }
  }

  async stopResilientPlatform(): Promise<ServiceControlResult> {
    try {
      const { stdout, stderr } = await execAsync(`cd ${this.projectRoot} && echo "y" | ./stop.sh`);
      return {
        success: true,
        message: 'SecureWatch platform stopped gracefully with data protection',
        output: stdout
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Graceful shutdown failed: ${error.message}`,
        output: error.stderr || error.stdout
      };
    }
  }

  async checkResilientStatus(): Promise<ServiceControlResult> {
    try {
      const { stdout } = await execAsync(`cd ${this.projectRoot} && docker-compose -f docker-compose.resilient.yml ps --services --filter "status=running"`);
      const runningServices = stdout.trim().split('\n').filter(s => s);
      
      // Expected services in resilient configuration
      const expectedServices = [
        'postgres', 'redis', 'zookeeper', 'kafka', 'elasticsearch',
        'log-ingestion', 'search-api', 'correlation-engine', 'analytics-engine', 
        'mcp-marketplace', 'frontend'
      ];
      
      const healthyCount = runningServices.length;
      const totalCount = expectedServices.length;
      
      return {
        success: healthyCount === totalCount,
        message: `Resilient platform status: ${healthyCount}/${totalCount} services running`,
        output: `Running services:\n${runningServices.join('\n')}\n\nExpected services:\n${expectedServices.join('\n')}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to check resilient status: ${error.message}`,
        output: error.toString()
      };
    }
  }

  async healthCheckAll(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [serviceName, config] of this.servicesConfig) {
      const status = await this.getServiceStatus(serviceName);
      healthStatus.set(serviceName, status === 'running');
    }

    return healthStatus;
  }

  async restartAllServices(): Promise<ServiceControlResult[]> {
    const results: ServiceControlResult[] = [];
    
    // Restart all services in order
    const allServices = Array.from(this.servicesConfig.keys());
    for (const service of allServices) {
      results.push(await this.restartService(service));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async runHealthCheck(): Promise<ServiceControlResult> {
    try {
      const healthStatus = await this.healthCheckAll();
      const totalServices = healthStatus.size;
      const healthyServices = Array.from(healthStatus.values()).filter(healthy => healthy).length;
      
      return {
        success: healthyServices === totalServices,
        message: `Health check completed: ${healthyServices}/${totalServices} services healthy`,
        output: Array.from(healthStatus.entries())
          .map(([service, healthy]) => `${service}: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`)
          .join('\n')
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Health check failed: ${error.message}`,
        output: error.toString()
      };
    }
  }
}

interface ServiceConfig {
  type: 'docker' | 'node' | 'python';
  dockerName?: string | null;
  path?: string;
  startCommand: string;
  stopCommand: string;
  restartCommand?: string;
  port?: number | null;
}