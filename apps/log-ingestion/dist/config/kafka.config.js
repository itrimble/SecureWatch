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
    // Producer settings optimized for 10M+ events/second
    producerPool: {
        size: 20, // Increased number of producer instances
        maxQueueSize: 500000, // Increased memory queue size
        idleTimeout: 30000, // 30 seconds idle timeout
    },
    // Consumer settings
    consumerConcurrency: 200, // Increased parallel message processing
    consumerInstances: 50, // Number of consumer instances per topic
    // Batch processing optimized for throughput
    batchSize: 50000, // Larger batch sizes for higher throughput
    batchTimeout: 50, // Reduced timeout for lower latency
    maxBatchBytes: 52428800, // 50MB max batch size
    // Circuit breaker with faster recovery
    circuitBreaker: {
        failureThreshold: 0.3, // Lower threshold for faster detection
        resetTimeout: 30000, // 30 seconds reset timeout
        halfOpenRequests: 20, // More requests in half-open state
        monitoringInterval: 5000, // 5 second monitoring
    },
    // Rate limiting for spike handling
    rateLimiting: {
        maxEventsPerSecond: 20000000, // 20M to handle extreme spikes
        burstSize: 2000000, // 2M burst capacity
        slidingWindowSize: 60000, // 1 minute sliding window
    },
    // Partition management
    partitioning: {
        strategy: 'round-robin', // or 'hash' for sticky partitioning
        maxPartitionsPerConsumer: 10,
        rebalanceTimeout: 30000,
    },
    // Memory and resource management
    memory: {
        maxHeapSize: '8g', // JVM heap size
        gcOptimization: 'g1gc', // G1 garbage collector
        bufferPoolSize: 134217728, // 128MB buffer pool
    },
    // Monitoring and metrics
    monitoring: {
        metricsInterval: 10000, // 10 seconds
        lagThreshold: 100000, // Alert if lag > 100k
        throughputThreshold: 8000000, // Alert if < 8M events/sec
    },
};
//# sourceMappingURL=kafka.config.js.map