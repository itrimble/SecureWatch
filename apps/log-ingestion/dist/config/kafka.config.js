export const kafkaConfig = {
    clientId: 'securewatch-log-ingestion',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true' ? {
        rejectUnauthorized: true,
        ca: process.env.KAFKA_CA_CERT,
        key: process.env.KAFKA_CLIENT_KEY,
        cert: process.env.KAFKA_CLIENT_CERT,
    } : undefined,
    sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || '',
    } : undefined,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 100,
        retries: 8,
    },
};
export const producerConfig = {
    allowAutoTopicCreation: false,
    transactionTimeout: 60000,
    compression: 2, // Zstandard compression
    maxInFlightRequests: 5,
    idempotent: true,
    // Batch settings for high throughput
    batch: {
        size: 1048576, // 1MB
        lingerMs: 5,
    },
};
export const consumerConfig = {
    groupId: process.env.KAFKA_CONSUMER_GROUP || 'log-ingestion-consumers',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 10485760, // 10MB
    minBytes: 1024, // 1KB
    maxBytes: 52428800, // 50MB
    maxWaitTimeInMs: 100,
    retry: {
        initialRetryTime: 100,
        retries: 8,
    },
    autoCommit: false, // Manual commit for better control
    autoCommitInterval: 5000,
};
export const topics = {
    raw: 'log-events-raw',
    normalized: 'log-events-normalized',
    enriched: 'log-events-enriched',
    alerts: 'alerts',
    dlq: 'log-events-dlq', // Dead letter queue
};
// Performance tuning for 10M+ events/second
export const performanceConfig = {
    // Producer settings
    producerPool: {
        size: 10, // Number of producer instances
        maxQueueSize: 100000, // Max events in memory queue
    },
    // Consumer settings
    consumerConcurrency: 100, // Parallel message processing
    // Batch processing
    batchSize: 10000,
    batchTimeout: 100, // ms
    // Circuit breaker
    circuitBreaker: {
        failureThreshold: 0.5,
        resetTimeout: 60000, // 1 minute
        halfOpenRequests: 10,
    },
    // Rate limiting
    rateLimiting: {
        maxEventsPerSecond: 15000000, // 15M to handle spikes
        burstSize: 1000000,
    },
};
//# sourceMappingURL=kafka.config.js.map