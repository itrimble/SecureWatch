import express from 'express';
import { Kafka } from 'kafkajs';
import { WindowsEventLogAdapter } from './adapters/windows-event-log.adapter';
import { SyslogAdapter } from './adapters/syslog.adapter';
import { LogNormalizer } from './processors/log-normalizer';
import { LogEnricher } from './processors/log-enricher';
import { KafkaProducerPool } from './utils/kafka-producer-pool';
import { BufferManager } from './buffers/buffer-manager';
import { MetricsCollector } from './monitoring/metrics-collector';
import { HealthChecker } from './monitoring/health-checker';
import { UploadRoutes } from './routes/upload.routes';
import { kafkaConfig, producerConfig, consumerConfig, topics, performanceConfig } from './config/kafka.config';
import logger from './utils/logger';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 4002;
const CORRELATION_ENGINE_URL = process.env.CORRELATION_ENGINE_URL || 'http://localhost:4005';

// Initialize components
let kafka: Kafka;
let producerPool: KafkaProducerPool;
let bufferManager: BufferManager;
let metricsCollector: MetricsCollector;
let healthChecker: HealthChecker;
let windowsAdapter: WindowsEventLogAdapter;
let syslogAdapter: SyslogAdapter;
let normalizer: LogNormalizer;
let enricher: LogEnricher;
let uploadRoutes: UploadRoutes;

async function initializeServices() {
  try {
    // Initialize Kafka
    kafka = new Kafka(kafkaConfig);
    
    // Initialize metrics collector
    metricsCollector = new MetricsCollector();
    
    // Initialize producer pool for high throughput
    producerPool = new KafkaProducerPool(
      kafka,
      producerConfig,
      performanceConfig.producerPool.size,
      metricsCollector
    );
    await producerPool.initialize();
    
    // Initialize buffer manager
    bufferManager = new BufferManager({
      memoryBufferSize: 1000000, // 1M events in memory
      diskBufferSize: 10000000,  // 10M events on disk
      diskBufferPath: process.env.DISK_BUFFER_PATH || '/var/lib/securewatch/buffers',
      highWaterMark: 80,  // Start spilling at 80%
      lowWaterMark: 60,   // Stop spilling at 60%
      compressionEnabled: true,
    }, metricsCollector);
    await bufferManager.initialize();
    
    // Initialize adapters
    windowsAdapter = new WindowsEventLogAdapter(
      {
        channels: ['Security', 'System', 'Application'],
        servers: (process.env.WINDOWS_SERVERS || 'localhost').split(','),
        batchSize: performanceConfig.batchSize,
        pollInterval: 1000, // 1 second
        includeEventData: true,
      },
      producerPool,
      bufferManager,
      metricsCollector
    );
    
    syslogAdapter = new SyslogAdapter(
      {
        udpPort: parseInt(process.env.SYSLOG_UDP_PORT || '514', 10),
        tcpPort: parseInt(process.env.SYSLOG_TCP_PORT || '514', 10),
        rfc5425Port: parseInt(process.env.SYSLOG_RFC5425_PORT || '601', 10),
        tlsPort: parseInt(process.env.SYSLOG_TLS_PORT || '6514', 10),
        maxMessageSize: 64 * 1024, // 64KB
        batchSize: performanceConfig.batchSize,
        flushInterval: performanceConfig.batchTimeout,
        rfc: 'RFC5424',
        enableJsonPayloadParsing: true,
        jsonPayloadDelimiter: ' JSON:',
      },
      producerPool,
      bufferManager,
      metricsCollector
    );
    
    // Initialize processors
    normalizer = new LogNormalizer();
    enricher = new LogEnricher();
    
    // Initialize health checker
    healthChecker = new HealthChecker({
      kafka,
      producerPool,
      bufferManager,
      adapters: {
        windows: windowsAdapter,
        syslog: syslogAdapter,
      },
    });
    
    // Initialize upload routes
    uploadRoutes = new UploadRoutes(
      producerPool,
      bufferManager,
      metricsCollector
    );
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', error);
    throw error;
  }
}

