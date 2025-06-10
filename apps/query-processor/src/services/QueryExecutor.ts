// Enhanced Query Executor Service
// Handles actual execution of different query types (KQL, SQL, OpenSearch) with optimization

import { Pool } from 'pg';
import { Client } from '@opensearch-project/opensearch';
import { logger } from '../utils/logger';
import { QueryJob, QueryResult, QueryColumn, QueryExecutor as IQueryExecutor } from '../types';
import { QueryCache } from './QueryCache';
import { CompressedCache } from './CompressedCache';
import { QueryOptimizer } from './QueryOptimizer';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ParallelQueryExecutor } from './ParallelQueryExecutor';

export class QueryExecutorService {
  private pgPool: Pool;
  private opensearchClient: Client;
  private executors: Map<string, IQueryExecutor> = new Map();
  private queryCache: QueryCache;
  private compressedCache: CompressedCache;
  private queryOptimizer: QueryOptimizer;
  private performanceMonitor: PerformanceMonitor;
  private parallelExecutor: ParallelQueryExecutor;
  private useCompressedCache: boolean;

  constructor() {
    // Initialize PostgreSQL connection pool with enhanced settings
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'securewatch',
      user: process.env.DB_USER || 'securewatch',
      password: process.env.DB_PASSWORD || 'securewatch',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '32', 10), // Increased for better concurrency
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Initialize OpenSearch client
    this.opensearchClient = new Client({
      node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
      auth: process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD ? {
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD,
      } : undefined,
      ssl: {
        rejectUnauthorized: process.env.OPENSEARCH_SSL_VERIFY !== 'false',
      },
    });

    // Initialize optimization services
    this.useCompressedCache = process.env.USE_COMPRESSED_CACHE === 'true';
    this.queryCache = new QueryCache(process.env.REDIS_URL || 'redis://localhost:6379');
    this.compressedCache = new CompressedCache(process.env.REDIS_URL || 'redis://localhost:6379');
    this.queryOptimizer = new QueryOptimizer(this.pgPool);
    this.performanceMonitor = new PerformanceMonitor();
    this.parallelExecutor = new ParallelQueryExecutor(
      this.pgPool,
      this.opensearchClient,
      this.useCompressedCache ? this.compressedCache as any : this.queryCache,
      this.performanceMonitor
    );

