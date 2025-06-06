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

export class QueryComplexityAnalyzer {
  private config: QueryComplexityConfig;

  constructor(config?: Partial<QueryComplexityConfig>) {
    this.config = {
      maxRows: 5000, // Reduced from 10000 to prevent memory exhaustion
      maxTimeoutMs: 120000, // Reduced from 300000 (5min) to 2min
      maxTimeRangeHours: 168, // 1 week maximum
      maxJoins: 5,
      maxAggregations: 10,
      maxNestedQueries: 3,
      complexityScoreLimit: 100,
      ...config
    };
  }

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
  }): QueryComplexityResult {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let complexityScore = 0;

    // 1. Validate row limits
    if (query.maxRows && query.maxRows > this.config.maxRows) {
      violations.push(`Row limit exceeds maximum (${query.maxRows} > ${this.config.maxRows})`);
      recommendations.push(`Reduce maxRows to ${this.config.maxRows} or less`);
      complexityScore += 30;
    }

    // 2. Validate timeout limits
    if (query.timeout && query.timeout > this.config.maxTimeoutMs) {
      violations.push(`Timeout exceeds maximum (${query.timeout}ms > ${this.config.maxTimeoutMs}ms)`);
      recommendations.push(`Reduce timeout to ${this.config.maxTimeoutMs}ms or less`);
      complexityScore += 20;
    }

    // 3. Validate time range
    if (query.startTime && query.endTime) {
      const timeRangeAnalysis = this.analyzeTimeRange(query.startTime, query.endTime);
      if (timeRangeAnalysis.violations.length > 0) {
        violations.push(...timeRangeAnalysis.violations);
        recommendations.push(...timeRangeAnalysis.recommendations);
        complexityScore += timeRangeAnalysis.complexityScore;
      }
    }

    // 4. Analyze KQL/SQL query complexity
    if (query.kqlQuery) {
      const kqlAnalysis = this.analyzeKQLComplexity(query.kqlQuery);
      violations.push(...kqlAnalysis.violations);
      recommendations.push(...kqlAnalysis.recommendations);
      complexityScore += kqlAnalysis.complexityScore;
    }

    if (query.sqlQuery) {
      const sqlAnalysis = this.analyzeSQLComplexity(query.sqlQuery);
      violations.push(...sqlAnalysis.violations);
      recommendations.push(...sqlAnalysis.recommendations);
      complexityScore += sqlAnalysis.complexityScore;
    }

    // 5. Estimate resource usage
    const estimatedResourceUsage = this.estimateResourceUsage({
      maxRows: query.maxRows || 1000,
      timeRangeHours: this.calculateTimeRangeHours(query.startTime, query.endTime),
      complexityScore
    });

    return {
      isValid: violations.length === 0 && complexityScore <= this.config.complexityScoreLimit,
      complexityScore,
      violations,
      recommendations,
      estimatedResourceUsage
    };
  }

  /**
   * Analyze time range complexity
   */
  private analyzeTimeRange(startTime: string, endTime: string): {
    violations: string[];
    recommendations: string[];
    complexityScore: number;
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let complexityScore = 0;

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      if (diffHours > this.config.maxTimeRangeHours) {
        violations.push(`Time range exceeds maximum (${diffHours.toFixed(1)} hours > ${this.config.maxTimeRangeHours} hours)`);
        recommendations.push(`Reduce time range to ${this.config.maxTimeRangeHours} hours or less`);
        complexityScore += 25;
      }

      // Add complexity score based on time range size
      if (diffHours > 24) complexityScore += 10; // More than 1 day
      if (diffHours > 168) complexityScore += 20; // More than 1 week

    } catch (error) {
      violations.push('Invalid time range format');
      recommendations.push('Use valid ISO 8601 date format');
      complexityScore += 5;
    }

    return { violations, recommendations, complexityScore };
  }

  /**
   * Analyze KQL query complexity
   */
  private analyzeKQLComplexity(kqlQuery: string): {
    violations: string[];
    recommendations: string[];
    complexityScore: number;
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let complexityScore = 0;

    // Convert to lowercase for analysis
    const query = kqlQuery.toLowerCase();

    // 1. Check for joins
    const joinCount = (query.match(/\bjoin\b/g) || []).length;
    if (joinCount > this.config.maxJoins) {
      violations.push(`Too many joins (${joinCount} > ${this.config.maxJoins})`);
      recommendations.push(`Reduce joins to ${this.config.maxJoins} or less`);
      complexityScore += joinCount * 5;
    }

    // 2. Check for aggregations
    const aggregationCount = (query.match(/\b(summarize|count|sum|avg|max|min|distinct)\b/g) || []).length;
    if (aggregationCount > this.config.maxAggregations) {
      violations.push(`Too many aggregations (${aggregationCount} > ${this.config.maxAggregations})`);
      recommendations.push(`Reduce aggregations to ${this.config.maxAggregations} or less`);
      complexityScore += aggregationCount * 3;
    }

    // 3. Check for nested queries (subqueries)
    const nestedQueryCount = (query.match(/\(/g) || []).length;
    if (nestedQueryCount > this.config.maxNestedQueries) {
      violations.push(`Too many nested queries (${nestedQueryCount} > ${this.config.maxNestedQueries})`);
      recommendations.push(`Reduce nested queries to ${this.config.maxNestedQueries} or less`);
      complexityScore += nestedQueryCount * 8;
    }

    // 4. Check for expensive operations
    if (query.includes('regex') || query.includes('matches')) {
      complexityScore += 10;
      recommendations.push('Consider using more efficient string operations instead of regex when possible');
    }

    if (query.includes('sort') && !query.includes('limit')) {
      complexityScore += 15;
      recommendations.push('Add LIMIT clause when using SORT operations');
    }

    // 5. Check for wildcard searches
    if (query.includes('*') && !query.includes('limit')) {
      complexityScore += 20;
      violations.push('Wildcard searches without LIMIT can be resource intensive');
      recommendations.push('Add LIMIT clause when using wildcard searches');
    }

    return { violations, recommendations, complexityScore };
  }

  /**
   * Analyze SQL query complexity
   */
  private analyzeSQLComplexity(sqlQuery: string): {
    violations: string[];
    recommendations: string[];
    complexityScore: number;
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let complexityScore = 0;

    const query = sqlQuery.toLowerCase();

    // 1. Check for joins
    const joinCount = (query.match(/\b(inner join|left join|right join|full join|cross join)\b/g) || []).length;
    if (joinCount > this.config.maxJoins) {
      violations.push(`Too many SQL joins (${joinCount} > ${this.config.maxJoins})`);
      recommendations.push(`Reduce joins to ${this.config.maxJoins} or less`);
      complexityScore += joinCount * 5;
    }

    // 2. Check for subqueries
    const subqueryCount = (query.match(/\bselect\b/g) || []).length - 1; // Minus the main SELECT
    if (subqueryCount > this.config.maxNestedQueries) {
      violations.push(`Too many SQL subqueries (${subqueryCount} > ${this.config.maxNestedQueries})`);
      recommendations.push(`Reduce subqueries to ${this.config.maxNestedQueries} or less`);
      complexityScore += subqueryCount * 8;
    }

    // 3. Check for expensive operations
    if (query.includes('group by') && !query.includes('limit')) {
      complexityScore += 15;
      recommendations.push('Add LIMIT clause when using GROUP BY operations');
    }

    if (query.includes('order by') && !query.includes('limit')) {
      complexityScore += 10;
      recommendations.push('Add LIMIT clause when using ORDER BY operations');
    }

    // 4. Check for full table scans
    if (!query.includes('where') && !query.includes('limit')) {
      violations.push('Query may perform full table scan without WHERE clause');
      recommendations.push('Add WHERE clause to filter results and improve performance');
      complexityScore += 25;
    }

    return { violations, recommendations, complexityScore };
  }

  /**
   * Calculate time range in hours
   */
  private calculateTimeRangeHours(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) return 24; // Default to 24 hours

    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    } catch {
      return 24;
    }
  }

  /**
   * Estimate resource usage based on query parameters
   */
  private estimateResourceUsage(params: {
    maxRows: number;
    timeRangeHours: number;
    complexityScore: number;
  }): {
    memory: string;
    cpu: string;
    executionTime: string;
  } {
    // Memory estimation (rough calculation)
    const memoryMB = Math.ceil((params.maxRows * 2) / 1000); // ~2KB per row estimate
    
    // CPU estimation based on complexity
    let cpuLevel = 'Low';
    if (params.complexityScore > 50) cpuLevel = 'High';
    else if (params.complexityScore > 25) cpuLevel = 'Medium';

    // Execution time estimation
    let executionTime = 'Under 10s';
    if (params.complexityScore > 75 || params.timeRangeHours > 168) {
      executionTime = 'Over 60s';
    } else if (params.complexityScore > 40 || params.timeRangeHours > 24) {
      executionTime = '10-60s';
    }

    return {
      memory: `~${memoryMB}MB`,
      cpu: cpuLevel,
      executionTime
    };
  }

  /**
   * Get configuration for external reference
   */
  getConfig(): QueryComplexityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<QueryComplexityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default analyzer instance
