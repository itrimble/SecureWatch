import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/metrics-collector';
export declare enum CircuitState {
    CLOSED = "closed",
    OPEN = "open",
    HALF_OPEN = "half_open"
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
    monitoringInterval: number;
    minRequests: number;
}
export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    totalRequests: number;
    failureRate: number;
    lastFailureTime?: number;
    stateTransitions: number;
    halfOpenRequests: number;
}
export declare class CircuitBreaker extends EventEmitter {
    private config;
    private metrics;
    private state;
    private failures;
    private successes;
    private totalRequests;
    private lastFailureTime?;
    private stateTransitions;
    private halfOpenRequests;
    private monitoringTimer?;
    constructor(config: CircuitBreakerConfig, metrics: MetricsCollector);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private shouldOpenCircuit;
    private shouldAttemptReset;
    private transitionToClosed;
    private transitionToOpen;
    private transitionToHalfOpen;
    private getFailureRate;
    private startMonitoring;
    private updateMetrics;
    getStats(): CircuitBreakerStats;
    isOpen(): boolean;
    isClosed(): boolean;
    isHalfOpen(): boolean;
    reset(): void;
    destroy(): void;
}
//# sourceMappingURL=circuit-breaker.d.ts.map