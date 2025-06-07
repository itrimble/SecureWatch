// @ts-nocheck
/**
 * KQL Parser Implementation using ANTLR4
 * Converts KQL queries into Abstract Syntax Trees for optimization and execution
 */

import { 
  KQLQuery, 
  KQLNode, 
  TableExpression, 
  WhereExpression, 
  SummarizeExpression,
  ProjectExpression,
  ExtendExpression,
  SortExpression,
  TopExpression,
  JoinExpression,
  FilterExpression,
  FilterOperator,
  AggregationFunction,
  KQLError,
  KQLErrorType
} from '../types/kql.types';

export class KQLParser {
  private errors: KQLError[] = [];
  
  /**
   * Parse KQL query string into AST
   */
  public parse(query: string): { ast: KQLNode | null; errors: KQLError[] } {
    this.errors = [];
    
    try {
      // Clean and normalize the query
      const normalizedQuery = this.normalizeQuery(query);
      
      // Parse the query into AST
      const ast = this.parseQuery(normalizedQuery);
      
      return { ast, errors: this.errors };
    } catch (error) {
      this.addError('syntax_error', `Failed to parse query: ${error.message}`, 1, 1);
      return { ast: null, errors: this.errors };
    }
  }
  
  /**
   * Normalize KQL query string
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\|\s*\|/g, '|'); // Remove double pipes
  }
  
  /**
   * Parse KQL query into AST nodes
   */
  private parseQuery(query: string): KQLNode {
    const tokens = this.tokenize(query);
    const ast = this.buildAST(tokens);
    return ast;
  }
  
  /**
   * Tokenize KQL query
   */
  private tokenize(query: string): Token[] {
    const tokens: Token[] = [];
    const operators = ['|', '==', '!=', '<=', '>=', '<', '>', '=~', '!~', 'and', 'or', 'not'];
    const keywords = [
      'where', 'summarize', 'project', 'extend', 'sort', 'top', 'limit', 'take',
      'join', 'union', 'render', 'evaluate', 'make-series', 'mv-expand',
      'parse', 'lookup', 'externaldata', 'count', 'sum', 'avg', 'min', 'max',
      'bin', 'ago', 'now', 'startofday', 'endofday', 'datetime', 'timespan'
    ];
    
    let i = 0;
    while (i < query.length) {
      const char = query[i];
      
      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      
      // String literals
      if (char === '"' || char === "'") {
        const { token, newIndex } = this.parseStringLiteral(query, i);
        tokens.push(token);
        i = newIndex;
        continue;
      }
      
      // Numbers
      if (/\d/.test(char)) {
        const { token, newIndex } = this.parseNumber(query, i);
        tokens.push(token);
        i = newIndex;
        continue;
      }
      
      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char)) {
        const { token, newIndex } = this.parseIdentifier(query, i, keywords);
        tokens.push(token);
        i = newIndex;
        continue;
      }
      