export const queryComplexityAnalyzer = new QueryComplexityAnalyzer();

// Rate limiting for complex queries
export interface QueryRateLimitConfig {
  maxQueriesPerMinute: number;
  maxComplexQueriesPerHour: number;
  complexityThreshold: number;
}

export class QueryRateLimiter {
  private queryCache = new Map<string, number[]>();
  private complexQueryCache = new Map<string, number[]>();

  constructor(private config: QueryRateLimitConfig) {}

  /**
   * Check if user can execute query based on rate limits
   */
  canExecuteQuery(userId: string, complexityScore: number): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Check general query rate limit
    const userQueries = this.queryCache.get(userId) || [];
    const recentQueries = userQueries.filter(time => time > oneMinuteAgo);
    
    if (recentQueries.length >= this.config.maxQueriesPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.maxQueriesPerMinute} queries per minute`,
        retryAfter: 60
      };
    }

    // Check complex query rate limit
    if (complexityScore >= this.config.complexityThreshold) {
      const userComplexQueries = this.complexQueryCache.get(userId) || [];
      const recentComplexQueries = userComplexQueries.filter(time => time > oneHourAgo);
      
      if (recentComplexQueries.length >= this.config.maxComplexQueriesPerHour) {
        return {
          allowed: false,
          reason: `Complex query limit exceeded: ${this.config.maxComplexQueriesPerHour} complex queries per hour`,
          retryAfter: 3600
        };
      }
    }

    // Update caches
    this.queryCache.set(userId, [...recentQueries, now]);
    
    if (complexityScore >= this.config.complexityThreshold) {
      const userComplexQueries = this.complexQueryCache.get(userId) || [];
      const recentComplexQueries = userComplexQueries.filter(time => time > oneHourAgo);
      this.complexQueryCache.set(userId, [...recentComplexQueries, now]);
    }

    return { allowed: true };
  }

  /**
   * Clear rate limit data for user (admin function)
   */
  clearUserLimits(userId: string): void {
    this.queryCache.delete(userId);
    this.complexQueryCache.delete(userId);
  }
}

// Default rate limiter instance
export const queryRateLimiter = new QueryRateLimiter({
  maxQueriesPerMinute: 30,
  maxComplexQueriesPerHour: 10,
  complexityThreshold: 50
});