import { RawLogEvent } from '../types/log-event.types';
import { MetricsCollector } from '../monitoring/metrics-collector';
interface BufferManagerConfig {
    memoryBufferSize: number;
    diskBufferSize: number;
    diskBufferPath: string;
    highWaterMark: number;
    lowWaterMark: number;
    compressionEnabled: boolean;
}
export declare class BufferManager {
    private config;
    private memoryBuffer;
    private diskBuffer;
    private metrics;
    private spillToDisk;
    private isRecovering;
    constructor(config: BufferManagerConfig, metrics: MetricsCollector);
    initialize(): Promise<void>;
    addEvent(event: RawLogEvent): Promise<void>;
    addEvents(events: RawLogEvent[]): Promise<void>;
    private addToMemoryBuffer;
    getBatch(size: number): Promise<RawLogEvent[]>;
    getBatches(batchSize: number): Promise<RawLogEvent[][]>;
    requeueEvents(events: RawLogEvent[]): Promise<void>;
    flush(): Promise<RawLogEvent[]>;
    getSize(): number;
    getTotalSize(): Promise<number>;
    private updateMetrics;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=buffer-manager.d.ts.map