import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';

import { TokenService } from './services/token.service';
import { KafkaService } from './services/kafka.service';
import { EventsRoutes } from './routes/events.routes';
import { AdminRoutes } from './routes/admin.routes';
import { HECConfig } from './types/hec.types';
import logger from './utils/logger';

class HECService {
  private app: express.Application;
  private config: HECConfig;
  private tokenService!: TokenService;
  private kafkaService!: KafkaService;
  private eventsRoutes!: EventsRoutes;
  private adminRoutes!: AdminRoutes;

  constructor() {
    this.app = express();
    this.config = this.loadConfig();
    this.setupLogging();
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Load configuration from environment variables with defaults
   */
  private loadConfig(): HECConfig {
    return {
      port: parseInt(process.env.HEC_PORT || '8888'),
      maxEventSize: parseInt(process.env.HEC_MAX_EVENT_SIZE || '1048576'), // 1MB
      maxBatchSize: parseInt(process.env.HEC_MAX_BATCH_SIZE || '104857600'), // 100MB
      maxEventsPerBatch: parseInt(process.env.HEC_MAX_EVENTS_PER_BATCH || '1000'),
      tokenValidationCacheMs: parseInt(process.env.HEC_TOKEN_CACHE_MS || '300000'), // 5 minutes
      rateLimitWindowMs: parseInt(process.env.HEC_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
      defaultRateLimit: parseInt(process.env.HEC_DEFAULT_RATE_LIMIT || '1000'), // requests per window
      enableCompression: process.env.HEC_ENABLE_COMPRESSION === 'true',
      enableCors: process.env.HEC_ENABLE_CORS !== 'false', // enabled by default
      corsOrigins: process.env.HEC_CORS_ORIGINS ? 
        process.env.HEC_CORS_ORIGINS.split(',') : 
        ['http://localhost:3000', 'http://localhost:4000'],
      kafkaTopic: process.env.HEC_KAFKA_TOPIC || 'hec-events',
      kafkaBrokers: process.env.KAFKA_BROKERS ? 
        process.env.KAFKA_BROKERS.split(',') : 
        ['localhost:9092'],
      enableAck: process.env.HEC_ENABLE_ACK === 'true',
      ackTimeoutMs: parseInt(process.env.HEC_ACK_TIMEOUT_MS || '30000') // 30 seconds
    };
  }

  /**
   * Setup logging directory
   */
  private setupLogging(): void {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    logger.info('Initializing HEC services...', this.config);

    // Initialize token service
    this.tokenService = new TokenService(this.config.tokenValidationCacheMs);

    // Initialize Kafka service
    this.kafkaService = new KafkaService(this.config.kafkaBrokers, 'hec-service');

    // Initialize route handlers
    this.eventsRoutes = new EventsRoutes(
      this.tokenService,
      this.kafkaService,
      this.config.kafkaTopic,
      this.config.enableAck
    );

    this.adminRoutes = new AdminRoutes(this.tokenService, this.kafkaService);

    logger.info('HEC services initialized successfully');
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for API service
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: false
      }));
    }

    // Compression
    if (this.config.enableCompression) {
      this.app.use(compression());
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.defaultRateLimit,
      message: {
        text: 'Too many requests from this IP',
        code: 429
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use IP and token for rate limiting
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const token = req.headers.authorization?.replace('Bearer ', '').substring(0, 8) || 'no-token';
        return `${ip}:${token}`;
      }
    });

    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: this.config.maxBatchSize,
      strict: false // Allow parsing of non-JSON for raw endpoints
    }));
    
    this.app.use(express.text({ 
      limit: this.config.maxEventSize,
      type: ['text/plain', 'application/x-raw']
    }));

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.debug('Incoming request', {
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

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Root endpoint
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

    // Mount event routes (Splunk-compatible paths)
    this.app.use('/services/collector', this.eventsRoutes.getRouter());

    // Mount admin routes
    this.app.use('/admin', this.adminRoutes.getRouter());

    // Alternative health endpoint (no auth required)
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
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        text: 'Not Found: Invalid endpoint',
        code: 404,
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled application error', {
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

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown
      this.shutdown().then(() => {
        process.exit(1);
      });
    });

    // Handle graceful shutdown signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, initiating graceful shutdown...');
      this.shutdown().then(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, initiating graceful shutdown...');
      this.shutdown().then(() => process.exit(0));
    });
  }

  /**
   * Start the HEC service
   */
  async start(): Promise<void> {
    try {
      // Connect to Kafka first
      await this.kafkaService.connect();
      
      // Ensure Kafka topic exists
      await this.kafkaService.ensureTopic(this.config.kafkaTopic);

      // Start HTTP server
      const server = this.app.listen(this.config.port, () => {
        logger.info(`HEC Service started successfully`, {
          port: this.config.port,
          kafkaTopic: this.config.kafkaTopic,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0'
        });
      });

      // Handle server errors
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.config.port} is already in use`);
        } else {
          logger.error('Server error', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start HEC service', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    logger.info('Shutting down HEC service...');
    
    try {
      // Disconnect from Kafka
      await this.kafkaService.disconnect();
      logger.info('Kafka connection closed');

      logger.info('HEC service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', error);
    }
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const hecService = new HECService();
  hecService.start().catch((error) => {
    logger.error('Failed to start HEC service', error);
    process.exit(1);
  });
}

export default HECService;