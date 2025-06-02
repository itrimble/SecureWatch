import {
  Query, TableExpression, Operation, Expression, WhereOperation,
  ProjectOperation, ExtendOperation, SummarizeOperation, OrderOperation,
  BinaryExpression, Identifier, Literal
} from '../parser/ast';
import { QueryOptimization, OptimizationType, ExecutionPlan, ExecutionStep } from './types';

export class QueryOptimizer {
  private optimizations: QueryOptimization[] = [];

  optimize(query: Query): { optimizedQuery: Query; plan: ExecutionPlan } {
    this.optimizations = [];
    
    let optimizedQuery = { ...query };
    
    // Apply optimizations in order of effectiveness
    optimizedQuery = this.applyPredicatePushdown(optimizedQuery);
    optimizedQuery = this.applyProjectionPushdown(optimizedQuery);
    optimizedQuery = this.applyConstantFolding(optimizedQuery);
    optimizedQuery = this.applyDeadCodeElimination(optimizedQuery);
    optimizedQuery = this.reorderOperations(optimizedQuery);

    const plan = this.generateExecutionPlan(optimizedQuery);
    
    return { optimizedQuery, plan };
  }

  private applyPredicatePushdown(query: Query): Query {
    // Move WHERE conditions as early as possible in the pipeline
    const whereOperations: WhereOperation[] = [];
    const otherOperations: Operation[] = [];

    // Collect all WHERE operations
    for (const operation of query.operations) {
      if (operation.type === 'WhereOperation') {
        whereOperations.push(operation);
      } else {
        otherOperations.push(operation);
      }
    }

    if (whereOperations.length > 1) {
      // Combine multiple WHERE conditions with AND
      const combinedPredicate = this.combinePredicates(whereOperations.map(op => op.predicate));
      const combinedWhere: WhereOperation = {
        type: 'WhereOperation',
        predicate: combinedPredicate
      };

      this.optimizations.push({
        type: OptimizationType.PREDICATE_PUSHDOWN,
        description: `Combined ${whereOperations.length} WHERE conditions`,
        estimatedImprovement: whereOperations.length * 0.1,
        applied: true
      });

      return {
        ...query,
        operations: [combinedWhere, ...otherOperations]
      };
    }

    return query;
  }

  private applyProjectionPushdown(query: Query): Query {
    // Move PROJECT operations earlier to reduce data size
    const projectOperations: ProjectOperation[] = [];
    const otherOperations: Operation[] = [];

    for (const operation of query.operations) {
      if (operation.type === 'ProjectOperation') {
        projectOperations.push(operation);
      } else {
        otherOperations.push(operation);
      }
    }

    if (projectOperations.length > 0) {
      // Find the last PROJECT operation (it determines final columns)
      const lastProject = projectOperations[projectOperations.length - 1];
      
      // Check if we can move it earlier
      const canMoveEarlier = this.canMoveProjectionEarlier(lastProject, otherOperations);
      
      if (canMoveEarlier) {
        this.optimizations.push({
          type: OptimizationType.PROJECTION_PUSHDOWN,
          description: 'Moved projection earlier in pipeline',
          estimatedImprovement: 0.2,
          applied: true
        });

        // Move project operation earlier
        const whereOps = otherOperations.filter(op => op.type === 'WhereOperation');
        const nonWhereOps = otherOperations.filter(op => op.type !== 'WhereOperation');

        return {
          ...query,
          operations: [...whereOps, lastProject, ...nonWhereOps]
        };
      }
    }

    return query;
  }

  private applyConstantFolding(query: Query): Query {
    // Fold constant expressions at compile time
    const foldedQuery = this.foldConstants(query);
    
    if (foldedQuery !== query) {
      this.optimizations.push({
        type: OptimizationType.CONSTANT_FOLDING,
        description: 'Folded constant expressions',
        estimatedImprovement: 0.05,
        applied: true
      });
    }

    return foldedQuery;
  }

  private applyDeadCodeElimination(query: Query): Query {
    // Remove unused columns and operations
    const usedColumns = this.findUsedColumns(query);
    const eliminatedQuery = this.eliminateDeadCode(query, usedColumns);

    if (eliminatedQuery !== query) {
      this.optimizations.push({
        type: OptimizationType.DEAD_CODE_ELIMINATION,
        description: 'Eliminated unused columns and operations',
        estimatedImprovement: 0.1,
        applied: true
      });
    }

    return eliminatedQuery;
  }

