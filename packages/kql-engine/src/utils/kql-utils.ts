import { KQLLexer } from '../lexer/lexer';
import { KQLParser } from '../parser/parser';
import { SQLGenerator } from '../execution/sql-generator';
import { Query } from '../parser/ast';

export function validateKQLSyntax(kqlQuery: string): { valid: boolean; errors: string[] } {
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

export function parseKQLToSQL(kqlQuery: string, organizationId: string): { sql: string; parameters: any[]; errors: string[] } {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors: lexErrors } = lexer.tokenize();

    if (lexErrors.length > 0) {
      return {
        sql: '',
        parameters: [],
        errors: lexErrors.map(e => e.message)
      };
    }

    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();

    if (parseErrors.length > 0 || !query) {
      return {
        sql: '',
        parameters: [],
        errors: parseErrors.map(e => e.message)
      };
    }

    const sqlGenerator = new SQLGenerator(organizationId);
    const { sql, parameters } = sqlGenerator.generateSQL(query);

    return { sql, parameters, errors: [] };
  } catch (error) {
    return {
      sql: '',
      parameters: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

export function formatKQLQuery(kqlQuery: string): string {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors } = lexer.tokenize();

    if (errors.length > 0) {
      return kqlQuery; // Return original if there are lexical errors
    }

    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();

    if (parseErrors.length > 0 || !query) {
      return kqlQuery; // Return original if there are parse errors
    }

    return formatQuery(query);
  } catch (error) {
    return kqlQuery; // Return original on any error
  }
}

function formatQuery(query: Query, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  let formatted = '';

  // Format table expression
  formatted += query.tableExpression.name;
  if (query.tableExpression.alias) {
    formatted += ` as ${query.tableExpression.alias}`;
  }

  // Format operations
  for (const operation of query.operations) {
    formatted += '\n' + indent + '| ' + formatOperation(operation, indentLevel + 1);
  }

  return formatted;
}

function formatOperation(operation: any, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);

  switch (operation.type) {
    case 'WhereOperation':
      return `where ${formatExpression(operation.predicate)}`;
    
    case 'ProjectOperation':
      const columns = operation.columns.map((col: any) => {
        let result = formatExpression(col.expression);
        if (col.alias) {
          result += ` as ${col.alias}`;
        }
        return result;
      }).join(',\n' + indent + '    ');
      
      return operation.columns.length > 3 
        ? `project\n${indent}    ${columns}`
        : `project ${columns.replace(/\n\s+/g, ' ')}`;
    
    case 'ExtendOperation':
      const assignments = operation.assignments.map((assignment: any) => 
        `${assignment.name} = ${formatExpression(assignment.expression)}`
      ).join(',\n' + indent + '    ');
      
      return operation.assignments.length > 2
        ? `extend\n${indent}    ${assignments}`
        : `extend ${assignments.replace(/\n\s+/g, ' ')}`;
    
    case 'SummarizeOperation':
      const aggregations = operation.aggregations.map((agg: any) => {
        let result = agg.function;
        if (agg.expression) {
          result += `(${formatExpression(agg.expression)})`;
        } else {
          result += '()';
        }
        if (agg.alias) {
          result += ` as ${agg.alias}`;
        }
        return result;
      }).join(', ');
      
      let summarizeResult = `summarize ${aggregations}`;
      if (operation.by && operation.by.length > 0) {
        const byColumns = operation.by.map((expr: any) => formatExpression(expr)).join(', ');
        summarizeResult += ` by ${byColumns}`;
      }
      
      return summarizeResult;
    
    case 'OrderOperation':
      const orderBy = operation.orderBy.map((orderExpr: any) => 
        `${formatExpression(orderExpr.expression)} ${orderExpr.direction}`
      ).join(', ');
      
      return `order by ${orderBy}`;
    
    case 'TopOperation':
      let topResult = `top ${formatExpression(operation.count)}`;
      if (operation.by && operation.by.length > 0) {
        const byColumns = operation.by.map((orderExpr: any) => 
          `${formatExpression(orderExpr.expression)} ${orderExpr.direction}`
        ).join(', ');
        topResult += ` by ${byColumns}`;
      }
      return topResult;
    
    case 'LimitOperation':
      return `limit ${formatExpression(operation.count)}`;
    
    case 'DistinctOperation':
      if (operation.columns && operation.columns.length > 0) {
        const distinctColumns = operation.columns.map((col: any) => formatExpression(col)).join(', ');
        return `distinct ${distinctColumns}`;
      }
      return 'distinct';
    
    default:
      return operation.type.replace('Operation', '').toLowerCase();
  }
}