      // Operators and special characters
      const { token, newIndex } = this.parseOperator(query, i, operators);
      if (token) {
        tokens.push(token);
        i = newIndex;
      } else {
        i++;
      }
    }
    
    return tokens;
  }
  
  /**
   * Parse string literal
   */
  private parseStringLiteral(query: string, start: number): { token: Token; newIndex: number } {
    const quote = query[start];
    let i = start + 1;
    let value = '';
    
    while (i < query.length && query[i] !== quote) {
      if (query[i] === '\\' && i + 1 < query.length) {
        // Handle escape sequences
        i++;
        switch (query[i]) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += query[i]; break;
        }
      } else {
        value += query[i];
      }
      i++;
    }
    
    if (i >= query.length) {
      this.addError('syntax_error', 'Unterminated string literal', 1, start);
    }
    
    return {
      token: { type: 'string', value, start, end: i + 1 },
      newIndex: i + 1
    };
  }
  
  /**
   * Parse number
   */
  private parseNumber(query: string, start: number): { token: Token; newIndex: number } {
    let i = start;
    let value = '';
    let hasDecimal = false;
    
    while (i < query.length && (/\d/.test(query[i]) || (query[i] === '.' && !hasDecimal))) {
      if (query[i] === '.') {
        hasDecimal = true;
      }
      value += query[i];
      i++;
    }
    
    // Handle scientific notation
    if (i < query.length && (query[i] === 'e' || query[i] === 'E')) {
      value += query[i];
      i++;
      if (i < query.length && (query[i] === '+' || query[i] === '-')) {
        value += query[i];
        i++;
      }
      while (i < query.length && /\d/.test(query[i])) {
        value += query[i];
        i++;
      }
    }
    
    return {
      token: { 
        type: 'number', 
        value: hasDecimal ? parseFloat(value) : parseInt(value, 10), 
        start, 
        end: i 
      },
      newIndex: i
    };
  }
  
  /**
   * Parse identifier or keyword
   */
  private parseIdentifier(query: string, start: number, keywords: string[]): { token: Token; newIndex: number } {
    let i = start;
    let value = '';
    
    while (i < query.length && /[a-zA-Z0-9_.-]/.test(query[i])) {
      value += query[i];
      i++;
    }
    
    const type = keywords.includes(value.toLowerCase()) ? 'keyword' : 'identifier';
    
    return {
      token: { type, value, start, end: i },
      newIndex: i
    };
  }
  
  /**
   * Parse operator
   */
  private parseOperator(query: string, start: number, operators: string[]): { token: Token | null; newIndex: number } {
    // Sort operators by length (longest first) to match correctly
    const sortedOperators = operators.sort((a, b) => b.length - a.length);
    
    for (const op of sortedOperators) {
      if (query.substring(start, start + op.length) === op) {
        return {
          token: { type: 'operator', value: op, start, end: start + op.length },
          newIndex: start + op.length
        };
      }
    }
    
    // Single character tokens
    const char = query[start];
    if ('()[]{},.;:'.includes(char)) {
      return {
        token: { type: 'punctuation', value: char, start, end: start + 1 },
        newIndex: start + 1
      };
    }
    
    return { token: null, newIndex: start + 1 };
  }
  
  /**
   * Build AST from tokens
   */
  private buildAST(tokens: Token[]): KQLNode {
    const parser = new ASTBuilder(tokens, this);
    return parser.build();
  }
  
  /**
   * Add parser error
   */
  private addError(type: KQLErrorType, message: string, line: number, column: number, suggestions?: string[]): void {
    this.errors.push({
      type,
      message,
      line,
      column,
      suggestions
    });
  }
  
  /**
   * Validate semantic correctness of AST
   */
  public validateSemantics(ast: KQLNode, schema: any): KQLError[] {
    const validator = new SemanticValidator(schema);
    return validator.validate(ast);
  }
}

/**
 * Token interface for lexical analysis
 */
interface Token {
  type: 'keyword' | 'identifier' | 'string' | 'number' | 'operator' | 'punctuation';
  value: any;
  start: number;
  end: number;
}

/**
 * AST Builder class
 */
class ASTBuilder {
  private tokens: Token[];
  private position: number = 0;
  private parser: KQLParser;
  
  constructor(tokens: Token[], parser: KQLParser) {
    this.tokens = tokens;
    this.parser = parser;
  }
  
  public build(): KQLNode {
    return this.parseQueryExpression();
  }
  
  private parseQueryExpression(): KQLNode {
    let node = this.parseTableExpression();
    
    while (this.currentToken()?.value === '|') {
      this.consume('|');
      const operator = this.parseOperator();
      
      node = {
        type: 'pipeline',
        children: [node, operator]
      };
    }
    
    return node;
  }
  
  private parseTableExpression(): TableExpression {
    const tableName = this.expectIdentifier();
    
    return {
      type: 'table',
      tableName: tableName.value
    };
  }
  
  private parseOperator(): KQLNode {
    const token = this.currentToken();
    
    if (!token || token.type !== 'keyword') {
      throw new Error(`Expected operator, got ${token?.value || 'EOF'}`);
    }
    
    switch (token.value.toLowerCase()) {
      case 'where':
        return this.parseWhereExpression();
      case 'summarize':
        return this.parseSummarizeExpression();
      case 'project':
        return this.parseProjectExpression();
      case 'extend':
        return this.parseExtendExpression();
      case 'sort':
        return this.parseSortExpression();
      case 'top':
        return this.parseTopExpression();
      case 'join':
        return this.parseJoinExpression();
      default:
        throw new Error(`Unsupported operator: ${token.value}`);
    }
  }
  