  private reorderOperations(query: Query): Query {
    // Reorder operations for optimal performance
    const reorderedOperations = [...query.operations];
    
    // Sort by operation cost (cheaper operations first)
    reorderedOperations.sort((a, b) => {
      const costA = this.getOperationCost(a);
      const costB = this.getOperationCost(b);
      return costA - costB;
    });

    // Ensure WHERE operations come before projections and summarizations
    const whereOps = reorderedOperations.filter(op => op.type === 'WhereOperation');
    const projectOps = reorderedOperations.filter(op => op.type === 'ProjectOperation');
    const otherOps = reorderedOperations.filter(op => 
      op.type !== 'WhereOperation' && op.type !== 'ProjectOperation'
    );

    const finalOrder = [...whereOps, ...projectOps, ...otherOps];

    if (JSON.stringify(finalOrder) !== JSON.stringify(query.operations)) {
      this.optimizations.push({
        type: OptimizationType.JOIN_REORDER,
        description: 'Reordered operations for better performance',
        estimatedImprovement: 0.15,
        applied: true
      });

      return {
        ...query,
        operations: finalOrder
      };
    }

    return query;
  }

  private combinePredicates(predicates: Expression[]): Expression {
    if (predicates.length === 1) {
      return predicates[0];
    }

    return predicates.reduce((combined, predicate) => ({
      type: 'BinaryExpression',
      operator: 'and',
      left: combined,
      right: predicate
    }));
  }

  private canMoveProjectionEarlier(project: ProjectOperation, operations: Operation[]): boolean {
    // Check if projection can be moved earlier without affecting results
    const projectColumns = project.columns.map(col => {
      if (col.expression.type === 'Identifier') {
        return col.expression.name;
      }
      return null;
    }).filter(Boolean);

    // Check if any operation depends on columns not in the projection
    for (const operation of operations) {
      const usedColumns = this.getOperationColumns(operation);
      const hasUnprojectedColumns = usedColumns.some(col => !projectColumns.includes(col));
      
      if (hasUnprojectedColumns) {
        return false;
      }
    }

    return true;
  }

  private foldConstants(query: Query): Query {
    // Recursively fold constant expressions
    return {
      ...query,
      operations: query.operations.map(op => this.foldOperationConstants(op))
    };
  }

  private foldOperationConstants(operation: Operation): Operation {
    switch (operation.type) {
      case 'WhereOperation':
        return {
          ...operation,
          predicate: this.foldExpressionConstants(operation.predicate)
        };
      case 'ProjectOperation':
        return {
          ...operation,
          columns: operation.columns.map(col => ({
            ...col,
            expression: this.foldExpressionConstants(col.expression)
          }))
        };
      case 'ExtendOperation':
        return {
          ...operation,
          assignments: operation.assignments.map(assignment => ({
            ...assignment,
            expression: this.foldExpressionConstants(assignment.expression)
          }))
        };
      default:
        return operation;
    }
  }

  private foldExpressionConstants(expression: Expression): Expression {
    if (expression.type === 'BinaryExpression') {
      const left = this.foldExpressionConstants(expression.left);
      const right = this.foldExpressionConstants(expression.right);

      // If both operands are literals, fold the expression
      if (left.type === 'Literal' && right.type === 'Literal') {
        return this.evaluateBinaryExpression(expression.operator, left, right);
      }

      return {
        ...expression,
        left,
        right
      };
    }

    return expression;
  }

  private evaluateBinaryExpression(operator: string, left: Literal, right: Literal): Literal {
    const leftVal = left.value;
    const rightVal = right.value;

    switch (operator) {
      case '+':
        return { type: 'Literal', value: leftVal + rightVal, dataType: 'number' };
      case '-':
        return { type: 'Literal', value: leftVal - rightVal, dataType: 'number' };
      case '*':
        return { type: 'Literal', value: leftVal * rightVal, dataType: 'number' };
      case '/':
        return { type: 'Literal', value: leftVal / rightVal, dataType: 'number' };
      case '==':
        return { type: 'Literal', value: leftVal === rightVal, dataType: 'boolean' };
      case '!=':
        return { type: 'Literal', value: leftVal !== rightVal, dataType: 'boolean' };
      case '<':
        return { type: 'Literal', value: leftVal < rightVal, dataType: 'boolean' };
      case '<=':
        return { type: 'Literal', value: leftVal <= rightVal, dataType: 'boolean' };
      case '>':
        return { type: 'Literal', value: leftVal > rightVal, dataType: 'boolean' };
      case '>=':
        return { type: 'Literal', value: leftVal >= rightVal, dataType: 'boolean' };
      default:
        return left; // Return original if can't fold
    }
  }

  private findUsedColumns(query: Query): Set<string> {
    const usedColumns = new Set<string>();
    
    // Add columns from table expression
    usedColumns.add('*'); // Start with all columns
    
    // Find columns used in operations
    for (const operation of query.operations) {
      const operationColumns = this.getOperationColumns(operation);
      operationColumns.forEach(col => usedColumns.add(col));
    }
    
    return usedColumns;
  }

