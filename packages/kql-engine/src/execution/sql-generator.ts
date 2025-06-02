import {
  Query, TableExpression, Operation, Expression, WhereOperation,
  ProjectOperation, ExtendOperation, SummarizeOperation, OrderOperation,
  TopOperation, LimitOperation, DistinctOperation, JoinOperation,
  BinaryExpression, UnaryExpression, CallExpression, MemberExpression,
  Identifier, Literal, OrderByExpression, Aggregation, Assignment,
  ProjectColumn, BinaryOperator, UnaryOperator
} from '../parser/ast';

export class SQLGenerator {
  private organizationId: string;
  private aliases: Map<string, string> = new Map();
  private parameterIndex = 1;
  private parameters: any[] = [];

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  generateSQL(query: Query): { sql: string; parameters: any[] } {
    this.aliases.clear();
    this.parameterIndex = 1;
    this.parameters = [];

    const sql = this.visitQuery(query);
    return { sql, parameters: this.parameters };
  }

  private visitQuery(query: Query): string {
    let sql = this.visitTableExpression(query.tableExpression);

    for (const operation of query.operations) {
      sql = this.visitOperation(sql, operation);
    }

    return sql;
  }

  private visitTableExpression(table: TableExpression): string {
    const tableName = this.escapeIdentifier(table.name);
    let sql = `SELECT * FROM ${tableName}`;
    
    // Add organization filter
    sql += ` WHERE organization_id = $${this.parameterIndex++}`;
    this.parameters.push(this.organizationId);

    if (table.alias) {
      this.aliases.set(table.name, table.alias);
      sql += ` AS ${this.escapeIdentifier(table.alias)}`;
    }

    return `(${sql})`;
  }

  private visitOperation(baseSql: string, operation: Operation): string {
    switch (operation.type) {
      case 'WhereOperation':
        return this.visitWhereOperation(baseSql, operation);
      case 'ProjectOperation':
        return this.visitProjectOperation(baseSql, operation);
      case 'ExtendOperation':
        return this.visitExtendOperation(baseSql, operation);
      case 'SummarizeOperation':
        return this.visitSummarizeOperation(baseSql, operation);
      case 'OrderOperation':
        return this.visitOrderOperation(baseSql, operation);
      case 'TopOperation':
        return this.visitTopOperation(baseSql, operation);
      case 'LimitOperation':
        return this.visitLimitOperation(baseSql, operation);
      case 'DistinctOperation':
        return this.visitDistinctOperation(baseSql, operation);
      case 'JoinOperation':
        return this.visitJoinOperation(baseSql, operation);
      default:
        throw new Error(`Unsupported operation: ${(operation as any).type}`);
    }
  }

  private visitWhereOperation(baseSql: string, operation: WhereOperation): string {
    const condition = this.visitExpression(operation.predicate);
    return `SELECT * FROM (${baseSql}) base WHERE ${condition}`;
  }

  private visitProjectOperation(baseSql: string, operation: ProjectOperation): string {
    const columns = operation.columns.map(col => this.visitProjectColumn(col)).join(', ');
    return `SELECT ${columns} FROM (${baseSql}) base`;
  }

  private visitProjectColumn(column: ProjectColumn): string {
    const expr = this.visitExpression(column.expression);
    if (column.alias) {
      return `${expr} AS ${this.escapeIdentifier(column.alias)}`;
    }
    return expr;
  }

  private visitExtendOperation(baseSql: string, operation: ExtendOperation): string {
    const baseColumns = 'base.*';
    const extensions = operation.assignments.map(assignment => {
      const expr = this.visitExpression(assignment.expression);
      return `${expr} AS ${this.escapeIdentifier(assignment.name)}`;
    }).join(', ');

    return `SELECT ${baseColumns}, ${extensions} FROM (${baseSql}) base`;
  }

  private visitSummarizeOperation(baseSql: string, operation: SummarizeOperation): string {
    const aggregations = operation.aggregations.map(agg => this.visitAggregation(agg)).join(', ');
    
    let sql = `SELECT ${aggregations}`;
    
    if (operation.by && operation.by.length > 0) {
      const groupBy = operation.by.map(expr => this.visitExpression(expr)).join(', ');
      sql += `, ${groupBy}`;
      sql += ` FROM (${baseSql}) base GROUP BY ${groupBy}`;
    } else {
      sql += ` FROM (${baseSql}) base`;
    }

    return sql;
  }

