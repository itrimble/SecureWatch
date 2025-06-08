// Enhanced Log Ingestion Service with Parser Framework Integration
// Updated service integrating the new comprehensive parser framework
import express from 'express';
import { Kafka } from 'kafkajs';
import { WindowsEventLogAdapter } from './adapters/windows-event-log.adapter';
import { SyslogAdapter } from './adapters/syslog.adapter';
import { CSVAdapter } from './adapters/csv.adapter';
import { XMLAdapter } from './adapters/xml.adapter';
import { EnhancedLogProcessor } from './services/enhanced-log-processor';
import { TimescaleDBService } from './services/database.service';
import { KafkaProducerPool } from './utils/kafka-producer-pool';
import { BufferManager } from './buffers/buffer-manager';
import { MetricsCollector } from './monitoring/metrics-collector';
import { HealthChecker } from './monitoring/health-checker';
import { UploadRoutes } from './routes/upload.routes';
import { kafkaConfig, producerConfig, consumerConfig, topics, performanceConfig } from './config/kafka.config';
import logger from './utils/logger';
const app = express();
const PORT = process.env.PORT || 4002;
const CORRELATION_ENGINE_URL = process.env.CORRELATION_ENGINE_URL || 'http://localhost:4005';
// Initialize components
let kafka;
let producerPool;
let bufferManager;
let metricsCollector;
let healthChecker;
let dbService;
let enhancedProcessor;
// Adapters
let windowsAdapter;
let syslogAdapter;
let csvAdapter;
let xmlAdapter;
let uploadRoutes;
async function initializeServices() {
    try {
        logger.info('Initializing enhanced log ingestion service...');
        // Initialize metrics collector
        metricsCollector = new MetricsCollector();
        // Initialize Kafka
        kafka = new Kafka(kafkaConfig);
        // Initialize producer pool for high throughput
        producerPool = new KafkaProducerPool(kafka, producerConfig, performanceConfig.producerPool.size, metricsCollector);
        await producerPool.initialize();
        // Initialize database service
        dbService = new TimescaleDBService({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.DB_NAME || 'securewatch',
            username: process.env.DB_USER || 'securewatch',
            password: process.env.DB_PASSWORD || 'securewatch',
            ssl: process.env.DB_SSL === 'true'
        });
        await dbService.initialize();
        // Initialize enhanced log processor with parser framework
        enhancedProcessor = new EnhancedLogProcessor(dbService, producerPool.getProducer());
        await enhancedProcessor.initialize();
        // Initialize buffer manager
        bufferManager = new BufferManager({
            memoryBufferSize: 1000000,
            diskBufferSize: 10000000,
            diskBufferPath: process.env.DISK_BUFFER_PATH || '/var/lib/securewatch/buffers',
            highWaterMark: 80,
            lowWaterMark: 60,
            compressionEnabled: true,
        }, metricsCollector);
        await bufferManager.initialize();
        // Initialize adapters with enhanced processor integration
        windowsAdapter = new WindowsEventLogAdapter({
            channels: ['Security', 'System', 'Application'],
            servers: (process.env.WINDOWS_SERVERS || 'localhost').split(','),
            batchSize: performanceConfig.batchSize,
            pollInterval: 1000,
            includeEventData: true,
        }, producerPool, bufferManager, metricsCollector);
        syslogAdapter = new SyslogAdapter({
            udpPort: parseInt(process.env.SYSLOG_UDP_PORT || '514', 10),
            tcpPort: parseInt(process.env.SYSLOG_TCP_PORT || '514', 10),
            rfc5425Port: parseInt(process.env.SYSLOG_RFC5425_PORT || '601', 10),
            tlsPort: parseInt(process.env.SYSLOG_TLS_PORT || '6514', 10),
            maxMessageSize: 64 * 1024,
            batchSize: performanceConfig.batchSize,
            flushInterval: performanceConfig.batchTimeout,
            rfc: 'RFC5424',
            enableJsonPayloadParsing: true,
            jsonPayloadDelimiter: ' JSON:',
        }, producerPool, bufferManager, metricsCollector);
        csvAdapter = new CSVAdapter({
            delimiter: ',',
            quote: '"',
            escape: '\\',
            hasHeaders: true,
            skipEmptyLines: true,
            batchSize: 1000
        });
        xmlAdapter = new XMLAdapter({
            rootElement: 'Event',
            timestampField: 'TimeCreated',
            batchSize: 500
        });
        // Initialize health checker
        healthChecker = new HealthChecker({
            kafka,
            producerPool,
            bufferManager,
            dbService,
            enhancedProcessor,
            adapters: {
                windows: windowsAdapter,
                syslog: syslogAdapter,
                csv: csvAdapter,
                xml: xmlAdapter
            },
        });
        // Initialize upload routes with enhanced processor
        uploadRoutes = new UploadRoutes(producerPool, bufferManager, metricsCollector, enhancedProcessor);
        logger.info('All services initialized successfully');
    }
    catch (error) {
        logger.error('Failed to initialize services', error);
        throw error;
    }
}
// Enhanced processing pipeline using parser framework
async function startEnhancedProcessingPipeline() {
    const consumer = kafka.consumer({
        ...consumerConfig,
        groupId: 'enhanced-log-processor-group',
    });
    await consumer.connect();
    await consumer.subscribe({ topic: topics.raw, fromBeginning: false });
    await consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
            const startTime = Date.now();
            const processedResults = [];
            for (const message of batch.messages) {
                try {
                    const rawLog = message.value.toString();
                    const headers = message.headers || {};
                    // Extract source hints from Kafka headers
                    const sourceHint = headers.source?.toString();
                    const categoryHint = headers.category?.toString();
                    // Process with enhanced processor
                    const result = await enhancedProcessor.processLog(rawLog, sourceHint, categoryHint);
                    processedResults.push(result);
                    // Send heartbeat periodically
                    if (processedResults.length % 100 === 0) {
                        await heartbeat();
                    }
                }
                catch (error) {
                    logger.error('Error processing message in enhanced pipeline', error);
                    metricsCollector.incrementCounter('enhanced_pipeline.processing_errors');
                }
            }
            // Commit offsets
            await resolveOffset(batch.messages[batch.messages.length - 1].offset);
            // Update metrics
            const duration = Date.now() - startTime;
            const successfulCount = processedResults.filter(r => r.success).length;
            const failedCount = processedResults.length - successfulCount;
            metricsCollector.recordHistogram('enhanced_pipeline.batch_processing_time', duration);
            metricsCollector.incrementCounter('enhanced_pipeline.events_processed', {}, successfulCount);
            metricsCollector.incrementCounter('enhanced_pipeline.events_failed', {}, failedCount);
            logger.debug(`Enhanced pipeline processed batch: ${successfulCount} successful, ${failedCount} failed`);
        },
    });
}
// API endpoints
app.use(express.json({ limit: '100mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));
// Mount upload routes with enhanced processing
app.use('/', uploadRoutes.getRouter());
// Enhanced log processing endpoint
app.post('/api/logs/process', async (req, res) => {
    try {
        const { logs, sourceHint, categoryHint } = req.body;
        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request: logs array required'
            });
        }
        logger.info(`Processing ${logs.length} logs with enhanced processor`);
        const results = await enhancedProcessor.processLogsBatch(logs.map(log => ({ rawLog: log, sourceHint, categoryHint })));
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        res.json({
            status: 'success',
            total_logs: logs.length,
            successful,
            failed,
            results: results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Error in enhanced log processing endpoint', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Parser management endpoints
app.get('/api/parsers', (req, res) => {
    try {
        const parsers = enhancedProcessor.listParsers();
        res.json({
            status: 'success',
            parsers: parsers.map(parser => ({
                id: parser.id,
                name: parser.name,
                vendor: parser.vendor,
                version: parser.version,
                format: parser.format,
                category: parser.category,
                enabled: parser.enabled,
                priority: parser.priority
            })),
            total: parsers.length
        });
    }
    catch (error) {
        logger.error('Error listing parsers', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to list parsers'
        });
    }
});
app.get('/api/parsers/stats', (req, res) => {
    try {
        const stats = enhancedProcessor.getParserStats();
        res.json({
            status: 'success',
            stats
        });
    }
    catch (error) {
        logger.error('Error getting parser stats', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to get parser stats'
        });
    }
});
app.post('/api/parsers/:parserId/toggle', (req, res) => {
    try {
        const { parserId } = req.params;
        const { enabled } = req.body;
        const success = enhancedProcessor.setParserEnabled(parserId, enabled);
        if (success) {
            res.json({
                status: 'success',
                message: `Parser ${parserId} ${enabled ? 'enabled' : 'disabled'}`
            });
        }
        else {
            res.status(404).json({
                status: 'error',
                message: `Parser ${parserId} not found`
            });
        }
    }
    catch (error) {
        logger.error('Error toggling parser', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to toggle parser'
        });
    }
});
app.post('/api/parsers/:parserId/test', async (req, res) => {
    try {
        const { parserId } = req.params;
        const { testData } = req.body;
        if (!testData || !Array.isArray(testData)) {
            return res.status(400).json({
                status: 'error',
                message: 'Test data array required'
            });
        }
        const results = await enhancedProcessor.testParser(parserId, testData);
        res.json({
            status: 'success',
            results
        });
    }
    catch (error) {
        logger.error('Error testing parser', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to test parser'
        });
    }
});
// Processing statistics
app.get('/api/processing/stats', (req, res) => {
    try {
        const stats = enhancedProcessor.getProcessingStats();
        const health = enhancedProcessor.getHealthStatus();
        res.json({
            status: 'success',
            processing: stats,
            health
        });
    }
    catch (error) {
        logger.error('Error getting processing stats', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to get processing stats'
        });
    }
});
// Legacy agent ingest endpoint (enhanced with parser framework)
app.post('/api/ingest', async (req, res) => {
    try {
        const logEntries = Array.isArray(req.body) ? req.body : [req.body];
        logger.info(`Received ${logEntries.length} log entries from agent`);
        const results = [];
        for (const entry of logEntries) {
            try {
                // Convert legacy format to raw log string
                const rawLog = typeof entry === 'string' ? entry : JSON.stringify(entry);
                // Process with enhanced processor
                const result = await enhancedProcessor.processFromAdapter(rawLog, 'json', {
                    source: entry.source_identifier || 'agent',
                    agent_id: req.headers['x-agent-id']
                });
                results.push(result);
            }
            catch (processError) {
                logger.error('Error processing agent log entry', processError);
                results.push({
                    success: false,
                    error: processError instanceof Error ? processError.message : 'Processing failed',
                    processingTime: 0
                });
            }
        }
        const successful = results.filter(r => r.success).length;
        res.json({
            status: 'success',
            processed: successful,
            failed: results.length - successful,
            total: logEntries.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Error in enhanced ingest endpoint', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Enhanced health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = await healthChecker.check();
        const enhancedHealth = enhancedProcessor.getHealthStatus();
        const combined = {
            ...health,
            enhanced_processor: enhancedHealth,
            parser_framework: {
                initialized: enhancedHealth.initialized,
                parsers_loaded: enhancedHealth.parsersLoaded,
                active_parsers: enhancedHealth.activeParsers
            }
        };
        const statusCode = combined.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(combined);
    }
    catch (error) {
        logger.error('Error in enhanced health check', error);
        res.status(500).json({
            status: 'error',
            message: 'Health check failed'
        });
    }
});
// Enhanced metrics endpoint
app.get('/metrics', (req, res) => {
    try {
        const metrics = metricsCollector.getPrometheusMetrics();
        const parserMetrics = enhancedProcessor.getParserMetrics();
        // Add parser-specific metrics
        let enhancedMetrics = metrics;
        if (parserMetrics && typeof parserMetrics === 'object') {
            enhancedMetrics += '\n# Parser Framework Metrics\n';
            Object.entries(parserMetrics).forEach(([key, value]) => {
                enhancedMetrics += `parser_${key} ${value}\n`;
            });
        }
        res.set('Content-Type', 'text/plain');
        res.send(enhancedMetrics);
    }
    catch (error) {
        logger.error('Error generating enhanced metrics', error);
        res.status(500).send('# Error generating metrics\n');
    }
});
// Enhanced adapter control endpoints
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
        res.json({
            message: `${adapter} adapter started`,
            enhanced_processing: true,
            parser_framework: 'enabled'
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to start adapter',
            enhanced_processing: false
        });
    }
});
// Start the enhanced service
async function start() {
    try {
        // Initialize all services
        await initializeServices();
        // Start enhanced processing pipeline
        await startEnhancedProcessingPipeline();
        // Start adapters
        await windowsAdapter.start();
        await syslogAdapter.start();
        // Start HTTP server
        app.listen(PORT, () => {
            logger.info(`Enhanced log ingestion service running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info('Features: Parser Framework, Enhanced Processing, ECS Normalization');
            logger.info('Adapters started: Windows Event Log, Syslog, CSV, XML');
            // Log parser framework status
            const health = enhancedProcessor.getHealthStatus();
            logger.info(`Parser Framework: ${health.parsersLoaded} parsers loaded, ${health.activeParsers} active`);
        });
    }
    catch (error) {
        logger.error('Failed to start enhanced log ingestion service', error);
        process.exit(1);
    }
}
// Enhanced graceful shutdown
async function shutdown() {
    logger.info('Shutting down enhanced log ingestion service...');
    try {
        // Stop adapters
        await windowsAdapter.stop();
        await syslogAdapter.stop();
        // Shutdown enhanced processor
        await enhancedProcessor.shutdown();
        // Flush buffers
        await bufferManager.flush();
        // Close database service
        await dbService.close();
        // Close producer pool
        await producerPool.close();
        // Close buffer manager
        await bufferManager.close();
        logger.info('Enhanced shutdown complete');
        process.exit(0);
    }
    catch (error) {
        logger.error('Error during enhanced shutdown', error);
        process.exit(1);
    }
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Start the enhanced service
start();
//# sourceMappingURL=index-enhanced.js.map