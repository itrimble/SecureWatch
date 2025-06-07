"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const kql_engine_1 = require("@securewatch/kql-engine");
const kql_engine_2 = require("@securewatch/kql-engine");
const auth_1 = require("./middleware/auth");
const error_handler_1 = require("./middleware/error-handler");
const search_1 = require("./routes/search");
const templates_1 = require("./routes/templates");
const schema_1 = require("./routes/schema");
const metrics_1 = require("./routes/metrics");
const logger_1 = __importDefault(require("./utils/logger"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4004;
// Database connections
const db = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'securewatch',
    user: process.env.DB_USER || 'securewatch',
    password: process.env.DB_PASSWORD || 'securewatch_dev',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'securewatch_dev',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
});
// Initialize KQL Engine
const kqlEngine = new kql_engine_1.KQLEngine({
    database: db,
    cache: {
        enabled: true,
        maxSize: 10000,
        ttl: 5 * 60 * 1000 // 5 minutes
    },
    timeout: 30000, // 30 seconds
    maxRows: 10000
});
// Initialize Template Provider
const templateProvider = new kql_engine_2.SecurityTemplateProvider();
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4000', 'http://localhost:4001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID']
}));
app.use((0, compression_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Query-specific rate limiting (stricter)
const queryLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit to 100 queries per minute
    message: 'Query rate limit exceeded. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Add engine and template provider to request context
app.use((req, res, next) => {
    req.kqlEngine = kqlEngine;
    req.templateProvider = templateProvider;
    req.redis = redis;
    next();
});
// Swagger documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SecureWatch Search API',
            version: '1.0.0',
            description: 'KQL-powered search API for SecureWatch SIEM platform',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/models/*.ts'],
};
const specs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await db.query('SELECT 1');
        // Check Redis connection
        await redis.ping();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: 'connected',
                redis: 'connected',
                kqlEngine: 'ready'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Development endpoint without auth for testing (must come before auth middleware)
app.get('/api/v1/search/logs', queryLimiter, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const offset = parseInt(req.query.offset) || 0;
        // Query real log data from TimescaleDB
        const query = `
      SELECT 
        id,
        timestamp,
        source_identifier,
        source_type,
        message,
        log_level,
        hostname,
        process_name,
        attributes,
        ingested_at
      FROM logs 
      ORDER BY timestamp DESC 
      LIMIT $1 OFFSET $2
    `;
        const countQuery = 'SELECT COUNT(*) as total_count FROM logs';
        const [logsResult, countResult] = await Promise.all([
            db.query(query, [limit, offset]),
            db.query(countQuery)
        ]);
        const logs = logsResult.rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            source_identifier: row.source_identifier,
            source_type: row.source_type,
            message: row.message,
            enriched_data: {
                event_id: 'LOG_ENTRY',
                severity: row.log_level || 'Information',
                hostname: row.hostname,
                process_name: row.process_name,
                ingested_at: row.ingested_at,
                attributes: row.attributes,
                tags: ['real-data', 'timescaledb', row.source_type],
                event_type_id: 'LIVE_LOG_DATA'
            }
        }));
        const totalCount = parseInt(countResult.rows[0].total_count);
        logger_1.default.info('🔍 Real logs endpoint accessed', {
            limit,
            offset,
            returned: logs.length,
            total: totalCount,
            dataSource: 'TimescaleDB'
        });
        res.json(logs);
    }
    catch (error) {
        logger_1.default.error('❌ Failed to get real logs from database', error);
        res.status(500).json({
            error: 'Failed to get logs',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// API Routes
app.use('/api/v1/search', auth_1.authMiddleware, queryLimiter, search_1.searchRoutes);
app.use('/api/v1/templates', auth_1.authMiddleware, templates_1.templatesRoutes);
app.use('/api/v1/schema', auth_1.authMiddleware, schema_1.schemaRoutes);
app.use('/api/v1/metrics', auth_1.authMiddleware, metrics_1.metricsRoutes);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'SecureWatch Search API',
        version: process.env.npm_package_version || '0.1.0',
        description: 'KQL-powered search API for SecureWatch SIEM platform',
        endpoints: {
            health: '/health',
            docs: '/api-docs',
            search: '/api/v1/search',
            templates: '/api/v1/templates',
            schema: '/api/v1/schema',
            metrics: '/api/v1/metrics'
        }
    });
});
// Error handling
app.use(error_handler_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    try {
        await db.end();
        await redis.disconnect();
        logger_1.default.info('Database and Redis connections closed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    try {
        await db.end();
        await redis.disconnect();
        logger_1.default.info('Database and Redis connections closed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', error);
        process.exit(1);
    }
});
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await db.query('SELECT 1');
        // Test Redis connection
        await redis.ping();
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'search-api',
            version: '1.0.0',
            uptime: process.uptime(),
            database: 'connected',
            redis: 'connected'
        });
    }
    catch (error) {
        logger_1.default.error('Health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'search-api',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Start server with error handling
const server = app.listen(PORT, () => {
    logger_1.default.info(`Search API server running on port ${PORT}`);
    logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.default.info(`API Documentation: http://localhost:${PORT}/api-docs`);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger_1.default.error(`Port ${PORT} is already in use`);
    }
    else if (error.code === 'EACCES') {
        logger_1.default.error(`Permission denied to bind to port ${PORT}`);
    }
    else {
        logger_1.default.error('Server startup error', error);
    }
    process.exit(1);
});
// Graceful shutdown handling
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.default.info('HTTP server closed');
    });
    try {
        await db.end();
        await redis.disconnect();
        logger_1.default.info('Database and Redis connections closed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_1.default.info('HTTP server closed');
    });
    try {
        await db.end();
        await redis.disconnect();
        logger_1.default.info('Database and Redis connections closed');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error during shutdown', error);
        process.exit(1);
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
exports.default = app;
