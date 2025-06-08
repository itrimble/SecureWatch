import { Pool, PoolClient, QueryResult as PGQueryResult } from 'pg';
import { LRUCache } from 'lru-cache';
// import { Query } from '../parser/ast';
import { KQLLexer } from '../lexer/lexer';
import { KQLParser } from '../parser/parser';
import { SQLGenerator } from './sql-generator';
import { QueryOptimizer } from './query-optimizer';
import {
  ExecutionContext, QueryResult, ResultColumn, ResultRow,
  QueryMetadata, PerformanceMetrics, CacheKey, CacheEntry
} from './types';

export class QueryExecutor {
  private db: Pool;
  private cache: LRUCache<string, CacheEntry>;
  private optimizer: QueryOptimizer;

  constructor(db: Pool, cacheOptions?: { max?: number; ttl?: number }) {
    this.db = db;
    this.cache = new LRUCache({
      max: cacheOptions?.max || 1000,
      ttl: cacheOptions?.ttl || 5 * 60 * 1000, // 5 minutes default
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
    this.optimizer = new QueryOptimizer();
  }

  async executeKQL(kqlQuery: string, context: ExecutionContext): Promise<QueryResult> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      // Check cache first
      if (context.cache !== false) {
        const cacheKey = this.createCacheKey(kqlQuery, context);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return {
            ...cached.result,
            fromCache: true
          };
        }
      }

      // Parse KQL query
      const parseStartTime = Date.now();
      const lexer = new KQLLexer(kqlQuery);
      const { tokens, errors: lexErrors } = lexer.tokenize();

      if (lexErrors.length > 0) {
        throw new Error(`Lexical errors: ${lexErrors.map(e => e.message).join(', ')}`);
      }

      const parser = new KQLParser(tokens);
      const { query, errors: parseErrors } = parser.parse();

      if (parseErrors.length > 0 || !query) {
        throw new Error(`Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);
      }

      const parseTime = Date.now() - parseStartTime;

      // Optimize query
      const planStartTime = Date.now();
      const { optimizedQuery, plan } = this.optimizer.optimize(query);
      const planTime = Date.now() - planStartTime;

      // Generate SQL
      const sqlGenerator = new SQLGenerator(context.organizationId);
      const { sql, parameters } = sqlGenerator.generateSQL(optimizedQuery);

      // Add time range filter if specified
      let finalSql = sql;
      let finalParameters = [...parameters];

      if (context.timeRange) {
        finalSql += ` AND timestamp BETWEEN $${parameters.length + 1} AND $${parameters.length + 2}`;
        finalParameters.push(context.timeRange.start, context.timeRange.end);
      }

      // Add row limit if specified
      if (context.maxRows) {
        finalSql += ` LIMIT $${finalParameters.length + 1}`;
        finalParameters.push(context.maxRows);
      }

      // Execute SQL query
      const executionStartTime = Date.now();
      client = await this.db.connect();

      // Set query timeout if specified
      if (context.timeout) {
        await client.query(`SET statement_timeout = ${context.timeout}`);
      }

      const result = await client.query(finalSql, finalParameters);
      const executionTime = Date.now() - executionStartTime;

      // Process results
      const queryResult = this.processResults(result, {
        parseTime,
        planTime,
        executionTime,
        totalTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuTime: process.cpuUsage().system + process.cpuUsage().user,
        ioOperations: 0 // Would need to be tracked separately
      }, plan);

      // Cache result if caching is enabled
      if (context.cache !== false) {
        const cacheKey = this.createCacheKey(kqlQuery, context);
        this.setCache(cacheKey, queryResult);
      }

      return queryResult;

    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async explainKQL(kqlQuery: string, context: ExecutionContext): Promise<QueryMetadata> {
    try {
      // Parse and optimize query
      const lexer = new KQLLexer(kqlQuery);
      const { tokens, errors: lexErrors } = lexer.tokenize();

      if (lexErrors.length > 0) {
        throw new Error(`Lexical errors: ${lexErrors.map(e => e.message).join(', ')}`);
      }

      const parser = new KQLParser(tokens);
      const { query, errors: parseErrors } = parser.parse();

      if (parseErrors.length > 0 || !query) {
        throw new Error(`Parse errors: ${parseErrors.map(e => e.message).join(', ')}`);
      }

      const { optimizedQuery, plan } = this.optimizer.optimize(query);

      // Generate SQL and get execution plan
      const sqlGenerator = new SQLGenerator(context.organizationId);
      const { sql, parameters } = sqlGenerator.generateSQL(optimizedQuery);

      let explainSql = `EXPLAIN (FORMAT JSON, ANALYZE false, BUFFERS false) ${sql}`;
      let finalParameters = [...parameters];

      if (context.timeRange) {
        explainSql = explainSql.replace(sql, sql + ` AND timestamp BETWEEN $${parameters.length + 1} AND $${parameters.length + 2}`);
        finalParameters.push(context.timeRange.start, context.timeRange.end);
      }

      const client = await this.db.connect();
      const result = await client.query(explainSql, finalParameters);
      client.release();

      const pgPlan = result.rows[0]['QUERY PLAN'][0];

      return {
        totalRows: 0,
        scannedRows: pgPlan['Plan']['Plan Rows'] || 0,
        executionPlan: plan,
        performance: {
          parseTime: 0,
          planTime: 0,
          executionTime: pgPlan['Plan']['Total Cost'] || 0,
          totalTime: 0,
          memoryUsage: 0,
          cpuTime: 0,
          ioOperations: 0
        }
      };

    } catch (error) {
      throw new Error(`Query explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateKQL(kqlQuery: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const lexer = new KQLLexer(kqlQuery);
      const { tokens, errors: lexErrors } = lexer.tokenize();

      if (lexErrors.length > 0) {
        return {
          valid: false,
          errors: lexErrors.map(e => e.message)
        };
      }

      const parser = new KQLParser(tokens);
      const { query, errors: parseErrors } = parser.parse();

      if (parseErrors.length > 0 || !query) {
        return {
          valid: false,
          errors: parseErrors.map(e => e.message)
        };
      }

      return { valid: true, errors: [] };

    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }

  private processResults(
    pgResult: PGQueryResult,
    performance: PerformanceMetrics,
    plan: any
  ): QueryResult {
    // Convert PostgreSQL result to our format
    const columns: ResultColumn[] = pgResult.fields.map(field => ({
      name: field.name,
      type: this.mapPostgreSQLType(field.dataTypeID),
      nullable: true // PostgreSQL doesn't provide nullable info in result
    }));

    const rows: ResultRow[] = pgResult.rows.map(row => {
      const resultRow: ResultRow = {};
      columns.forEach(col => {
        resultRow[col.name] = row[col.name];
      });
      return resultRow;
    });

    const metadata: QueryMetadata = {
      totalRows: pgResult.rowCount || 0,
      scannedRows: pgResult.rowCount || 0, // Would need to be tracked separately
      executionPlan: plan,
      performance
    };

    return {
      columns,
      rows,
      metadata,
      executionTime: performance.executionTime,
      fromCache: false
    };
  }

  private mapPostgreSQLType(dataTypeID: number): string {
    // Map PostgreSQL data type IDs to readable types
    const typeMap: Record<number, string> = {
      16: 'boolean',     // bool
      20: 'bigint',      // int8
      21: 'smallint',    // int2
      23: 'integer',     // int4
      25: 'text',        // text
      700: 'real',       // float4
      701: 'double',     // float8
      1043: 'varchar',   // varchar
      1082: 'date',      // date
      1114: 'timestamp', // timestamp
      1184: 'timestamptz', // timestamptz
      2950: 'uuid',      // uuid
      3802: 'jsonb'      // jsonb
    };

    return typeMap[dataTypeID] || 'unknown';
  }

  private createCacheKey(kqlQuery: string, context: ExecutionContext): string {
    const key: CacheKey = {
      query: kqlQuery.trim(),
      organizationId: context.organizationId,
      timeRange: context.timeRange,
      parameters: {
        maxRows: context.maxRows,
        timeout: context.timeout
      }
    };

    return JSON.stringify(key);
  }

  private getFromCache(keyStr: string): CacheEntry | null {
    const entry = this.cache.get(keyStr);
    if (entry && entry.expiresAt > new Date()) {
      return entry;
    }
    
    if (entry) {
      this.cache.delete(keyStr);
    }
    
    return null;
  }

  private setCache(keyStr: string, result: QueryResult): void {
    const entry: CacheEntry = {
      key: JSON.parse(keyStr),
      result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      size: JSON.stringify(result).length
    };

    this.cache.set(keyStr, entry);
  }

  // Statistics and monitoring methods
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // LRU cache doesn't provide this by default
      misses: 0 // Would need to track separately
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getTableSchemas(_organizationId: string): Promise<Record<string, any>> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      const schemas: Record<string, any> = {};
      
      for (const row of result.rows) {
        if (!schemas[row.table_name]) {
          schemas[row.table_name] = {
            name: row.table_name,
            columns: []
          };
        }
        
        schemas[row.table_name].columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          defaultValue: row.column_default
        });
      }

      return schemas;
      
    } finally {
      client.release();
    }
  }
}