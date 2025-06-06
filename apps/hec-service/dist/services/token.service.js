"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
class TokenService {
    constructor(cacheTimeoutMs = 300000) {
        this.tokens = new Map();
        this.usageStats = new Map();
        this.tokenCache = new Map();
        this.cacheTimeoutMs = cacheTimeoutMs;
        this.initializeDefaultTokens();
    }
    initializeDefaultTokens() {
        const defaultTokens = [
            {
                name: 'Default HEC Token',
                token: this.generateSecureToken(),
                isActive: true,
                maxEventsPerSecond: 1000,
                usageCount: 0,
                organizationId: 'default',
                createdBy: 'system'
            },
            {
                name: 'Test Application Token',
                token: this.generateSecureToken(),
                isActive: true,
                allowedSources: ['app1', 'webapp'],
                allowedIndexes: ['application_logs'],
                maxEventsPerSecond: 500,
                usageCount: 0,
                organizationId: 'default',
                createdBy: 'system'
            }
        ];
        for (const tokenData of defaultTokens) {
            const token = {
                id: crypto_1.default.randomUUID(),
                ...tokenData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.tokens.set(token.token, token);
            this.usageStats.set(token.id, {
                tokenId: token.id,
                tokenName: token.name,
                eventsReceived: 0,
                bytesReceived: 0,
                lastUsed: new Date(),
                errorCount: 0,
                successRate: 1.0,
                topSources: [],
                topSourceTypes: []
            });
            logger_1.default.info('Initialized HEC token', {
                tokenId: token.id,
                name: token.name,
                token: token.token.substring(0, 8) + '...'
            });
        }
    }
    generateSecureToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    async validateToken(tokenString) {
        const cached = this.tokenCache.get(tokenString);
        if (cached && (Date.now() - cached.cachedAt) < this.cacheTimeoutMs) {
            return cached.token;
        }
        const token = this.tokens.get(tokenString);
        if (!token) {
            logger_1.default.warn('Invalid token attempted', {
                token: tokenString.substring(0, 8) + '...'
            });
            return null;
        }
        if (!token.isActive) {
            logger_1.default.warn('Inactive token attempted', {
                tokenId: token.id,
                name: token.name
            });
            return null;
        }
        if (token.expiresAt && token.expiresAt < new Date()) {
            logger_1.default.warn('Expired token attempted', {
                tokenId: token.id,
                name: token.name,
                expiresAt: token.expiresAt
            });
            return null;
        }
        this.tokenCache.set(tokenString, {
            token,
            cachedAt: Date.now()
        });
        token.lastUsed = new Date();
        token.usageCount++;
        return token;
    }
    async checkRateLimit(token, requestedEvents) {
        if (!token.maxEventsPerSecond) {
            return true;
        }
        const stats = this.usageStats.get(token.id);
        if (!stats) {
            return true;
        }
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        const estimatedCurrentRate = stats.eventsReceived / ((now - stats.lastUsed.getTime()) / 1000 + 1);
        if (estimatedCurrentRate + requestedEvents > token.maxEventsPerSecond) {
            logger_1.default.warn('Rate limit exceeded', {
                tokenId: token.id,
                currentRate: estimatedCurrentRate,
                requestedEvents,
                maxEventsPerSecond: token.maxEventsPerSecond
            });
            return false;
        }
        return true;
    }
    async updateUsageStats(tokenId, eventsCount, bytesCount, sources, sourceTypes, isSuccess = true) {
        const stats = this.usageStats.get(tokenId);
        if (!stats) {
            logger_1.default.warn('Usage stats not found for token', { tokenId });
            return;
        }
        stats.eventsReceived += eventsCount;
        stats.bytesReceived += bytesCount;
        stats.lastUsed = new Date();
        if (!isSuccess) {
            stats.errorCount++;
        }
        const totalRequests = stats.eventsReceived + stats.errorCount;
        stats.successRate = (stats.eventsReceived) / totalRequests;
        this.updateTopSources(stats, sources);
        this.updateTopSourceTypes(stats, sourceTypes);
        logger_1.default.debug('Updated usage stats', {
            tokenId,
            eventsCount,
            bytesCount,
            totalEvents: stats.eventsReceived,
            successRate: stats.successRate
        });
    }
    updateTopSources(stats, sources) {
        const sourceMap = new Map();
        for (const { source, count } of stats.topSources) {
            sourceMap.set(source, count);
        }
        for (const source of sources) {
            sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
        }
        stats.topSources = Array.from(sourceMap.entries())
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    updateTopSourceTypes(stats, sourceTypes) {
        const sourceTypeMap = new Map();
        for (const { sourcetype, count } of stats.topSourceTypes) {
            sourceTypeMap.set(sourcetype, count);
        }
        for (const sourcetype of sourceTypes) {
            sourceTypeMap.set(sourcetype, (sourceTypeMap.get(sourcetype) || 0) + 1);
        }
        stats.topSourceTypes = Array.from(sourceTypeMap.entries())
            .map(([sourcetype, count]) => ({ sourcetype, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    async createToken(tokenData) {
        const token = {
            id: crypto_1.default.randomUUID(),
            token: this.generateSecureToken(),
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...tokenData
        };
        this.tokens.set(token.token, token);
        this.usageStats.set(token.id, {
            tokenId: token.id,
            tokenName: token.name,
            eventsReceived: 0,
            bytesReceived: 0,
            lastUsed: new Date(),
            errorCount: 0,
            successRate: 1.0,
            topSources: [],
            topSourceTypes: []
        });
        logger_1.default.info('Created new HEC token', {
            tokenId: token.id,
            name: token.name
        });
        return token;
    }
    async getAllTokens() {
        return Array.from(this.tokens.values()).map(({ token, ...tokenData }) => tokenData);
    }
    async getAllUsageStats() {
        return Array.from(this.usageStats.values());
    }
    async getTokenUsageStats(tokenId) {
        return this.usageStats.get(tokenId) || null;
    }
    async deactivateToken(tokenId) {
        for (const [tokenString, token] of this.tokens.entries()) {
            if (token.id === tokenId) {
                token.isActive = false;
                token.updatedAt = new Date();
                this.tokenCache.delete(tokenString);
                logger_1.default.info('Deactivated HEC token', { tokenId, name: token.name });
                return true;
            }
        }
        return false;
    }
    clearCache() {
        this.tokenCache.clear();
        logger_1.default.info('Cleared token cache');
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=token.service.js.map