    this.initializeExecutors();
  }

  private initializeExecutors(): void {
    // Register SQL executor with optimization services
    this.executors.set('sql', new SQLExecutor(this.pgPool, this.queryOptimizer));
    
    // Register OpenSearch executor
    this.executors.set('opensearch', new OpenSearchExecutor(this.opensearchClient));
    
    // Register KQL executor (converts to SQL) with optimization
    this.executors.set('kql', new KQLExecutor(this.pgPool, this.queryOptimizer));
  }

  async executeQuery(job: QueryJob, progressCallback?: (progress: number, message?: string) => void): Promise<QueryResult> {
    const executor = this.executors.get(job.query_type);
    
    if (!executor) {
      throw new Error(`Unsupported query type: ${job.query_type}`);
    }

    // Start performance monitoring
    this.performanceMonitor.startQuery(job.id, job.query_type, job.parameters.userId);

    try {
      progressCallback?.(5, 'Checking cache...');

      // Check cache first for eligible queries
      const cached = await this.checkCache(job);
      if (cached) {
        this.performanceMonitor.recordCacheHit(job.id);
        this.performanceMonitor.endQuery(job.id, {
          rowsReturned: cached.total_rows,
          cacheHit: true
        });
        
        progressCallback?.(100, 'Results retrieved from cache');
        logger.info(`Cache hit for query`, { jobId: job.id, queryType: job.query_type });
        return cached;
      }

      progressCallback?.(15, 'Validating and optimizing query...');

      // Validate query before execution
      const validation = await executor.validate_query(job.query);
      if (!validation.valid) {
        const error = `Query validation failed: ${validation.errors.join(', ')}`;
        this.performanceMonitor.endQuery(job.id, { error });
        throw new Error(error);
      }

      // Optimize query if supported
      let optimizedJob = job;
      if (job.query_type === 'sql' || job.query_type === 'kql') {
        try {
          const queryPlan = job.query_type === 'sql' 
            ? await this.queryOptimizer.optimizeSQL(job.query)
            : await this.queryOptimizer.optimizeKQL(job.query);

          optimizedJob = {
            ...job,
            query: queryPlan.optimizedQuery
          };

          logger.info('Query optimized', {
            jobId: job.id,
            optimizations: queryPlan.optimizations,
            estimatedCost: queryPlan.estimatedCost
          });
        } catch (error) {
          logger.warn('Query optimization failed, using original query', { error });
        }
      }

      progressCallback?.(25, 'Analyzing query for parallel execution...');

      // Determine if query should be executed in parallel
      const shouldUseParallel = await this.shouldUseParallelExecution(optimizedJob);
      
      if (shouldUseParallel) {
        progressCallback?.(30, 'Executing query in parallel...');
        
        try {
          const parallelResult = await this.parallelExecutor.executeParallel(optimizedJob);
          
          // Add execution metadata
          parallelResult.metadata = {
            ...parallelResult.metadata,
            cache_hit: false,
            query_optimized: optimizedJob.query !== job.query,
            execution_mode: 'parallel'
          };

          // Cache result if eligible
          await this.cacheResult(job, parallelResult);
          
          // End performance monitoring
          this.performanceMonitor.endQuery(job.id, {
            rowsReturned: parallelResult.total_rows,
            bytesProcessed: this.estimateResultSize(parallelResult),
            cacheHit: false,
            parallelExecution: true
          });

          progressCallback?.(100, 'Parallel query completed successfully');

          logger.info('Parallel query executed successfully', {
            jobId: job.id,
            queryType: job.query_type,
            executionTime: parallelResult.execution_time_ms,
            rowCount: parallelResult.total_rows,
            parallelEfficiency: parallelResult.metadata?.parallel_efficiency
          });

          return parallelResult;
          
        } catch (parallelError) {
          logger.warn('Parallel execution failed, falling back to sequential:', parallelError);
          // Fall through to sequential execution
        }
      }

      progressCallback?.(30, 'Executing optimized query sequentially...');

      // Execute the query sequentially
      const startTime = Date.now();
      const result = await executor.execute(optimizedJob);
      const executionTime = Date.now() - startTime;
      
      progressCallback?.(85, 'Processing and caching results...');

      // Add execution metadata
      result.execution_time_ms = executionTime;
      result.metadata = {
        ...result.metadata,
        cache_hit: false,
        query_optimized: optimizedJob.query !== job.query,
        execution_mode: 'sequential'
      };

      // Cache result if eligible
      await this.cacheResult(job, result);
      
      // End performance monitoring
      this.performanceMonitor.endQuery(job.id, {
        rowsReturned: result.total_rows,
        bytesProcessed: this.estimateResultSize(result),
        cacheHit: false
      });

      progressCallback?.(100, 'Query completed successfully');

      logger.info(`Query executed successfully`, {
        jobId: job.id,
        queryType: job.query_type,
        executionTime: result.execution_time_ms,
        rowCount: result.total_rows,
        optimized: optimizedJob.query !== job.query
      });

      return result;

    } catch (error) {
      this.performanceMonitor.endQuery(job.id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      logger.error(`Query execution failed for job ${job.id}:`, error);
      throw error;
    }
  }

  async estimateQueryDuration(queryType: string, query: string, parameters: Record<string, any>): Promise<number> {
    const executor = this.executors.get(queryType);
    
    if (!executor) {
      return 30000; // Default 30 seconds for unknown query types
    }

    try {
      return await executor.estimate_duration(query, parameters);
    } catch (error) {
      logger.warn(`Failed to estimate duration for ${queryType} query:`, error);
      return 30000; // Fallback estimate
    }
  }

  async validateQuery(queryType: string, query: string): Promise<{ valid: boolean; errors: string[] }> {
    const executor = this.executors.get(queryType);
    
    if (!executor) {
      return { valid: false, errors: [`Unsupported query type: ${queryType}`] };
    }

    return await executor.validate_query(query);
  }

  async shutdown(): Promise<void> {
    try {
      await this.pgPool.end();
      await this.queryCache.close();
      if (this.useCompressedCache) {
        await this.compressedCache.close();
      }
      this.performanceMonitor.stop();
      await this.parallelExecutor.shutdown();
      logger.info('Query executor shut down gracefully');
    } catch (error) {
      logger.error('Error during query executor shutdown:', error);
    }
  }

  // Parallel execution decision logic
  
  private async shouldUseParallelExecution(job: QueryJob): Promise<boolean> {
    // Check if parallel execution is enabled
    const parallelEnabled = process.env.PARALLEL_EXECUTION_ENABLED !== 'false';
    if (!parallelEnabled) {
      return false;
    }

    // Don't parallelize small or simple queries
    const estimatedDuration = await this.estimateQueryDuration(job.query_type, job.query, job.parameters);
    if (estimatedDuration < 5000) { // Less than 5 seconds
      return false;
    }

    // Check if query has time range suitable for partitioning
    if (job.time_range.start && job.time_range.end) {
      const startTime = new Date(job.time_range.start);
      const endTime = new Date(job.time_range.end);
      const hoursDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff >= 2) { // More than 2 hours of data
        return true;
      }
    }

    // Check for queries that can benefit from index-based parallelization
    if (job.query_type === 'opensearch' && job.parameters.index?.includes('*')) {
      return true;
    }

    // Check for complex aggregation queries
    const query = job.query.toLowerCase();
    if (query.includes('group by') && (query.includes('count') || query.includes('sum'))) {
      return true;
    }

    // Default to sequential execution for safety
    return false;
  }

  // Optimization helper methods

  private async checkCache(job: QueryJob): Promise<QueryResult | null> {
    // Only cache for certain query types and safe operations
    if (!this.isCacheEligible(job)) {
      return null;
    }

    try {
      const cache = this.useCompressedCache ? this.compressedCache : this.queryCache;
      const cached = await cache.get(
        job.query_type,
        job.query,
        { ...job.parameters, timeRange: job.time_range }
      );

      if (cached) {
        return {
          job_id: job.id,
          ...cached.data,
          metadata: {
            ...cached.data.metadata,
            cache_hit: true,
            cached_at: cached.metadata.cachedAt,
            hit_count: cached.metadata.hitCount,
            cache_type: this.useCompressedCache ? 'compressed' : 'standard'
          }
        };
      }
    } catch (error) {
      logger.warn('Cache check failed:', error);
    }

    return null;
  }

  private async cacheResult(job: QueryJob, result: QueryResult): Promise<void> {
    if (!this.isCacheEligible(job) || !this.isResultCacheable(result)) {
      return;
    }

    try {
      const tags = this.generateCacheTags(job);
      const ttl = this.calculateCacheTTL(job, result);
      const cache = this.useCompressedCache ? this.compressedCache : this.queryCache;

      await cache.set(
        job.query_type,
        job.query,
        result,
        { ttl, tags },
        { ...job.parameters, timeRange: job.time_range },
        result.execution_time_ms || 0
      );
    } catch (error) {
      logger.warn('Failed to cache result:', error);
    }
  }

  private isCacheEligible(job: QueryJob): boolean {
    // Don't cache real-time queries or those with user-specific data
    if (job.parameters.realTime || job.parameters.userId) {
      return false;
    }

    // Don't cache queries with very recent time ranges
    if (job.time_range.end) {
      const endTime = new Date(job.time_range.end);
      const now = new Date();
      const diffMinutes = (now.getTime() - endTime.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) { // Don't cache queries with data from last 5 minutes
        return false;
      }
    }

    return true;
  }

  private isResultCacheable(result: QueryResult): boolean {
    // Don't cache very large results or errors
    const maxCacheableRows = parseInt(process.env.MAX_CACHEABLE_ROWS || '50000', 10);
    return result.total_rows <= maxCacheableRows && !result.metadata?.error;
  }

  private generateCacheTags(job: QueryJob): string[] {
    const tags: string[] = [job.query_type];
    
    if (job.parameters.index) {
      tags.push(`index:${job.parameters.index}`);
    }
    
    if (job.time_range.start) {
      const date = new Date(job.time_range.start).toISOString().split('T')[0];
      tags.push(`date:${date}`);
    }

    return tags;
  }

  private calculateCacheTTL(job: QueryJob, result: QueryResult): number {
    // Longer TTL for historical data, shorter for recent data
    if (job.time_range.end) {
      const endTime = new Date(job.time_range.end);
      const now = new Date();
      const hoursOld = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursOld > 24) return 3600 * 24; // 24 hours for data > 24 hours old
      if (hoursOld > 1) return 3600 * 4;   // 4 hours for data > 1 hour old
      return 3600; // 1 hour for recent data
    }
    
    return 3600; // Default 1 hour
  }

  private estimateResultSize(result: QueryResult): number {
    try {
      return JSON.stringify(result.data).length;
    } catch {
      return result.total_rows * 1000; // Rough estimate
    }
  }

  // Public monitoring and admin methods

  async getPerformanceStats(): Promise<any> {
    const queryStats = this.performanceMonitor.getAggregatedMetrics();
    const cacheStats = this.useCompressedCache ? 
      await this.compressedCache.getStats() : 
      await this.queryCache.getStats();
    const optimizerStats = this.queryOptimizer.getStats();
    const systemStats = await this.performanceMonitor.getSystemMetrics();
    const parallelStats = this.parallelExecutor.getMetrics();

    return {
      performance: queryStats,
      cache: {
        ...cacheStats,
        type: this.useCompressedCache ? 'compressed' : 'standard',
        features: {
          compression: this.useCompressedCache,
          deduplication: this.useCompressedCache,
          parallelExecution: true
        }
      },
      optimizer: optimizerStats,
      parallel: parallelStats,
      system: systemStats,
      timestamp: new Date().toISOString()
    };
  }

  async warmUpCache(commonQueries?: Array<{ type: string; query: string; params?: any }>): Promise<void> {
    if (commonQueries) {
      await this.queryCache.warmUp(commonQueries);
    }
  }

  async clearCache(tags?: string[]): Promise<number> {
    if (tags) {
      return await this.queryCache.invalidateByTags(tags);
    } else {
      await this.queryCache.clear();
      return 0;
    }
  }
}