// Start log processing pipeline
async function startProcessingPipeline() {
  const consumer = kafka.consumer({
    ...consumerConfig,
    groupId: 'log-normalizer-group',
  });
  
  await consumer.connect();
  await consumer.subscribe({ topic: topics.raw, fromBeginning: false });
  
  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
      const startTime = Date.now();
      const normalizedEvents = [];
      
      for (const message of batch.messages) {
        try {
          const rawEvent = JSON.parse(message.value!.toString());
          const normalizedEvent = await normalizer.normalize(rawEvent);
          normalizedEvents.push(normalizedEvent);
          
          // Send heartbeat periodically
          if (normalizedEvents.length % 100 === 0) {
            await heartbeat();
          }
        } catch (error) {
          logger.error('Error processing message', error);
          metricsCollector.incrementCounter('pipeline.normalization_errors');
        }
      }
      
      // Send normalized events to next topic
      if (normalizedEvents.length > 0) {
        const messages = normalizedEvents.map(event => ({
          key: event.metadata.organizationId,
          value: JSON.stringify(event),
        }));
        
        await producerPool.sendBatch(topics.normalized, messages);
        
        // Send batch to correlation engine
        try {
          await axios.post(`${CORRELATION_ENGINE_URL}/api/events/batch`, normalizedEvents, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 // 10 second timeout for batch
          });
        } catch (correlationError) {
          logger.warn('Failed to send batch to correlation engine', {
            error: correlationError instanceof Error ? correlationError.message : 'Unknown error',
            batchSize: normalizedEvents.length
          });
        }
      }
      
      // Commit offsets
      await resolveOffset(batch.messages[batch.messages.length - 1].offset);
      
      // Update metrics
      const duration = Date.now() - startTime;
      metricsCollector.recordHistogram('pipeline.batch_processing_time', duration);
      metricsCollector.incrementCounter('pipeline.events_normalized', {}, normalizedEvents.length);
    },
  });
}

// API endpoints
app.use(express.json({ limit: '100mb' })); // Increase limit for EVTX uploads
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

// Mount upload routes
app.use('/', uploadRoutes.getRouter());

