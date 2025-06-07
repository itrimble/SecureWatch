/**
 * Advanced Resource Manager for KQL Analytics Engine
 * Manages CPU, memory, and query execution limits with priority queuing
 */
import { EventEmitter } from 'events';
import { ResourceLimits } from '../types/kql.types';
export interface ResourceConfig {
    limits: ResourceLimits;
    monitoring: {
        enabled: boolean;
        sampleIntervalMs: number;
        alertThresholds: {
            memoryUsagePercent: number;
            cpuUsagePercent: number;
            queryQueueSize: number;
        };
    };
    priorityQueues: {
        critical: {
            maxConcurrent: number;
            weight: number;
        };
        high: {
            maxConcurrent: number;
            weight: number;
        };
        normal: {
            maxConcurrent: number;
            weight: number;
        };
        low: {
            maxConcurrent: number;
            weight: number;
        };
    };
}
export declare class AdvancedResourceManager extends EventEmitter {
    private config;
    private activeQueries;
    private queryQueue;
    private resourceMetrics;
    private monitoringInterval?;
    constructor(config: ResourceConfig);
    /**
     * Request resources for query execution
     */
    requestResources(queryId: string, priority: 'critical' | 'high' | 'normal' | 'low', estimatedResources: {
        memoryMB: number;
        timeoutMs: number;
        complexity: number;
    }): Promise<ResourceAllocation>;
    /**
     * Release resources after query completion
     */
    releaseResources(queryId: string): void;
    /**
     * Cancel queued or active query
     */
    cancelQuery(queryId: string): boolean;
    /**
     * Get current resource usage statistics
     */
    getResourceUsage(): ResourceUsage;
    /**
     * Get health status of resource manager
     */
    getHealthStatus(): HealthStatus;
    /**
     * Force cleanup of stuck or zombie queries
     */
    forceCleanup(): CleanupResult;
    /**
     * Check if query can be executed immediately
     */
    private canExecuteImmediately;
    /**
     * Allocate resources for query execution
     */
    private allocateResources;
    /**
     * Process queued queries when resources become available
     */
    private processQueue;
    /**
     * Get position in queue for a specific priority
     */
    private getQueuePosition;
    /**
     * Calculate average queue wait time
     */
    private calculateAverageQueueWaitTime;
    /**
     * Detect queries that may be stuck
     */
    private detectStuckQueries;
    /**
     * Detect expired items in queue
     */
    private detectExpiredQueueItems;
    /**
     * Start resource monitoring
     */
    private startMonitoring;
    /**
     * Stop resource monitoring
     */
    stopMonitoring(): void;
    /**
     * Shutdown resource manager
     */
    shutdown(): void;
}
interface ResourceAllocation {
    queryId: string;
    allocatedMemoryMB: number;
    timeoutMs: number;
    priority: 'critical' | 'high' | 'normal' | 'low';
    allocatedAt: Date;
}
interface ResourceUsage {
    memory: {
        used: number;
        limit: number;
        percentage: number;
    };
    queries: {
        active: number;
        queued: number;
        limit: number;
        byPriority: {
            critical: number;
            high: number;
            normal: number;
            low: number;
        };
    };
    performance: {
        averageExecutionTime: number;
        completedQueries: number;
        failedQueries: number;
        queueWaitTime: number;
    };
}
interface HealthStatus {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    lastChecked: Date;
    uptime: number;
    resourceUsage: ResourceUsage;
}
interface CleanupResult {
    cleanedQueries: number;
    memoryFreed: number;
    timestamp: Date;
}
export { AdvancedResourceManager, ResourceConfig, ResourceAllocation, ResourceUsage, HealthStatus, CleanupResult };
//# sourceMappingURL=resource-manager.d.ts.map