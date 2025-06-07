/**
 * Advanced Resource Manager for KQL Analytics Engine
 * Manages CPU, memory, and query execution limits with priority queuing
 */

import { EventEmitter } from 'events';
import { 
  ResourceLimits, 
  QueryResource, 
  KQLError 
} from '../types/kql.types';

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
    critical: { maxConcurrent: number; weight: number };
    high: { maxConcurrent: number; weight: number };
    normal: { maxConcurrent: number; weight: number };
    low: { maxConcurrent: number; weight: number };
  };
}

export class AdvancedResourceManager extends EventEmitter {
  private config: ResourceConfig;
  private activeQueries: Map<string, QueryResource> = new Map();
  private queryQueue: Map<string, QueuedQuery> = new Map();
  private resourceMetrics: ResourceMetrics;
  private monitoringInterval?: NodeJS.Timeout;
  
  constructor(config: ResourceConfig) {
    super();
    this.config = config;
    this.resourceMetrics = new ResourceMetrics();
    
    if (config.monitoring.enabled) {
      this.startMonitoring();
    }
  }
  
  /**
   * Request resources for query execution
   */
  public async requestResources(
    queryId: string, 
    priority: 'critical' | 'high' | 'normal' | 'low',
    estimatedResources: {
      memoryMB: number;
      timeoutMs: number;
      complexity: number;
    }
  ): Promise<ResourceAllocation> {
    
    // Check if query can be executed immediately
    if (this.canExecuteImmediately(priority, estimatedResources)) {
      const allocation = this.allocateResources(queryId, priority, estimatedResources);
      this.emit('resourceAllocated', { queryId, allocation });
      return allocation;
    }
    
    // Add to priority queue
    const queuedQuery: QueuedQuery = {
      queryId,
      priority,
      estimatedResources,
      queuedAt: new Date(),
      timeoutAt: new Date(Date.now() + estimatedResources.timeoutMs)
    };
    
    this.queryQueue.set(queryId, queuedQuery);
    this.emit('queryQueued', { queryId, priority, position: this.getQueuePosition(priority) });
    
    // Return promise that resolves when resources become available
    return new Promise((resolve, reject) => {
      const checkTimeout = () => {
        if (Date.now() > queuedQuery.timeoutAt.getTime()) {
          this.queryQueue.delete(queryId);
          reject(new Error(`Query ${queryId} timed out in queue`));
          return;
        }
        setTimeout(checkTimeout, 1000);
      };
      
      const onResourceAvailable = () => {
        if (this.canExecuteImmediately(priority, estimatedResources)) {
          this.queryQueue.delete(queryId);
          const allocation = this.allocateResources(queryId, priority, estimatedResources);
          this.emit('resourceAllocated', { queryId, allocation });
          resolve(allocation);
        }
      };
      
      this.on('resourceReleased', onResourceAvailable);
      checkTimeout();
    });
  }
  
  /**
   * Release resources after query completion
   */
  public releaseResources(queryId: string): void {
    const queryResource = this.activeQueries.get(queryId);
    
    if (queryResource) {
      // Update metrics
      this.resourceMetrics.releaseMemory(queryResource.memoryUsed);
      this.resourceMetrics.completeQuery(queryResource);
      
      // Remove from active queries
      this.activeQueries.delete(queryId);
      
      this.emit('resourceReleased', { queryId, queryResource });
      
      // Try to process queued queries
      this.processQueue();
    }
  }
  
  /**
   * Cancel queued or active query
   */
  public cancelQuery(queryId: string): boolean {
    // Check if query is queued
    if (this.queryQueue.has(queryId)) {
      this.queryQueue.delete(queryId);
      this.emit('queryCancelled', { queryId, reason: 'user_cancelled' });
      return true;
    }
    
    // Check if query is active
    const queryResource = this.activeQueries.get(queryId);
    if (queryResource) {
      queryResource.status = 'cancelled';
      this.releaseResources(queryId);
      this.emit('queryCancelled', { queryId, reason: 'user_cancelled' });
      return true;
    }
    
    return false;
  }
  