// SQL Query Executor
class SQLExecutor implements IQueryExecutor {
  id = 'sql-executor';
  name = 'SQL Query Executor';
  description = 'Executes SQL queries against PostgreSQL/TimescaleDB';
  supports_query_type = ['sql'];

  constructor(private pgPool: Pool, private queryOptimizer?: QueryOptimizer) {}

  async execute(job: QueryJob): Promise<QueryResult> {
    const client = await this.pgPool.connect();
    
    try {
      // Apply time range filters if provided
      let query = job.query;
      if (job.time_range.start && job.time_range.end) {
        // Inject time range into WHERE clause if not already present
        if (!query.toLowerCase().includes('where')) {
          query += ` WHERE timestamp >= '${job.time_range.start}' AND timestamp <= '${job.time_range.end}'`;
        }
      }

      // Execute query with parameters
      const result = await client.query(query, Object.values(job.parameters));

      // Extract column information
      const columns: QueryColumn[] = result.fields.map(field => ({
        name: field.name,
        type: this.mapPostgresType(field.dataTypeID),
        description: undefined,
      }));

      return {
        job_id: job.id,
        data: result.rows,
        total_rows: result.rowCount || 0,
        execution_time_ms: 0, // Will be set by caller
        columns,
        metadata: {
          query_plan: undefined, // Could be enhanced with EXPLAIN
          cache_hit: false,
          data_scanned_bytes: undefined,
          indices_used: undefined,
        },
      };

    } finally {
      client.release();
    }
  }

