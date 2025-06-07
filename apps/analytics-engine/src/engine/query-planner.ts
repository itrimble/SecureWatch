/**
 * KQL Query Planner and Optimizer
 * Converts KQL AST to optimized execution plans and SQL queries
 */

import { 
  KQLNode, 
  QueryExecutionPlan, 
  ExecutionStep, 
  ExecutionStepType,
  TableExpression,
  WhereExpression,
  SummarizeExpression,
  ProjectExpression,
  SortExpression,
  JoinExpression,
  FilterExpression,
  FilterOperator,
  AggregationFunction
} from '../types/kql.types';

export class QueryPlanner {
  private stepIdCounter = 0;
  
  /**
   * Create optimized execution plan from KQL AST
   */
  public createExecutionPlan(ast: KQLNode, schema?: any): QueryExecutionPlan {
    this.stepIdCounter = 0;
    
    const originalQuery = this.astToKQL(ast);
    const optimizedAST = this.optimizeAST(ast);
    const steps = this.generateExecutionSteps(optimizedAST);
    const optimizedQuery = this.generateSQL(optimizedAST);
    
    return {
      id: this.generatePlanId(),
      originalQuery,
      optimizedQuery,
      steps,
      estimatedCost: this.calculateTotalCost(steps),
      estimatedRows: this.estimateResultRows(steps),
      cacheKey: this.generateCacheKey(optimizedQuery)
    };
  }
  
  /**
   * Generate SQL query from KQL AST
   */
  public generateSQL(ast: KQLNode): string {
    const sqlBuilder = new SQLBuilder();
    return sqlBuilder.build(ast);
  }
  
  /**
   * Optimize KQL AST for better performance
   */
  private optimizeAST(ast: KQLNode): KQLNode {
    let optimized = ast;
    
    // Apply optimization strategies
    optimized = this.pushDownFilters(optimized);
    optimized = this.reorderJoins(optimized);
    optimized = this.eliminateRedundantProjections(optimized);
    optimized = this.optimizeAggregations(optimized);
    optimized = this.mergeCompatibleOperations(optimized);
    
    return optimized;
  }
  
  /**
   * Push filter conditions as close to data source as possible
   */
  private pushDownFilters(ast: KQLNode): KQLNode {
    if (ast.type === 'pipeline' && ast.children) {
      const optimizedChildren = [];
      let pendingFilters: WhereExpression[] = [];
      
      for (const child of ast.children) {
        if (child.type === 'where') {
          pendingFilters.push(child as WhereExpression);
        } else if (child.type === 'table') {
          // Apply all pending filters right after table
          optimizedChildren.push(child);
          pendingFilters.forEach(filter => optimizedChildren.push(filter));
          pendingFilters = [];
        } else {
          // For other operations, check if filters can be pushed through
          if (this.canPushFilterThrough(child)) {
            optimizedChildren.push(child);
          } else {
            // Apply pending filters before this operation
            pendingFilters.forEach(filter => optimizedChildren.push(filter));
            pendingFilters = [];
            optimizedChildren.push(child);
          }
        }
      }
      
      // Apply any remaining filters
      pendingFilters.forEach(filter => optimizedChildren.push(filter));
      
      return { ...ast, children: optimizedChildren };
    }
    
    return ast;
  }
  
  /**
   * Reorder joins for better performance
   */
  private reorderJoins(ast: KQLNode): KQLNode {
    // Implement join reordering based on estimated table sizes and selectivity
    // For now, return as-is
    return ast;
  }
  
  /**
   * Eliminate redundant projection operations
   */
  private eliminateRedundantProjections(ast: KQLNode): KQLNode {
    if (ast.type === 'pipeline' && ast.children) {
      const optimizedChildren = [];
      let lastProjection: ProjectExpression | null = null;
      
      for (const child of ast.children) {
        if (child.type === 'project') {
          lastProjection = child as ProjectExpression;
        } else {
          if (lastProjection) {
            optimizedChildren.push(lastProjection);
            lastProjection = null;
          }
          optimizedChildren.push(child);
        }
      }
      
      if (lastProjection) {
        optimizedChildren.push(lastProjection);
      }
      
      return { ...ast, children: optimizedChildren };
    }
    
    return ast;
  }
  
  /**
   * Optimize aggregation operations
   */
  private optimizeAggregations(ast: KQLNode): KQLNode {
    // Implement aggregation optimizations:
    // - Use indexes for GROUP BY columns
    // - Pre-aggregate when possible
    // - Optimize COUNT(*) queries
    return ast;
  }
  
  /**
   * Merge compatible operations
   */
  private mergeCompatibleOperations(ast: KQLNode): KQLNode {
    // Merge consecutive WHERE clauses with AND
    // Combine multiple PROJECT operations
    return ast;
  }
  