  /**
   * Get current resource usage statistics
   */
  public getResourceUsage(): ResourceUsage {
    const activeQueries = Array.from(this.activeQueries.values());
    const queuedQueries = Array.from(this.queryQueue.values());
    
    return {
      memory: {
        used: this.resourceMetrics.getCurrentMemoryUsage(),
        limit: this.config.limits.maxMemoryUsage,
        percentage: (this.resourceMetrics.getCurrentMemoryUsage() / this.config.limits.maxMemoryUsage) * 100
      },
      queries: {
        active: activeQueries.length,
        queued: queuedQueries.length,
        limit: this.config.limits.maxConcurrentQueries,
        byPriority: {
          critical: activeQueries.filter(q => q.priority === 'critical').length,
          high: activeQueries.filter(q => q.priority === 'high').length,
          normal: activeQueries.filter(q => q.priority === 'normal').length,
          low: activeQueries.filter(q => q.priority === 'low').length
        }
      },
      performance: {
        averageExecutionTime: this.resourceMetrics.getAverageExecutionTime(),
        completedQueries: this.resourceMetrics.getCompletedQueryCount(),
        failedQueries: this.resourceMetrics.getFailedQueryCount(),
        queueWaitTime: this.calculateAverageQueueWaitTime()
      }
    };
  }
  
  /**
   * Get health status of resource manager
   */
  public getHealthStatus(): HealthStatus {
    const usage = this.getResourceUsage();
    const thresholds = this.config.monitoring.alertThresholds;
    
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check memory usage
    if (usage.memory.percentage > thresholds.memoryUsagePercent) {
      issues.push(`High memory usage: ${usage.memory.percentage.toFixed(1)}%`);
      status = usage.memory.percentage > 90 ? 'critical' : 'warning';
    }
    
    // Check queue size
    if (usage.queries.queued > thresholds.queryQueueSize) {
      issues.push(`Large query queue: ${usage.queries.queued} queries waiting`);
      status = usage.queries.queued > thresholds.queryQueueSize * 2 ? 'critical' : 'warning';
    }
    
    // Check for stuck queries
    const stuckQueries = this.detectStuckQueries();
    if (stuckQueries.length > 0) {
      issues.push(`${stuckQueries.length} potentially stuck queries detected`);
      status = 'warning';
    }
    
    return {
      status,
      issues,
      lastChecked: new Date(),
      uptime: process.uptime(),
      resourceUsage: usage
    };
  }
  