  private visitAggregation(aggregation: Aggregation): string {
    let sql = '';
    
    switch (aggregation.function) {
      case 'count':
        if (aggregation.expression) {
          sql = `COUNT(${this.visitExpression(aggregation.expression)})`;
        } else {
          sql = 'COUNT(*)';
        }
        break;
      case 'sum':
        sql = `SUM(${this.visitExpression(aggregation.expression!)})`;
        break;
      case 'avg':
        sql = `AVG(${this.visitExpression(aggregation.expression!)})`;
        break;
      case 'min':
        sql = `MIN(${this.visitExpression(aggregation.expression!)})`;
        break;
      case 'max':
        sql = `MAX(${this.visitExpression(aggregation.expression!)})`;
        break;
      case 'dcount':
        sql = `COUNT(DISTINCT ${this.visitExpression(aggregation.expression!)})`;
        break;
      default:
        throw new Error(`Unsupported aggregation function: ${aggregation.function}`);
    }

    if (aggregation.alias) {
      sql += ` AS ${this.escapeIdentifier(aggregation.alias)}`;
    }

    return sql;
  }

  private visitOrderOperation(baseSql: string, operation: OrderOperation): string {
    const orderBy = operation.orderBy.map(expr => this.visitOrderByExpression(expr)).join(', ');
    return `SELECT * FROM (${baseSql}) base ORDER BY ${orderBy}`;
  }

  private visitOrderByExpression(orderBy: OrderByExpression): string {
    const expr = this.visitExpression(orderBy.expression);
    return `${expr} ${orderBy.direction.toUpperCase()}`;
  }

