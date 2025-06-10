import { Pool } from 'pg';
import { logger } from '../utils/logger';

interface QueryPlan {
  originalQuery: string;
  optimizedQuery: string;
  estimatedCost: number;
  estimatedRows: number;
  optimizations: string[];
  indexes?: string[];
  warnings?: string[];
}

interface OptimizationRule {
  name: string;
  pattern: RegExp;
  apply: (query: string) => string;
  description: string;
}

export class QueryOptimizer {
  private pool: Pool;
  private queryPlanCache: Map<string, QueryPlan> = new Map();
  private readonly maxCacheSize = 1000;
  private optimizationRules: OptimizationRule[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeOptimizationRules();
  }

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        name: 'RemoveRedundantDistinct',
        pattern: /SELECT\s+DISTINCT\s+.*\s+FROM\s+.*\s+WHERE\s+.*\s+GROUP\s+BY/i,
        apply: (query: string) => query.replace(/SELECT\s+DISTINCT/i, 'SELECT'),
        description: 'Remove redundant DISTINCT when GROUP BY is present'
      },
      {
        name: 'OptimizeWildcardPrefix',
        pattern: /WHERE\s+\w+\s+LIKE\s+'%[^%]/i,
        apply: (query: string) => {
          logger.warn('Query uses leading wildcard which prevents index usage');
          return query;
        },
        description: 'Warn about leading wildcards that prevent index usage'
      },
      {
        name: 'UseExistsInsteadOfCount',
        pattern: /WHERE\s+\(SELECT\s+COUNT\(\*\).*?\)\s*>\s*0/i,
        apply: (query: string) => {
          return query.replace(
            /WHERE\s+\(SELECT\s+COUNT\(\*\)(.*?)\)\s*>\s*0/i,
            'WHERE EXISTS (SELECT 1$1)'
          );
        },
        description: 'Replace COUNT(*) > 0 with EXISTS for better performance'
      },
      {
        name: 'OptimizeInClause',
        pattern: /WHERE\s+\w+\s+IN\s*\([^)]{1000,}\)/i,
        apply: (query: string) => {
          logger.warn('Large IN clause detected, consider using JOIN or temporary table');
          return query;
        },
        description: 'Warn about large IN clauses'
      },
      {
        name: 'AddLimitToExists',
        pattern: /EXISTS\s*\(\s*SELECT\s+(?!1\s|.*LIMIT)/i,
        apply: (query: string) => {
          return query.replace(
            /EXISTS\s*\(\s*SELECT\s+(.*?)FROM/gi,
            'EXISTS (SELECT 1 FROM'
          );
        },
        description: 'Optimize EXISTS subqueries to SELECT 1'
      }
    ];
  }

  /**
   * Analyze and optimize a SQL query
   */
  async optimizeSQL(query: string): Promise<QueryPlan> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.queryPlanCache.get(cacheKey);
      if (cached) {
        logger.info('Query plan cache hit');
        return cached;
      }

      // Apply optimization rules
      const optimizations: string[] = [];
      let optimizedQuery = query;

      for (const rule of this.optimizationRules) {
        if (rule.pattern.test(query)) {
          const before = optimizedQuery;
          optimizedQuery = rule.apply(optimizedQuery);
          if (before !== optimizedQuery) {
            optimizations.push(rule.description);
          }
        }
      }

      // Get execution plan
      const plan = await this.getExecutionPlan(optimizedQuery);
      
      // Analyze for missing indexes
      const indexSuggestions = await this.suggestIndexes(optimizedQuery, plan);

      const queryPlan: QueryPlan = {
        originalQuery: query,
        optimizedQuery,
        estimatedCost: plan.totalCost,
        estimatedRows: plan.estimatedRows,
        optimizations,
        indexes: indexSuggestions,
        warnings: plan.warnings
      };

      // Cache the plan
      this.cacheQueryPlan(cacheKey, queryPlan);

      return queryPlan;
    } catch (error) {
      logger.error('Query optimization error:', error);
      return {
        originalQuery: query,
        optimizedQuery: query,
        estimatedCost: 0,
        estimatedRows: 0,
        optimizations: [],
        warnings: ['Failed to optimize query']
      };
    }
  }

  /**
   * Optimize KQL queries by converting to efficient SQL
   */
  async optimizeKQL(kqlQuery: string): Promise<QueryPlan> {
    try {
      // Enhanced KQL to SQL conversion with optimizations
      const sqlQuery = this.convertKQLToOptimizedSQL(kqlQuery);
      return await this.optimizeSQL(sqlQuery);
    } catch (error) {
      logger.error('KQL optimization error:', error);
      return {
        originalQuery: kqlQuery,
        optimizedQuery: kqlQuery,
        estimatedCost: 0,
        estimatedRows: 0,
        optimizations: [],
        warnings: ['Failed to optimize KQL query']
      };
    }
  }

  /**
   * Get execution plan for a query
   */
  private async getExecutionPlan(query: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const explainQuery = `EXPLAIN (ANALYZE false, BUFFERS false, FORMAT JSON) ${query}`;
      const result = await client.query(explainQuery);
      const plan = result.rows[0]['QUERY PLAN'][0]['Plan'];

      const warnings: string[] = [];
      
      // Analyze plan for issues
      this.analyzePlanNode(plan, warnings);

      return {
        totalCost: plan['Total Cost'],
        estimatedRows: plan['Plan Rows'],
        nodeType: plan['Node Type'],
        warnings,
        rawPlan: plan
      };
    } catch (error) {
      logger.error('Failed to get execution plan:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Analyze plan nodes for performance issues
   */
  private analyzePlanNode(node: any, warnings: string[], depth = 0): void {
    // Check for sequential scans on large tables
    if (node['Node Type'] === 'Seq Scan' && node['Plan Rows'] > 10000) {
      warnings.push(`Sequential scan on large table: ${node['Relation Name']} (${node['Plan Rows']} rows)`);
    }

    // Check for nested loops with high row counts
    if (node['Node Type'] === 'Nested Loop' && node['Plan Rows'] > 1000) {
      warnings.push('Nested loop join with high row count detected');
    }

    // Check for missing indexes
    if (node['Index Cond'] === null && node['Filter'] && node['Plan Rows'] > 1000) {
      warnings.push(`Possible missing index on filter condition`);
    }

    // Recursively analyze child nodes
    if (node['Plans']) {
      for (const childNode of node['Plans']) {
        this.analyzePlanNode(childNode, warnings, depth + 1);
      }
    }
  }

  /**
   * Suggest indexes based on query analysis
   */
  private async suggestIndexes(query: string, plan: any): Promise<string[]> {
    const suggestions: string[] = [];

    // Extract table and column references from query
    const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      
      // Look for equality comparisons
      const equalityMatches = whereClause.matchAll(/(\w+)\.(\w+)\s*=\s*/g);
      for (const match of equalityMatches) {
        const [, table, column] = match;
        suggestions.push(`CREATE INDEX idx_${table}_${column} ON ${table}(${column});`);
      }

      // Look for range comparisons
      const rangeMatches = whereClause.matchAll(/(\w+)\.(\w+)\s*(?:>|<|>=|<=|BETWEEN)/g);
      for (const match of rangeMatches) {
        const [, table, column] = match;
        suggestions.push(`CREATE INDEX idx_${table}_${column} ON ${table}(${column});`);
      }
    }

    // Extract JOIN conditions
    const joinMatches = query.matchAll(/JOIN\s+(\w+)\s+\w+\s+ON\s+\w+\.(\w+)\s*=\s*\w+\.(\w+)/gi);
    for (const match of joinMatches) {
      const [, table, column1, column2] = match;
      suggestions.push(`CREATE INDEX idx_${table}_join ON ${table}(${column1}, ${column2});`);
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Convert KQL to optimized SQL
   */
  private convertKQLToOptimizedSQL(kql: string): string {
    // Enhanced KQL parser with optimization
    let sql = 'SELECT * FROM logs WHERE 1=1';

    // Parse search terms
    const searchMatch = kql.match(/search\s+"([^"]+)"/i);
    if (searchMatch) {
      const searchTerm = searchMatch[1];
      sql += ` AND message ILIKE '%${searchTerm}%'`;
    }

    // Parse field filters with optimization
    const whereMatches = kql.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
    for (const match of whereMatches) {
      const [, field, value] = match;
      sql += ` AND ${field} = '${value}'`;
    }

    // Parse time range with index optimization
    const timeMatch = kql.match(/timestamp\s*>=?\s*(\S+)\s+and\s+timestamp\s*<=?\s*(\S+)/i);
    if (timeMatch) {
      const [, start, end] = timeMatch;
      sql += ` AND timestamp >= '${start}' AND timestamp <= '${end}'`;
      sql += ' ORDER BY timestamp DESC'; // Use index scan
    }

    // Add default limit for safety
    if (!kql.includes('limit') && !kql.includes('take')) {
      sql += ' LIMIT 10000';
    }

    return sql;
  }

  /**
   * Cache query plan
   */
  private cacheQueryPlan(key: string, plan: QueryPlan): void {
    // Implement LRU eviction
    if (this.queryPlanCache.size >= this.maxCacheSize) {
      const firstKey = this.queryPlanCache.keys().next().value;
      this.queryPlanCache.delete(firstKey);
    }
    this.queryPlanCache.set(key, plan);
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string): string {
    // Normalize query for caching
    return query.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Get optimizer statistics
   */
  getStats(): any {
    return {
      cachedPlans: this.queryPlanCache.size,
      optimizationRules: this.optimizationRules.length,
      cacheHitRate: 0 // Would need to track this
    };
  }
}