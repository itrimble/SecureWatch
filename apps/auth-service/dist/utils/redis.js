import Redis from 'ioredis';
// Validate required Redis configuration
if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    throw new Error('REDIS_URL or REDIS_HOST environment variable is required');
}
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
};
// Create Redis client
export const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    })
    : new Redis(redisConfig);
// Import logger for proper logging
import winston from 'winston';
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'auth-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        })
    ]
});
// Handle Redis connection events
redis.on('connect', () => {
    logger.info('Connected to Redis');
});
redis.on('error', (error) => {
    logger.error('Redis connection error:', error);
});
redis.on('close', () => {
    logger.info('Redis connection closed');
});
export default redis;
//# sourceMappingURL=redis.js.map