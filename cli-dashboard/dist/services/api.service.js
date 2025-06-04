"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
const axios_1 = __importDefault(require("axios"));
class ApiService {
    timeout;
    axiosInstance;
    constructor(timeout = 3000) {
        this.timeout = timeout;
        this.axiosInstance = axios_1.default.create({
            timeout: this.timeout,
            headers: {
                'User-Agent': 'SecureWatch-CLI-Dashboard/1.0.0'
            }
        });
    }
    async checkServiceHealth(service) {
        const startTime = Date.now();
        try {
            const response = await this.axiosInstance.get(`${service.url}${service.healthPath}`);
            const responseTime = Date.now() - startTime;
            let status = 'unknown';
            let uptime;
            let details;
            if (response.status === 200) {
                const data = response.data;
                // Parse common health response formats
                if (data.status) {
                    status = data.status;
                }
                else if (response.status === 200) {
                    status = 'operational';
                }
                uptime = data.uptime || data.service?.uptime;
                details = data;
            }
            return {
                name: service.name,
                status,
                uptime,
                responseTime,
                lastChecked: new Date(),
                details
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                name: service.name,
                status: 'critical',
                responseTime,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getServiceMetrics(service) {
        if (!service.metricsPath) {
            return null;
        }
        try {
            const response = await this.axiosInstance.get(`${service.url}${service.metricsPath}`);
            const data = response.data;
            const metrics = {
                name: service.name,
                uptime: data.uptime
            };
            // Parse different metrics formats
            if (data.memory) {
                metrics.memory = {
                    rss: data.memory.rss || 0,
                    heapTotal: data.memory.heapTotal || 0,
                    heapUsed: data.memory.heapUsed || 0,
                    external: data.memory.external || 0
                };
            }
            if (data.cpu) {
                metrics.cpu = {
                    user: data.cpu.user || 0,
                    system: data.cpu.system || 0
                };
            }
            if (data.cache) {
                metrics.cache = {
                    hits: data.cache.hits || 0,
                    misses: data.cache.misses || 0,
                    hitRate: data.cache.hitRate || 0,
                    size: data.cache.size || 0
                };
            }
            if (data.redis) {
                metrics.redis = {
                    connected: data.redis.connected || false,
                    memoryUsed: data.redis.memoryUsed
                };
            }
            return metrics;
        }
        catch (error) {
            return null;
        }
    }
    async getRecentAlerts() {
        try {
            // Try to get alerts from correlation engine
            const response = await this.axiosInstance.get('http://localhost:4005/api/alerts/recent?limit=10');
            if (response.data && Array.isArray(response.data)) {
                return response.data.map((alert) => ({
                    id: alert.id || alert._id || Math.random().toString(36),
                    title: alert.title || alert.name || alert.message || 'Unknown Alert',
                    severity: alert.severity || alert.level || 'medium',
                    timestamp: new Date(alert.timestamp || alert.createdAt || Date.now()),
                    source: alert.source || alert.detector || 'correlation-engine',
                    status: alert.status || 'active'
                }));
            }
        }
        catch (error) {
            // Return mock alerts if correlation engine is unavailable
            return [
                {
                    id: 'mock-1',
                    title: 'Multiple failed login attempts detected',
                    severity: 'high',
                    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                    source: 'authentication-monitor',
                    status: 'active'
                },
                {
                    id: 'mock-2',
                    title: 'Suspicious network activity',
                    severity: 'medium',
                    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
                    source: 'network-monitor',
                    status: 'acknowledged'
                }
            ];
        }
        return [];
    }
    async getLogIngestionStats() {
        try {
            const response = await this.axiosInstance.get('http://localhost:4002/performance/stats');
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    async getSearchApiStats() {
        try {
            const response = await this.axiosInstance.get('http://localhost:4004/api/v1/metrics/performance');
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
}
exports.ApiService = ApiService;
//# sourceMappingURL=api.service.js.map