function formatExpression(expression: any): string {
  if (!expression) return '';

  switch (expression.type) {
    case 'BinaryExpression':
      const left = formatExpression(expression.left);
      const right = formatExpression(expression.right);
      
      // Add parentheses for complex expressions
      if (needsParentheses(expression)) {
        return `(${left} ${expression.operator} ${right})`;
      }
      return `${left} ${expression.operator} ${right}`;
    
    case 'UnaryExpression':
      const operand = formatExpression(expression.operand);
      return `${expression.operator}${operand}`;
    
    case 'CallExpression':
      const args = expression.arguments.map((arg: any) => formatExpression(arg)).join(', ');
      return `${expression.function}(${args})`;
    
    case 'MemberExpression':
      const object = formatExpression(expression.object);
      const property = formatExpression(expression.property);
      
      if (expression.computed) {
        return `${object}[${property}]`;
      }
      return `${object}.${property}`;
    
    case 'Identifier':
      return expression.quoted ? `\`${expression.name}\`` : expression.name;
    
    case 'Literal':
      if (expression.dataType === 'string') {
        return `"${expression.value}"`;
      }
      return String(expression.value);
    
    default:
      return '';
  }
}

function needsParentheses(expression: any): boolean {
  // Add logic to determine when parentheses are needed
  // This is a simplified version - a full implementation would consider operator precedence
  return expression.operator === 'and' || expression.operator === 'or';
}

export function extractTableNames(kqlQuery: string): string[] {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors } = lexer.tokenize();

    if (errors.length > 0) {
      return [];
    }

    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();

    if (parseErrors.length > 0 || !query) {
      return [];
    }

    const tableNames: string[] = [query.tableExpression.name];

    // Extract table names from join operations
    for (const operation of query.operations) {
      if (operation.type === 'JoinOperation') {
        tableNames.push(operation.table.name);
      } else if (operation.type === 'UnionOperation') {
        tableNames.push(...operation.tables.map((table: any) => table.name));
      }
    }

    return [...new Set(tableNames)]; // Remove duplicates
  } catch (error) {
    return [];
  }
}

export function extractColumnNames(kqlQuery: string): string[] {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors } = lexer.tokenize();

    if (errors.length > 0) {
      return [];
    }

    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();

    if (parseErrors.length > 0 || !query) {
      return [];
    }

    const columnNames = new Set<string>();

    // Extract columns from operations
    for (const operation of query.operations) {
      extractColumnsFromOperation(operation, columnNames);
    }

    return Array.from(columnNames);
  } catch (error) {
    return [];
  }
}

function extractColumnsFromOperation(operation: any, columnNames: Set<string>): void {
  switch (operation.type) {
    case 'WhereOperation':
      extractColumnsFromExpression(operation.predicate, columnNames);
      break;
    
    case 'ProjectOperation':
      operation.columns.forEach((col: any) => {
        extractColumnsFromExpression(col.expression, columnNames);
      });
      break;
    
    case 'ExtendOperation':
      operation.assignments.forEach((assignment: any) => {
        extractColumnsFromExpression(assignment.expression, columnNames);
      });
      break;
    
    case 'SummarizeOperation':
      operation.aggregations.forEach((agg: any) => {
        if (agg.expression) {
          extractColumnsFromExpression(agg.expression, columnNames);
        }
      });
      if (operation.by) {
        operation.by.forEach((expr: any) => {
          extractColumnsFromExpression(expr, columnNames);
        });
      }
      break;
    
    case 'OrderOperation':
      operation.orderBy.forEach((orderExpr: any) => {
        extractColumnsFromExpression(orderExpr.expression, columnNames);
      });
      break;
  }
}

function extractColumnsFromExpression(expression: any, columnNames: Set<string>): void {
  if (!expression) return;

  switch (expression.type) {
    case 'Identifier':
      columnNames.add(expression.name);
      break;
    
    case 'BinaryExpression':
      extractColumnsFromExpression(expression.left, columnNames);
      extractColumnsFromExpression(expression.right, columnNames);
      break;
    
    case 'UnaryExpression':
      extractColumnsFromExpression(expression.operand, columnNames);
      break;
    
    case 'CallExpression':
      expression.arguments.forEach((arg: any) => {
        extractColumnsFromExpression(arg, columnNames);
      });
      break;
    
    case 'MemberExpression':
      extractColumnsFromExpression(expression.object, columnNames);
      if (expression.computed) {
        extractColumnsFromExpression(expression.property, columnNames);
      }
      break;
  }
}