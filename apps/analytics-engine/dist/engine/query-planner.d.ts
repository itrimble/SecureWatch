/**
 * KQL Query Planner and Optimizer
 * Converts KQL AST to optimized execution plans and SQL queries
 */
import { KQLNode, QueryExecutionPlan } from '../types/kql.types';
export declare class QueryPlanner {
    private stepIdCounter;
    /**
     * Create optimized execution plan from KQL AST
     */
    createExecutionPlan(ast: KQLNode, schema?: any): QueryExecutionPlan;
    /**
     * Generate SQL query from KQL AST
     */
    generateSQL(ast: KQLNode): string;
    /**
     * Optimize KQL AST for better performance
     */
    private optimizeAST;
    /**
     * Push filter conditions as close to data source as possible
     */
    private pushDownFilters;
    /**
     * Reorder joins for better performance
     */
    private reorderJoins;
    /**
     * Eliminate redundant projection operations
     */
    private eliminateRedundantProjections;
    /**
     * Optimize aggregation operations
     */
    private optimizeAggregations;
    /**
     * Merge compatible operations
     */
    private mergeCompatibleOperations;
    /**
     * Check if filters can be pushed through an operation
     */
    private canPushFilterThrough;
    /**
     * Generate execution steps from optimized AST
     */
    private generateExecutionSteps;
    /**
     * Generate execution steps for a single AST node
     */
    private generateStepsForNode;
    /**
     * Create table scan execution step
     */
    private createTableScanStep;
    /**
     * Create filter execution step
     */
    private createFilterStep;
    /**
     * Create aggregation execution step
     */
    private createAggregationStep;
    /**
     * Create projection execution step
     */
    private createProjectionStep;
    /**
     * Create sort execution step
     */
    private createSortStep;
    /**
     * Create join execution step
     */
    private createJoinStep;
    /**
     * Create generic execution step
     */
    private createGenericStep;
    /**
     * Convert filter expression to SQL
     */
    private filterToSQL;
    /**
     * Convert AST node to SQL fragment
     */
    private nodeToSQL;
    /**
     * Escape SQL identifier
     */
    private escapeIdentifier;
    /**
     * Calculate total cost of execution plan
     */
    private calculateTotalCost;
    /**
     * Estimate final result row count
     */
    private estimateResultRows;
    /**
     * Generate cache key for query
     */
    private generateCacheKey;
    /**
     * Generate unique execution plan ID
     */
    private generatePlanId;
    /**
     * Generate unique step ID
     */
    private generateStepId;
    /**
     * Convert AST back to KQL string (for debugging)
     */
    private astToKQL;
    /**
     * Convert filter expression to KQL string
     */
    private filterToKQL;
    /**
     * Convert AST node to KQL fragment
     */
    private nodeToKQL;
}
export { QueryPlanner };
//# sourceMappingURL=query-planner.d.ts.map