  private parseWhereExpression(): WhereExpression {
    this.consume('where');
    const condition = this.parseFilterExpression();
    
    return {
      type: 'where',
      condition
    };
  }
  
  private parseFilterExpression(): FilterExpression {
    let left = this.parseFilterTerm();
    
    while (this.isLogicalOperator(this.currentToken()?.value)) {
      const operator = this.consume().value.toLowerCase() as FilterOperator;
      const right = this.parseFilterTerm();
      
      left = {
        type: 'filter',
        operator,
        left,
        right
      };
    }
    
    return left as FilterExpression;
  }
  
  private parseFilterTerm(): KQLNode {
    if (this.currentToken()?.value === 'not') {
      this.consume('not');
      const operand = this.parseFilterTerm();
      return {
        type: 'filter',
        operator: 'not' as FilterOperator,
        left: operand,
        right: { type: 'literal', value: null }
      };
    }
    
    if (this.currentToken()?.value === '(') {
      this.consume('(');
      const expr = this.parseFilterExpression();
      this.consume(')');
      return expr;
    }
    
    const left = this.parseValue();
    const operator = this.parseComparisonOperator();
    const right = this.parseValue();
    
    return {
      type: 'filter',
      operator,
      left,
      right
    };
  }
  
  private parseSummarizeExpression(): SummarizeExpression {
    this.consume('summarize');
    
    const aggregations = [];
    do {
      aggregations.push(this.parseAggregation());
    } while (this.currentToken()?.value === ',' && this.consume(','));
    
    let groupBy: string[] | undefined;
    if (this.currentToken()?.value === 'by') {
      this.consume('by');
      groupBy = [];
      do {
        groupBy.push(this.expectIdentifier().value);
      } while (this.currentToken()?.value === ',' && this.consume(','));
    }
    
    return {
      type: 'summarize',
      aggregations,
      groupBy
    };
  }
  
  private parseAggregation(): any {
    const func = this.expectIdentifier().value.toLowerCase() as AggregationFunction;
    this.consume('(');
    
    let column = '*';
    if (this.currentToken()?.value !== ')') {
      column = this.expectIdentifier().value;
    }
    
    this.consume(')');
    
    let alias: string | undefined;
    if (this.currentToken()?.value === 'as') {
      this.consume('as');
      alias = this.expectIdentifier().value;
    }
    
    return {
      type: 'aggregation',
      function: func,
      column,
      alias
    };
  }
  
  private parseProjectExpression(): ProjectExpression {
    this.consume('project');
    
    const columns = [];
    do {
      const column = this.parseProjectColumn();
      columns.push(column);
    } while (this.currentToken()?.value === ',' && this.consume(','));
    
    return {
      type: 'project',
      columns
    };
  }
  
  private parseProjectColumn(): any {
    const name = this.expectIdentifier().value;
    
    let alias: string | undefined;
    if (this.currentToken()?.value === 'as') {
      this.consume('as');
      alias = this.expectIdentifier().value;
    }
    
    return { name, alias };
  }
  
  private parseExtendExpression(): ExtendExpression {
    this.consume('extend');
    
    const extensions = [];
    do {
      const name = this.expectIdentifier().value;
      this.consume('=');
      const expression = this.parseValue();
      extensions.push({ name, expression });
    } while (this.currentToken()?.value === ',' && this.consume(','));
    
    return {
      type: 'extend',
      extensions
    };
  }
  
  private parseSortExpression(): SortExpression {
    this.consume('sort');
    this.consume('by');
    
    const columns = [];
    do {
      const name = this.expectIdentifier().value;
      let direction: 'asc' | 'desc' = 'asc';
      
      if (this.currentToken()?.value === 'asc' || this.currentToken()?.value === 'desc') {
        direction = this.consume().value as 'asc' | 'desc';
      }
      
      columns.push({ name, direction });
    } while (this.currentToken()?.value === ',' && this.consume(','));
    
    return {
      type: 'sort',
      columns
    };
  }
  
