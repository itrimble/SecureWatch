/**
 * KQL Analytics Engine - Main Service Entry Point
 * Enterprise-grade analytics engine for SecureWatch SIEM platform
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import rateLimit from 'express-rate-limit';
import { AnalyticsRoutes } from './routes/analytics.routes';
import { DashboardRoutes } from './routes/dashboard.routes';
import { WidgetRoutes } from './routes/widgets.routes';
import winston from 'winston';
// Load environment variables
config();
// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'analytics-engine' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        }),
        new winston.transports.File({
            filename: '/tmp/analytics-engine-error.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: '/tmp/analytics-engine.log'
        })
    ]
});
// Service configuration
const CONFIG = {
    port: parseInt(process.env.PORT || '4009', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'securewatch',
        user: process.env.DB_USER || 'securewatch',
        password: process.env.DB_PASSWORD || 'securewatch',
        max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    },
    // Redis configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3
    },
    // Resource limits
    resourceLimits: {
        maxQueryTime: parseInt(process.env.MAX_QUERY_TIME || '300', 10), // 5 minutes
        maxMemoryUsage: parseInt(process.env.MAX_MEMORY_MB || '2048', 10), // 2GB
        maxResultRows: parseInt(process.env.MAX_RESULT_ROWS || '100000', 10),
        maxConcurrentQueries: parseInt(process.env.MAX_CONCURRENT_QUERIES || '10', 10),
        maxQueryComplexity: parseInt(process.env.MAX_QUERY_COMPLEXITY || '100', 10)
    },
    // Rate limiting
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // requests per window
        message: 'Too many requests from this IP, please try again later'
    }
};
class AnalyticsEngineService {
    app;
    dbPool;
    redisClient;
    server;
    constructor() {
        this.app = express();
        this.setupDatabase();
        this.setupRedis();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    /**
     * Setup database connection pool
     */
    setupDatabase() {
        this.dbPool = new Pool({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            database: CONFIG.database.database,
            user: CONFIG.database.user,
            password: CONFIG.database.password,
            max: CONFIG.database.max,
            idleTimeoutMillis: CONFIG.database.idleTimeoutMillis,
            connectionTimeoutMillis: CONFIG.database.connectionTimeoutMillis,
            ssl: CONFIG.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
        });
        this.dbPool.on('connect', () => {
            logger.info('Connected to PostgreSQL database');
        });
        this.dbPool.on('error', (err) => {
            logger.error('PostgreSQL pool error:', err);
        });
    }
    /**
     * Setup Redis connection
     */
    setupRedis() {
        this.redisClient = new Redis({
            host: CONFIG.redis.host,
            port: CONFIG.redis.port,
            password: CONFIG.redis.password,
            db: CONFIG.redis.db,
            retryDelayOnFailover: CONFIG.redis.retryDelayOnFailover,
            enableReadyCheck: CONFIG.redis.enableReadyCheck,
            maxRetriesPerRequest: CONFIG.redis.maxRetriesPerRequest,
            lazyConnect: true
        });
        this.redisClient.on('connect', () => {
            logger.info('Connected to Redis');
        });
        this.redisClient.on('error', (err) => {
            logger.error('Redis connection error:', err);
        });
        this.redisClient.on('reconnecting', () => {
            logger.info('Reconnecting to Redis...');
        });
    }
    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));
        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        // Compression
        this.app.use(compression());
        // Request parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        // Rate limiting
        const limiter = rateLimit({
            windowMs: CONFIG.rateLimiting.windowMs,
            max: CONFIG.rateLimiting.max,
            message: { error: CONFIG.rateLimiting.message },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);
        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                query: req.query,
                body: req.method === 'POST' ? { ...req.body, password: '[REDACTED]' } : undefined
            });
            next();
        });
    }
    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                // Check database connection
                await this.dbPool.query('SELECT 1');
                // Check Redis connection
                await this.redisClient.ping();
                res.json({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    version: process.env.npm_package_version || '1.0.0',
                    environment: CONFIG.nodeEnv,
                    services: {
                        database: 'connected',
                        redis: 'connected'
                    },
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage()
                });
            }
            catch (error) {
                logger.error('Health check failed:', error);
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: error.message
                });
            }
        });
        // API information endpoint
        this.app.get('/api', (req, res) => {
            res.json({
                name: 'SecureWatch KQL Analytics Engine',
                version: process.env.npm_package_version || '1.0.0',
                description: 'Enterprise-grade KQL analytics engine for security data analysis',
                endpoints: {
                    health: '/health',
                    analytics: '/api/v1/analytics/*',
                    dashboard: '/api/dashboard/*',
                    widgets: '/api/widgets/*',
                    documentation: '/api/docs'
                },
                features: [
                    'KQL Query Execution',
                    'Query Library Management',
                    'Scheduled Queries',
                    'Real-time Analytics',
                    'Resource Management',
                    'Caching & Optimization',
                    'Schema Management',
                    'Dashboard Analytics (merged from analytics-api)',
                    'Widget Endpoints for Fast UI Updates',
                    'TimescaleDB Continuous Aggregates'
                ]
            });
        });
        // Setup resource configuration
        const resourceConfig = {
            limits: CONFIG.resourceLimits,
            monitoring: {
                enabled: true,
                sampleIntervalMs: 30000, // 30 seconds
                alertThresholds: {
                    memoryUsagePercent: 80,
                    cpuUsagePercent: 80,
                    queryQueueSize: 20
                }
            },
            priorityQueues: {
                critical: { maxConcurrent: 3, weight: 4 },
                high: { maxConcurrent: 4, weight: 3 },
                normal: { maxConcurrent: 6, weight: 2 },
                low: { maxConcurrent: 2, weight: 1 }
            }
        };
        // Setup analytics routes
        const analyticsRoutes = new AnalyticsRoutes(this.dbPool, this.redisClient, resourceConfig);
        // Setup dashboard routes (merged from analytics-api)
        const dashboardRoutes = new DashboardRoutes(this.dbPool, logger);
        const widgetRoutes = new WidgetRoutes(this.dbPool, logger);
        this.app.use('/api/v1/analytics', analyticsRoutes.getRouter());
        this.app.use('/api/dashboard', dashboardRoutes.getRouter());
        this.app.use('/api/widgets', widgetRoutes.getRouter());
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });
    }
    /**
     * Setup error handling middleware
     */
    setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            logger.error('Unhandled error:', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method,
                ip: req.ip
            });
            res.status(500).json({
                error: 'Internal server error',
                message: CONFIG.nodeEnv === 'development' ? error.message : 'Something went wrong',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown'
            });
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', {
                promise,
                reason
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', {
                error: error.message,
                stack: error.stack
            });
            // Graceful shutdown
            this.shutdown('UNCAUGHT_EXCEPTION');
        });
        // Handle shutdown signals
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.shutdown('SIGTERM');
        });
        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.shutdown('SIGINT');
        });
    }
    /**
     * Start the server
     */
    async start() {
        try {
            // Connect to Redis
            await this.redisClient.connect();
            // Test database connection
            await this.dbPool.query('SELECT NOW()');
            // Start HTTP server
            this.server = this.app.listen(CONFIG.port, CONFIG.host, () => {
                logger.info(`Analytics Engine started successfully`, {
                    port: CONFIG.port,
                    host: CONFIG.host,
                    environment: CONFIG.nodeEnv,
                    processId: process.pid,
                    nodeVersion: process.version
                });
                logger.info('Service endpoints:', {
                    health: `http://${CONFIG.host}:${CONFIG.port}/health`,
                    api: `http://${CONFIG.host}:${CONFIG.port}/api`,
                    analytics: `http://${CONFIG.host}:${CONFIG.port}/api/v1/analytics`
                });
            });
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${CONFIG.port} is already in use`);
                }
                else {
                    logger.error('Server error:', error);
                }
                process.exit(1);
            });
        }
        catch (error) {
            logger.error('Failed to start Analytics Engine:', error);
            process.exit(1);
        }
    }
    /**
     * Graceful shutdown
     */
    async shutdown(signal) {
        logger.info(`Shutting down Analytics Engine (${signal})...`);
        // Set a timeout for forced shutdown
        const forceShutdownTimeout = setTimeout(() => {
            logger.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 30000); // 30 seconds
        try {
            // Stop accepting new connections
            if (this.server) {
                this.server.close(() => {
                    logger.info('HTTP server closed');
                });
            }
            // Close database connections
            if (this.dbPool) {
                await this.dbPool.end();
                logger.info('Database connections closed');
            }
            // Close Redis connection
            if (this.redisClient) {
                this.redisClient.disconnect();
                logger.info('Redis connection closed');
            }
            clearTimeout(forceShutdownTimeout);
            logger.info('Analytics Engine shutdown complete');
            process.exit(0);
        }
        catch (error) {
            logger.error('Error during shutdown:', error);
            clearTimeout(forceShutdownTimeout);
            process.exit(1);
        }
    }
}
// Start the service
const analyticsEngine = new AnalyticsEngineService();
if (require.main === module) {
    analyticsEngine.start().catch((error) => {
        logger.error('Failed to start service:', error);
        process.exit(1);
    });
}
export { AnalyticsEngineService };
//# sourceMappingURL=index.js.map