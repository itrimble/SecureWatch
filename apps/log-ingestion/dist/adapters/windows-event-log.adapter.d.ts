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
    realTimeCollection?: boolean;
    evtxFilePaths?: string[];
    maxConcurrentProcesses?: number;
    powerShellPath?: string;
    wefEnabled?: boolean;
    performanceOptimized?: boolean;
    compressionEnabled?: boolean;
    highVolumeMode?: boolean;
    credentials?: {
        username: string;
        password: string;
        domain?: string;
    };
}
interface EventFilter {
    eventIds?: number[];
    levels?: number[];
    providers?: string[];
    keywords?: string[];
    timeRange?: {
        startTime?: Date;
        endTime?: Date;
    };
    severityMin?: number;
    includeUserData?: boolean;
}
interface PerformanceMetrics {
    eventsPerSecond: number;
    averageLatencyMs: number;
    totalEventsProcessed: number;
    totalErrors: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    networkBytesReceived: number;
    compressionRatio: number;
    startTime: number;
}
export declare class WindowsEventLogAdapter extends EventEmitter {
    private config;
    private producerPool;
    private bufferManager;
    private metrics;
    private isRunning;
    private pollIntervals;
    private performanceMetrics;
    private activeProcesses;
    private eventBuffer;
    private lastFlushTime;
    private processingQueue;
    private powerShellPath;
    private readonly MAX_BUFFER_SIZE;
    private readonly FLUSH_INTERVAL_MS;
    private readonly MAX_CONCURRENT_PROCESSES;
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
    private startRealTimeCollection;
    private startRealTimeChannelCollection;
    private buildOptimizedPowerShellScript;
    private buildEventFilters;
    private processRealTimeEvent;
    private startPollingCollection;
    private processEvtxFiles;
    private processEvtxFile;
    private addToEventBuffer;
    private flushEventBuffer;
    private startBufferFlushing;
    private convertToRawLogEvent;
    private setupPerformanceMonitoring;
    private updatePerformanceMetrics;
    private updateResourceMetrics;
    private logPerformanceMetrics;
    private logFinalMetrics;
    getStats(): object;
    getPerformanceMetrics(): PerformanceMetrics;
    healthCheck(): Promise<{
        healthy: boolean;
        details: any;
    }>;
}
export {};
//# sourceMappingURL=windows-event-log.adapter.d.ts.map