  /**
   * Check if filters can be pushed through an operation
   */
  private canPushFilterThrough(operation: KQLNode): boolean {
    // Filters can be pushed through most operations except aggregations
    return !['summarize', 'join'].includes(operation.type);
  }
  
  /**
   * Generate execution steps from optimized AST
   */
  private generateExecutionSteps(ast: KQLNode): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    if (ast.type === 'pipeline' && ast.children) {
      for (const child of ast.children) {
        steps.push(...this.generateStepsForNode(child));
      }
    } else {
      steps.push(...this.generateStepsForNode(ast));
    }
    
    return steps;
  }
  
  /**
   * Generate execution steps for a single AST node
   */
  private generateStepsForNode(node: KQLNode): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    switch (node.type) {
      case 'table':
        steps.push(this.createTableScanStep(node as TableExpression));
        break;
        
      case 'where':
        steps.push(this.createFilterStep(node as WhereExpression));
        break;
        
      case 'summarize':
        steps.push(this.createAggregationStep(node as SummarizeExpression));
        break;
        
      case 'project':
        steps.push(this.createProjectionStep(node as ProjectExpression));
        break;
        
      case 'sort':
        steps.push(this.createSortStep(node as SortExpression));
        break;
        
      case 'join':
        steps.push(this.createJoinStep(node as JoinExpression));
        break;
        
      default:
        steps.push(this.createGenericStep(node));
        break;
    }
    
    return steps;
  }
  
  /**
   * Create table scan execution step
   */
  private createTableScanStep(node: TableExpression): ExecutionStep {
    return {
      id: this.generateStepId(),
      type: 'table_scan',
      description: `Scan table: ${node.tableName}`,
      sql: `SELECT * FROM ${this.escapeIdentifier(node.tableName)}`,
      estimatedCost: 100, // Base cost for table scan
      estimatedRows: 10000, // Estimated based on table statistics
      dependencies: []
    };
  }
  
  /**
   * Create filter execution step
   */
  private createFilterStep(node: WhereExpression): ExecutionStep {
    const sqlCondition = this.filterToSQL(node.condition);
    
    return {
      id: this.generateStepId(),
      type: 'filter',
      description: `Apply filter: ${sqlCondition}`,
      sql: `WHERE ${sqlCondition}`,
      estimatedCost: 50,
      estimatedRows: 1000, // Estimated after filtering
      dependencies: []
    };
  }
  
  /**
   * Create aggregation execution step
   */
  private createAggregationStep(node: SummarizeExpression): ExecutionStep {
    const aggregations = node.aggregations.map(agg => 
      `${agg.function}(${agg.column})${agg.alias ? ` AS ${agg.alias}` : ''}`
    ).join(', ');
    
    const groupBy = node.groupBy ? ` GROUP BY ${node.groupBy.join(', ')}` : '';
    
    return {
      id: this.generateStepId(),
      type: 'aggregation',
      description: `Aggregate: ${aggregations}${groupBy}`,
      sql: `SELECT ${aggregations}${groupBy}`,
      estimatedCost: 200,
      estimatedRows: 100, // Aggregation typically reduces rows
      dependencies: []
    };
  }
  
  /**
   * Create projection execution step
   */
  private createProjectionStep(node: ProjectExpression): ExecutionStep {
    const columns = node.columns.map(col => 
      `${col.name}${col.alias ? ` AS ${col.alias}` : ''}`
    ).join(', ');
    
    return {
      id: this.generateStepId(),
      type: 'projection',
      description: `Project columns: ${columns}`,
      sql: `SELECT ${columns}`,
      estimatedCost: 25,
      estimatedRows: 1000, // Projection doesn't change row count
      dependencies: []
    };
  }
  
  /**
   * Create sort execution step
   */
  private createSortStep(node: SortExpression): ExecutionStep {
    const orderBy = node.columns.map(col => 
      `${col.name} ${col.direction.toUpperCase()}`
    ).join(', ');
    
    return {
      id: this.generateStepId(),
      type: 'sort',
      description: `Sort by: ${orderBy}`,
      sql: `ORDER BY ${orderBy}`,
      estimatedCost: 150,
      estimatedRows: 1000,
      dependencies: []
    };
  }
  
  /**
   * Create join execution step
   */
  private createJoinStep(node: JoinExpression): ExecutionStep {
    const joinCondition = this.filterToSQL(node.onCondition);
    
    return {
      id: this.generateStepId(),
      type: 'join',
      description: `${node.joinType.toUpperCase()} JOIN on: ${joinCondition}`,
      sql: `${node.joinType.toUpperCase()} JOIN ${node.rightTable.tableName} ON ${joinCondition}`,
      estimatedCost: 300,
      estimatedRows: 2000,
      dependencies: []
    };
  }
  
  /**
   * Create generic execution step
   */
  private createGenericStep(node: KQLNode): ExecutionStep {
    return {
      id: this.generateStepId(),
      type: 'filter', // Default type
      description: `Execute: ${node.type}`,
      estimatedCost: 50,
      estimatedRows: 1000,
      dependencies: []
    };
  }
  
  /**
   * Convert filter expression to SQL
   */
  private filterToSQL(filter: FilterExpression): string {
    const left = this.nodeToSQL(filter.left);
    const right = this.nodeToSQL(filter.right);
    
    switch (filter.operator) {
      case 'eq': return `${left} = ${right}`;
      case 'neq': return `${left} != ${right}`;
      case 'lt': return `${left} < ${right}`;
      case 'lte': return `${left} <= ${right}`;
      case 'gt': return `${left} > ${right}`;
      case 'gte': return `${left} >= ${right}`;
      case 'contains': return `${left} ILIKE '%' || ${right} || '%'`;
      case 'startswith': return `${left} ILIKE ${right} || '%'`;
      case 'endswith': return `${left} ILIKE '%' || ${right}`;
      case 'matches': return `${left} ~ ${right}`;
      case 'in': return `${left} IN (${right})`;
      case 'not_in': return `${left} NOT IN (${right})`;
      case 'is_null': return `${left} IS NULL`;
      case 'is_not_null': return `${left} IS NOT NULL`;
      case 'and': return `(${left}) AND (${right})`;
      case 'or': return `(${left}) OR (${right})`;
      case 'not': return `NOT (${left})`;
      default: return `${left} = ${right}`;
    }
  }
  
  /**
   * Convert AST node to SQL fragment
   */
  private nodeToSQL(node: KQLNode): string {
    switch (node.type) {
      case 'column':
        return this.escapeIdentifier(node.value);
      case 'literal':
        return typeof node.value === 'string' ? `'${node.value.replace(/'/g, "''")}'` : String(node.value);
      case 'filter':
        return this.filterToSQL(node as FilterExpression);
      default:
        return String(node.value || '');
    }
  }
  
  /**
   * Escape SQL identifier
   */
  private escapeIdentifier(identifier: string): string {
    return `\"${identifier.replace(/\"/g, '\"\"')}\"`;
  }
  
  /**
   * Calculate total cost of execution plan
   */
  private calculateTotalCost(steps: ExecutionStep[]): number {
    return steps.reduce((total, step) => total + step.estimatedCost, 0);
  }
  
  /**
   * Estimate final result row count
   */
  private estimateResultRows(steps: ExecutionStep[]): number {
    return steps.length > 0 ? steps[steps.length - 1].estimatedRows : 0;
  }
  
  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `query_${Math.abs(hash)}`;
  }
  
  /**
   * Generate unique execution plan ID
   */
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate unique step ID
   */
  private generateStepId(): string {
    return `step_${++this.stepIdCounter}`;
  }
  
  /**
   * Convert AST back to KQL string (for debugging)
   */
  private astToKQL(ast: KQLNode): string {
    // Simplified AST to KQL conversion for debugging purposes
    switch (ast.type) {
      case 'table':
        return (ast as TableExpression).tableName;
      case 'pipeline':
        return ast.children?.map(child => this.astToKQL(child)).join(' | ') || '';
      case 'where':
        return `where ${this.filterToKQL((ast as WhereExpression).condition)}`;
      case 'summarize':
        const sumNode = ast as SummarizeExpression;
        const aggs = sumNode.aggregations.map(agg => 
          `${agg.function}(${agg.column})${agg.alias ? ` as ${agg.alias}` : ''}`
        ).join(', ');
        const groupBy = sumNode.groupBy ? ` by ${sumNode.groupBy.join(', ')}` : '';
        return `summarize ${aggs}${groupBy}`;
      case 'project':
        const projCols = (ast as ProjectExpression).columns.map(col => 
          `${col.name}${col.alias ? ` as ${col.alias}` : ''}`
        ).join(', ');
        return `project ${projCols}`;
      default:
        return ast.type;
    }
  }
  
  /**
   * Convert filter expression to KQL string
   */
  private filterToKQL(filter: FilterExpression): string {
    const left = this.nodeToKQL(filter.left);
    const right = this.nodeToKQL(filter.right);
    
    switch (filter.operator) {
      case 'eq': return `${left} == ${right}`;
      case 'neq': return `${left} != ${right}`;
      case 'lt': return `${left} < ${right}`;
      case 'lte': return `${left} <= ${right}`;
      case 'gt': return `${left} > ${right}`;
      case 'gte': return `${left} >= ${right}`;
      case 'contains': return `${left} contains ${right}`;
      case 'startswith': return `${left} startswith ${right}`;
      case 'endswith': return `${left} endswith ${right}`;
      case 'matches': return `${left} matches regex ${right}`;
      case 'and': return `(${left}) and (${right})`;
      case 'or': return `(${left}) or (${right})`;
      case 'not': return `not (${left})`;
      default: return `${left} == ${right}`;
    }
  }
  
  /**
   * Convert AST node to KQL fragment
   */
  private nodeToKQL(node: KQLNode): string {
    switch (node.type) {
      case 'column':
        return node.value;
      case 'literal':
        return typeof node.value === 'string' ? `\"${node.value}\"` : String(node.value);
      case 'filter':
        return this.filterToKQL(node as FilterExpression);
      default:
        return String(node.value || '');
    }
  }
}

