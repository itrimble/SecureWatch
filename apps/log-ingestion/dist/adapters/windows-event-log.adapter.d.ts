import { EventEmitter } from 'events';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
interface WindowsEventLogConfig {
    channels: string[];
    servers: string[];
    batchSize: number;
    pollInterval: number;
    includeEventData: boolean;
    filters?: EventFilter[];
}
interface EventFilter {
    eventIds?: number[];
    levels?: number[];
    providers?: string[];
    keywords?: string[];
}
export declare class WindowsEventLogAdapter extends EventEmitter {
    private config;
    private producerPool;
    private bufferManager;
    private metrics;
    private isRunning;
    private pollIntervals;
    constructor(config: WindowsEventLogConfig, producerPool: KafkaProducerPool, bufferManager: BufferManager, metrics: MetricsCollector);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startChannelPolling;
    private pollEvents;
    private queryWindowsEvents;
    private shouldFilterEvent;
    private processEvents;
    private sendToKafka;
    private subscribeToWindowsEvents;
    getStats(): object;
}
export {};
//# sourceMappingURL=windows-event-log.adapter.d.ts.map