  private getOperationColumns(operation: Operation): string[] {
    const columns: string[] = [];
    
    switch (operation.type) {
      case 'WhereOperation':
        columns.push(...this.getExpressionColumns(operation.predicate));
        break;
      case 'ProjectOperation':
        operation.columns.forEach(col => {
          columns.push(...this.getExpressionColumns(col.expression));
        });
        break;
      case 'ExtendOperation':
        operation.assignments.forEach(assignment => {
          columns.push(...this.getExpressionColumns(assignment.expression));
        });
        break;
      case 'SummarizeOperation':
        operation.aggregations.forEach(agg => {
          if (agg.expression) {
            columns.push(...this.getExpressionColumns(agg.expression));
          }
        });
        if (operation.by) {
          operation.by.forEach(expr => {
            columns.push(...this.getExpressionColumns(expr));
          });
        }
        break;
      case 'OrderOperation':
        operation.orderBy.forEach(orderBy => {
          columns.push(...this.getExpressionColumns(orderBy.expression));
        });
        break;
    }
    
    return columns;
  }

  private getExpressionColumns(expression: Expression): string[] {
    const columns: string[] = [];
    
    switch (expression.type) {
      case 'Identifier':
        columns.push(expression.name);
        break;
      case 'BinaryExpression':
        columns.push(...this.getExpressionColumns(expression.left));
        columns.push(...this.getExpressionColumns(expression.right));
        break;
      case 'UnaryExpression':
        columns.push(...this.getExpressionColumns(expression.operand));
        break;
      case 'CallExpression':
        expression.arguments.forEach(arg => {
          columns.push(...this.getExpressionColumns(arg));
        });
        break;
      case 'MemberExpression':
        columns.push(...this.getExpressionColumns(expression.object));
        if (expression.computed) {
          columns.push(...this.getExpressionColumns(expression.property));
        }
        break;
    }
    
    return columns;
  }

  private eliminateDeadCode(query: Query, usedColumns: Set<string>): Query {
    // For now, return the query as-is
    // In a full implementation, this would remove unused projections and operations
    return query;
  }

  private getOperationCost(operation: Operation): number {
    // Assign relative costs to operations
    switch (operation.type) {
      case 'WhereOperation': return 1;
      case 'ProjectOperation': return 2;
      case 'ExtendOperation': return 3;
      case 'OrderOperation': return 8;
      case 'TopOperation': return 6;
      case 'LimitOperation': return 1;
      case 'DistinctOperation': return 7;
      case 'SummarizeOperation': return 9;
      case 'JoinOperation': return 10;
      case 'UnionOperation': return 5;
      default: return 5;
    }
  }

  private generateExecutionPlan(query: Query): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    let currentRows = 1000000; // Estimated starting rows
    let totalCost = 0;

    // Table scan step
    steps.push({
      operation: 'TableScan',
      description: `Scan table: ${query.tableExpression.name}`,
      estimatedRows: currentRows,
      estimatedCost: 10,
      index: 0
    });
    totalCost += 10;

    // Operation steps
    query.operations.forEach((operation, index) => {
      const step = this.createExecutionStep(operation, currentRows, index + 1);
      steps.push(step);
      currentRows = step.estimatedRows;
      totalCost += step.estimatedCost;
    });

    return {
      steps,
      estimatedCost: totalCost,
      optimizations: this.optimizations.filter(opt => opt.applied).map(opt => opt.description)
    };
  }

  private createExecutionStep(operation: Operation, inputRows: number, index: number): ExecutionStep {
    let estimatedRows = inputRows;
    let estimatedCost = 0;
    let description = '';

    switch (operation.type) {
      case 'WhereOperation':
        estimatedRows = Math.floor(inputRows * 0.1); // Assume 10% selectivity
        estimatedCost = inputRows * 0.001;
        description = 'Filter rows with WHERE condition';
        break;
      case 'ProjectOperation':
        // Rows stay the same, but cost is minimal
        estimatedCost = inputRows * 0.0001;
        description = `Project ${operation.columns.length} columns`;
        break;
      case 'SummarizeOperation':
        estimatedRows = Math.floor(inputRows * 0.01); // Assume 1% unique groups
        estimatedCost = inputRows * 0.01;
        description = `Summarize with ${operation.aggregations.length} aggregations`;
        break;
      case 'OrderOperation':
        estimatedCost = inputRows * Math.log2(inputRows) * 0.001;
        description = `Sort by ${operation.orderBy.length} columns`;
        break;
      case 'TopOperation':
        estimatedRows = Math.min(inputRows, 1000); // Assume top 1000
        estimatedCost = inputRows * Math.log2(inputRows) * 0.001;
        description = 'Take top N rows';
        break;
      case 'LimitOperation':
        estimatedRows = Math.min(inputRows, 1000); // Assume limit 1000
        estimatedCost = 1;
        description = 'Limit result set';
        break;
      case 'DistinctOperation':
        estimatedRows = Math.floor(inputRows * 0.8); // Assume 80% unique
        estimatedCost = inputRows * 0.01;
        description = 'Remove duplicate rows';
        break;
      default:
        estimatedCost = inputRows * 0.001;
        description = `Execute ${operation.type}`;
    }

    return {
      operation: operation.type,
      description,
      estimatedRows,
      estimatedCost,
      index
    };
  }

  getOptimizations(): QueryOptimization[] {
    return this.optimizations;
  }
}