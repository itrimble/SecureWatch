"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
class EventsRoutes {
    constructor(tokenService, kafkaService, kafkaTopic = 'hec-events', enableAck = false) {
        this.router = (0, express_1.Router)();
        this.tokenService = tokenService;
        this.kafkaService = kafkaService;
        this.kafkaTopic = kafkaTopic;
        this.enableAck = enableAck;
        this.authMiddleware = new auth_middleware_1.AuthMiddleware(tokenService);
        this.validationMiddleware = new validation_middleware_1.ValidationMiddleware();
        this.setupRoutes();
    }
    setupRoutes() {
        this.router.use(this.authMiddleware.logRequest);
        this.router.use(this.authMiddleware.authenticateToken);
        this.router.use(this.authMiddleware.checkRateLimit);
        this.router.use(this.validationMiddleware.checkRequestSize);
        this.router.post('/event', this.validationMiddleware.getQueryValidation(), this.validationMiddleware.validateSingleEvent, this.handleSingleEvent.bind(this));
        this.router.post('/events', this.validationMiddleware.getQueryValidation(), this.validationMiddleware.validateBatchEvents, this.handleBatchEvents.bind(this));
        this.router.post('/raw', this.validationMiddleware.getQueryValidation(), this.validationMiddleware.validateRawEvent, this.handleRawEvent.bind(this));
        this.router.get('/health', this.handleHealthCheck.bind(this));
    }
    async handleSingleEvent(req, res) {
        try {
            const hecEvent = req.body;
            const token = req.hecToken;
            const sources = [];
            const sourceTypes = [];
            const processedEvent = await this.processHECEvent(hecEvent, token.token, token.name, token.organizationId, req.clientIp, req.headers['user-agent'], req.query);
            sources.push(processedEvent.metadata.source);
            sourceTypes.push(processedEvent.metadata.sourcetype);
            await this.kafkaService.sendEvent(this.kafkaTopic, processedEvent);
            await this.tokenService.updateUsageStats(token.id, 1, processedEvent.metadata.eventSize, sources, sourceTypes, true);
            const response = {
                text: 'Success',
                code: 0
            };
            if (this.enableAck) {
                response.ackId = Date.now();
            }
            logger_1.default.info('Single HEC event processed successfully', {
                eventId: processedEvent.id,
                tokenId: token.id,
                source: processedEvent.metadata.source,
                size: processedEvent.metadata.eventSize,
                ip: req.clientIp
            });
            res.json(response);
        }
        catch (error) {
            await this.handleEventError(error, req, res, 'single event');
        }
    }
    async handleBatchEvents(req, res) {
        try {
            const batchRequest = req.body;
            const token = req.hecToken;
            const sources = [];
            const sourceTypes = [];
            const processedEvents = [];
            for (const hecEvent of batchRequest.events) {
                const processedEvent = await this.processHECEvent(hecEvent, token.token, token.name, token.organizationId, req.clientIp, req.headers['user-agent'], req.query, batchRequest.metadata);
                processedEvents.push(processedEvent);
                sources.push(processedEvent.metadata.source);
                sourceTypes.push(processedEvent.metadata.sourcetype);
            }
            await this.kafkaService.sendBatch(this.kafkaTopic, processedEvents);
            const totalSize = processedEvents.reduce((sum, event) => sum + event.metadata.eventSize, 0);
            await this.tokenService.updateUsageStats(token.id, processedEvents.length, totalSize, sources, sourceTypes, true);
            const response = {
                text: 'Success',
                code: 0
            };
            if (this.enableAck) {
                response.ackId = Date.now();
            }
            logger_1.default.info('Batch HEC events processed successfully', {
                eventCount: processedEvents.length,
                tokenId: token.id,
                totalSize,
                ip: req.clientIp
            });
            res.json(response);
        }
        catch (error) {
            await this.handleEventError(error, req, res, 'batch events');
        }
    }
    async handleRawEvent(req, res) {
        try {
            const rawText = req.body;
            const token = req.hecToken;
            const hecEvent = {
                event: rawText,
                time: Date.now() / 1000,
                source: req.query.source || 'hec:raw',
                sourcetype: req.query.sourcetype || 'text',
                index: req.query.index || 'main',
                host: req.query.host || req.headers.host || 'unknown'
            };
            const processedEvent = await this.processHECEvent(hecEvent, token.token, token.name, token.organizationId, req.clientIp, req.headers['user-agent'], req.query);
            await this.kafkaService.sendEvent(this.kafkaTopic, processedEvent);
            await this.tokenService.updateUsageStats(token.id, 1, processedEvent.metadata.eventSize, [processedEvent.metadata.source], [processedEvent.metadata.sourcetype], true);
            const response = {
                text: 'Success',
                code: 0
            };
            if (this.enableAck) {
                response.ackId = Date.now();
            }
            logger_1.default.info('Raw HEC event processed successfully', {
                eventId: processedEvent.id,
                tokenId: token.id,
                source: processedEvent.metadata.source,
                size: processedEvent.metadata.eventSize,
                ip: req.clientIp
            });
            res.json(response);
        }
        catch (error) {
            await this.handleEventError(error, req, res, 'raw event');
        }
    }
    async handleHealthCheck(req, res) {
        try {
            const kafkaHealth = await this.kafkaService.healthCheck();
            const health = {
                status: kafkaHealth.connected ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                uptime: process.uptime(),
                kafka: kafkaHealth,
                validation: this.validationMiddleware.getConfig()
            };
            res.status(kafkaHealth.connected ? 200 : 503).json(health);
        }
        catch (error) {
            logger_1.default.error('Health check error', error);
            res.status(500).json({
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async processHECEvent(hecEvent, tokenString, tokenName, organizationId, clientIp, userAgent, queryParams, batchMetadata) {
        const now = new Date();
        let timestamp = now;
        if (hecEvent.time) {
            if (typeof hecEvent.time === 'number') {
                const timeMs = hecEvent.time < 1e10 ? hecEvent.time * 1000 : hecEvent.time;
                timestamp = new Date(timeMs);
            }
            else if (typeof hecEvent.time === 'string') {
                timestamp = new Date(hecEvent.time);
            }
        }
        const source = hecEvent.source ||
            batchMetadata?.source ||
            queryParams?.source ||
            'hec:unknown';
        const sourcetype = hecEvent.sourcetype ||
            batchMetadata?.sourcetype ||
            queryParams?.sourcetype ||
            'hec:json';
        const index = hecEvent.index ||
            batchMetadata?.index ||
            queryParams?.index ||
            'main';
        const host = hecEvent.host ||
            batchMetadata?.host ||
            queryParams?.host ||
            'unknown';
        let format = 'json';
        if (typeof hecEvent.event === 'string') {
            try {
                JSON.parse(hecEvent.event);
                format = 'json';
            }
            catch {
                format = 'raw';
            }
        }
        const normalizedEvent = {
            timestamp,
            source,
            sourcetype,
            index,
            host,
            event: hecEvent.event,
            fields: hecEvent.fields || {},
            rawData: JSON.stringify(hecEvent.event),
            metadata: {
                ingestionId: (0, uuid_1.v4)(),
                ingestionTime: now,
                collector: 'hec-service',
                collectorVersion: '1.0.0',
                organizationId,
                environment: process.env.ENVIRONMENT || 'production',
                retention: {
                    tier: 'hot',
                    days: 30,
                    compressed: false,
                    encrypted: false
                },
                hec: {
                    tokenName,
                    format,
                    originalTimestamp: hecEvent.time,
                    clientIp,
                    userAgent
                }
            }
        };
        const eventSize = JSON.stringify(normalizedEvent).length;
        return {
            id: (0, uuid_1.v4)(),
            originalEvent: hecEvent,
            normalizedEvent,
            metadata: {
                token: tokenString,
                tokenName,
                organizationId,
                receivedAt: now,
                processedAt: now,
                source,
                sourcetype,
                index,
                host,
                eventSize,
                format,
                clientIp,
                userAgent
            }
        };
    }
    async handleEventError(error, req, res, eventType) {
        const token = req.hecToken;
        logger_1.default.error(`Failed to process ${eventType}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            tokenId: token?.id,
            ip: req.clientIp,
            path: req.path
        });
        if (token) {
            await this.tokenService.updateUsageStats(token.id, 0, 0, [], [], false);
        }
        res.status(500).json({
            text: `Internal Server Error: Failed to process ${eventType}`,
            code: 500
        });
    }
    getRouter() {
        return this.router;
    }
}
exports.EventsRoutes = EventsRoutes;
//# sourceMappingURL=events.routes.js.map