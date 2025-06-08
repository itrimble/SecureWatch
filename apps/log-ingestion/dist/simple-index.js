import express from 'express';
import { Pool } from 'pg';
import logger from './utils/logger';
const app = express();
const PORT = process.env.PORT || 4002;
// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'securewatch',
    user: process.env.DB_USER || 'securewatch',
    password: process.env.DB_PASSWORD || 'securewatch_dev',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Default organization ID for development
const DEFAULT_ORG_ID = 'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3';
// Test database connection on startup
pool.connect()
    .then(client => {
    logger.info('🗄️ Database connected successfully');
    client.release();
})
    .catch(err => {
    logger.error('❌ Database connection failed', err);
});
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:4000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Agent ingest endpoint for receiving logs from agents
app.post('/api/ingest', async (req, res) => {
    try {
        const logEntries = Array.isArray(req.body) ? req.body : [req.body];
        logger.info(`📥 Received ${logEntries.length} log entries from agent`, {
            source: req.headers['user-agent'] || 'unknown',
            timestamp: new Date().toISOString(),
            contentLength: JSON.stringify(req.body).length
        });
        // Process each log entry
        let processed = 0;
        let errors = 0;
        for (const entry of logEntries) {
            try {
                // Handle agent batch format: { events: [...], log_source_identifier: "..." }
                if (entry.events && entry.log_source_identifier) {
                    logger.debug('📦 Processing agent batch', {
                        sourceIdentifier: entry.log_source_identifier,
                        eventCount: entry.events.length
                    });
                    // Process each event in the batch
                    for (const event of entry.events) {
                        try {
                            logger.debug('📋 Processing individual event', {
                                sourceFile: event.source_file,
                                timestamp: event.timestamp_collected,
                                messageLength: event.raw_message?.length || 0,
                                sourceIdentifier: entry.log_source_identifier
                            });
                            // Store in TimescaleDB
                            await storeLogEntry({
                                timestamp: new Date(event.timestamp_collected),
                                organization_id: DEFAULT_ORG_ID,
                                source_identifier: entry.log_source_identifier,
                                source_type: 'macos-agent',
                                message: event.raw_message,
                                log_level: 'INFO',
                                hostname: extractHostname(event.raw_message),
                                process_name: extractProcessName(event.raw_message),
                                attributes: {
                                    source_file: event.source_file,
                                    original_timestamp: event.timestamp_collected,
                                    agent_batch: true
                                }
                            });
                            processed++;
                        }
                        catch (eventError) {
                            logger.error('❌ Error processing individual event', {
                                error: eventError instanceof Error ? eventError.message : 'Unknown error',
                                event: event
                            });
                            errors++;
                        }
                    }
                }
                // Handle direct log entry format: { message: "...", source_identifier: "..." }
                else if (entry.message && entry.source_identifier) {
                    logger.debug('📋 Processing direct log entry', {
                        sourceIdentifier: entry.source_identifier,
                        timestamp: entry.timestamp,
                        messageLength: entry.message?.length || 0
                    });
                    // Store direct log entry in TimescaleDB
                    await storeLogEntry({
                        timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
                        organization_id: DEFAULT_ORG_ID,
                        source_identifier: entry.source_identifier,
                        source_type: 'direct-ingestion',
                        message: entry.message,
                        log_level: entry.log_level || 'INFO',
                        hostname: entry.hostname,
                        process_name: entry.process_name,
                        attributes: entry.attributes || {}
                    });
                    processed++;
                }
                else {
                    logger.warn('⚠️ Invalid log entry format', {
                        entry: typeof entry === 'object' ? Object.keys(entry) : entry,
                        expectedFormats: ['agent batch: {events, log_source_identifier}', 'direct: {message, source_identifier}']
                    });
                    errors++;
                }
            }
            catch (processError) {
                logger.error('❌ Error processing log entry', {
                    error: processError instanceof Error ? processError.message : 'Unknown error',
                    entry: entry
                });
                errors++;
            }
        }
        logger.info(`✅ Ingest completed: ${processed} processed, ${errors} errors`);
        res.json({
            status: 'success',
            processed: processed,
            errors: errors,
            total: logEntries.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('💥 Error in ingest endpoint', error);
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'log-ingestion',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});
// Basic status endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'SecureWatch Log Ingestion Service',
        version: '0.1.0',
        description: 'Log collection and processing service',
        endpoints: {
            health: '/health',
            ingest: '/api/ingest'
        },
        timestamp: new Date().toISOString()
    });
});
// Database helper functions
async function storeLogEntry(logData) {
    const client = await pool.connect();
    try {
        const query = `
      INSERT INTO logs (
        timestamp, organization_id, source_identifier, source_type, 
        message, log_level, hostname, process_name, attributes, 
        ingested_at, normalized
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, true
      )
    `;
        const values = [
            logData.timestamp,
            logData.organization_id,
            logData.source_identifier,
            logData.source_type,
            logData.message,
            logData.log_level,
            logData.hostname,
            logData.process_name,
            JSON.stringify(logData.attributes)
        ];
        await client.query(query, values);
        logger.debug('💾 Stored log entry in database', {
            source: logData.source_identifier,
            timestamp: logData.timestamp
        });
    }
    catch (error) {
        logger.error('❌ Failed to store log entry', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Helper functions to extract data from log messages
function extractHostname(message) {
    const match = message.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})[+-]\d{2} ([^\s]+)/);
    return match ? match[2] : null;
}
function extractProcessName(message) {
    const match = message.match(/([^\s]+)\[\d+\]:/);
    return match ? match[1] : null;
}
// Database health check endpoint
app.get('/db/health', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, COUNT(*) as log_count FROM logs');
        client.release();
        res.json({
            status: 'healthy',
            database: 'connected',
            current_time: result.rows[0].current_time,
            log_count: parseInt(result.rows[0].log_count),
            pool_info: {
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'log-ingestion',
            version: '1.0.0',
            uptime: process.uptime(),
            database: 'connected'
        });
    }
    catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'log-ingestion',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Database health endpoint
app.get('/db/health', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) as total_logs FROM logs');
        client.release();
        res.status(200).json({
            status: 'healthy',
            database: 'connected',
            total_logs: parseInt(result.rows[0].total_logs),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Database health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Start the service with error handling
const server = app.listen(PORT, () => {
    logger.info(`🚀 Log Ingestion Service running on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('📡 Ready to receive logs from agents');
    logger.info('🗄️ Database connection configured');
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
    }
    else if (error.code === 'EACCES') {
        logger.error(`Permission denied to bind to port ${PORT}`);
    }
    else {
        logger.error('Server startup error', error);
    }
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
    });
    try {
        await pool.end();
        logger.info('Database connection pool closed');
        process.exit(0);
    }
    catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    logger.info('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
    });
    try {
        await pool.end();
        logger.info('Database connection pool closed');
        process.exit(0);
    }
    catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
export default app;
//# sourceMappingURL=simple-index.js.map