// EVTX file processing endpoint
app.post('/api/evtx/process', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request: events array required'
      });
    }
    
    logger.info(`Processing ${events.length} EVTX events`);
    
    const processed = [];
    const failed = [];
    
    // Process each EVTX event
    for (const event of events) {
      try {
        // Normalize the EVTX event to SecureWatch format
        const normalizedEvent = await normalizer.normalize({
          timestamp: event.timestamp,
          source: 'windows_evtx',
          level: event.level?.toLowerCase() || 'info',
          message: event.message || `Windows Event ${event.event_id}`,
          event_id: event.event_id?.toString(),
          channel: event.channel,
          computer: event.computer,
          record_id: event.record_id,
          correlation_id: event.correlation_id,
          user_id: event.user_id,
          process_id: event.process_id,
          thread_id: event.thread_id,
          activity_id: event.activity_id,
          keywords: event.keywords,
          task: event.task,
          opcode: event.opcode,
          source_file: event.source_file,
          parsed_at: event.parsed_timestamp,
          event_data: event.event_data,
          system_data: event.system_data,
          raw_xml: event.raw_xml,
          metadata: event.metadata || {
            parser: 'evtx_parser',
            version: '1.0',
            source_type: 'windows_evtx'
          }
        });
        
        // Send to correlation engine for analysis
        try {
          await axios.post(`${CORRELATION_ENGINE_URL}/api/events`, normalizedEvent, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
        } catch (correlationError) {
          logger.warn('Failed to send EVTX event to correlation engine', {
            error: correlationError instanceof Error ? correlationError.message : 'Unknown error',
            event_id: event.event_id
          });
        }
        
        processed.push(normalizedEvent);
        metricsCollector.incrementCounter('evtx.events_processed');
        
      } catch (processError) {
        logger.error('Error processing EVTX event', {
          error: processError instanceof Error ? processError.message : 'Unknown error',
          event_id: event.event_id
        });
        failed.push({
          event_id: event.event_id,
          error: processError instanceof Error ? processError.message : 'Unknown error'
        });
        metricsCollector.incrementCounter('evtx.processing_errors');
      }
    }
    
    res.json({
      status: 'success',
      total_events: events.length,
      processed_events: processed.length,
      failed_events: failed.length,
      failed_details: failed,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error in EVTX processing endpoint', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Batch EVTX processing endpoint (for large files)
app.post('/api/logs/batch', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request: events array required'
      });
    }
    
    logger.info(`Processing batch of ${events.length} events`);
    
    const processed = [];
    const failed = [];
    
    // Process each event in the batch
    for (const event of events) {
      try {
        // Normalize the event
        const normalizedEvent = await normalizer.normalize(event);
        
        // Send to correlation engine
        try {
          await axios.post(`${CORRELATION_ENGINE_URL}/api/events`, normalizedEvent, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
        } catch (correlationError) {
          logger.warn('Failed to send batch event to correlation engine', {
            error: correlationError instanceof Error ? correlationError.message : 'Unknown error'
          });
        }
        
        processed.push(normalizedEvent);
        metricsCollector.incrementCounter('batch.events_processed');
        
      } catch (processError) {
        logger.error('Error processing batch event', {
          error: processError instanceof Error ? processError.message : 'Unknown error'
        });
        failed.push({
          error: processError instanceof Error ? processError.message : 'Unknown error'
        });
        metricsCollector.incrementCounter('batch.processing_errors');
      }
    }
    
    res.json({
      status: 'success',
      total_events: events.length,
      processed_events: processed.length,
      failed_events: failed.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error in batch processing endpoint', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Agent ingest endpoint for receiving logs from agents
app.post('/api/ingest', async (req, res) => {
  try {
    const logEntries = Array.isArray(req.body) ? req.body : [req.body];
    
    logger.info(`Received ${logEntries.length} log entries from agent`, {
      source: req.headers['user-agent'] || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // Process each log entry
    for (const entry of logEntries) {
      try {
        // Normalize the log entry
        const normalizedEntry = await normalizer.normalize(entry);
        
        // Send to correlation engine for real-time analysis
        try {
          await axios.post(`${CORRELATION_ENGINE_URL}/api/events`, normalizedEntry, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // 5 second timeout
          });
        } catch (correlationError) {
          logger.warn('Failed to send event to correlation engine', {
            error: correlationError instanceof Error ? correlationError.message : 'Unknown error'
          });
          // Continue processing even if correlation fails
        }
        
        // TODO: Send to Kafka topic or store in database
        logger.debug('Processed log entry', {
          sourceIdentifier: entry.source_identifier,
          timestamp: entry.timestamp,
          messageLength: entry.message?.length || 0
        });
        
        // For now, just log successful processing
        metricsCollector.incrementCounter('ingest.events_received');
      } catch (processError) {
        logger.error('Error processing log entry', {
          error: processError instanceof Error ? processError.message : 'Unknown error',
          entry: entry
        });
        metricsCollector.incrementCounter('ingest.processing_errors');
      }
    }
    
    res.json({
      status: 'success',
      processed: logEntries.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error in ingest endpoint', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthChecker.check();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.getPrometheusMetrics());
});

// Adapter control endpoints
app.post('/adapters/:adapter/start', async (req, res) => {
  try {
    const { adapter } = req.params;
    
    switch (adapter) {
      case 'windows':
        await windowsAdapter.start();
        break;
      case 'syslog':
        await syslogAdapter.start();
        break;
      default:
        return res.status(404).json({ error: 'Adapter not found' });
    }
    
    res.json({ message: `${adapter} adapter started` });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start adapter' });
  }
});

app.post('/adapters/:adapter/stop', async (req, res) => {
  try {
    const { adapter } = req.params;
    
    switch (adapter) {
      case 'windows':
        await windowsAdapter.stop();
        break;
      case 'syslog':
        await syslogAdapter.stop();
        break;
      default:
        return res.status(404).json({ error: 'Adapter not found' });
    }
    
    res.json({ message: `${adapter} adapter stopped` });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to stop adapter' });
  }
});

// Get adapter statistics
app.get('/adapters/:adapter/stats', (req, res) => {
  const { adapter } = req.params;
  
  let stats;
  switch (adapter) {
    case 'windows':
      stats = windowsAdapter.getStats();
      break;
    case 'syslog':
      stats = syslogAdapter.getStats();
      break;
    default:
      return res.status(404).json({ error: 'Adapter not found' });
  }
  
  res.json(stats);
});

// Buffer statistics
app.get('/buffer/stats', async (req, res) => {
  const stats = {
    memorySize: bufferManager.getSize(),
    totalSize: await bufferManager.getTotalSize(),
    metrics: metricsCollector.getMetrics().buffer || {},
  };
  res.json(stats);
});

// Performance statistics
app.get('/performance/stats', (req, res) => {
  const stats = {
    kafka: producerPool.getStats(),
    pipeline: metricsCollector.getMetrics().pipeline || {},
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
  };
  res.json(stats);
});

// Start the service
async function start() {
  try {
    // Initialize all services
    await initializeServices();
    
    // Start processing pipeline
    await startProcessingPipeline();
    
    // Start adapters
    await windowsAdapter.start();
    await syslogAdapter.start();
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Log ingestion service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Adapters started: Windows Event Log, Syslog');
    });
  } catch (error) {
    logger.error('Failed to start log ingestion service', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down log ingestion service...');
  
  try {
    // Stop adapters
    await windowsAdapter.stop();
    await syslogAdapter.stop();
    
    // Flush buffers
    await bufferManager.flush();
    
    // Close producer pool
    await producerPool.close();
    
    // Close buffer manager
    await bufferManager.close();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the service
start();