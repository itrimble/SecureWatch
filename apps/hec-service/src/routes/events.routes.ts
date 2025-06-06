import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { TokenService } from '../services/token.service';
import { KafkaService } from '../services/kafka.service';
import { HECEvent, HECBatchRequest, ProcessedHECEvent, HECResponse, HECEventFormat } from '../types/hec.types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export class EventsRoutes {
  private router: Router;
  private authMiddleware: AuthMiddleware;
  private validationMiddleware: ValidationMiddleware;
  private tokenService: TokenService;
  private kafkaService: KafkaService;
  private kafkaTopic: string;
  private enableAck: boolean;

  constructor(
    tokenService: TokenService,
    kafkaService: KafkaService,
    kafkaTopic: string = 'hec-events',
    enableAck: boolean = false
  ) {
    this.router = Router();
    this.tokenService = tokenService;
    this.kafkaService = kafkaService;
    this.kafkaTopic = kafkaTopic;
    this.enableAck = enableAck;

    this.authMiddleware = new AuthMiddleware(tokenService);
    this.validationMiddleware = new ValidationMiddleware();

    this.setupRoutes();
  }

  /**
   * Setup all event routes
   */
  private setupRoutes(): void {
    // Apply common middleware to all routes
    this.router.use(this.authMiddleware.logRequest);
    this.router.use(this.authMiddleware.authenticateToken);
    this.router.use(this.authMiddleware.checkRateLimit);
    this.router.use(this.validationMiddleware.checkRequestSize);

    // Single event endpoint
    this.router.post(
      '/event',
      this.validationMiddleware.getQueryValidation(),
      this.validationMiddleware.validateSingleEvent,
      this.handleSingleEvent.bind(this)
    );

    // Batch events endpoint
    this.router.post(
      '/events',
      this.validationMiddleware.getQueryValidation(),
      this.validationMiddleware.validateBatchEvents,
      this.handleBatchEvents.bind(this)
    );

    // Raw event endpoint (for simple text events)
    this.router.post(
      '/raw',
      this.validationMiddleware.getQueryValidation(),
      this.validationMiddleware.validateRawEvent,
      this.handleRawEvent.bind(this)
    );

    // Health check endpoint (no auth required)
    this.router.get('/health', this.handleHealthCheck.bind(this));
  }

  /**
   * Handle single event submission
   */
  private async handleSingleEvent(req: Request, res: Response): Promise<void> {
    try {
      const hecEvent: HECEvent = req.body;
      const token = req.hecToken!;
      const sources: string[] = [];
      const sourceTypes: string[] = [];

      // Process the event
      const processedEvent = await this.processHECEvent(
        hecEvent,
        token.token,
        token.name,
        token.organizationId,
        req.clientIp!,
        req.headers['user-agent'],
        req.query
      );

      sources.push(processedEvent.metadata.source);
      sourceTypes.push(processedEvent.metadata.sourcetype);

      // Send to Kafka
      await this.kafkaService.sendEvent(this.kafkaTopic, processedEvent);

      // Update token usage statistics
      await this.tokenService.updateUsageStats(
        token.id,
        1,
        processedEvent.metadata.eventSize,
        sources,
        sourceTypes,
        true
      );

      // Prepare response
      const response: HECResponse = {
        text: 'Success',
        code: 0
      };

      if (this.enableAck) {
        response.ackId = Date.now(); // Simple ack ID based on timestamp
      }

      logger.info('Single HEC event processed successfully', {
        eventId: processedEvent.id,
        tokenId: token.id,
        source: processedEvent.metadata.source,
        size: processedEvent.metadata.eventSize,
        ip: req.clientIp
      });

      res.json(response);
    } catch (error) {
      await this.handleEventError(error, req, res, 'single event');
    }
  }

  /**
   * Handle batch events submission
   */
  private async handleBatchEvents(req: Request, res: Response): Promise<void> {
    try {
      const batchRequest: HECBatchRequest = req.body;
      const token = req.hecToken!;
      const sources: string[] = [];
      const sourceTypes: string[] = [];

      // Process all events
      const processedEvents: ProcessedHECEvent[] = [];
      for (const hecEvent of batchRequest.events) {
        const processedEvent = await this.processHECEvent(
          hecEvent,
          token.token,
          token.name,
          token.organizationId,
          req.clientIp!,
          req.headers['user-agent'],
          req.query,
          batchRequest.metadata
        );

        processedEvents.push(processedEvent);
        sources.push(processedEvent.metadata.source);
        sourceTypes.push(processedEvent.metadata.sourcetype);
      }

      // Send batch to Kafka
      await this.kafkaService.sendBatch(this.kafkaTopic, processedEvents);

      // Update token usage statistics
      const totalSize = processedEvents.reduce((sum, event) => sum + event.metadata.eventSize, 0);
      await this.tokenService.updateUsageStats(
        token.id,
        processedEvents.length,
        totalSize,
        sources,
        sourceTypes,
        true
      );

      // Prepare response
      const response: HECResponse = {
        text: 'Success',
        code: 0
      };

      if (this.enableAck) {
        response.ackId = Date.now(); // Simple ack ID based on timestamp
      }

      logger.info('Batch HEC events processed successfully', {
        eventCount: processedEvents.length,
        tokenId: token.id,
        totalSize,
        ip: req.clientIp
      });

      res.json(response);
    } catch (error) {
      await this.handleEventError(error, req, res, 'batch events');
    }
  }

  /**
   * Handle raw text event submission
   */
  private async handleRawEvent(req: Request, res: Response): Promise<void> {
    try {
      const rawText: string = req.body;
      const token = req.hecToken!;

      // Convert raw text to HEC event format
      const hecEvent: HECEvent = {
        event: rawText,
        time: Date.now() / 1000, // Unix timestamp
        source: (req.query.source as string) || 'hec:raw',
        sourcetype: (req.query.sourcetype as string) || 'text',
        index: (req.query.index as string) || 'main',
        host: (req.query.host as string) || req.headers.host || 'unknown'
      };

      // Process the event
      const processedEvent = await this.processHECEvent(
        hecEvent,
        token.token,
        token.name,
        token.organizationId,
        req.clientIp!,
        req.headers['user-agent'],
        req.query
      );

      // Send to Kafka
      await this.kafkaService.sendEvent(this.kafkaTopic, processedEvent);

      // Update token usage statistics
      await this.tokenService.updateUsageStats(
        token.id,
        1,
        processedEvent.metadata.eventSize,
        [processedEvent.metadata.source],
        [processedEvent.metadata.sourcetype],
        true
      );

      // Prepare response
      const response: HECResponse = {
        text: 'Success',
        code: 0
      };

      if (this.enableAck) {
        response.ackId = Date.now();
      }

      logger.info('Raw HEC event processed successfully', {
        eventId: processedEvent.id,
        tokenId: token.id,
        source: processedEvent.metadata.source,
        size: processedEvent.metadata.eventSize,
        ip: req.clientIp
      });

      res.json(response);
    } catch (error) {
      await this.handleEventError(error, req, res, 'raw event');
    }
  }

  /**
   * Handle health check
   */
  private async handleHealthCheck(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      logger.error('Health check error', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a single HEC event and convert to internal format
   */
  private async processHECEvent(
    hecEvent: HECEvent,
    tokenString: string,
    tokenName: string,
    organizationId: string,
    clientIp: string,
    userAgent?: string,
    queryParams?: any,
    batchMetadata?: any
  ): Promise<ProcessedHECEvent> {
    const now = new Date();
    
    // Determine event timestamp
    let timestamp = now;
    if (hecEvent.time) {
      if (typeof hecEvent.time === 'number') {
        // Unix timestamp (seconds or milliseconds)
        const timeMs = hecEvent.time < 1e10 ? hecEvent.time * 1000 : hecEvent.time;
        timestamp = new Date(timeMs);
      } else if (typeof hecEvent.time === 'string') {
        timestamp = new Date(hecEvent.time);
      }
    }

    // Extract metadata with fallbacks
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

    // Determine format
    let format: HECEventFormat = 'json';
    if (typeof hecEvent.event === 'string') {
      try {
        JSON.parse(hecEvent.event);
        format = 'json';
      } catch {
        format = 'raw';
      }
    }

    // Create normalized event data
    const normalizedEvent = {
      timestamp,
      source,
      sourcetype,
      index,
      host,
      event: hecEvent.event,
      fields: hecEvent.fields || {},
      // Additional fields for SecureWatch compatibility
      rawData: JSON.stringify(hecEvent.event),
      metadata: {
        ingestionId: uuidv4(),
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
      id: uuidv4(),
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

  /**
   * Handle errors during event processing
   */
  private async handleEventError(error: any, req: Request, res: Response, eventType: string): Promise<void> {
    const token = req.hecToken;
    
    logger.error(`Failed to process ${eventType}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      tokenId: token?.id,
      ip: req.clientIp,
      path: req.path
    });

    // Update error statistics if token is available
    if (token) {
      await this.tokenService.updateUsageStats(
        token.id,
        0, // no events processed
        0, // no bytes processed
        [],
        [],
        false // not successful
      );
    }

    res.status(500).json({
      text: `Internal Server Error: Failed to process ${eventType}`,
      code: 500
    });
  }

  /**
   * Get the configured router
   */
  getRouter(): Router {
    return this.router;
  }
}