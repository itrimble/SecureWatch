export interface ServiceStatus {
    name: string;
    status: 'operational' | 'degraded' | 'critical' | 'maintenance' | 'warning' | 'unknown';
    uptime?: number;
    responseTime?: number;
    lastChecked: Date;
    error?: string;
    details?: any;
    healthScore?: number;
    healthEndpoint?: string;
    metricsEndpoint?: string;
    port?: number;
    version?: string;
    environment?: string;
    dependencies?: string[];
    memory?: number;
    statusDuration?: number;
    kpis?: {
        [key: string]: string | number;
    };
    errorCount?: number;
    alertCount?: number;
    thresholds?: {
        [metric: string]: {
            current: number;
            threshold: number;
            unit: string;
        };
    };
    impact?: string;
    troubleshooting?: {
        commands?: string[];
        logFiles?: string[];
        dashboardLinks?: string[];
    };
    recentEvents?: {
        timestamp: Date;
        level: 'error' | 'warn' | 'info';
        message: string;
    }[];
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
    ports?: string;
    health?: string;
    uptime?: number;
    port?: number;
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
    duration?: number;
    affectedUsers?: number;
    affectedSystems?: string[];
    category?: string;
}
export interface LogEntry {
    timestamp: Date;
    level: 'error' | 'warn' | 'info' | 'debug';
    service: string;
    message: string;
}
export interface SystemHealth {
    overall: 'operational' | 'degraded' | 'critical' | 'maintenance';
    score: number;
    summary: string;
    criticalIssues: number;
    degradedServices: number;
    totalServices: number;
}
export interface DashboardData {
    services: ServiceStatus[];
    metrics: ServiceMetrics[];
    dockerServices: DockerServiceStatus[];
    systemResources: SystemResourceUsage;
    recentAlerts: AlertInfo[];
    recentLogs: LogEntry[];
    lastUpdated: Date;
    systemHealth: SystemHealth;
}
//# sourceMappingURL=index.d.ts.map