import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { BackpressureMonitor } from './backpressure-monitor';
export interface AdaptiveBatchConfig {
    initialBatchSize: number;
    minBatchSize: number;
    maxBatchSize: number;
    targetLatency: number;
    adjustmentFactor: number;
    evaluationInterval: number;
    throughputTarget: number;
    adaptiveEnabled: boolean;
}
export interface BatchMetrics {
    currentBatchSize: number;
    averageLatency: number;
    throughput: number;
    adjustmentHistory: number[];
    performanceScore: number;
    backpressureActive: boolean;
}
export declare class AdaptiveBatchManager extends EventEmitter {
    private config;
    private metrics;
    private backpressureMonitor;
    private currentBatchSize;
    private latencyHistory;
    private throughputHistory;
    private adjustmentHistory;
    private lastEvaluation;
    private evaluationTimer?;
    private performanceScore;
    constructor(config: AdaptiveBatchConfig, metrics: MetricsCollector, backpressureMonitor: BackpressureMonitor);
    getBatchSize(): number;
    recordBatchProcessing(batchSize: number, latency: number, throughput: number): void;
    private onBackpressureActivated;
    private onBackpressureDeactivated;
    private startEvaluation;
    private evaluatePerformance;
    private shouldAdjustBatchSize;
    private calculateOptimalBatchSize;
    private adjustBatchSize;
    private updateEvaluationMetrics;
    getMetrics(): BatchMetrics;
    setBatchSize(size: number): void;
    reset(): void;
    destroy(): void;
}
//# sourceMappingURL=adaptive-batch-manager.d.ts.map