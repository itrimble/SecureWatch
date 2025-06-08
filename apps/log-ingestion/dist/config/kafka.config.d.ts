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
    };
    consumerConcurrency: number;
    batchSize: number;
    batchTimeout: number;
    circuitBreaker: {
        failureThreshold: number;
        resetTimeout: number;
        halfOpenRequests: number;
    };
    rateLimiting: {
        maxEventsPerSecond: number;
        burstSize: number;
    };
};
//# sourceMappingURL=kafka.config.d.ts.map