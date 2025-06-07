/**
 * Query Complexity Analyzer for SecureWatch SIEM
 * Prevents DoS attacks by analyzing and limiting query complexity
 */
export interface QueryComplexityConfig {
    maxRows: number;
    maxTimeoutMs: number;
    maxTimeRangeHours: number;
    maxJoins: number;
    maxAggregations: number;
    maxNestedQueries: number;
    complexityScoreLimit: number;
}
export interface QueryComplexityResult {
    isValid: boolean;
    complexityScore: number;
    violations: string[];
    recommendations: string[];
    estimatedResourceUsage: {
        memory: string;
        cpu: string;
        executionTime: string;
    };
}
export declare class QueryComplexityAnalyzer {
    private config;
    constructor(config?: Partial<QueryComplexityConfig>);
    /**
     * Analyze query complexity and return validation result
     */
    analyzeQuery(query: {
        kqlQuery?: string;
        sqlQuery?: string;
        startTime?: string;
        endTime?: string;
        maxRows?: number;
        timeout?: number;
        organizationId?: string;
    }): QueryComplexityResult;
    /**
     * Analyze time range complexity
     */
    private analyzeTimeRange;
    /**
     * Analyze KQL query complexity
     */
    private analyzeKQLComplexity;
    /**
     * Analyze SQL query complexity
     */
    private analyzeSQLComplexity;
    /**
     * Calculate time range in hours
     */
    private calculateTimeRangeHours;
    /**
     * Estimate resource usage based on query parameters
     */
    private estimateResourceUsage;
    /**
     * Get configuration for external reference
     */
    getConfig(): QueryComplexityConfig;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<QueryComplexityConfig>): void;
}
export declare const queryComplexityAnalyzer: QueryComplexityAnalyzer;
export interface QueryRateLimitConfig {
    maxQueriesPerMinute: number;
    maxComplexQueriesPerHour: number;
    complexityThreshold: number;
}
export declare class QueryRateLimiter {
    private config;
    private queryCache;
    private complexQueryCache;
    constructor(config: QueryRateLimitConfig);
    /**
     * Check if user can execute query based on rate limits
     */
    canExecuteQuery(userId: string, complexityScore: number): {
        allowed: boolean;
        reason?: string;
        retryAfter?: number;
    };
    /**
     * Clear rate limit data for user (admin function)
     */
    clearUserLimits(userId: string): void;
}
export declare const queryRateLimiter: QueryRateLimiter;
//# sourceMappingURL=query-complexity-analyzer.d.ts.map