  async estimate_duration(query: string, parameters: Record<string, any>): Promise<number> {
    const client = await this.pgPool.connect();
    
    try {
      // Use EXPLAIN to estimate query cost
      const explainResult = await client.query(`EXPLAIN (FORMAT JSON) ${query}`, Object.values(parameters));
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      
      // Rough estimation based on total cost
      const totalCost = plan['Total Cost'] || 1000;
      return Math.min(Math.max(totalCost * 10, 5000), 300000); // 5s to 5min range

    } catch (error) {
      logger.warn('Failed to estimate SQL query duration:', error);
      return 30000; // 30 second fallback
    } finally {
      client.release();
    }
  }

  async validate_query(query: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic SQL validation
    if (!query.trim()) {
      errors.push('Query cannot be empty');
    }

    // Check for dangerous operations
    const dangerous = ['drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'];
    const lowerQuery = query.toLowerCase();
    
    for (const op of dangerous) {
      if (lowerQuery.includes(op)) {
        errors.push(`Dangerous operation detected: ${op.toUpperCase()}`);
      }
    }

    // Try to validate syntax with EXPLAIN
    if (errors.length === 0) {
      const client = await this.pgPool.connect();
      try {
        await client.query(`EXPLAIN ${query}`);
      } catch (error) {
        errors.push(`SQL syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        client.release();
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private mapPostgresType(dataTypeID: number): string {
    // Map PostgreSQL OIDs to readable types
    const typeMap: Record<number, string> = {
      23: 'integer',
      25: 'text',
      1114: 'timestamp',
      16: 'boolean',
      20: 'bigint',
      701: 'float',
      1184: 'timestamptz',
      114: 'json',
      3802: 'jsonb',
    };
    
    return typeMap[dataTypeID] || 'unknown';
  }
}

// OpenSearch Query Executor
class OpenSearchExecutor implements IQueryExecutor {
  id = 'opensearch-executor';
  name = 'OpenSearch Query Executor';
  description = 'Executes queries against OpenSearch indices';
  supports_query_type = ['opensearch'];

  constructor(private client: Client) {}

  async execute(job: QueryJob): Promise<QueryResult> {
    try {
      const searchParams = {
        index: job.parameters.index || 'logs-*',
        body: {
          query: JSON.parse(job.query),
          size: job.parameters.size || 10000,
          from: job.parameters.from || 0,
          sort: job.parameters.sort || [{ '@timestamp': { order: 'desc' } }],
        },
      };

      // Apply time range filter
      if (job.time_range.start && job.time_range.end) {
        searchParams.body.query = {
          bool: {
            must: [searchParams.body.query],
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: job.time_range.start,
                    lte: job.time_range.end,
                  },
                },
              },
            ],
          },
        };
      }

      const response = await this.client.search(searchParams);

      // Extract field names from the first hit
      const columns: QueryColumn[] = [];
      if (response.body.hits.hits.length > 0) {
        const firstHit = response.body.hits.hits[0]?._source;
        if (firstHit) {
          Object.keys(firstHit).forEach(key => {
            columns.push({
              name: key,
              type: typeof firstHit[key],
              description: undefined,
            });
          });
        }
      }

      return {
        job_id: job.id,
        data: response.body.hits.hits.map((hit: any) => ({ _id: hit._id, ...hit._source })),
        total_rows: (typeof response.body.hits.total === 'object' ? response.body.hits.total?.value : response.body.hits.total) || 0,
        execution_time_ms: response.body.took || 0,
        columns,
        metadata: {
          query_plan: undefined,
          cache_hit: false,
          data_scanned_bytes: undefined,
          indices_used: searchParams.index ? [searchParams.index] : undefined,
        },
      };

    } catch (error) {
      logger.error('OpenSearch query execution failed:', error);
      throw error;
    }
  }

  async estimate_duration(query: string, parameters: Record<string, any>): Promise<number> {
    // Estimate based on query complexity and data size
    try {
      const queryObj = JSON.parse(query);
      const hasAggregations = !!queryObj.aggs || !!queryObj.aggregations;
      const size = parameters.size || 10000;
      
      let estimate = 5000; // Base 5 seconds
      
      if (hasAggregations) estimate *= 2;
      if (size > 50000) estimate *= 1.5;
      
      return Math.min(estimate, 180000); // Max 3 minutes

    } catch (error) {
      return 15000; // 15 second fallback
    }
  }

  async validate_query(query: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      JSON.parse(query);
    } catch (error) {
      errors.push('Invalid JSON query format');
    }

    return { valid: errors.length === 0, errors };
  }
}

// KQL Query Executor (converts KQL to SQL)
class KQLExecutor implements IQueryExecutor {
  id = 'kql-executor';
  name = 'KQL Query Executor';
  description = 'Converts KQL queries to SQL and executes against PostgreSQL';
  supports_query_type = ['kql'];

  constructor(private pgPool: Pool, private queryOptimizer?: QueryOptimizer) {}

  async execute(job: QueryJob): Promise<QueryResult> {
    // Convert KQL to SQL using optimizer if available, otherwise use basic conversion
    let sqlQuery: string;
    
    if (this.queryOptimizer) {
      try {
        const queryPlan = await this.queryOptimizer.optimizeKQL(job.query);
        sqlQuery = queryPlan.optimizedQuery;
      } catch (error) {
        logger.warn('KQL optimization failed, using basic conversion:', error);
        sqlQuery = this.convertKQLToSQL(job.query, job.time_range);
      }
    } else {
      sqlQuery = this.convertKQLToSQL(job.query, job.time_range);
    }
    
    // Create a temporary SQL job
    const sqlJob: QueryJob = {
      ...job,
      query: sqlQuery,
      query_type: 'sql',
    };

    // Execute using SQL executor
    const sqlExecutor = new SQLExecutor(this.pgPool, this.queryOptimizer);
    return await sqlExecutor.execute(sqlJob);
  }

  async estimate_duration(query: string, parameters: Record<string, any>): Promise<number> {
    // Convert to SQL and estimate
    const sqlQuery = this.convertKQLToSQL(query, { start: '', end: '' });
    const sqlExecutor = new SQLExecutor(this.pgPool);
    return await sqlExecutor.estimate_duration(sqlQuery, parameters);
  }

  async validate_query(query: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic KQL validation
    if (!query.trim()) {
      errors.push('KQL query cannot be empty');
    }

    // Validate KQL syntax (simplified)
    try {
      this.convertKQLToSQL(query, { start: '', end: '' });
    } catch (error) {
      errors.push(`KQL syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private convertKQLToSQL(kqlQuery: string, timeRange: { start: string; end: string }): string {
    // Simplified KQL to SQL conversion
    // In production, you'd want a proper KQL parser
    
    let sqlQuery = 'SELECT * FROM logs';
    const conditions: string[] = [];

    // Add time range filter
    if (timeRange.start && timeRange.end) {
      conditions.push(`timestamp >= '${timeRange.start}' AND timestamp <= '${timeRange.end}'`);
    }

    // Parse basic KQL operators
    kqlQuery = kqlQuery.trim();
    
    // Handle simple field:value patterns
    const fieldValuePattern = /(\w+)\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = fieldValuePattern.exec(kqlQuery)) !== null) {
      const [, field, value] = match;
      conditions.push(`${field} ILIKE '%${value}%'`);
    }

    // Handle contains operator
    const containsPattern = /(\w+)\s+contains\s+"([^"]+)"/g;
    while ((match = containsPattern.exec(kqlQuery)) !== null) {
      const [, field, value] = match;
      conditions.push(`${field} ILIKE '%${value}%'`);
    }

    // Handle simple text search
    if (!fieldValuePattern.test(kqlQuery) && !containsPattern.test(kqlQuery)) {
      // Treat as full-text search
      conditions.push(`search_vector @@ plainto_tsquery('english', '${kqlQuery}')`);
    }

    if (conditions.length > 0) {
      sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }

    sqlQuery += ' ORDER BY timestamp DESC LIMIT 10000';

    return sqlQuery;
  }
}