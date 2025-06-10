import { KafkaConfig, ProducerConfig, ConsumerConfig } from 'kafkajs';
export declare const kafkaConfig: KafkaConfig;
export declare const producerConfig: ProducerConfig;
export declare const consumerConfig: ConsumerConfig;
export declare const topics: {
    raw: string;
    normalized: string;
    enriched: string;
    alerts: string;
    dlq: string;
};
export declare const performanceConfig: {
    producerPool: {
        size: number;
        maxQueueSize: number;
        idleTimeout: number;
    };
    consumerConcurrency: number;
    consumerInstances: number;
    batchSize: number;
    batchTimeout: number;
    maxBatchBytes: number;
    circuitBreaker: {
        failureThreshold: number;
        resetTimeout: number;
        halfOpenRequests: number;
        monitoringInterval: number;
    };
    rateLimiting: {
        maxEventsPerSecond: number;
        burstSize: number;
        slidingWindowSize: number;
    };
    partitioning: {
        strategy: string;
        maxPartitionsPerConsumer: number;
        rebalanceTimeout: number;
    };
    memory: {
        maxHeapSize: string;
        gcOptimization: string;
        bufferPoolSize: number;
    };
    monitoring: {
        metricsInterval: number;
        lagThreshold: number;
        throughputThreshold: number;
    };
};
//# sourceMappingURL=kafka.config.d.ts.map