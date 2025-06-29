// @ts-nocheck
import express from 'express';
import { createServer } from 'http';
import { correlationEngine } from './engine/correlation-engine';
import { rulesRouter } from './routes/rules';
import { incidentsRouter } from './routes/incidents';
import { patternsRouter } from './routes/patterns';
import { healthRouter } from './routes/health';
import { logger } from './utils/logger';
import { initializeDatabase } from './database/init';
import { KafkaConsumer } from './consumers/kafka-consumer';
import { MetricsCollector } from './services/metrics-collector';
import { RuleScheduler } from './services/rule-scheduler';
import { CommunityRuleService } from './services/CommunityRuleService';
import { Pool } from 'pg';
const app = express();
const port = process.env.CORRELATION_ENGINE_PORT || 4005;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Routes
app.use('/health', healthRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/patterns', patternsRouter);
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized');
        // Initialize database pool for community rules
        const dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            database: process.env.DB_NAME || 'securewatch',
            user: process.env.DB_USER || 'securewatch',
            password: process.env.DB_PASSWORD || 'securewatch',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        // Initialize community rule service
        const communityRuleService = new CommunityRuleService(dbPool);
        await communityRuleService.initialize();
        logger.info('Community rule service initialized');
        // Initialize correlation engine with community rules
        await correlationEngine.initialize(communityRuleService);
        logger.info('Correlation engine initialized with community rules');
        // Start Kafka consumer
        const kafkaConsumer = new KafkaConsumer();
        await kafkaConsumer.start();
        logger.info('Kafka consumer started');
        // Start metrics collector
        const metricsCollector = new MetricsCollector();
        metricsCollector.start();
        logger.info('Metrics collector started');
        // Start rule scheduler
        const ruleScheduler = new RuleScheduler();
        await ruleScheduler.start();
        logger.info('Rule scheduler started');
        // Start HTTP server
        const server = createServer(app);
        server.listen(port, () => {
            logger.info(`Correlation engine running on port ${port}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('HTTP server closed');
            });
            await kafkaConsumer.stop();
            await correlationEngine.shutdown();
            process.exit(0);
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map