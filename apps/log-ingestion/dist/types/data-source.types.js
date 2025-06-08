export class DataSource {
    config;
    status = 'inactive';
    health;
    metrics;
    constructor(config) {
        this.config = config;
        this.health = this.initializeHealth();
        this.metrics = this.initializeMetrics();
    }
    getId() {
        return this.config.id;
    }
    getName() {
        return this.config.name;
    }
    getType() {
        return this.config.type;
    }
    getStatus() {
        return this.status;
    }
    getHealth() {
        return this.health;
    }
    getMetrics() {
        return this.metrics;
    }
    getConfig() {
        return { ...this.config };
    }
    async updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (this.status === 'active') {
            await this.restart();
        }
    }
    setStatus(status) {
        this.status = status;
        this.updateHealth();
    }
    updateHealth() {
        const now = new Date();
        this.health.lastCheck = now;
        // Update health status based on current status and error rates
        if (this.status === 'error') {
            this.health.status = 'unhealthy';
        }
        else if (this.status === 'active' && this.metrics.statistics.errorRate < 0.01) {
            this.health.status = 'healthy';
        }
        else if (this.status === 'active' && this.metrics.statistics.errorRate < 0.05) {
            this.health.status = 'degraded';
        }
        else {
            this.health.status = 'unknown';
        }
    }
    addHealthIssue(severity, message, details) {
        if (!this.health.issues) {
            this.health.issues = [];
        }
        this.health.issues.push({
            severity,
            message,
            timestamp: new Date(),
            details
        });
        // Keep only last 100 issues
        if (this.health.issues.length > 100) {
            this.health.issues = this.health.issues.slice(-100);
        }
        if (severity === 'error') {
            this.health.errorCount++;
        }
        else if (severity === 'warning') {
            this.health.warningCount++;
        }
    }
    initializeHealth() {
        return {
            status: 'unknown',
            lastCheck: new Date(),
            uptime: 0,
            errorCount: 0,
            warningCount: 0,
            metrics: {
                eventsPerSecond: 0,
                bytesPerSecond: 0,
                latencyMs: 0,
                successRate: 0
            },
            issues: []
        };
    }
    initializeMetrics() {
        return {
            id: this.config.id,
            status: this.status,
            health: this.health,
            statistics: {
                totalEvents: 0,
                eventsToday: 0,
                avgEventsPerHour: 0,
                peakEventsPerSecond: 0,
                totalBytes: 0,
                avgLatencyMs: 0,
                errorRate: 0
            },
            performance: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0,
                networkBytesIn: 0,
                networkBytesOut: 0
            }
        };
    }
}
//# sourceMappingURL=data-source.types.js.map