  /**
   * Force cleanup of stuck or zombie queries
   */
  public forceCleanup(): CleanupResult {
    const stuckQueries = this.detectStuckQueries();
    const expiredQueueItems = this.detectExpiredQueueItems();
    
    let cleaned = 0;
    
    // Clean stuck queries
    stuckQueries.forEach(queryId => {
      this.activeQueries.delete(queryId);
      cleaned++;
    });
    
    // Clean expired queue items
    expiredQueueItems.forEach(queryId => {
      this.queryQueue.delete(queryId);
      cleaned++;
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    this.emit('forcedCleanup', { cleanedQueries: cleaned });
    
    return {
      cleanedQueries: cleaned,
      memoryFreed: 0, // Would be calculated based on actual cleanup
      timestamp: new Date()
    };
  }
  
  /**
   * Check if query can be executed immediately
   */
  private canExecuteImmediately(
    priority: 'critical' | 'high' | 'normal' | 'low',
    estimatedResources: { memoryMB: number; timeoutMs: number; complexity: number }
  ): boolean {
    const usage = this.getResourceUsage();
    const priorityLimits = this.config.priorityQueues[priority];
    
    // Check memory limits
    if (usage.memory.used + estimatedResources.memoryMB > this.config.limits.maxMemoryUsage) {
      return false;
    }
    
    // Check concurrent query limits
    if (usage.queries.active >= this.config.limits.maxConcurrentQueries) {
      return false;
    }
    
    // Check priority-specific limits
    if (usage.queries.byPriority[priority] >= priorityLimits.maxConcurrent) {
      return false;
    }
    
    // Check complexity limits
    if (estimatedResources.complexity > this.config.limits.maxQueryComplexity) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Allocate resources for query execution
   */
  private allocateResources(
    queryId: string,
    priority: 'critical' | 'high' | 'normal' | 'low',
    estimatedResources: { memoryMB: number; timeoutMs: number; complexity: number }
  ): ResourceAllocation {
    const queryResource: QueryResource = {
      queryId,
      startTime: new Date(),
      memoryUsed: estimatedResources.memoryMB,
      cpuTime: 0,
      status: 'running',
      priority
    };
    
    this.activeQueries.set(queryId, queryResource);
    this.resourceMetrics.allocateMemory(estimatedResources.memoryMB);
    
    return {
      queryId,
      allocatedMemoryMB: estimatedResources.memoryMB,
      timeoutMs: estimatedResources.timeoutMs,
      priority,
      allocatedAt: new Date()
    };
  }
  
  /**
   * Process queued queries when resources become available
   */
  private processQueue(): void {
    // Sort queue by priority and queue time
    const sortedQueue = Array.from(this.queryQueue.values()).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
    
    // Try to execute highest priority queries
    for (const queuedQuery of sortedQueue) {
      if (this.canExecuteImmediately(queuedQuery.priority, queuedQuery.estimatedResources)) {
        this.emit('queueProcessed', { queryId: queuedQuery.queryId });
        break; // Process one at a time to avoid resource conflicts
      }
    }
  }
  
  /**
   * Get position in queue for a specific priority
   */
  private getQueuePosition(priority: 'critical' | 'high' | 'normal' | 'low'): number {
    const queuedWithSamePriority = Array.from(this.queryQueue.values())
      .filter(q => q.priority === priority);
    
    return queuedWithSamePriority.length;
  }
  
  /**
   * Calculate average queue wait time
   */
  private calculateAverageQueueWaitTime(): number {
    const queuedQueries = Array.from(this.queryQueue.values());
    
    if (queuedQueries.length === 0) {
      return 0;
    }
    
    const totalWaitTime = queuedQueries.reduce((sum, query) => {
      return sum + (Date.now() - query.queuedAt.getTime());
    }, 0);
    
    return totalWaitTime / queuedQueries.length;
  }
  
  /**
   * Detect queries that may be stuck
   */
  private detectStuckQueries(): string[] {
    const stuckQueries: string[] = [];
    const maxRunTime = this.config.limits.maxQueryTime * 1000; // Convert to milliseconds
    
    for (const [queryId, queryResource] of this.activeQueries) {
      const runTime = Date.now() - queryResource.startTime.getTime();
      
      if (runTime > maxRunTime) {
        stuckQueries.push(queryId);
      }
    }
    
    return stuckQueries;
  }
  
  /**
   * Detect expired items in queue
   */
  private detectExpiredQueueItems(): string[] {
    const expiredItems: string[] = [];
    const now = Date.now();
    
    for (const [queryId, queuedQuery] of this.queryQueue) {
      if (now > queuedQuery.timeoutAt.getTime()) {
        expiredItems.push(queryId);
      }
    }
    
    return expiredItems;
  }
  
  /**
   * Start resource monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const healthStatus = this.getHealthStatus();
      
      if (healthStatus.status !== 'healthy') {
        this.emit('healthAlert', healthStatus);
      }
      
      this.emit('resourceUpdate', this.getResourceUsage());
      
    }, this.config.monitoring.sampleIntervalMs);
  }
  
  /**
   * Stop resource monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
  
  /**
   * Shutdown resource manager
   */
  public shutdown(): void {
    this.stopMonitoring();
    
    // Cancel all active and queued queries
    for (const queryId of this.activeQueries.keys()) {
      this.cancelQuery(queryId);
    }
    
    for (const queryId of this.queryQueue.keys()) {
      this.cancelQuery(queryId);
    }
    
    this.emit('shutdown');
  }
}

/**
 * Resource metrics tracking
 */
class ResourceMetrics {
  private currentMemoryUsage = 0;
  private completedQueries = 0;
  private failedQueries = 0;
  private totalExecutionTime = 0;
  
  public allocateMemory(memoryMB: number): void {
    this.currentMemoryUsage += memoryMB;
  }
  
  public releaseMemory(memoryMB: number): void {
    this.currentMemoryUsage = Math.max(0, this.currentMemoryUsage - memoryMB);
  }
  
  public completeQuery(queryResource: QueryResource): void {
    const executionTime = Date.now() - queryResource.startTime.getTime();
    
    if (queryResource.status === 'completed') {
      this.completedQueries++;
      this.totalExecutionTime += executionTime;
    } else {
      this.failedQueries++;
    }
  }
  
  public getCurrentMemoryUsage(): number {
    return this.currentMemoryUsage;
  }
  
  public getAverageExecutionTime(): number {
    return this.completedQueries > 0 ? this.totalExecutionTime / this.completedQueries : 0;
  }
  
  public getCompletedQueryCount(): number {
    return this.completedQueries;
  }
  
  public getFailedQueryCount(): number {
    return this.failedQueries;
  }
}

// Supporting interfaces
interface QueuedQuery {
  queryId: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  estimatedResources: {
    memoryMB: number;
    timeoutMs: number;
    complexity: number;
  };
  queuedAt: Date;
  timeoutAt: Date;
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