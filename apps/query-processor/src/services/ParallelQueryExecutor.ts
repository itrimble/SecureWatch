// Parallel Query Execution Service for High-Performance Query Processing
// Implements parallel query execution patterns for independent subqueries and data partitioning

import { Pool, PoolClient } from 'pg';
import { Client } from '@opensearch-project/opensearch';
import { logger } from '../utils/logger';
import { QueryJob, QueryResult, QueryColumn } from '../types';
import { QueryCache } from './QueryCache';
import { PerformanceMonitor } from './PerformanceMonitor';

interface ParallelQueryPlan {
  canParallelize: boolean;
  subqueries: ParallelSubquery[];
  mergeStrategy: 'union' | 'intersection' | 'custom';
  estimatedSpeedup: number;
}

interface ParallelSubquery {
  id: string;
  query: string;
  parameters: Record<string, any>;
  timeRange?: { start: string; end: string };
  partition?: DataPartition;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
}

interface DataPartition {
  type: 'time' | 'hash' | 'range';
  field: string;
  segments: PartitionSegment[];
}

interface PartitionSegment {
  id: string;
  condition: string;
  estimatedRows: number;
  estimatedCost: number;
}

interface ParallelExecutionMetrics {
  totalQueries: number;
  parallelQueries: number;
  avgSpeedup: number;
  maxConcurrency: number;
  parallelEfficiency: number;
}

export class ParallelQueryExecutor {
  private pgPool: Pool;
  private opensearchClient: Client;
  private queryCache: QueryCache;
  private performanceMonitor: PerformanceMonitor;
  private maxParallelQueries: number;
  private connectionSemaphore: number[];
  private metrics: ParallelExecutionMetrics;

  constructor(
    pgPool: Pool,
    opensearchClient: Client,
    queryCache: QueryCache,
    performanceMonitor: PerformanceMonitor
  ) {
    this.pgPool = pgPool;
    this.opensearchClient = opensearchClient;
    this.queryCache = queryCache;
    this.performanceMonitor = performanceMonitor;
    
    // Configure parallel execution limits
    this.maxParallelQueries = parseInt(process.env.MAX_PARALLEL_QUERIES || '8');
    this.connectionSemaphore = new Array(this.maxParallelQueries).fill(0);
    
    this.metrics = {
      totalQueries: 0,
      parallelQueries: 0,
      avgSpeedup: 1.0,
      maxConcurrency: 0,
      parallelEfficiency: 0
    };

    logger.info('Parallel Query Executor initialized', {
      maxParallelQueries: this.maxParallelQueries,
      poolSize: this.pgPool.totalCount
    });
  }

  async executeParallel(job: QueryJob): Promise<QueryResult> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Analyze query for parallelization opportunities
      const parallelPlan = await this.createParallelPlan(job);
      
      if (!parallelPlan.canParallelize || parallelPlan.subqueries.length <= 1) {
        logger.debug('Query not suitable for parallelization, executing sequentially', {
          jobId: job.id,
          reason: !parallelPlan.canParallelize ? 'not parallelizable' : 'insufficient subqueries'
        });
        return await this.executeSequential(job);
      }

      this.metrics.parallelQueries++;
      logger.info('Executing query in parallel', {
        jobId: job.id,
        subqueries: parallelPlan.subqueries.length,
        estimatedSpeedup: parallelPlan.estimatedSpeedup
      });

      // Execute subqueries in parallel
      const subqueryResults = await this.executeSubqueriesParallel(parallelPlan.subqueries);
      
      // Merge results according to strategy
      const mergedResult = await this.mergeResults(subqueryResults, parallelPlan.mergeStrategy, job);
      
      // Update performance metrics
      const executionTime = Date.now() - startTime;
      const actualSpeedup = parallelPlan.estimatedSpeedup * (parallelPlan.subqueries.length / Math.max(executionTime / 1000, 1));
      this.updateMetrics(actualSpeedup, parallelPlan.subqueries.length);

      logger.info('Parallel query execution completed', {
        jobId: job.id,
        executionTime,
        actualSpeedup,
        resultRows: mergedResult.total_rows
      });

