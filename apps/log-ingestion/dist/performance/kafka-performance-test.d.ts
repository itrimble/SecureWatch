interface PerformanceMetrics {
    totalMessages: number;
    startTime: number;
    endTime: number;
    messagesPerSecond: number;
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    errors: number;
}
export declare class KafkaPerformanceTester {
    private kafka;
    private producers;
    private consumers;
    private metrics;
    constructor();
    initialize(): Promise<void>;
    runProducerTest(targetMessagesPerSecond?: number, durationSeconds?: number): Promise<PerformanceMetrics>;
    runConsumerTest(durationSeconds?: number): Promise<PerformanceMetrics>;
    private updateLatencyMetrics;
    cleanup(): Promise<void>;
    runFullPerformanceTest(): Promise<{
        producerMetrics: PerformanceMetrics;
        consumerMetrics: PerformanceMetrics;
    }>;
}
export {};
//# sourceMappingURL=kafka-performance-test.d.ts.map