/**
 * KQL Execution Engine with Apache Arrow Integration
 * High-performance columnar data processing for analytics queries
 */

import { Pool, PoolClient } from 'pg';
import * as arrow from 'apache-arrow';
import { createReadStream } from 'fs';
import { 
  QueryExecutionPlan, 
  QueryResult, 
  ResultColumn, 
  ResultRow, 
  ResultMetadata,
  PerformanceMetrics,
  ResourceLimits,
  QueryResource,
  KQLError
} from '../types/kql.types';

export class ExecutionEngine {
  private dbPool: Pool;
  private resourceManager: ResourceManager;
  private activeQueries: Map<string, QueryResource> = new Map();
  
  constructor(dbPool: Pool, resourceLimits: ResourceLimits) {
    this.dbPool = dbPool;
    this.resourceManager = new ResourceManager(resourceLimits);
  }
  
  /**
   * Execute a query execution plan
   */
  public async executeQuery(plan: QueryExecutionPlan, timeoutMs?: number): Promise<QueryResult> {
    const startTime = Date.now();
    const queryId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Register query execution for resource management
    const queryResource: QueryResource = {
      queryId,
      startTime: new Date(),
      memoryUsed: 0,
      cpuTime: 0,
      status: 'running',
      priority: 'normal'
    };
    
    this.activeQueries.set(queryId, queryResource);
    
    try {
      // Check resource limits
      await this.resourceManager.checkLimits();
      
      // Execute with timeout
      const timeout = timeoutMs || 30000; // 30 seconds default
      const result = await Promise.race([
        this.executeInternal(plan, queryResource),
        this.createTimeoutPromise(timeout, queryId)
      ]);
      
      queryResource.status = 'completed';
      this.activeQueries.delete(queryId);
      
      return result;
      
    } catch (error) {
      queryResource.status = 'failed';
      this.activeQueries.delete(queryId);
      
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }
  
  /**
   * Internal query execution logic
   */
  private async executeInternal(plan: QueryExecutionPlan, queryResource: QueryResource): Promise<QueryResult> {
    const performanceMetrics: PerformanceMetrics = {
      parseTime: 0,
      planTime: 0,
      executionTime: 0,
      totalTime: 0,
      memoryUsed: 0,
      ioOperations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    const startTime = Date.now();
    let client: PoolClient | null = null;
    
    try {
      // Get database connection
      client = await this.dbPool.connect();
      
      // Execute SQL query
      const sqlResult = await this.executeSQLQuery(client, plan.optimizedQuery, queryResource);
      
      // Convert to Arrow format for efficient processing
      const arrowTable = await this.convertToArrow(sqlResult);
      
      // Process data using Arrow
      const processedData = await this.processWithArrow(arrowTable, plan);
      
      // Convert back to standard format
      const result = await this.convertFromArrow(processedData, plan);
      
      performanceMetrics.executionTime = Date.now() - startTime;
      performanceMetrics.totalTime = performanceMetrics.executionTime;
      performanceMetrics.memoryUsed = queryResource.memoryUsed;
      
      return {
        id: plan.id,
        query: plan.originalQuery,
        executionTime: performanceMetrics.executionTime,
        totalRows: result.data.length,
        columns: result.columns,
        data: result.data,
        metadata: {
          executionPlan: plan,
          performance: performanceMetrics,
          dataSource: 'live-backend',
          queryHash: plan.cacheKey || ''
        }
      };
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  /**
   * Execute SQL query against database
   */
  private async executeSQLQuery(client: PoolClient, sql: string, queryResource: QueryResource): Promise<any> {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await client.query(sql);
      
      const endTime = process.hrtime.bigint();
      queryResource.cpuTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      return result;
      
    } catch (error) {
      throw new Error(`SQL execution error: ${error.message}`);
    }
  }
  
  /**
   * Convert SQL result to Apache Arrow table
   */
  private async convertToArrow(sqlResult: any): Promise<arrow.Table> {
    const { rows, fields } = sqlResult;
    
    if (!rows || rows.length === 0) {
      return arrow.Table.empty();
    }
    
    // Analyze data types from first few rows
    const columnTypes = this.inferColumnTypes(rows.slice(0, 100), fields);
    
    // Create Arrow schema
    const arrowFields = Object.entries(columnTypes).map(([name, type]) => 
      arrow.Field.new(name, type)
    );
    const schema = new arrow.Schema(arrowFields);
    
    // Create record batches
    const batchSize = 10000; // Process in batches for memory efficiency
    const recordBatches: arrow.RecordBatch[] = [];
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batchRows = rows.slice(i, i + batchSize);
      const recordBatch = this.createRecordBatch(schema, batchRows);
      recordBatches.push(recordBatch);
    }
    
    return new arrow.Table(recordBatches);
  }
  
  /**
   * Infer Arrow data types from SQL result
   */
  private inferColumnTypes(sampleRows: any[], fields: any[]): Record<string, arrow.DataType> {
    const types: Record<string, arrow.DataType> = {};
    
    for (const field of fields) {
      const columnName = field.name;
      
      // Sample values from this column
      const sampleValues = sampleRows.map(row => row[columnName]).filter(val => val != null);
      
      if (sampleValues.length === 0) {
        types[columnName] = new arrow.Utf8(); // Default to string
        continue;
      }
      
      const firstValue = sampleValues[0];
      
      // Infer type based on PostgreSQL type and sample data
      switch (field.dataTypeID) {
        case 23: // INTEGER
        case 21: // SMALLINT
        case 20: // BIGINT
          types[columnName] = new arrow.Int64();
          break;
          
        case 700: // REAL
        case 701: // DOUBLE PRECISION
        case 1700: // NUMERIC
          types[columnName] = new arrow.Float64();
          break;
          
        case 16: // BOOLEAN
          types[columnName] = new arrow.Bool();
          break;
          
        case 1082: // DATE
        case 1083: // TIME
        case 1114: // TIMESTAMP
        case 1184: // TIMESTAMPTZ
          types[columnName] = new arrow.TimestampMillisecond();
          break;
          
        case 114: // JSON
        case 3802: // JSONB
          types[columnName] = new arrow.Utf8(); // Store as string, parse as needed
          break;
          
        default:
          // Default to string for unknown types
          types[columnName] = new arrow.Utf8();
          break;
      }
    }
    
    return types;
  }
  
  /**
   * Create Arrow record batch from rows
   */
  private createRecordBatch(schema: arrow.Schema, rows: any[]): arrow.RecordBatch {
    const columns: Record<string, any[]> = {};
    
    // Initialize columns
    for (const field of schema.fields) {
      columns[field.name] = [];
    }
    
    // Populate column data
    for (const row of rows) {
      for (const field of schema.fields) {
        const value = this.convertValueForArrow(row[field.name], field.type);
        columns[field.name].push(value);
      }
    }
    
    // Create vectors
    const vectors = schema.fields.map(field => {
      const columnData = columns[field.name];
      return this.createArrowVector(field.type, columnData);
    });
    
    return new arrow.RecordBatch(schema, vectors);
  }
  
  /**
   * Convert value for Arrow storage
   */
  private convertValueForArrow(value: any, type: arrow.DataType): any {
    if (value == null) {
      return null;
    }
    
    if (type instanceof arrow.TimestampMillisecond) {
      return new Date(value).getTime();
    }
    
    if (type instanceof arrow.Int64) {
      return parseInt(value, 10);
    }
    
    if (type instanceof arrow.Float64) {
      return parseFloat(value);
    }
    
    if (type instanceof arrow.Bool) {
      return Boolean(value);
    }
    
    // Default to string conversion
    return String(value);
  }
  
  /**
   * Create Arrow vector from data and type
   */
  private createArrowVector(type: arrow.DataType, data: any[]): arrow.Vector {
    if (type instanceof arrow.Int64) {
      return arrow.Vector.from({ type: new arrow.Int64(), values: data });
    }
    
    if (type instanceof arrow.Float64) {
      return arrow.Vector.from({ type: new arrow.Float64(), values: data });
    }
    
    if (type instanceof arrow.Bool) {
      return arrow.Vector.from({ type: new arrow.Bool(), values: data });
    }
    
    if (type instanceof arrow.TimestampMillisecond) {
      return arrow.Vector.from({ type: new arrow.TimestampMillisecond(), values: data });
    }
    
    // Default to UTF8
    return arrow.Vector.from({ type: new arrow.Utf8(), values: data });
  }
  
  /**
   * Process data using Arrow's columnar operations
   */
  private async processWithArrow(table: arrow.Table, plan: QueryExecutionPlan): Promise<arrow.Table> {
    let processedTable = table;
    
    // Apply any additional processing that wasn't handled in SQL
    // This could include complex transformations, calculations, etc.
    
    // Example: Apply additional filters using Arrow
    for (const step of plan.steps) {
      if (step.type === 'filter' && step.parameters) {
        processedTable = this.applyArrowFilter(processedTable, step.parameters);
      }
    }
    
    return processedTable;
  }
  
  /**
   * Apply filter using Arrow operations
   */
  private applyArrowFilter(table: arrow.Table, filterParams: any): arrow.Table {
    // Example Arrow filter implementation
    // This would be expanded based on specific filter requirements
    return table;
  }
  
  /**
   * Convert Arrow table back to standard result format
   */
  private async convertFromArrow(table: arrow.Table, plan: QueryExecutionPlan): Promise<{ columns: ResultColumn[]; data: ResultRow[] }> {
    const columns: ResultColumn[] = table.schema.fields.map(field => ({
      name: field.name,
      type: this.arrowTypeToString(field.type),
      displayName: field.name
    }));
    
    const data: ResultRow[] = [];
    
    // Convert Arrow data to JSON format
    for (let i = 0; i < table.numRows; i++) {
      const row: ResultRow = {};
      
      for (let j = 0; j < table.numCols; j++) {
        const column = table.getColumnAt(j);
        const field = table.schema.fields[j];
        const value = column?.get(i);
        
        row[field.name] = this.convertArrowValue(value, field.type);
      }
      
      data.push(row);
    }
    
    return { columns, data };
  }
  
  /**
   * Convert Arrow data type to string representation
   */
  private arrowTypeToString(type: arrow.DataType): string {
    if (type instanceof arrow.Int64 || type instanceof arrow.Int32) {
      return 'number';
    }
    
    if (type instanceof arrow.Float64 || type instanceof arrow.Float32) {
      return 'number';
    }
    
    if (type instanceof arrow.Bool) {
      return 'boolean';
    }
    
    if (type instanceof arrow.TimestampMillisecond) {
      return 'timestamp';
    }
    
    return 'string';
  }
  
  /**
   * Convert Arrow value to JavaScript value
   */
  private convertArrowValue(value: any, type: arrow.DataType): any {
    if (value == null) {
      return null;
    }
    
    if (type instanceof arrow.TimestampMillisecond) {
      return new Date(value).toISOString();
    }
    
    return value;
  }
  
  /**
   * Create timeout promise for query execution
   */
  private createTimeoutPromise(timeoutMs: number, queryId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const queryResource = this.activeQueries.get(queryId);
        if (queryResource) {
          queryResource.status = 'timeout';
          this.activeQueries.delete(queryId);
        }
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
  
  /**
   * Cancel running query
   */
  public async cancelQuery(queryId: string): Promise<boolean> {
    const queryResource = this.activeQueries.get(queryId);
    
    if (queryResource && queryResource.status === 'running') {
      queryResource.status = 'cancelled';
      this.activeQueries.delete(queryId);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get active queries for monitoring
   */
  public getActiveQueries(): QueryResource[] {
    return Array.from(this.activeQueries.values());
  }
  
  /**
   * Get query statistics
   */
  public getQueryStats(): { totalQueries: number; activeQueries: number; averageExecutionTime: number } {
    return {
      totalQueries: this.activeQueries.size,
      activeQueries: this.activeQueries.size,
      averageExecutionTime: 0 // Would be calculated from historical data
    };
  }
}

/**
 * Resource Manager for query execution limits
 */
class ResourceManager {
  private limits: ResourceLimits;
  private currentMemoryUsage = 0;
  private currentQueryCount = 0;
  
  constructor(limits: ResourceLimits) {
    this.limits = limits;
  }
  
  /**
   * Check if resource limits allow new query execution
   */
  public async checkLimits(): Promise<void> {
    if (this.currentQueryCount >= this.limits.maxConcurrentQueries) {
      throw new Error(`Maximum concurrent queries limit reached: ${this.limits.maxConcurrentQueries}`);
    }
    
    if (this.currentMemoryUsage >= this.limits.maxMemoryUsage * 1024 * 1024) { // Convert MB to bytes
      throw new Error(`Memory usage limit reached: ${this.limits.maxMemoryUsage}MB`);
    }
  }
  
  /**
   * Reserve resources for query execution
   */
  public reserveResources(estimatedMemory: number): void {
    this.currentQueryCount++;
    this.currentMemoryUsage += estimatedMemory;
  }
  
  /**
   * Release resources after query completion
   */
  public releaseResources(usedMemory: number): void {
    this.currentQueryCount = Math.max(0, this.currentQueryCount - 1);
    this.currentMemoryUsage = Math.max(0, this.currentMemoryUsage - usedMemory);
  }
  
  /**
   * Get current resource usage
   */
  public getResourceUsage(): { memoryUsage: number; queryCount: number } {
    return {
      memoryUsage: this.currentMemoryUsage,
      queryCount: this.currentQueryCount
    };
  }
}

export { ExecutionEngine, ResourceManager };