      return {
        ...mergedResult,
        execution_time_ms: executionTime,
        metadata: {
          ...mergedResult.metadata,
          parallel_execution: true,
          subqueries_count: parallelPlan.subqueries.length,
          actual_speedup: actualSpeedup,
          parallel_efficiency: this.calculateParallelEfficiency(parallelPlan.subqueries.length, actualSpeedup)
        }
      };

    } catch (error) {
      logger.error('Parallel query execution failed:', error, { jobId: job.id });
      throw error;
    }
  }

  private async createParallelPlan(job: QueryJob): Promise<ParallelQueryPlan> {
    const plan: ParallelQueryPlan = {
      canParallelize: false,
      subqueries: [],
      mergeStrategy: 'union',
      estimatedSpeedup: 1.0
    };

    try {
      switch (job.query_type) {
        case 'sql':
          return await this.createSQLParallelPlan(job, plan);
        
        case 'opensearch':
          return await this.createOpenSearchParallelPlan(job, plan);
        
        case 'kql':
          return await this.createKQLParallelPlan(job, plan);
        
        default:
          return plan;
      }
    } catch (error) {
      logger.warn('Failed to create parallel plan:', error);
      return plan;
    }
  }

  private async createSQLParallelPlan(job: QueryJob, plan: ParallelQueryPlan): Promise<ParallelQueryPlan> {
    const query = job.query.toLowerCase();
    
    // Check for parallelizable patterns
    if (this.isJoinQuery(query)) {
      return await this.createJoinParallelPlan(job, plan);
    }
    
    if (this.isAggregationQuery(query)) {
      return await this.createAggregationParallelPlan(job, plan);
    }
    
    if (this.hasTimeRangePartitioning(job)) {
      return await this.createTimePartitionPlan(job, plan);
    }

    return plan;
  }

  private async createTimePartitionPlan(job: QueryJob, plan: ParallelQueryPlan): Promise<ParallelQueryPlan> {
    if (!job.time_range.start || !job.time_range.end) {
      return plan;
    }

    const startTime = new Date(job.time_range.start);
    const endTime = new Date(job.time_range.end);
    const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Only partition if time range is substantial (>2 hours) and query is expensive
    if (totalHours < 2) {
      return plan;
    }

    const partitionCount = Math.min(Math.ceil(totalHours / 2), this.maxParallelQueries);
    const partitionDuration = totalHours / partitionCount;
    
    const subqueries: ParallelSubquery[] = [];
    
    for (let i = 0; i < partitionCount; i++) {
      const partitionStart = new Date(startTime.getTime() + (i * partitionDuration * 60 * 60 * 1000));
      const partitionEnd = new Date(startTime.getTime() + ((i + 1) * partitionDuration * 60 * 60 * 1000));
      
      // Ensure the last partition includes the exact end time
      if (i === partitionCount - 1) {
        partitionEnd.setTime(endTime.getTime());
      }

      const partitionQuery = this.addTimeRangeToQuery(
        job.query,
        partitionStart.toISOString(),
        partitionEnd.toISOString()
      );

      subqueries.push({
        id: `partition_${i}`,
        query: partitionQuery,
        parameters: { ...job.parameters },
        timeRange: {
          start: partitionStart.toISOString(),
          end: partitionEnd.toISOString()
        },
        partition: {
          type: 'time',
          field: 'timestamp',
          segments: [{
            id: `time_segment_${i}`,
            condition: `timestamp >= '${partitionStart.toISOString()}' AND timestamp < '${partitionEnd.toISOString()}'`,
            estimatedRows: 10000, // Could be enhanced with statistics
            estimatedCost: 1000
          }]
        },
        priority: 'medium',
        dependencies: []
      });
    }

    plan.canParallelize = true;
    plan.subqueries = subqueries;
    plan.mergeStrategy = 'union';
    plan.estimatedSpeedup = Math.min(partitionCount * 0.8, this.maxParallelQueries * 0.7); // Account for overhead

    return plan;
  }

  private async createJoinParallelPlan(job: QueryJob, plan: ParallelQueryPlan): Promise<ParallelQueryPlan> {
    // For complex joins, we can potentially parallelize by splitting large tables
    // This is a simplified implementation - real-world would need cost-based analysis
    
    const query = job.query;
    const joinPattern = /JOIN\s+(\w+)/gi;
    const joins = Array.from(query.matchAll(joinPattern));
    
    if (joins.length >= 2) {
      // For multiple joins, we might be able to execute some joins in parallel
      // and then merge results - this would require sophisticated query rewriting
      plan.canParallelize = false; // Conservative approach for now
    }

    return plan;
  }

  private async createAggregationParallelPlan(job: QueryJob, plan: ParallelQueryPlan): Promise<ParallelQueryPlan> {
    const query = job.query.toLowerCase();
    
    // Check if we can parallelize aggregations by partitioning data
    if (query.includes('group by') && this.hasTimeRangePartitioning(job)) {
      // We can partition by time and then aggregate results
      return await this.createTimePartitionPlan(job, plan);
    }

    return plan;
  }

  private async createOpenSearchParallelPlan(job: QueryJob, plan: ParallelQueryPlan): Promise<ParallelQueryPlan> {
    try {
      const queryObj = JSON.parse(job.query);
      
      // Check if we can split by index patterns
      const indexPattern = job.parameters.index || 'logs-*';
      const indices = await this.getMatchingIndices(indexPattern);
      
      if (indices.length > 1 && indices.length <= this.maxParallelQueries) {
        const subqueries: ParallelSubquery[] = indices.map((index, i) => ({
          id: `index_${i}`,
          query: job.query,
          parameters: { ...job.parameters, index },
          timeRange: job.time_range,
          priority: 'medium',
          dependencies: []
        }));

        plan.canParallelize = true;
        plan.subqueries = subqueries;
        plan.mergeStrategy = 'union';
        plan.estimatedSpeedup = Math.min(indices.length * 0.9, this.maxParallelQueries * 0.8);
      }
    } catch (error) {
      logger.warn('Failed to parse OpenSearch query for parallelization:', error);
    }

    return plan;
  }

  private async createKQLParallelPlan(job: QueryJob, plan: ParallelQueryPlan): Promise<ParallelQueryPlan> {
    // KQL queries can be parallelized similar to SQL after conversion
    // For now, delegate to time-based partitioning if applicable
    if (this.hasTimeRangePartitioning(job)) {
      return await this.createTimePartitionPlan(job, plan);
    }
    
    return plan;
  }

  private async executeSubqueriesParallel(subqueries: ParallelSubquery[]): Promise<QueryResult[]> {
    // Sort by priority and dependencies
    const sortedQueries = this.sortByDependencies(subqueries);
    const results: QueryResult[] = [];
    const concurrentQueries: Map<string, Promise<QueryResult>> = new Map();
    
    for (const subquery of sortedQueries) {
      // Wait for dependencies to complete
      await this.waitForDependencies(subquery.dependencies, concurrentQueries);
      
      // Check if we have available slots for parallel execution
      if (concurrentQueries.size >= this.maxParallelQueries) {
        // Wait for at least one query to complete
        const completedQuery = await Promise.race(concurrentQueries.values());
        results.push(completedQuery);
        
        // Remove completed query from tracking
        for (const [id, promise] of concurrentQueries) {
          if (await promise === completedQuery) {
            concurrentQueries.delete(id);
            break;
          }
        }
      }
      
      // Start execution of current subquery
      const queryPromise = this.executeSubquery(subquery);
      concurrentQueries.set(subquery.id, queryPromise);
    }
    
    // Wait for all remaining queries to complete
    const remainingResults = await Promise.all(concurrentQueries.values());
    results.push(...remainingResults);
    
    return results;
  }

  private async executeSubquery(subquery: ParallelSubquery): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Create a mock QueryJob for the subquery
      const subqueryJob: QueryJob = {
        id: `${subquery.id}_${Date.now()}`,
        query: subquery.query,
        query_type: 'sql', // Assuming SQL for now
        parameters: subquery.parameters,
        time_range: subquery.timeRange || { start: '', end: '' },
        created_at: new Date().toISOString(),
        user_id: 'parallel_executor'
      };

      // Execute using appropriate method (simplified - would use actual executors)
      const client = await this.pgPool.connect();
      
      try {
        const result = await client.query(subquery.query, Object.values(subquery.parameters));
        
        const queryResult: QueryResult = {
          job_id: subqueryJob.id,
          data: result.rows,
          total_rows: result.rowCount || 0,
          execution_time_ms: Date.now() - startTime,
          columns: result.fields.map(field => ({
            name: field.name,
            type: 'string', // Simplified
            description: undefined
          })),
          metadata: {
            subquery_id: subquery.id,
            partition: subquery.partition,
            cache_hit: false
          }
        };

        return queryResult;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error(`Subquery ${subquery.id} execution failed:`, error);
      throw error;
    }
  }

  private async mergeResults(
    results: QueryResult[],
    strategy: 'union' | 'intersection' | 'custom',
    originalJob: QueryJob
  ): Promise<QueryResult> {
    if (results.length === 0) {
      throw new Error('No results to merge');
    }

    if (results.length === 1) {
      return results[0];
    }

    switch (strategy) {
      case 'union':
        return this.mergeUnion(results, originalJob);
      
      case 'intersection':
        return this.mergeIntersection(results, originalJob);
      
      case 'custom':
        return this.mergeCustom(results, originalJob);
      
      default:
        return this.mergeUnion(results, originalJob);
    }
  }

  private mergeUnion(results: QueryResult[], originalJob: QueryJob): QueryResult {
    const mergedData: any[] = [];
    let totalRows = 0;
    let totalExecutionTime = 0;
    
    // Use columns from first result
    const columns = results[0].columns;
    
    for (const result of results) {
      mergedData.push(...result.data);
      totalRows += result.total_rows;
      totalExecutionTime = Math.max(totalExecutionTime, result.execution_time_ms || 0);
    }

    return {
      job_id: originalJob.id,
      data: mergedData,
      total_rows: totalRows,
      execution_time_ms: totalExecutionTime,
      columns,
      metadata: {
        merged_results: results.length,
        merge_strategy: 'union',
        cache_hit: false,
        parallel_execution: true
      }
    };
  }

  private mergeIntersection(results: QueryResult[], originalJob: QueryJob): QueryResult {
    // For intersection, we need to find common records
    // This is complex and depends on the specific use case
    // For now, return first result as placeholder
    logger.warn('Intersection merge not fully implemented, returning first result');
    return results[0];
  }

  private mergeCustom(results: QueryResult[], originalJob: QueryJob): QueryResult {
    // Custom merge logic would be application-specific
    // For now, default to union
    return this.mergeUnion(results, originalJob);
  }

  // Helper methods

  private isJoinQuery(query: string): boolean {
    return /\bJOIN\b/i.test(query);
  }

  private isAggregationQuery(query: string): boolean {
    return /\b(GROUP\s+BY|COUNT|SUM|AVG|MAX|MIN)\b/i.test(query);
  }

  private hasTimeRangePartitioning(job: QueryJob): boolean {
    return !!(job.time_range.start && job.time_range.end);
  }

  private addTimeRangeToQuery(query: string, start: string, end: string): string {
    // Simple time range injection - would need more sophisticated parsing in production
    const timeCondition = `timestamp >= '${start}' AND timestamp < '${end}'`;
    
    if (query.toLowerCase().includes('where')) {
      return query.replace(/WHERE/i, `WHERE ${timeCondition} AND`);
    } else {
      return `${query} WHERE ${timeCondition}`;
    }
  }

  private async getMatchingIndices(pattern: string): Promise<string[]> {
    try {
      const response = await this.opensearchClient.cat.indices({
        format: 'json',
        index: pattern
      });
      
      return response.body.map((index: any) => index.index);
    } catch (error) {
      logger.warn('Failed to get matching indices:', error);
      return [pattern]; // Fallback to original pattern
    }
  }

  private sortByDependencies(subqueries: ParallelSubquery[]): ParallelSubquery[] {
    // Simple topological sort based on dependencies
    const sorted: ParallelSubquery[] = [];
    const remaining = [...subqueries];
    
    while (remaining.length > 0) {
      const independent = remaining.filter(sq => 
        sq.dependencies.every(dep => sorted.some(s => s.id === dep))
      );
      
      if (independent.length === 0) {
        // Circular dependency or error - just add remaining
        sorted.push(...remaining);
        break;
      }
      
      sorted.push(...independent);
      remaining.splice(0, remaining.length, ...remaining.filter(sq => !independent.includes(sq)));
    }
    
    return sorted;
  }

  private async waitForDependencies(
    dependencies: string[],
    concurrentQueries: Map<string, Promise<QueryResult>>
  ): Promise<void> {
    const dependencyPromises = dependencies
      .map(dep => concurrentQueries.get(dep))
      .filter(promise => promise !== undefined) as Promise<QueryResult>[];
    
    if (dependencyPromises.length > 0) {
      await Promise.all(dependencyPromises);
    }
  }

  private async executeSequential(job: QueryJob): Promise<QueryResult> {
    // Fallback to sequential execution - would delegate to original executor
    throw new Error('Sequential execution fallback not implemented - should delegate to QueryExecutorService');
  }

  private updateMetrics(speedup: number, concurrency: number): void {
    this.metrics.avgSpeedup = (this.metrics.avgSpeedup * (this.metrics.parallelQueries - 1) + speedup) / this.metrics.parallelQueries;
    this.metrics.maxConcurrency = Math.max(this.metrics.maxConcurrency, concurrency);
    this.metrics.parallelEfficiency = this.metrics.avgSpeedup / this.metrics.maxConcurrency;
  }

  private calculateParallelEfficiency(parallelism: number, speedup: number): number {
    return speedup / parallelism; // Ideal would be 1.0
  }

  getMetrics(): ParallelExecutionMetrics {
    return { ...this.metrics };
  }

  async shutdown(): Promise<void> {
    logger.info('Parallel Query Executor shutting down');
  }
}