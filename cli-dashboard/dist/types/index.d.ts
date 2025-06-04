export interface ServiceStatus {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    uptime?: number;
    responseTime?: number;
    lastChecked: Date;
    error?: string;
    details?: any;
}
export interface ServiceMetrics {
    name: string;
    cpu?: {
        user: number;
        system: number;
    };
    memory?: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    cache?: {
        hits: number;
        misses: number;
        hitRate: number;
        size: number;
    };
    throughput?: {
        eventsPerSecond: number;
        queriesPerSecond: number;
        averageLatency: number;
    };
    uptime?: number;
    redis?: {
        connected: boolean;
        memoryUsed?: string;
    };
}
export interface DockerServiceStatus {
    name: string;
    status: string;
    ports: string;
    health?: string;
}
export interface SystemResourceUsage {
    cpu: {
        percentage: number;
        loadAverage: number[];
    };
    memory: {
        totalMB: number;
        usedMB: number;
        freeMB: number;
        percentage: number;
    };
    disk: {
        totalGB: number;
        usedGB: number;
        freeGB: number;
        percentage: number;
    };
    network?: {
        inMbps: number;
        outMbps: number;
    };
}
export interface AlertInfo {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    timestamp: Date;
    source: string;
    status: 'active' | 'acknowledged' | 'resolved';
}
export interface LogEntry {
    timestamp: Date;
    level: 'error' | 'warn' | 'info' | 'debug';
    service: string;
    message: string;
}
export interface DashboardData {
    services: ServiceStatus[];
    metrics: ServiceMetrics[];
    dockerServices: DockerServiceStatus[];
    systemResources: SystemResourceUsage;
    recentAlerts: AlertInfo[];
    recentLogs: LogEntry[];
    lastUpdated: Date;
}
//# sourceMappingURL=index.d.ts.map