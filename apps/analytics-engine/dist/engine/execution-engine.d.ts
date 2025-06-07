/**
 * KQL Execution Engine with Apache Arrow Integration
 * High-performance columnar data processing for analytics queries
 */
import { Pool } from 'pg';
import { QueryExecutionPlan, QueryResult, ResourceLimits, QueryResource } from '../types/kql.types';
export declare class ExecutionEngine {
    private dbPool;
    private resourceManager;
    private activeQueries;
    constructor(dbPool: Pool, resourceLimits: ResourceLimits);
    /**
     * Execute a query execution plan
     */
    executeQuery(plan: QueryExecutionPlan, timeoutMs?: number): Promise<QueryResult>;
    /**
     * Internal query execution logic
     */
    private executeInternal;
    /**
     * Execute SQL query against database
     */
    private executeSQLQuery;
    /**
     * Convert SQL result to Apache Arrow table
     */
    private convertToArrow;
    /**
     * Infer Arrow data types from SQL result
     */
    private inferColumnTypes;
    /**
     * Create Arrow record batch from rows
     */
    private createRecordBatch;
    /**
     * Convert value for Arrow storage
     */
    private convertValueForArrow;
    /**
     * Create Arrow vector from data and type
     */
    private createArrowVector;
    /**
     * Process data using Arrow's columnar operations
     */
    private processWithArrow;
    /**
     * Apply filter using Arrow operations
     */
    private applyArrowFilter;
    /**
     * Convert Arrow table back to standard result format
     */
    private convertFromArrow;
    /**
     * Convert Arrow data type to string representation
     */
    private arrowTypeToString;
    /**
     * Convert Arrow value to JavaScript value
     */
    private convertArrowValue;
    /**
     * Create timeout promise for query execution
     */
    private createTimeoutPromise;
    /**
     * Cancel running query
     */
    cancelQuery(queryId: string): Promise<boolean>;
    /**
     * Get active queries for monitoring
     */
    getActiveQueries(): QueryResource[];
    /**
     * Get query statistics
     */
    getQueryStats(): {
        totalQueries: number;
        activeQueries: number;
        averageExecutionTime: number;
    };
}
/**
 * Resource Manager for query execution limits
 */
declare class ResourceManager {
    private limits;
    private currentMemoryUsage;
    private currentQueryCount;
    constructor(limits: ResourceLimits);
    /**
     * Check if resource limits allow new query execution
     */
    checkLimits(): Promise<void>;
    /**
     * Reserve resources for query execution
     */
    reserveResources(estimatedMemory: number): void;
    /**
     * Release resources after query completion
     */
    releaseResources(usedMemory: number): void;
    /**
     * Get current resource usage
     */
    getResourceUsage(): {
        memoryUsage: number;
        queryCount: number;
    };
}
export { ExecutionEngine, ResourceManager };
//# sourceMappingURL=execution-engine.d.ts.map