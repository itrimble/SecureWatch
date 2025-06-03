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
import { kafkaConfig, producerConfig, consumerConfig, topics, performanceConfig } from './config/kafka.config';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 4002;

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
        tlsPort: parseInt(process.env.SYSLOG_TLS_PORT || '6514', 10),
        maxMessageSize: 64 * 1024, // 64KB
        batchSize: performanceConfig.batchSize,
        flushInterval: performanceConfig.batchTimeout,
        rfc: 'RFC5424',
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
app.use(express.json());

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