/**
 * SQL Builder for converting KQL AST to SQL
 */
class SQLBuilder {
  public build(ast: KQLNode): string {
    if (ast.type === 'pipeline' && ast.children) {
      return this.buildPipeline(ast.children);
    }
    
    return this.buildSingleOperation(ast);
  }
  
  private buildPipeline(nodes: KQLNode[]): string {
    let sql = '';
    let hasTable = false;
    let selectClauses: string[] = [];
    let fromClause = '';
    let whereClause = '';
    let groupByClause = '';
    let orderByClause = '';
    let limitClause = '';
    
    for (const node of nodes) {
      switch (node.type) {
        case 'table':
          fromClause = `FROM ${this.escapeIdentifier((node as TableExpression).tableName)}`;
          hasTable = true;
          if (selectClauses.length === 0) {
            selectClauses.push('*');
          }
          break;
          
        case 'where':
          const filter = (node as WhereExpression).condition;
          whereClause = `WHERE ${this.filterToSQL(filter)}`;
          break;
          
        case 'project':
          const projNode = node as ProjectExpression;
          selectClauses = projNode.columns.map(col => 
            `${this.escapeIdentifier(col.name)}${col.alias ? ` AS ${this.escapeIdentifier(col.alias)}` : ''}`
          );
          break;
          
        case 'summarize':
          const sumNode = node as SummarizeExpression;
          selectClauses = sumNode.aggregations.map(agg => 
            `${agg.function.toUpperCase()}(${agg.column === '*' ? '*' : this.escapeIdentifier(agg.column)})${agg.alias ? ` AS ${this.escapeIdentifier(agg.alias)}` : ''}`
          );
          if (sumNode.groupBy && sumNode.groupBy.length > 0) {
            groupByClause = `GROUP BY ${sumNode.groupBy.map(col => this.escapeIdentifier(col)).join(', ')}`;
            // Add group by columns to select if not already present
            sumNode.groupBy.forEach(col => {
              if (!selectClauses.some(clause => clause.includes(col))) {
                selectClauses.unshift(this.escapeIdentifier(col));
              }
            });
          }
          break;
          
        case 'sort':
          const sortNode = node as SortExpression;
          orderByClause = `ORDER BY ${sortNode.columns.map(col => 
            `${this.escapeIdentifier(col.name)} ${col.direction.toUpperCase()}`
          ).join(', ')}`;
          break;
          
        case 'top':
          const topNode = node as any; // TopExpression
          limitClause = `LIMIT ${topNode.count}`;
          if (topNode.columns && topNode.columns.length > 0) {
            orderByClause = `ORDER BY ${topNode.columns.map((col: any) => 
              `${this.escapeIdentifier(col.name)} ${col.direction.toUpperCase()}`
            ).join(', ')}`;
          }
          break;
      }
    }
    
    // Build final SQL
    if (hasTable) {
      const parts = [
        `SELECT ${selectClauses.join(', ')}`,
        fromClause,
        whereClause,
        groupByClause,
        orderByClause,
        limitClause
      ].filter(part => part.length > 0);
      
      sql = parts.join('\n');
    }
    
    return sql;
  }
  
  private buildSingleOperation(node: KQLNode): string {
    // Handle single operation nodes
    switch (node.type) {
      case 'table':
        return `SELECT * FROM ${this.escapeIdentifier((node as TableExpression).tableName)}`;
      default:
        return 'SELECT 1'; // Fallback
    }
  }
  
  private filterToSQL(filter: FilterExpression): string {
    const planner = new QueryPlanner();
    return (planner as any).filterToSQL(filter);
  }
  
  private escapeIdentifier(identifier: string): string {
    return `\"${identifier.replace(/\"/g, '\"\"')}\"`;
  }
}