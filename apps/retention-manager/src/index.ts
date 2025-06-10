import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createLogger } from './utils/logger';
import { createRetentionRoutes } from './routes/retention.routes';
import { LifecycleOrchestrator } from './services/lifecycle-orchestrator';

const app = express();
const logger = createLogger('retention-manager');
const PORT = process.env.RETENTION_MANAGER_PORT || 3012;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
  });
  next();
});

// Initialize database connection
const pgPool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/securewatch',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pgPool.query('SELECT 1');

    // Check Redis connection
    await redis.ping();

    res.json({
      status: 'healthy',
      service: 'retention-manager',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Mount retention routes
app.use('/api/retention', createRetentionRoutes(pgPool, redis, logger));

// Initialize lifecycle orchestrator
let lifecycleOrchestrator: LifecycleOrchestrator;

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
);

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down retention manager...');

  try {
    // Close database connections
    await pgPool.end();

    // Close Redis connection
    redis.disconnect();

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Test database connection
    await pgPool.query('SELECT 1');
    logger.info('Database connection established');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connection established');

    // Initialize lifecycle orchestrator
    lifecycleOrchestrator = new LifecycleOrchestrator(pgPool, redis, logger);
    logger.info('Lifecycle orchestrator initialized');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Retention Manager service started on port ${PORT}`);
      logger.info('Scheduled jobs initialized:');
      logger.info('- Hourly: Tier migration checks');
      logger.info('- Daily: Data pruning (2 AM)');
      logger.info('- Daily: Capacity planning (3 AM)');
      logger.info('- Every 6 hours: Storage optimization');
      logger.info('- Every 5 minutes: Health checks');
    });
  } catch (error) {
    logger.error('Failed to start service', error);
    process.exit(1);
  }
}

start();