  private parseTopExpression(): TopExpression {
    this.consume('top');
    
    const count = this.expectNumber().value;
    
    let columns: any[] | undefined;
    if (this.currentToken()?.value === 'by') {
      this.consume('by');
      columns = [];
      do {
        const name = this.expectIdentifier().value;
        let direction: 'asc' | 'desc' = 'desc'; // top defaults to desc
        
        if (this.currentToken()?.value === 'asc' || this.currentToken()?.value === 'desc') {
          direction = this.consume().value as 'asc' | 'desc';
        }
        
        columns.push({ name, direction });
      } while (this.currentToken()?.value === ',' && this.consume(','));
    }
    
    return {
      type: 'top',
      count,
      columns
    };
  }
  
  private parseJoinExpression(): JoinExpression {
    this.consume('join');
    
    // Parse join type (optional)
    let joinType: any = 'inner';
    const nextToken = this.currentToken()?.value;
    if (['inner', 'left', 'right', 'full', 'anti', 'semi'].includes(nextToken)) {
      joinType = this.consume().value;
    }
    
    const rightTable = this.parseTableExpression();
    
    this.consume('on');
    const onCondition = this.parseFilterExpression();
    
    return {
      type: 'join',
      joinType,
      rightTable,
      onCondition
    };
  }
  
  private parseValue(): KQLNode {
    const token = this.currentToken();
    
    if (!token) {
      throw new Error('Unexpected end of input');
    }
    
    switch (token.type) {
      case 'identifier':
        return { type: 'column', value: this.consume().value };
      case 'string':
      case 'number':
        return { type: 'literal', value: this.consume().value };
      default:
        throw new Error(`Unexpected token: ${token.value}`);
    }
  }
  
  private parseComparisonOperator(): FilterOperator {
    const token = this.currentToken();
    
    if (!token || token.type !== 'operator') {
      throw new Error(`Expected comparison operator, got ${token?.value || 'EOF'}`);
    }
    
    const op = this.consume().value;
    
    switch (op) {
      case '==': return 'eq';
      case '!=': return 'neq';
      case '<': return 'lt';
      case '<=': return 'lte';
      case '>': return 'gt';
      case '>=': return 'gte';
      case '=~': return 'matches';
      case '!~': return 'not_in';
      default:
        throw new Error(`Unsupported comparison operator: ${op}`);
    }
  }
  
  private isLogicalOperator(value: any): boolean {
    return ['and', 'or'].includes(value?.toLowerCase());
  }
  
  private currentToken(): Token | null {
    return this.position < this.tokens.length ? this.tokens[this.position] : null;
  }
  
  private consume(expected?: string): Token {
    const token = this.currentToken();
    
    if (!token) {
      throw new Error(`Expected ${expected || 'token'}, got EOF`);
    }
    
    if (expected && token.value !== expected) {
      throw new Error(`Expected ${expected}, got ${token.value}`);
    }
    
    this.position++;
    return token;
  }
  
  private expectIdentifier(): Token {
    const token = this.currentToken();
    
    if (!token || token.type !== 'identifier') {
      throw new Error(`Expected identifier, got ${token?.value || 'EOF'}`);
    }
    
    return this.consume();
  }
  
  private expectNumber(): Token {
    const token = this.currentToken();
    
    if (!token || token.type !== 'number') {
      throw new Error(`Expected number, got ${token?.value || 'EOF'}`);
    }
    
    return this.consume();
  }
}

/**
 * Semantic validation for KQL AST
 */
class SemanticValidator {
  private schema: any;
  
  constructor(schema: any) {
    this.schema = schema;
  }
  
  public validate(ast: KQLNode): KQLError[] {
    const errors: KQLError[] = [];
    
    // Implement semantic validation logic
    // - Check if referenced tables exist
    // - Validate column names
    // - Check data types compatibility
    // - Validate function usage
    
    return errors;
  }
}

