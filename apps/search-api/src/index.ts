import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { KQLEngine } from '@securewatch/kql-engine';
import { SecurityTemplateProvider } from '@securewatch/kql-engine';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { searchRoutes } from './routes/search';
import { templatesRoutes } from './routes/templates';
import { schemaRoutes } from './routes/schema';
import { metricsRoutes } from './routes/metrics';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 4004;

// Database connections
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'securewatch',
  user: process.env.DB_USER || 'securewatch',
  password: process.env.DB_PASSWORD || 'securewatch_dev',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'securewatch_dev',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Initialize KQL Engine
const kqlEngine = new KQLEngine({
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
const templateProvider = new SecurityTemplateProvider();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4000', 'http://localhost:4001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID']
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Query-specific rate limiting (stricter)
const queryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit to 100 queries per minute
  message: 'Query rate limit exceeded. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add engine and template provider to request context
app.use((req, res, next) => {
  (req as any).kqlEngine = kqlEngine;
  (req as any).templateProvider = templateProvider;
  (req as any).redis = redis;
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

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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
  } catch (error) {
    logger.error('Health check failed', error);
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
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    
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
    
    logger.info('🔍 Real logs endpoint accessed', {
      limit,
      offset,
      returned: logs.length,
      total: totalCount,
      dataSource: 'TimescaleDB'
    });

    res.json(logs);
  } catch (error) {
    logger.error('❌ Failed to get real logs from database', error);
    res.status(500).json({
      error: 'Failed to get logs',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/v1/search', authMiddleware, queryLimiter, searchRoutes);
app.use('/api/v1/templates', authMiddleware, templatesRoutes);
app.use('/api/v1/schema', authMiddleware, schemaRoutes);
app.use('/api/v1/metrics', authMiddleware, metricsRoutes);

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
app.use(errorHandler);

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
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await db.end();
    await redis.disconnect();
    logger.info('Database and Redis connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await db.end();
    await redis.disconnect();
    logger.info('Database and Redis connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Search API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;