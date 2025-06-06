"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const token_service_1 = require("./services/token.service");
const kafka_service_1 = require("./services/kafka.service");
const events_routes_1 = require("./routes/events.routes");
const admin_routes_1 = require("./routes/admin.routes");
const logger_1 = __importDefault(require("./utils/logger"));
class HECService {
    constructor() {
        this.app = (0, express_1.default)();
        this.config = this.loadConfig();
        this.setupLogging();
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    loadConfig() {
        return {
            port: parseInt(process.env.HEC_PORT || '8888'),
            maxEventSize: parseInt(process.env.HEC_MAX_EVENT_SIZE || '1048576'),
            maxBatchSize: parseInt(process.env.HEC_MAX_BATCH_SIZE || '104857600'),
            maxEventsPerBatch: parseInt(process.env.HEC_MAX_EVENTS_PER_BATCH || '1000'),
            tokenValidationCacheMs: parseInt(process.env.HEC_TOKEN_CACHE_MS || '300000'),
            rateLimitWindowMs: parseInt(process.env.HEC_RATE_LIMIT_WINDOW_MS || '60000'),
            defaultRateLimit: parseInt(process.env.HEC_DEFAULT_RATE_LIMIT || '1000'),
            enableCompression: process.env.HEC_ENABLE_COMPRESSION === 'true',
            enableCors: process.env.HEC_ENABLE_CORS !== 'false',
            corsOrigins: process.env.HEC_CORS_ORIGINS ?
                process.env.HEC_CORS_ORIGINS.split(',') :
                ['http://localhost:3000', 'http://localhost:4000'],
            kafkaTopic: process.env.HEC_KAFKA_TOPIC || 'hec-events',
            kafkaBrokers: process.env.KAFKA_BROKERS ?
                process.env.KAFKA_BROKERS.split(',') :
                ['localhost:9092'],
            enableAck: process.env.HEC_ENABLE_ACK === 'true',
            ackTimeoutMs: parseInt(process.env.HEC_ACK_TIMEOUT_MS || '30000')
        };
    }
    setupLogging() {
        const logDir = path_1.default.join(__dirname, '../logs');
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
    }
    initializeServices() {
        logger_1.default.info('Initializing HEC services...', this.config);
        this.tokenService = new token_service_1.TokenService(this.config.tokenValidationCacheMs);
        this.kafkaService = new kafka_service_1.KafkaService(this.config.kafkaBrokers, 'hec-service');
        this.eventsRoutes = new events_routes_1.EventsRoutes(this.tokenService, this.kafkaService, this.config.kafkaTopic, this.config.enableAck);
        this.adminRoutes = new admin_routes_1.AdminRoutes(this.tokenService, this.kafkaService);
        logger_1.default.info('HEC services initialized successfully');
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));
        if (this.config.enableCors) {
            this.app.use((0, cors_1.default)({
                origin: this.config.corsOrigins,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
                credentials: false
            }));
        }
        if (this.config.enableCompression) {
            this.app.use((0, compression_1.default)());
        }
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: this.config.rateLimitWindowMs,
            max: this.config.defaultRateLimit,
            message: {
                text: 'Too many requests from this IP',
                code: 429
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                const ip = req.ip || req.connection.remoteAddress || 'unknown';
                const token = req.headers.authorization?.replace('Bearer ', '').substring(0, 8) || 'no-token';
                return `${ip}:${token}`;
            }
        });
        this.app.use(limiter);
        this.app.use(express_1.default.json({
            limit: this.config.maxBatchSize,
            strict: false
        }));
        this.app.use(express_1.default.text({
            limit: this.config.maxEventSize,
            type: ['text/plain', 'application/x-raw']
        }));
        this.app.set('trust proxy', 1);
        this.app.use((req, res, next) => {
            logger_1.default.debug('Incoming request', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                contentType: req.headers['content-type'],
                contentLength: req.headers['content-length']
            });
            next();
        });
    }
    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.json({
                service: 'SecureWatch HTTP Event Collector',
                version: process.env.npm_package_version || '1.0.0',
                status: 'operational',
                endpoints: {
                    events: {
                        single: 'POST /services/collector/event',
                        batch: 'POST /services/collector/events',
                        raw: 'POST /services/collector/raw'
                    },
                    admin: {
                        tokens: 'GET /admin/tokens',
                        metrics: 'GET /admin/metrics',
                        health: 'GET /admin/health'
                    },
                    health: 'GET /health'
                }
            });
        });
        this.app.use('/services/collector', this.eventsRoutes.getRouter());
        this.app.use('/admin', this.adminRoutes.getRouter());
        this.app.get('/health', async (req, res) => {
            try {
                const kafkaHealth = await this.kafkaService.healthCheck();
                res.status(kafkaHealth.connected ? 200 : 503).json({
                    status: kafkaHealth.connected ? 'healthy' : 'degraded',
                    service: 'hec-service',
                    version: process.env.npm_package_version || '1.0.0',
                    uptime: process.uptime(),
                    kafka: kafkaHealth,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                text: 'Not Found: Invalid endpoint',
                code: 404,
                path: req.originalUrl,
                method: req.method
            });
        });
    }
    setupErrorHandling() {
        this.app.use((error, req, res, next) => {
            logger_1.default.error('Unhandled application error', {
                error: error.message,
                stack: error.stack,
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            res.status(500).json({
                text: 'Internal Server Error',
                code: 500
            });
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.default.error('Unhandled Promise Rejection', {
                reason: reason instanceof Error ? reason.message : reason,
                stack: reason instanceof Error ? reason.stack : undefined
            });
        });
        process.on('uncaughtException', (error) => {
            logger_1.default.error('Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            this.shutdown().then(() => {
                process.exit(1);
            });
        });
        process.on('SIGTERM', () => {
            logger_1.default.info('SIGTERM received, initiating graceful shutdown...');
            this.shutdown().then(() => process.exit(0));
        });
        process.on('SIGINT', () => {
            logger_1.default.info('SIGINT received, initiating graceful shutdown...');
            this.shutdown().then(() => process.exit(0));
        });
    }
    async start() {
        try {
            await this.kafkaService.connect();
            await this.kafkaService.ensureTopic(this.config.kafkaTopic);
            const server = this.app.listen(this.config.port, () => {
                logger_1.default.info(`HEC Service started successfully`, {
                    port: this.config.port,
                    kafkaTopic: this.config.kafkaTopic,
                    environment: process.env.NODE_ENV || 'development',
                    version: process.env.npm_package_version || '1.0.0'
                });
            });
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger_1.default.error(`Port ${this.config.port} is already in use`);
                }
                else {
                    logger_1.default.error('Server error', error);
                }
                process.exit(1);
            });
        }
        catch (error) {
            logger_1.default.error('Failed to start HEC service', error);
            process.exit(1);
        }
    }
    async shutdown() {
        logger_1.default.info('Shutting down HEC service...');
        try {
            await this.kafkaService.disconnect();
            logger_1.default.info('Kafka connection closed');
            logger_1.default.info('HEC service shutdown complete');
        }
        catch (error) {
            logger_1.default.error('Error during shutdown', error);
        }
    }
}
if (require.main === module) {
    const hecService = new HECService();
    hecService.start().catch((error) => {
        logger_1.default.error('Failed to start HEC service', error);
        process.exit(1);
    });
}
exports.default = HECService;
//# sourceMappingURL=index.js.map