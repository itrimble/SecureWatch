// Analytics API Service - Main Entry Point
// Specialized endpoints for fast dashboard and widget data retrieval
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { dashboardRouter, initializeDashboardRoutes } from './routes/dashboard';
import { widgetRouter, initializeWidgetRoutes } from './routes/widgets';
import { logger } from './utils/logger';
const app = express();
const port = process.env.ANALYTICS_API_PORT || 4009;
// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path}`, {
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
    });
    next();
});
// Error handling middleware
app.use((err, req, res, _next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// Global database pool
let dbPool;
async function startServer() {
    try {
        logger.info('Starting Analytics API Service...');
        // Initialize database connection pool
        dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.DB_NAME || 'securewatch',
            user: process.env.DB_USER || 'securewatch',
            password: process.env.DB_PASSWORD || 'securewatch',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        // Test database connection
        await dbPool.query('SELECT NOW()');
        logger.info('Database connection established');
        // Verify continuous aggregates exist
        await verifyAggregates();
        // Initialize route handlers with database pool
        initializeDashboardRoutes(dbPool);
        initializeWidgetRoutes(dbPool);
        // API Routes
        app.use('/api/dashboard', dashboardRouter);
        app.use('/api/widgets', widgetRouter);
        // Health check endpoint
        app.get('/health', async (_req, res) => {
            try {
                // Test database connectivity
                const dbResult = await dbPool.query('SELECT 1 as healthy');
                const isDbHealthy = dbResult.rows[0]?.healthy === 1;
                // Get basic stats
                const stats = await getSystemStats();
                res.status(isDbHealthy ? 200 : 503).json({
                    status: isDbHealthy ? 'healthy' : 'unhealthy',
                    service: 'analytics-api',
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    database: isDbHealthy ? 'connected' : 'disconnected',
                    stats,
                });
            }
            catch (error) {
                logger.error('Health check failed:', error);
                res.status(503).json({
                    status: 'unhealthy',
                    service: 'analytics-api',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        // API documentation endpoint
        app.get('/api/docs', (_req, res) => {
            res.json({
                service: 'Analytics API',
                version: '1.0.0',
                description: 'Specialized analytics endpoints for SecureWatch SIEM dashboards',
                endpoints: {
                    dashboard: {
                        'GET /api/dashboard/realtime-overview': 'Real-time security overview (last hour)',
                        'GET /api/dashboard/hourly-trends': 'Hourly metrics for trend analysis',
                        'GET /api/dashboard/top-events': 'Most frequent security events',
                        'GET /api/dashboard/source-health': 'Source health status overview',
                        'GET /api/dashboard/daily-summary': 'Daily security summary',
                        'GET /api/dashboard/alert-performance': 'Alert performance metrics',
                        'GET /api/dashboard/cache-stats': 'Cache performance statistics',
                    },
                    widgets: {
                        'GET /api/widgets/total-events': 'Total events widget data',
                        'GET /api/widgets/critical-alerts': 'Critical alerts widget data',
                        'GET /api/widgets/active-sources': 'Active sources widget data',
                        'GET /api/widgets/security-incidents': 'Security incidents widget data',
                        'GET /api/widgets/network-activity': 'Network activity widget data',
                        'GET /api/widgets/events-timeline': 'Events timeline widget data',
                        'GET /api/widgets/top-sources': 'Top source types widget data',
                        'GET /api/widgets/system-performance': 'System performance widget data',
                        'GET /api/widgets/recent-alerts': 'Recent alerts widget data',
                    },
                    parameters: {
                        org_id: 'Organization ID (optional)',
                        hours: 'Time period in hours (optional)',
                        days: 'Time period in days (optional)',
                        limit: 'Result limit (optional)',
                        period: 'Period for aggregation (1h, 6h, 24h, 7d)',
                    },
                },
                features: [
                    'Fast queries using TimescaleDB continuous aggregates',
                    'Intelligent caching with different TTL per endpoint',
                    'Real-time and historical data',
                    'Multi-tenant support via org_id parameter',
                    'Rate limiting and performance optimization',
                ],
            });
        });
        // Root endpoint
        app.get('/', (_req, res) => {
            res.json({
                service: 'SecureWatch Analytics API',
                version: '1.0.0',
                status: 'running',
                docs: '/api/docs',
                health: '/health',
                timestamp: new Date().toISOString(),
            });
        });
        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({
                status: 'error',
                message: 'Endpoint not found',
                path: req.originalUrl,
                available_endpoints: ['/api/dashboard/*', '/api/widgets/*', '/health', '/api/docs'],
            });
        });
        // Start HTTP server
        app.listen(port, () => {
            logger.info(`Analytics API Service running on port ${port}`);
            logger.info(`API documentation available at http://localhost:${port}/api/docs`);
        });
        // Graceful shutdown handlers
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            await gracefulShutdown();
        });
        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down gracefully...');
            await gracefulShutdown();
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
    catch (error) {
        logger.error('Failed to start Analytics API Service:', error);
        process.exit(1);
    }
}
async function verifyAggregates() {
    try {
        // Check if continuous aggregates exist
        const aggregateCheck = await dbPool.query(`
      SELECT schemaname, matviewname 
      FROM pg_matviews 
      WHERE schemaname = 'public' 
      AND matviewname IN (
        'realtime_security_events',
        'hourly_security_metrics', 
        'daily_security_summary',
        'source_health_metrics',
        'alert_performance_metrics'
      );
    `);
        const existingAggregates = aggregateCheck.rows.map(row => row.matviewname);
        const requiredAggregates = [
            'realtime_security_events',
            'hourly_security_metrics',
            'daily_security_summary',
            'source_health_metrics',
            'alert_performance_metrics',
        ];
        const missingAggregates = requiredAggregates.filter(name => !existingAggregates.includes(name));
        if (missingAggregates.length > 0) {
            logger.warn(`Missing continuous aggregates: ${missingAggregates.join(', ')}`);
            logger.warn('Analytics API will work with reduced functionality');
            logger.warn('Run continuous_aggregates.sql to create missing aggregates');
        }
        else {
            logger.info('All required continuous aggregates found');
        }
        // Check if helper views exist
        const viewCheck = await dbPool.query(`
      SELECT schemaname, viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname IN ('current_hour_summary', 'today_summary', 'source_health_overview');
    `);
        const existingViews = viewCheck.rows.map(row => row.viewname);
        logger.info(`Found helper views: ${existingViews.join(', ')}`);
    }
    catch (error) {
        logger.error('Failed to verify continuous aggregates:', error);
        throw error;
    }
}
async function getSystemStats() {
    try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            memory: {
                used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
                total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
                external_mb: Math.round(memUsage.external / 1024 / 1024),
            },
            cpu: {
                user_microseconds: cpuUsage.user,
                system_microseconds: cpuUsage.system,
            },
            uptime_seconds: Math.floor(process.uptime()),
            active_connections: dbPool.totalCount,
            idle_connections: dbPool.idleCount,
        };
    }
    catch (error) {
        logger.error('Failed to get system stats:', error);
        return { error: 'Failed to collect stats' };
    }
}
async function gracefulShutdown() {
    try {
        logger.info('Starting graceful shutdown...');
        // Close database connections
        if (dbPool) {
            await dbPool.end();
            logger.info('Database pool closed');
        }
        logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}
// Start the server
startServer();
//# sourceMappingURL=index.js.map