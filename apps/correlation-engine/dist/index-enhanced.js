// Enhanced Real-Time Correlation Engine Entry Point
// Task 1.4 - Optimized for sub-second threat detection performance
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger';
import { enhancedCorrelationEngine } from './engine/enhanced-correlation-engine';
const app = express();
const port = process.env.PORT || 7000;
// High-performance middleware configuration
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
}));
app.use(compression({
    level: 6, // Balanced compression for performance
    threshold: 1024,
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
// Optimized JSON parsing with size limits
app.use(express.json({
    limit: '10mb',
    strict: true,
    reviver: (key, value) => {
        // Optimize date parsing for timestamps
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return new Date(value);
        }
        return value;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Performance monitoring middleware
app.use((req, res, next) => {
    req.startTime = process.hrtime.bigint();
    res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - req.startTime) / 1000000; // Convert to ms
        if (duration > 100) { // Log slow requests
            logger.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration: `${duration.toFixed(2)}ms`,
                statusCode: res.statusCode
            });
        }
    });
    next();
});
// Health check endpoint with detailed engine metrics
app.get('/health', async (req, res) => {
    try {
        const stats = await enhancedCorrelationEngine.getEngineStats();
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            engine: stats,
            performance: {
                avgResponseTime: stats.performance.averageProcessingTimeMs,
                p99ResponseTime: stats.performance.p99ProcessingTimeMs,
                throughput: stats.performance.throughputEventsPerSecond,
                cacheEfficiency: stats.performance.cacheHitRatio,
                queueHealth: {
                    normal: stats.queueSize < 100 ? 'healthy' : 'congested',
                    fast: stats.fastQueueSize < 50 ? 'healthy' : 'congested'
                }
            }
        };
        res.json(health);
    }
    catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// Real-time event processing endpoint with optimizations
app.post('/events', async (req, res) => {
    const requestStart = performance.now();
    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];
        // Validate and sanitize events
        const validEvents = events.filter(event => event &&
            event.id &&
            event.event_id &&
            event.source &&
            event.timestamp);
        if (validEvents.length === 0) {
            return res.status(400).json({
                error: 'No valid events provided',
                received: events.length,
                valid: 0
            });
        }
        // Process events with enhanced engine
        const processingPromises = validEvents.map(event => enhancedCorrelationEngine.processEvent(event).catch(error => {
            logger.error('Event processing error:', error, { eventId: event.id });
            return { error: error.message, eventId: event.id };
        }));
        // Use Promise.allSettled for better error handling
        const results = await Promise.allSettled(processingPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const processingTime = performance.now() - requestStart;
        // Response with performance metrics
        res.json({
            processed: successful,
            failed: failed,
            total: validEvents.length,
            processingTimeMs: processingTime.toFixed(2),
            throughput: (validEvents.length / processingTime * 1000).toFixed(2),
            timestamp: new Date().toISOString()
        });
        // Log performance metrics
        logger.info('Events processed', {
            count: validEvents.length,
            successful,
            failed,
            processingTime: `${processingTime.toFixed(2)}ms`,
            throughput: `${(validEvents.length / processingTime * 1000).toFixed(2)} eps`
        });
    }
    catch (error) {
        const processingTime = performance.now() - requestStart;
        logger.error('Event processing endpoint error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            processingTimeMs: processingTime.toFixed(2),
            timestamp: new Date().toISOString()
        });
    }
});
// Batch event processing endpoint for high throughput
app.post('/events/batch', async (req, res) => {
    const requestStart = performance.now();
    try {
        const { events, options = {} } = req.body;
        if (!Array.isArray(events)) {
            return res.status(400).json({
                error: 'Events must be an array',
                received: typeof events
            });
        }
        // Validate batch size
        const maxBatchSize = parseInt(process.env.MAX_BATCH_SIZE || '1000');
        if (events.length > maxBatchSize) {
            return res.status(400).json({
                error: `Batch size exceeds maximum of ${maxBatchSize}`,
                received: events.length,
                maximum: maxBatchSize
            });
        }
        // Process in parallel chunks for optimal performance
        const chunkSize = options.chunkSize || 100;
        const chunks = [];
        for (let i = 0; i < events.length; i += chunkSize) {
            chunks.push(events.slice(i, i + chunkSize));
        }
        let totalProcessed = 0;
        let totalFailed = 0;
        // Process chunks in parallel
        const chunkPromises = chunks.map(async (chunk, index) => {
            try {
                const chunkStart = performance.now();
                const eventPromises = chunk.map(event => enhancedCorrelationEngine.processEvent(event));
                const results = await Promise.allSettled(eventPromises);
                const successful = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;
                const chunkTime = performance.now() - chunkStart;
                logger.debug(`Batch chunk ${index + 1} processed`, {
                    chunkSize: chunk.length,
                    successful,
                    failed,
                    chunkTime: `${chunkTime.toFixed(2)}ms`
                });
                return { successful, failed };
            }
            catch (error) {
                logger.error(`Batch chunk ${index + 1} error:`, error);
                return { successful: 0, failed: chunk.length };
            }
        });
        const chunkResults = await Promise.allSettled(chunkPromises);
        // Aggregate results
        for (const result of chunkResults) {
            if (result.status === 'fulfilled') {
                totalProcessed += result.value.successful;
                totalFailed += result.value.failed;
            }
            else {
                totalFailed += chunkSize; // Assume all failed
            }
        }
        const totalProcessingTime = performance.now() - requestStart;
        const throughput = (totalProcessed / totalProcessingTime * 1000);
        res.json({
            processed: totalProcessed,
            failed: totalFailed,
            total: events.length,
            chunks: chunks.length,
            processingTimeMs: totalProcessingTime.toFixed(2),
            throughputEps: throughput.toFixed(2),
            averageChunkTime: (totalProcessingTime / chunks.length).toFixed(2),
            timestamp: new Date().toISOString()
        });
        logger.info('Batch processing completed', {
            totalEvents: events.length,
            processed: totalProcessed,
            failed: totalFailed,
            chunks: chunks.length,
            throughput: `${throughput.toFixed(2)} eps`,
            totalTime: `${totalProcessingTime.toFixed(2)}ms`
        });
    }
    catch (error) {
        const processingTime = performance.now() - requestStart;
        logger.error('Batch processing endpoint error:', error);
        res.status(500).json({
            error: 'Batch processing failed',
            message: error.message,
            processingTimeMs: processingTime.toFixed(2),
            timestamp: new Date().toISOString()
        });
    }
});
// Engine configuration endpoints
app.get('/config', async (req, res) => {
    try {
        const stats = await enhancedCorrelationEngine.getEngineStats();
        res.json({
            realTimeConfig: stats.realTimeConfig,
            circuitBreaker: stats.circuitBreaker,
            indexing: stats.indexing,
            performance: stats.performance
        });
    }
    catch (error) {
        logger.error('Config retrieval error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.patch('/config', async (req, res) => {
    try {
        await enhancedCorrelationEngine.updateRealTimeConfig(req.body);
        res.json({
            message: 'Configuration updated successfully',
            newConfig: req.body,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Config update error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Stream mode control
app.post('/stream/enable', async (req, res) => {
    try {
        await enhancedCorrelationEngine.enableStreamMode();
        res.json({
            message: 'Stream processing mode enabled for ultra-low latency',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Stream mode enable error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/stream/disable', async (req, res) => {
    try {
        await enhancedCorrelationEngine.disableStreamMode();
        res.json({
            message: 'Stream processing mode disabled',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Stream mode disable error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Rules management
app.post('/rules/reload', async (req, res) => {
    try {
        await enhancedCorrelationEngine.reloadRules();
        const stats = await enhancedCorrelationEngine.getEngineStats();
        res.json({
            message: 'Rules reloaded successfully',
            activeRules: stats.activeRules,
            indexedEventTypes: stats.indexing.indexedEventTypes,
            bloomFilterSize: stats.indexing.bloomFilterSize,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Rule reload error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Performance metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        const stats = await enhancedCorrelationEngine.getEngineStats();
        // Prometheus-style metrics format
        const metrics = `
# HELP correlation_events_processed_total Total number of events processed
# TYPE correlation_events_processed_total counter
correlation_events_processed_total ${stats.performance.totalEventsProcessed}

# HELP correlation_processing_time_ms Average processing time in milliseconds
# TYPE correlation_processing_time_ms gauge
correlation_processing_time_ms ${stats.performance.averageProcessingTimeMs}

# HELP correlation_processing_time_p99_ms P99 processing time in milliseconds
# TYPE correlation_processing_time_p99_ms gauge
correlation_processing_time_p99_ms ${stats.performance.p99ProcessingTimeMs}

# HELP correlation_throughput_eps Events processed per second
# TYPE correlation_throughput_eps gauge
correlation_throughput_eps ${stats.performance.throughputEventsPerSecond}

# HELP correlation_cache_hit_ratio Cache hit ratio percentage
# TYPE correlation_cache_hit_ratio gauge
correlation_cache_hit_ratio ${stats.performance.cacheHitRatio}

# HELP correlation_queue_size Current queue size
# TYPE correlation_queue_size gauge
correlation_queue_size ${stats.queueSize}

# HELP correlation_fast_queue_size Current fast queue size
# TYPE correlation_fast_queue_size gauge
correlation_fast_queue_size ${stats.fastQueueSize}

# HELP correlation_active_rules Number of active correlation rules
# TYPE correlation_active_rules gauge
correlation_active_rules ${stats.activeRules}

# HELP correlation_circuit_breaker_open Circuit breaker status (1=open, 0=closed)
# TYPE correlation_circuit_breaker_open gauge
correlation_circuit_breaker_open ${stats.circuitBreaker.status === 'OPEN' ? 1 : 0}
`.trim();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    }
    catch (error) {
        logger.error('Metrics endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    if (res.headersSent) {
        return next(error);
    }
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});
// Graceful shutdown handling
async function gracefulShutdown() {
    logger.info('Graceful shutdown initiated...');
    try {
        await enhancedCorrelationEngine.shutdown();
        logger.info('Enhanced correlation engine shut down successfully');
        process.exit(0);
    }
    catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Start the enhanced correlation engine
async function startServer() {
    try {
        // Initialize the enhanced correlation engine
        await enhancedCorrelationEngine.initialize();
        logger.info('Enhanced correlation engine initialized successfully');
        // Start the HTTP server
        const server = app.listen(port, () => {
            logger.info(`Enhanced Correlation Engine Server running on port ${port}`, {
                environment: process.env.NODE_ENV || 'development',
                features: {
                    streamProcessing: 'enabled',
                    batchProcessing: 'enabled',
                    circuitBreaker: 'enabled',
                    caching: 'enabled',
                    indexing: 'enabled',
                    performance: 'sub-second target'
                }
            });
        });
        // Server timeout configurations for high performance
        server.timeout = 30000; // 30 second timeout
        server.keepAliveTimeout = 65000; // Keep connections alive
        server.headersTimeout = 66000; // Headers timeout
        return server;
    }
    catch (error) {
        logger.error('Failed to start enhanced correlation engine server:', error);
        process.exit(1);
    }
}
// Start the server
if (require.main === module) {
    startServer();
}
export { app, startServer };
//# sourceMappingURL=index-enhanced.js.map