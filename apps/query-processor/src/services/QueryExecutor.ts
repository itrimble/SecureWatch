// Query Executor Service
// Handles actual execution of different query types (KQL, SQL, OpenSearch)

import { Pool } from 'pg';
import { Client } from '@opensearch-project/opensearch';
import { logger } from '../utils/logger';
import { QueryJob, QueryResult, QueryColumn, QueryExecutor as IQueryExecutor } from '../types';

export class QueryExecutorService {
  private pgPool: Pool;
  private opensearchClient: Client;
  private executors: Map<string, IQueryExecutor> = new Map();

  constructor() {
    // Initialize PostgreSQL connection pool
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'securewatch',
      user: process.env.DB_USER || 'securewatch',
      password: process.env.DB_PASSWORD || 'securewatch',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
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

    this.initializeExecutors();
  }

  private initializeExecutors(): void {
    // Register SQL executor
    this.executors.set('sql', new SQLExecutor(this.pgPool));
    
    // Register OpenSearch executor
    this.executors.set('opensearch', new OpenSearchExecutor(this.opensearchClient));
    
    // Register KQL executor (converts to SQL)
    this.executors.set('kql', new KQLExecutor(this.pgPool));
  }

  async executeQuery(job: QueryJob, progressCallback?: (progress: number, message?: string) => void): Promise<QueryResult> {
    const executor = this.executors.get(job.query_type);
    
    if (!executor) {
      throw new Error(`Unsupported query type: ${job.query_type}`);
    }

    const startTime = Date.now();
    
    try {
      // Validate query before execution
      const validation = await executor.validate_query(job.query);
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }

      progressCallback?.(10, 'Query validated, starting execution...');

      // Execute the query
      const result = await executor.execute(job);
      
      progressCallback?.(90, 'Query executed, processing results...');

      // Add execution metadata
      result.execution_time_ms = Date.now() - startTime;
      
      progressCallback?.(100, 'Query completed successfully');

      logger.info(`Query executed successfully`, {
        jobId: job.id,
        queryType: job.query_type,
        executionTime: result.execution_time_ms,
        rowCount: result.total_rows,
      });

      return result;

    } catch (error) {
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
      logger.info('Query executor shut down gracefully');
    } catch (error) {
      logger.error('Error during query executor shutdown:', error);
    }
  }
}

// SQL Query Executor
class SQLExecutor implements IQueryExecutor {
  id = 'sql-executor';
  name = 'SQL Query Executor';
  description = 'Executes SQL queries against PostgreSQL/TimescaleDB';
  supports_query_type = ['sql'];

  constructor(private pgPool: Pool) {}

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
        const firstHit = response.body.hits.hits[0]._source;
        Object.keys(firstHit).forEach(key => {
          columns.push({
            name: key,
            type: typeof firstHit[key],
            description: undefined,
          });
        });
      }

      return {
        job_id: job.id,
        data: response.body.hits.hits.map((hit: any) => ({ _id: hit._id, ...hit._source })),
        total_rows: response.body.hits.total.value || 0,
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

  constructor(private pgPool: Pool) {}

  async execute(job: QueryJob): Promise<QueryResult> {
    // Convert KQL to SQL (simplified conversion)
    const sqlQuery = this.convertKQLToSQL(job.query, job.time_range);
    
    // Create a temporary SQL job
    const sqlJob: QueryJob = {
      ...job,
      query: sqlQuery,
      query_type: 'sql',
    };

    // Execute using SQL executor
    const sqlExecutor = new SQLExecutor(this.pgPool);
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