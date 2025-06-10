import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/metrics-collector';
export interface BackpressureConfig {
    queueDepthThreshold: number;
    latencyThreshold: number;
    errorRateThreshold: number;
    monitoringInterval: number;
    adaptiveThresholds: boolean;
    recoveryFactor: number;
}
export interface BackpressureMetrics {
    queueDepth: number;
    averageLatency: number;
    errorRate: number;
    throughput: number;
    backpressureActive: boolean;
    adaptiveThresholds?: {
        queueDepth: number;
        latency: number;
        errorRate: number;
    };
}
export declare class BackpressureMonitor extends EventEmitter {
    private config;
    private metrics;
    private isBackpressureActive;
    private queueDepth;
    private latencyHistory;
    private errorCount;
    private requestCount;
    private throughputHistory;
    private lastThroughputCheck;
    private monitoringTimer?;
    private adaptiveQueueThreshold;
    private adaptiveLatencyThreshold;
    private adaptiveErrorThreshold;
    constructor(config: BackpressureConfig, metrics: MetricsCollector);
    recordRequest(latency: number, success: boolean): void;
    updateQueueDepth(depth: number): void;
    updateThroughput(eventsProcessed: number): void;
    private calculateMetrics;
    private checkBackpressure;
    private activateBackpressure;
    private deactivateBackpressure;
    private updateAdaptiveThresholds;
    private updateMonitoringMetrics;
    private startMonitoring;
    getMetrics(): BackpressureMetrics;
    isActive(): boolean;
    reset(): void;
    destroy(): void;
}
//# sourceMappingURL=backpressure-monitor.d.ts.map