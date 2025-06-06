"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRoutes = void 0;
const express_1 = require("express");
const logger_1 = __importDefault(require("../utils/logger"));
class AdminRoutes {
    constructor(tokenService, kafkaService) {
        this.router = (0, express_1.Router)();
        this.tokenService = tokenService;
        this.kafkaService = kafkaService;
        this.startTime = new Date();
        this.setupRoutes();
    }
    setupRoutes() {
        this.router.get('/tokens', this.getTokens.bind(this));
        this.router.post('/tokens', this.createToken.bind(this));
        this.router.delete('/tokens/:tokenId', this.deactivateToken.bind(this));
        this.router.get('/tokens/:tokenId/stats', this.getTokenStats.bind(this));
        this.router.get('/metrics', this.getMetrics.bind(this));
        this.router.get('/health', this.getHealthStatus.bind(this));
        this.router.get('/status', this.getSystemStatus.bind(this));
        this.router.post('/cache/clear', this.clearCache.bind(this));
        this.router.get('/kafka/status', this.getKafkaStatus.bind(this));
        this.router.post('/kafka/reconnect', this.reconnectKafka.bind(this));
    }
    async getTokens(req, res) {
        try {
            const tokens = await this.tokenService.getAllTokens();
            res.json({
                success: true,
                data: tokens,
                count: tokens.length
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get tokens', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve tokens'
            });
        }
    }
    async createToken(req, res) {
        try {
            const { name, allowedSources, allowedIndexes, maxEventsPerSecond, expiresAt, organizationId = 'default', createdBy = 'admin' } = req.body;
            if (!name || typeof name !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Token name is required and must be a string'
                });
                return;
            }
            const tokenData = {
                name,
                isActive: true,
                allowedSources,
                allowedIndexes,
                maxEventsPerSecond,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                organizationId,
                createdBy
            };
            const token = await this.tokenService.createToken(tokenData);
            logger_1.default.info('Created new HEC token via admin API', {
                tokenId: token.id,
                name: token.name,
                createdBy
            });
            res.status(201).json({
                success: true,
                data: {
                    id: token.id,
                    name: token.name,
                    token: token.token,
                    isActive: token.isActive,
                    allowedSources: token.allowedSources,
                    allowedIndexes: token.allowedIndexes,
                    maxEventsPerSecond: token.maxEventsPerSecond,
                    expiresAt: token.expiresAt,
                    createdAt: token.createdAt,
                    organizationId: token.organizationId,
                    createdBy: token.createdBy
                }
            });
        }
        catch (error) {
            logger_1.default.error('Failed to create token', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create token'
            });
        }
    }
    async deactivateToken(req, res) {
        try {
            const { tokenId } = req.params;
            if (!tokenId) {
                res.status(400).json({
                    success: false,
                    error: 'Token ID is required'
                });
                return;
            }
            const success = await this.tokenService.deactivateToken(tokenId);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Token not found'
                });
                return;
            }
            logger_1.default.info('Deactivated HEC token via admin API', { tokenId });
            res.json({
                success: true,
                message: 'Token deactivated successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Failed to deactivate token', error);
            res.status(500).json({
                success: false,
                error: 'Failed to deactivate token'
            });
        }
    }
    async getTokenStats(req, res) {
        try {
            const { tokenId } = req.params;
            if (!tokenId) {
                res.status(400).json({
                    success: false,
                    error: 'Token ID is required'
                });
                return;
            }
            const stats = await this.tokenService.getTokenUsageStats(tokenId);
            if (!stats) {
                res.status(404).json({
                    success: false,
                    error: 'Token stats not found'
                });
                return;
            }
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get token stats', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve token statistics'
            });
        }
    }
    async getMetrics(req, res) {
        try {
            const allTokenStats = await this.tokenService.getAllUsageStats();
            const totalEvents = allTokenStats.reduce((sum, stats) => sum + stats.eventsReceived, 0);
            const totalBytes = allTokenStats.reduce((sum, stats) => sum + stats.bytesReceived, 0);
            const totalErrors = allTokenStats.reduce((sum, stats) => sum + stats.errorCount, 0);
            const uptime = Date.now() - this.startTime.getTime();
            const uptimeSeconds = uptime / 1000;
            const eventsPerSecond = uptimeSeconds > 0 ? totalEvents / uptimeSeconds : 0;
            const bytesPerSecond = uptimeSeconds > 0 ? totalBytes / uptimeSeconds : 0;
            const successRate = totalEvents > 0 ? (totalEvents - totalErrors) / totalEvents : 1;
            const peakEventsPerSecond = Math.max(...allTokenStats.map(stats => {
                const tokenUptime = Date.now() - stats.lastUsed.getTime();
                const tokenUptimeSeconds = Math.max(tokenUptime / 1000, 1);
                return stats.eventsReceived / tokenUptimeSeconds;
            }), 0);
            const metrics = {
                totalEvents,
                eventsPerSecond,
                bytesReceived: totalBytes,
                bytesPerSecond,
                errorCount: totalErrors,
                successRate,
                lastEventTime: allTokenStats.length > 0 ?
                    new Date(Math.max(...allTokenStats.map(s => s.lastUsed.getTime()))) :
                    undefined,
                peakEventsPerSecond,
                activeTokens: allTokenStats.filter(stats => {
                    const lastUsedHour = Date.now() - stats.lastUsed.getTime();
                    return lastUsedHour < 3600000;
                }).length
            };
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get metrics', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve metrics'
            });
        }
    }
    async getHealthStatus(req, res) {
        try {
            const kafkaHealth = await this.kafkaService.healthCheck();
            const allTokens = await this.tokenService.getAllTokens();
            const allTokenStats = await this.tokenService.getAllUsageStats();
            const uptime = Date.now() - this.startTime.getTime();
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            const totalEvents = allTokenStats.reduce((sum, stats) => sum + stats.eventsReceived, 0);
            const totalErrors = allTokenStats.reduce((sum, stats) => sum + stats.errorCount, 0);
            const errorRate = totalEvents > 0 ? totalErrors / totalEvents : 0;
            const eventsPerSecond = allTokenStats.reduce((sum, stats) => {
                const tokenUptime = Date.now() - stats.lastUsed.getTime();
                const tokenUptimeSeconds = Math.max(tokenUptime / 1000, 1);
                return sum + (stats.eventsReceived / tokenUptimeSeconds);
            }, 0);
            let status = 'healthy';
            const errors = [];
            if (!kafkaHealth.connected) {
                status = 'unhealthy';
                errors.push('Kafka connection failed');
            }
            if (errorRate > 0.1) {
                status = status === 'healthy' ? 'degraded' : 'unhealthy';
                errors.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
            }
            if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
                status = status === 'healthy' ? 'degraded' : status;
                errors.push('High memory usage');
            }
            const healthStatus = {
                status,
                uptime: uptime / 1000,
                version: process.env.npm_package_version || '1.0.0',
                kafka: {
                    connected: kafkaHealth.connected,
                    lastError: kafkaHealth.lastError,
                    messagesPerSecond: eventsPerSecond
                },
                tokens: {
                    total: allTokens.length,
                    active: allTokens.filter(token => token.isActive).length,
                    expired: allTokens.filter(token => token.expiresAt && token.expiresAt < new Date()).length
                },
                performance: {
                    currentLoad: eventsPerSecond,
                    memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
                    eventsPerSecond,
                    errorRate
                },
                errors: errors.length > 0 ? errors : undefined
            };
            const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
            res.status(statusCode).json({
                success: true,
                data: healthStatus,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get health status', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve health status'
            });
        }
    }
    async getSystemStatus(req, res) {
        try {
            const kafkaConnected = this.kafkaService.isKafkaConnected();
            const uptime = process.uptime();
            res.json({
                success: true,
                data: {
                    status: kafkaConnected ? 'operational' : 'degraded',
                    uptime,
                    kafka: {
                        connected: kafkaConnected,
                        attempts: this.kafkaService.getConnectionAttempts()
                    },
                    node: {
                        version: process.version,
                        platform: process.platform,
                        memory: process.memoryUsage()
                    }
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get system status', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve system status'
            });
        }
    }
    async clearCache(req, res) {
        try {
            this.tokenService.clearCache();
            logger_1.default.info('Cleared HEC token cache via admin API');
            res.json({
                success: true,
                message: 'Cache cleared successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Failed to clear cache', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache'
            });
        }
    }
    async getKafkaStatus(req, res) {
        try {
            const health = await this.kafkaService.healthCheck();
            res.json({
                success: true,
                data: {
                    connected: health.connected,
                    lastError: health.lastError,
                    connectionAttempts: this.kafkaService.getConnectionAttempts()
                }
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get Kafka status', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve Kafka status'
            });
        }
    }
    async reconnectKafka(req, res) {
        try {
            await this.kafkaService.disconnect();
            await this.kafkaService.connect();
            logger_1.default.info('Reconnected to Kafka via admin API');
            res.json({
                success: true,
                message: 'Kafka reconnection initiated'
            });
        }
        catch (error) {
            logger_1.default.error('Failed to reconnect to Kafka', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reconnect to Kafka'
            });
        }
    }
    getRouter() {
        return this.router;
    }
}
exports.AdminRoutes = AdminRoutes;
//# sourceMappingURL=admin.routes.js.map