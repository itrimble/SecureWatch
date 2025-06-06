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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceControlService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ServiceControlService {
    projectRoot;
    servicesConfig = new Map();
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../../../..');
        this.initializeServiceConfigs();
    }
    initializeServiceConfigs() {
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
    async startService(serviceName) {
        const config = this.servicesConfig.get(serviceName);
        if (!config) {
            return { success: false, message: `Unknown service: ${serviceName}` };
        }
        try {
            if (config.type === 'docker') {
                const { stdout } = await execAsync(config.startCommand);
                return { success: true, message: `Started ${serviceName}`, output: stdout };
            }
            else if (config.type === 'node') {
                // For Node.js services, we need to start them in background
                const servicePath = path.join(this.projectRoot, config.path);
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
            }
            else if (config.type === 'python') {
                const servicePath = path.join(this.projectRoot, config.path);
                const command = `cd ${servicePath} && ${config.startCommand}`;
                const { stdout } = await execAsync(command);
                return { success: true, message: `Started ${serviceName}`, output: stdout };
            }
            return { success: false, message: `Unsupported service type: ${config.type}` };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to start ${serviceName}: ${error.message}`,
                output: error.stderr || error.stdout
            };
        }
    }
    async stopService(serviceName) {
        const config = this.servicesConfig.get(serviceName);
        if (!config) {
            return { success: false, message: `Unknown service: ${serviceName}` };
        }
        try {
            const { stdout } = await execAsync(config.stopCommand);
            return { success: true, message: `Stopped ${serviceName}`, output: stdout };
        }
        catch (error) {
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
    async restartService(serviceName) {
        const config = this.servicesConfig.get(serviceName);
        if (!config) {
            return { success: false, message: `Unknown service: ${serviceName}` };
        }
        try {
            if (config.restartCommand) {
                // Use dedicated restart command if available (for Docker)
                const { stdout } = await execAsync(config.restartCommand);
                return { success: true, message: `Restarted ${serviceName}`, output: stdout };
            }
            else {
                // Stop then start
                await this.stopService(serviceName);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
                const result = await this.startService(serviceName);
                return { ...result, message: `Restarted ${serviceName}` };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to restart ${serviceName}: ${error.message}`,
                output: error.stderr || error.stdout
            };
        }
    }
    async getServiceLogs(serviceName, lines = 50) {
        const config = this.servicesConfig.get(serviceName);
        if (!config) {
            return [`Unknown service: ${serviceName}`];
        }
        try {
            if (config.type === 'docker') {
                const { stdout } = await execAsync(`docker logs --tail ${lines} ${config.dockerName}`);
                return stdout.split('\n').filter(line => line.trim());
            }
            else if (config.type === 'node' || config.type === 'python') {
                const logFile = `/tmp/${serviceName.replace(/ /g, '_')}.log`;
                if (fs.existsSync(logFile)) {
                    const { stdout } = await execAsync(`tail -n ${lines} ${logFile}`);
                    return stdout.split('\n').filter(line => line.trim());
                }
                else {
                    return [`No log file found for ${serviceName}`];
                }
            }
            return [`No logs available for ${serviceName}`];
        }
        catch (error) {
            return [`Error fetching logs: ${error.message}`];
        }
    }
    async getServiceStatus(serviceName) {
        const config = this.servicesConfig.get(serviceName);
        if (!config) {
            return 'unknown';
        }
        try {
            if (config.type === 'docker') {
                const { stdout } = await execAsync(`docker ps -a --filter name=${config.dockerName} --format "{{.Status}}"`);
                if (stdout.includes('Up'))
                    return 'running';
                if (stdout.includes('Exited'))
                    return 'stopped';
                return 'unknown';
            }
            else if (config.port) {
                // Check if port is in use
                try {
                    await execAsync(`lsof -i:${config.port}`);
                    return 'running';
                }
                catch {
                    return 'stopped';
                }
            }
            return 'unknown';
        }
        catch (error) {
            return 'error';
        }
    }
    async startAllServices() {
        const results = [];
        // Start infrastructure first
        const infrastructureServices = ['PostgreSQL', 'Redis', 'Zookeeper', 'Kafka', 'Elasticsearch'];
        for (const service of infrastructureServices) {
            results.push(await this.startService(service));
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between services
        }
        // Then start microservices
        const microservices = ['Log Ingestion', 'Search API', 'Correlation Engine', 'Analytics Engine', 'Frontend'];
        for (const service of microservices) {
            results.push(await this.startService(service));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return results;
    }
    async stopAllServices() {
        const results = [];
        // Stop microservices first
        const microservices = ['Frontend', 'Search API', 'Log Ingestion', 'Correlation Engine', 'Analytics Engine'];
        for (const service of microservices) {
            results.push(await this.stopService(service));
        }
        // Then stop infrastructure
        const infrastructureServices = ['Elasticsearch', 'Kafka', 'Zookeeper', 'Redis', 'PostgreSQL'];
        for (const service of infrastructureServices) {
            results.push(await this.stopService(service));
        }
        return results;
    }
    async healthCheckAll() {
        const healthStatus = new Map();
        for (const [serviceName, config] of this.servicesConfig) {
            const status = await this.getServiceStatus(serviceName);
            healthStatus.set(serviceName, status === 'running');
        }
        return healthStatus;
    }
    async restartAllServices() {
        const results = [];
        // Restart all services in order
        const allServices = Array.from(this.servicesConfig.keys());
        for (const service of allServices) {
            results.push(await this.restartService(service));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return results;
    }
    async runHealthCheck() {
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
        }
        catch (error) {
            return {
                success: false,
                message: `Health check failed: ${error.message}`,
                output: error.toString()
            };
        }
    }
}
exports.ServiceControlService = ServiceControlService;
//# sourceMappingURL=control.service.js.map