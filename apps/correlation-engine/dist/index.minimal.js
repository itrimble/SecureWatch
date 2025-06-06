import express from 'express';
import { createServer } from 'http';
import { correlationEngine } from './engine/correlation-engine';
import { healthRouter } from './routes/health';
import { logger } from './utils/logger';
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
// Basic API endpoints
app.get('/api/status', async (req, res) => {
    try {
        const stats = await correlationEngine.getEngineStats();
        res.json({ status: 'running', stats });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
async function startServer() {
    try {
        logger.info('Starting correlation engine...');
        // Initialize correlation engine
        await correlationEngine.initialize();
        logger.info('Correlation engine initialized');
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
//# sourceMappingURL=index.minimal.js.map