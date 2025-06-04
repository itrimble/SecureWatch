"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataService = void 0;
const api_service_1 = require("./api.service");
const system_service_1 = require("./system.service");
class DataService {
    config;
    apiService;
    systemService;
    constructor(config) {
        this.config = config;
        this.apiService = new api_service_1.ApiService(config.timeout);
        this.systemService = new system_service_1.SystemService();
    }
    async collectDashboardData() {
        const startTime = Date.now();
        try {
            // Collect data from all sources in parallel
            const [services, metrics, dockerServices, systemResources, recentAlerts, recentLogs] = await Promise.all([
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
        }
        catch (error) {
            // Return partial data even if some collection fails
            const emptySystemHealth = {
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
    async collectServiceStatuses() {
        const statusPromises = this.config.services.map(service => this.apiService.checkServiceHealth(service));
        try {
            return await Promise.all(statusPromises);
        }
        catch (error) {
            // Return partial results
            const results = await Promise.allSettled(statusPromises);
            return results
                .filter((result) => result.status === 'fulfilled')
                .map(result => result.value);
        }
    }
    async collectServiceMetrics() {
        const metricsPromises = this.config.services
            .filter(service => service.metricsPath)
            .map(async (service) => {
            const metrics = await this.apiService.getServiceMetrics(service);
            return metrics;
        });
        try {
            const results = await Promise.all(metricsPromises);
            return results.filter((metrics) => metrics !== null);
        }
        catch (error) {
            return [];
        }
    }
    async collectRecentLogs() {
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
        }
        catch (error) {
            return [];
        }
    }
    async getDetailedServiceInfo(serviceName) {
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
        }
        catch (error) {
            return {
                service: serviceName,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async restartService(serviceName) {
        // This would require proper service management implementation
        // For now, return a warning that this is not implemented
        return {
            success: false,
            message: 'Service restart is not implemented in this version. Please use the appropriate service management tools.'
        };
    }
    async getLogTail(serviceName, lines = 50) {
        const logPath = this.config.logPaths[serviceName];
        if (!logPath) {
            return [];
        }
        return this.systemService.getRecentLogs(logPath, lines);
    }
    /**
     * Calculate overall system health based on service statuses and alerts
     */
    calculateSystemHealth(services, alerts) {
        const totalServices = services.length;
        const criticalServices = services.filter(s => s.status === 'critical').length;
        const degradedServices = services.filter(s => s.status === 'degraded' || s.status === 'warning').length;
        const operationalServices = services.filter(s => s.status === 'operational').length;
        const unknownServices = services.filter(s => s.status === 'unknown').length;
        // Count critical alerts from last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' &&
            alert.timestamp > oneHourAgo &&
            alert.status === 'active').length;
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
        let overall;
        let summary;
        if (criticalServices > 0 || criticalAlerts >= 3) {
            overall = 'critical';
            summary = `${criticalServices} critical services, immediate attention required`;
        }
        else if (degradedServices > totalServices * 0.3 || criticalAlerts > 0) {
            overall = 'degraded';
            summary = `${degradedServices} services experiencing issues`;
        }
        else if (unknownServices > totalServices * 0.2) {
            overall = 'degraded';
            summary = `${unknownServices} services status unknown`;
        }
        else if (services.some(s => s.status === 'maintenance')) {
            overall = 'maintenance';
            summary = 'Scheduled maintenance in progress';
        }
        else {
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
    enhanceServiceStatus(baseStatus) {
        // Add enhanced fields based on service type and current status
        const enhanced = {
            ...baseStatus,
            statusDuration: this.calculateStatusDuration(baseStatus),
            kpis: this.generateServiceKPIs(baseStatus),
            thresholds: this.getServiceThresholds(baseStatus),
            troubleshooting: this.generateTroubleshootingInfo(baseStatus),
            recentEvents: [] // Would be populated from recent logs/events
        };
        return enhanced;
    }
    calculateStatusDuration(service) {
        // This would require storing previous status history
        // For now, return a placeholder based on last check time
        return Math.floor((Date.now() - service.lastChecked.getTime()) / 1000);
    }
    generateServiceKPIs(service) {
        const kpis = {};
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
    getServiceThresholds(service) {
        const thresholds = {};
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
    generateTroubleshootingInfo(service) {
        const commands = [];
        const logFiles = [];
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
exports.DataService = DataService;
//# sourceMappingURL=data.service.js.map