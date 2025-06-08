// Query Processor Service - Main Entry Point
// Handles async job processing for long-running SIEM queries

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';

import { JobQueue } from './services/JobQueue';
import { QueryExecutorService } from './services/QueryExecutor';
import { WebSocketService } from './services/WebSocketService';
import { QueryWorker } from './workers/QueryWorker';
import { jobsRouter, initializeJobRoutes } from './routes/jobs';
import { logger } from './utils/logger';

const app = express();
const port = process.env.QUERY_PROCESSOR_PORT || 4008;
const wsPort = parseInt(process.env.WS_PORT || '8080', 10);

// Middleware
app.use(helmet());
app.use(compression() as any);
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
  });
  next();
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    // Note: Error details are logged but not exposed to clients for security
  });
});

// Global services
let jobQueue: JobQueue;
let queryExecutor: QueryExecutorService;
let wsService: WebSocketService;
let queryWorker: QueryWorker;

async function startServer() {
  try {
    logger.info('Starting Query Processor Service...');

    // Initialize core services
    jobQueue = new JobQueue();
    await jobQueue.initialize();
    logger.info('Job queue initialized');

    queryExecutor = new QueryExecutorService();
    logger.info('Query executor initialized');

    wsService = new WebSocketService(wsPort);
    await wsService.initialize();
    logger.info(`WebSocket service initialized on port ${wsPort}`);

    // Initialize query worker
    const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10);
    queryWorker = new QueryWorker(jobQueue, queryExecutor, wsService, maxConcurrentJobs);
    await queryWorker.start();
    logger.info('Query worker started');

    // Initialize routes with services
    initializeJobRoutes(jobQueue, queryExecutor, wsService);

    // API Routes
    app.use('/api/jobs', jobsRouter);

    // Health check endpoint
    app.get('/health', async (_req, res) => {
      try {
        const queueStats = await jobQueue.getQueueStats();
        const workerStats = queryWorker.getStats();
        const wsStats = wsService.getStats();

        const isHealthy = 
          queueStats.active >= 0 && 
          workerStats.is_running &&
          wsStats.connected_clients >= 0;

        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          service: 'query-processor',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          stats: {
            queue: queueStats,
            worker: workerStats,
            websocket: wsStats,
          },
        });

      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          service: 'query-processor',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // API documentation endpoint
    app.get('/api/docs', (_req, res) => {
      res.json({
        service: 'Query Processor',
        version: '1.0.0',
        description: 'Async job processing service for long-running SIEM queries',
        endpoints: {
          'POST /api/jobs/submit': 'Submit a new query job',
          'GET /api/jobs/:jobId': 'Get job status and details',
          'GET /api/jobs/user/:userId': 'Get jobs for a user',
          'POST /api/jobs/:jobId/cancel': 'Cancel a job',
          'POST /api/jobs/validate': 'Validate query without submitting',
          'GET /api/jobs/:jobId/result': 'Get job results',
          'GET /api/jobs/admin/stats': 'Get queue statistics',
          'GET /health': 'Service health check',
        },
        websocket: {
          url: `ws://localhost:${wsPort}`,
          description: 'Real-time job status updates',
          query_params: ['userId', 'organizationId', 'token'],
        },
      });
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.json({
        service: 'SecureWatch Query Processor',
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
      });
    });

    // Start HTTP server
    const server = createServer(app);
    server.listen(port, () => {
      logger.info(`Query Processor Service running on port ${port}`);
      logger.info(`API documentation available at http://localhost:${port}/api/docs`);
      logger.info(`WebSocket server running on port ${wsPort}`);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await gracefulShutdown(server);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await gracefulShutdown(server);
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

  } catch (error) {
    logger.error('Failed to start Query Processor Service:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(server: any) {
  try {
    logger.info('Starting graceful shutdown...');

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Shutdown services in order
    if (queryWorker) {
      await queryWorker.shutdown();
      logger.info('Query worker shut down');
    }

    if (wsService) {
      await wsService.shutdown();
      logger.info('WebSocket service shut down');
    }

    if (queryExecutor) {
      await queryExecutor.shutdown();
      logger.info('Query executor shut down');
    }

    if (jobQueue) {
      await jobQueue.shutdown();
      logger.info('Job queue shut down');
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start the server
startServer();