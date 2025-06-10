import { LogEvent } from '../types';
interface PerformanceMetrics {
    totalEventsProcessed: number;
    averageProcessingTime: number;
    ruleEvaluationCache: Map<string, {
        result: boolean;
        timestamp: number;
    }>;
    eventBatchMetrics: {
        batchSize: number;
        batchProcessingTime: number;
        throughput: number;
    };
    p99ProcessingTime: number;
    cacheMisses: number;
    cacheHits: number;
}
interface RealTimeConfig {
    maxProcessingTimeMs: number;
    batchProcessingEnabled: boolean;
    batchSize: number;
    cacheExpirationMs: number;
    parallelRuleEvaluation: boolean;
    fastPathEnabled: boolean;
    streamProcessingMode: boolean;
    enableCircuitBreaker: boolean;
    maxConcurrentEvents: number;
    priorityQueueEnabled: boolean;
}
interface CircuitBreaker {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
    threshold: number;
    timeoutMs: number;
    halfOpenRequests: number;
}
export declare class EnhancedCorrelationEngine {
    private db;
    private redis;
    private queue;
    private fastQueue;
    private ruleEvaluator;
    private patternMatcher;
    private incidentManager;
    private actionExecutor;
    private activeRules;
    private eventBuffer;
    private realTimeConfig;
    private performanceMetrics;
    private ruleCache;
    private eventBatch;
    private batchTimer;
    private indexedRules;
    private bloomFilter;
    private processingTimes;
    private isStreamMode;
    private circuitBreaker;
    constructor();
    initialize(): Promise<void>;
    processEvent(event: LogEvent): Promise<void>;
    private processEventStream;
    private addEventToBatch;
    private processBatch;
    private loadAndIndexActiveRules;
    private generateIndexKeysForRule;
    private getApplicableRulesForEvent;
    private canUseFastPath;
    private processFastPath;
    private evaluateRuleWithCache;
    private processStandardPath;
    private addEventToOptimizedBuffer;
    private chunkArray;
    private determineEventPriority;
    private handleRuleMatchAsync;
    private extractAssetKey;
    private generateIncidentTitle;
    private generateIncidentDescription;
    private extractAffectedAssets;
    private updatePerformanceMetrics;
    private isCircuitBreakerOpen;
    private startPerformanceMonitoring;
    private adaptivePerformanceTuning;
    private startCacheCleanup;
    private cleanupCache;
    private startOptimizedEventBufferCleanup;
    private warmUpCaches;
    getEngineStats(): Promise<any>;
    getEventBufferSize(): Promise<number>;
    reloadRules(): Promise<void>;
    updateRealTimeConfig(config: Partial<RealTimeConfig>): Promise<void>;
    enableStreamMode(): Promise<void>;
    shutdown(): Promise<void>;
}
export declare const enhancedCorrelationEngine: EnhancedCorrelationEngine;
export type { PerformanceMetrics, RealTimeConfig, CircuitBreaker };
//# sourceMappingURL=enhanced-correlation-engine.d.ts.map