  private visitTopOperation(baseSql: string, operation: TopOperation): string {
    const limit = this.visitExpression(operation.count);
    let sql = `SELECT * FROM (${baseSql}) base`;

    if (operation.by && operation.by.length > 0) {
      const orderBy = operation.by.map(expr => this.visitOrderByExpression(expr)).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    sql += ` LIMIT ${limit}`;
    return sql;
  }

  private visitLimitOperation(baseSql: string, operation: LimitOperation): string {
    const limit = this.visitExpression(operation.count);
    return `SELECT * FROM (${baseSql}) base LIMIT ${limit}`;
  }

  private visitDistinctOperation(baseSql: string, operation: DistinctOperation): string {
    if (operation.columns && operation.columns.length > 0) {
      const columns = operation.columns.map(col => this.visitExpression(col)).join(', ');
      return `SELECT DISTINCT ${columns} FROM (${baseSql}) base`;
    } else {
      return `SELECT DISTINCT * FROM (${baseSql}) base`;
    }
  }

  private visitJoinOperation(baseSql: string, operation: JoinOperation): string {
    const joinType = this.mapJoinKind(operation.joinKind);
    const rightTable = this.visitTableExpression(operation.table);
    const condition = this.visitExpression(operation.on);

    return `SELECT * FROM (${baseSql}) base ${joinType} JOIN (${rightTable}) joined ON ${condition}`;
  }

  private mapJoinKind(joinKind: string): string {
    switch (joinKind) {
      case 'inner': return 'INNER';
      case 'left': return 'LEFT';
      case 'right': return 'RIGHT';
      case 'full': return 'FULL OUTER';
      case 'leftanti': return 'LEFT';
      case 'rightsemi': return 'RIGHT';
      default: return 'INNER';
    }
  }

  private visitExpression(expression: Expression): string {
    switch (expression.type) {
      case 'BinaryExpression':
        return this.visitBinaryExpression(expression);
      case 'UnaryExpression':
        return this.visitUnaryExpression(expression);
      case 'CallExpression':
        return this.visitCallExpression(expression);
      case 'MemberExpression':
        return this.visitMemberExpression(expression);
      case 'Identifier':
        return this.visitIdentifier(expression);
      case 'Literal':
        return this.visitLiteral(expression);
      default:
        throw new Error(`Unsupported expression type: ${(expression as any).type}`);
    }
  }

  private visitBinaryExpression(expression: BinaryExpression): string {
    const left = this.visitExpression(expression.left);
    const right = this.visitExpression(expression.right);
    const operator = this.mapBinaryOperator(expression.operator);

    return `(${left} ${operator} ${right})`;
  }

  private mapBinaryOperator(operator: BinaryOperator): string {
    switch (operator) {
      case '==': return '=';
      case '!=': return '!=';
      case '<': return '<';
      case '<=': return '<=';
      case '>': return '>';
      case '>=': return '>=';
      case 'and': return 'AND';
      case 'or': return 'OR';
      case '+': return '+';
      case '-': return '-';
      case '*': return '*';
      case '/': return '/';
      case '%': return '%';
      case 'contains': return 'ILIKE';
      case '!contains': return 'NOT ILIKE';
      case 'startswith': return 'ILIKE';
      case 'endswith': return 'ILIKE';
      case 'matches': return '~*';
      case 'in': return 'IN';
      case '!in': return 'NOT IN';
      case 'like': return 'LIKE';
      default:
        throw new Error(`Unsupported binary operator: ${operator}`);
    }
  }

  private visitUnaryExpression(expression: UnaryExpression): string {
    const operand = this.visitExpression(expression.operand);
    const operator = this.mapUnaryOperator(expression.operator);

    return `${operator}${operand}`;
  }

  private mapUnaryOperator(operator: UnaryOperator): string {
    switch (operator) {
      case 'not': return 'NOT ';
      case '-': return '-';
      case '+': return '+';
      default:
        throw new Error(`Unsupported unary operator: ${operator}`);
    }
  }

  private visitCallExpression(expression: CallExpression): string {
    const args = expression.arguments.map(arg => this.visitExpression(arg)).join(', ');
    const functionName = this.mapFunction(expression.function);

    return `${functionName}(${args})`;
  }

  private mapFunction(functionName: string): string {
    const functionMap: Record<string, string> = {
      'strlen': 'LENGTH',
      'substring': 'SUBSTRING',
      'toupper': 'UPPER',
      'tolower': 'LOWER',
      'trim': 'TRIM',
      'replace': 'REPLACE',
      'split': 'STRING_TO_ARRAY',
      'strcat': 'CONCAT',
      'now': 'NOW',
      'floor': 'FLOOR',
      'ceil': 'CEIL',
      'round': 'ROUND',
      'abs': 'ABS',
      'sqrt': 'SQRT',
      'log': 'LN',
      'pow': 'POWER',
      'coalesce': 'COALESCE',
      'isnull': 'IS NULL',
      'isnotnull': 'IS NOT NULL',
      'case': 'CASE'
    };

    return functionMap[functionName.toLowerCase()] || functionName.toUpperCase();
  }

  private visitMemberExpression(expression: MemberExpression): string {
    const object = this.visitExpression(expression.object);
    
    if (expression.computed) {
      const property = this.visitExpression(expression.property);
      return `${object}[${property}]`;
    } else {
      const property = this.visitExpression(expression.property);
      return `${object}.${property}`;
    }
  }

  private visitIdentifier(expression: Identifier): string {
    if (expression.quoted) {
      return this.escapeIdentifier(expression.name);
    }
    return this.escapeIdentifier(expression.name);
  }

  private visitLiteral(expression: Literal): string {
    if (expression.value === null) {
      return 'NULL';
    }

    switch (expression.dataType) {
      case 'string':
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case 'number':
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case 'boolean':
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case 'datetime':
        // Parse datetime literal and convert to timestamp
        const dateMatch = expression.value.match(/datetime\(([^)]+)\)/);
        if (dateMatch) {
          this.parameters.push(dateMatch[1]);
          return `$${this.parameterIndex++}::timestamp`;
        }
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case 'timespan':
        // Convert timespan to interval
        this.parameters.push(this.convertTimespanToInterval(expression.value));
        return `$${this.parameterIndex++}::interval`;
      case 'guid':
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}::uuid`;
      default:
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
    }
  }

  private convertTimespanToInterval(timespan: string): string {
    // Convert KQL timespan format to PostgreSQL interval
    const timespanMap: Record<string, string> = {
      'd': 'day',
      'h': 'hour',
      'm': 'minute',
      's': 'second',
      'ms': 'millisecond'
    };

    for (const [suffix, unit] of Object.entries(timespanMap)) {
      if (timespan.endsWith(suffix)) {
        const value = timespan.slice(0, -suffix.length);
        return `${value} ${unit}`;
      }
    }

    return timespan;
  }

  private escapeIdentifier(identifier: string): string {
    // PostgreSQL identifier escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}