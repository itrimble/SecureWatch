import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { BackpressureMonitor } from './backpressure-monitor';
export interface FlowControlConfig {
    maxEventsPerSecond: number;
    burstSize: number;
    slidingWindowSize: number;
    throttleEnabled: boolean;
    priorityLevels: number;
    emergencyMode: {
        enabled: boolean;
        triggerThreshold: number;
        throttleRate: number;
    };
}
export interface TokenBucket {
    capacity: number;
    tokens: number;
    fillRate: number;
    lastRefill: number;
}
export interface FlowControlMetrics {
    currentRate: number;
    allowedRate: number;
    throttledEvents: number;
    emergencyModeActive: boolean;
    bucketState: TokenBucket;
    priorityQueues: {
        [priority: number]: number;
    };
}
export declare class FlowControlManager extends EventEmitter {
    private config;
    private metrics;
    private backpressureMonitor;
    private tokenBucket;
    private slidingWindow;
    private emergencyModeActive;
    private throttledEventCount;
    private priorityQueues;
    constructor(config: FlowControlConfig, metrics: MetricsCollector, backpressureMonitor: BackpressureMonitor);
    requestPermission(eventCount?: number, priority?: number): Promise<boolean>;
    private refillTokenBucket;
    private checkSlidingWindowLimit;
    private handleEmergencyMode;
    private onBackpressureActivated;
    private onBackpressureDeactivated;
    private activateEmergencyMode;
    private deactivateEmergencyMode;
    private recordAllowedEvents;
    private recordThrottledEvents;
    private maintenance;
    updatePriorityQueueSize(priority: number, size: number): void;
    getMetrics(): FlowControlMetrics;
    adjustRateLimit(newRate: number): void;
    adjustBurstSize(newBurstSize: number): void;
    reset(): void;
    destroy(): void;
}
//# sourceMappingURL=flow-control-manager.d.ts.map