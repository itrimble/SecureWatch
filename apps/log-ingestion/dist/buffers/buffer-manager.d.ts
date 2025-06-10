import { RawLogEvent } from '../types/log-event.types';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { CircuitBreakerConfig } from './circuit-breaker';
import { BackpressureConfig } from './backpressure-monitor';
import { AdaptiveBatchConfig } from './adaptive-batch-manager';
import { FlowControlConfig } from './flow-control-manager';
interface BufferManagerConfig {
    memoryBufferSize: number;
    diskBufferSize: number;
    diskBufferPath: string;
    highWaterMark: number;
    lowWaterMark: number;
    compressionEnabled: boolean;
    circuitBreaker: CircuitBreakerConfig;
    backpressure: BackpressureConfig;
    adaptiveBatch: AdaptiveBatchConfig;
    flowControl: FlowControlConfig;
}
export declare class BufferManager {
    private config;
    private memoryBuffer;
    private diskBuffer;
    private metrics;
    private spillToDisk;
    private isRecovering;
    private circuitBreaker;
    private backpressureMonitor;
    private adaptiveBatchManager;
    private flowControlManager;
    constructor(config: BufferManagerConfig, metrics: MetricsCollector);
    initialize(): Promise<void>;
    addEvent(event: RawLogEvent): Promise<void>;
    addEvents(events: RawLogEvent[], priority?: number): Promise<void>;
    private addToMemoryBuffer;
    getBatch(requestedSize?: number): Promise<RawLogEvent[]>;
    getBatches(batchSize: number): Promise<RawLogEvent[][]>;
    requeueEvents(events: RawLogEvent[]): Promise<void>;
    flush(): Promise<RawLogEvent[]>;
    getSize(): number;
    getTotalSize(): Promise<number>;
    private updateMetrics;
    getBackpressureMetrics(): import("./backpressure-monitor").BackpressureMetrics;
    getFlowControlMetrics(): import("./flow-control-manager").FlowControlMetrics;
    getAdaptiveBatchMetrics(): import("./adaptive-batch-manager").BatchMetrics;
    getCircuitBreakerStats(): import("./circuit-breaker").CircuitBreakerStats;
    adjustFlowControlRate(newRate: number): void;
    adjustBatchSize(newSize: number): void;
    resetCircuitBreaker(): void;
    isBackpressureActive(): boolean;
    isCircuitBreakerOpen(): boolean;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=buffer-manager.d.ts.map