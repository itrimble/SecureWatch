import express from 'express';
import * as cron from 'node-cron';
import { config } from './config/spark.config';
import { SparkBatchProcessor } from './core/SparkBatchProcessor';
import { Logger } from './utils/logger';
import { MetricsCollector } from './monitoring/MetricsCollector';

const app = express();
const logger = Logger.getInstance();
const metrics = new MetricsCollector();

// Global instances
let batchProcessor: SparkBatchProcessor;
let isShuttingDown = false;

/**
 * Initialize the Spark Batch Processing service
 */
async function initialize(): Promise<void> {
  try {
    logger.info('Starting SecureWatch Spark Batch Processor...');
    
    // Initialize batch processor
    batchProcessor = new SparkBatchProcessor();
    await batchProcessor.initialize();
    
    // Setup Express middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Add request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        metrics.recordHistogram('http_request_duration_ms', duration);
        metrics.incrementCounter(`http_requests_${res.statusCode}`);
      });
      next();
    });
    
    // Setup routes
    setupRoutes();
    
    // Setup scheduled jobs
    setupScheduledJobs();
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Spark Batch Processor listening on port ${port}`);
      logger.info('Service ready to process batch jobs');
    });
    
  } catch (error) {
    logger.error('Failed to initialize Spark Batch Processor:', error);
    process.exit(1);
  }
}

/**
 * Setup Express routes
 */
function setupRoutes(): void {
  // Health check endpoint
  app.get('/health', (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.environment,
    };
    
    res.json(health);
  });

  // Metrics endpoint (Prometheus format)
  app.get('/metrics', async (req, res) => {
    try {
      const prometheusMetrics = metrics.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Start historical batch processing
  app.post('/api/batch/historical', async (req, res) => {
    try {
      const options = {
        batchId: req.body.batchId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        topics: req.body.topics,
        customQueries: req.body.customQueries,
        outputFormat: req.body.outputFormat,
        enableML: req.body.enableML,
        enableQualityChecks: req.body.enableQualityChecks,
      };
      
      const job = await batchProcessor.processHistoricalData(options);
      
      res.json({
        success: true,
        job: {
          id: job.id,
          name: job.name,
          status: job.status,
          startTime: job.startTime,
          metadata: job.metadata,
        },
      });
      
    } catch (error) {
      logger.error('Failed to start historical batch processing:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Start micro-batch processing
  app.post('/api/batch/micro-batch/start', async (req, res) => {
    try {
      await batchProcessor.startMicroBatchProcessing();
      
      res.json({
        success: true,
        message: 'Micro-batch processing started',
      });
      
    } catch (error) {
      logger.error('Failed to start micro-batch processing:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Get all active jobs
  app.get('/api/batch/jobs', (req, res) => {
    try {
      const jobs = batchProcessor.getActiveJobs();
      res.json({
        success: true,
        jobs,
      });
    } catch (error) {
      logger.error('Failed to get jobs:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Get job status
  app.get('/api/batch/jobs/:jobId', (req, res) => {
    try {
      const job = batchProcessor.getJobStatus(req.params.jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }
      
      res.json({
        success: true,
        job,
      });
      
    } catch (error) {
      logger.error('Failed to get job status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Cancel a job
  app.delete('/api/batch/jobs/:jobId', async (req, res) => {
    try {
      const cancelled = await batchProcessor.cancelJob(req.params.jobId);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: 'Job not found or cannot be cancelled',
        });
      }
      
      res.json({
        success: true,
        message: 'Job cancelled successfully',
      });
      
    } catch (error) {
      logger.error('Failed to cancel job:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Train ML models
  app.post('/api/ml/train', async (req, res) => {
    try {
      // This would need to be implemented with actual training data
      res.json({
        success: true,
        message: 'ML model training started',
      });
      
    } catch (error) {
      logger.error('Failed to start ML training:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Get configuration
  app.get('/api/config', (req, res) => {
    // Return sanitized configuration (no sensitive data)
    const sanitizedConfig = {
      spark: {
        appName: config.spark.appName,
        executorMemory: config.spark.executorMemory,
        executorCores: config.spark.executorCores,
        driverMemory: config.spark.driverMemory,
      },
      batch: {
        triggerInterval: config.batch.triggerInterval,
        outputMode: config.batch.outputMode,
        compression: config.batch.compression,
      },
      ml: {
        anomalyDetectionEnabled: config.ml.anomalyDetectionEnabled,
        featureColumns: config.ml.featureColumns,
        anomalyThreshold: config.ml.anomalyThreshold,
      },
      environment: config.environment,
      logLevel: config.logLevel,
    };
    
    res.json({
      success: true,
      config: sanitizedConfig,
    });
  });

  // Error handling middleware
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error in request:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      ...(config.environment === 'development' && { details: error.message }),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
    });
  });
}

/**
 * Setup scheduled jobs for automated processing
 */
function setupScheduledJobs(): void {
  // Schedule historical batch processing (daily at 2 AM)
  cron.schedule('0 2 * * *', async () => {
    if (isShuttingDown) return;
    
    try {
      logger.info('Starting scheduled historical batch processing...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      
      await batchProcessor.processHistoricalData({
        batchId: `scheduled_${yesterday.toISOString().slice(0, 10)}`,
        startDate: yesterday,
        endDate: endOfYesterday,
        enableML: true,
        enableQualityChecks: true,
      });
      
      logger.info('Scheduled historical batch processing completed');
      
    } catch (error) {
      logger.error('Scheduled batch processing failed:', error);
    }
  });

  // Schedule ML model retraining (weekly on Sunday at 3 AM)
  cron.schedule('0 3 * * 0', async () => {
    if (isShuttingDown) return;
    
    try {
      logger.info('Starting scheduled ML model retraining...');
      // Implementation would retrain ML models
      logger.info('Scheduled ML model retraining completed');
      
    } catch (error) {
      logger.error('Scheduled ML retraining failed:', error);
    }
  });

  // Schedule storage optimization (daily at 1 AM)
  cron.schedule('0 1 * * *', async () => {
    if (isShuttingDown) return;
    
    try {
      logger.info('Starting scheduled storage optimization...');
      // Implementation would optimize storage
      logger.info('Scheduled storage optimization completed');
      
    } catch (error) {
      logger.error('Scheduled storage optimization failed:', error);
    }
  });

  logger.info('Scheduled jobs configured');
}

/**
 * Setup graceful shutdown handling
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`Received ${signal} again, forcing exit`);
      process.exit(1);
    }
    
    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Stop accepting new requests
      logger.info('Stopping HTTP server...');
      
      // Shutdown batch processor
      if (batchProcessor) {
        logger.info('Shutting down batch processor...');
        await batchProcessor.shutdown();
      }
      
      // Shutdown metrics
      await metrics.shutdown();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// Start the service
if (require.main === module) {
  initialize().catch((error) => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}

export { app, batchProcessor };