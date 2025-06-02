import { Token, TokenType } from '../lexer/types';
import {
  ASTNode, Query, TableExpression, Operation, Expression,
  WhereOperation, ProjectOperation, ExtendOperation, SummarizeOperation,
  OrderOperation, TopOperation, LimitOperation, DistinctOperation,
  JoinOperation, UnionOperation, BinaryExpression, UnaryExpression,
  CallExpression, MemberExpression, ConditionalExpression,
  Identifier, Literal, ProjectColumn, Assignment, Aggregation,
  OrderByExpression, CaseExpression, CaseClause, ArrayExpression,
  LetStatement, BinaryOperator, UnaryOperator, AggregationFunction,
  JoinKind, LiteralType
} from './ast';

export interface ParseError {
  message: string;
  token: Token;
  expected?: TokenType[];
}

export class KQLParser {
  private tokens: Token[];
  private current = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => 
      t.type !== TokenType.WHITESPACE && 
      t.type !== TokenType.COMMENT &&
      t.type !== TokenType.NEWLINE
    );
  }

  parse(): { query: Query | null, errors: ParseError[] } {
    this.current = 0;
    this.errors = [];

    try {
      const query = this.parseQuery();
      return { query, errors: this.errors };
    } catch (error) {
      if (error instanceof Error) {
        this.addError(error.message);
      }
      return { query: null, errors: this.errors };
    }
  }

  private parseQuery(): Query {
    // Handle let statements first
    const letStatements: LetStatement[] = [];
    while (this.match(TokenType.LET)) {
      letStatements.push(this.parseLetStatement());
      this.consume(TokenType.SEMICOLON, 'Expected \';\' after let statement');
    }

    const tableExpression = this.parseTableExpression();
    const operations: Operation[] = [];

    while (this.match(TokenType.PIPE)) {
      operations.push(this.parseOperation());
    }

    const query: Query = {
      type: 'Query',
      tableExpression,
      operations,
      start: tableExpression.start,
      end: this.previous().end
    };

    return query;
  }

  private parseLetStatement(): LetStatement {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    this.consume(TokenType.EQUAL, 'Expected \'=\' after variable name');
    const expression = this.parseExpression();

    return {
      type: 'LetStatement',
      name,
      expression
    };
  }

  private parseTableExpression(): TableExpression {
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected table name');
    let alias: string | undefined;

    // Check for alias
    if (this.check(TokenType.IDENTIFIER) && !this.checkPipe()) {
      alias = this.advance().value;
    }

    return {
      type: 'TableExpression',
      name: nameToken.value,
      alias,
      start: nameToken.start,
      end: this.previous().end
    };
  }

  private parseOperation(): Operation {
    const operationType = this.advance();

    switch (operationType.type) {
      case TokenType.WHERE:
        return this.parseWhereOperation();
      case TokenType.PROJECT:
        return this.parseProjectOperation();
      case TokenType.EXTEND:
        return this.parseExtendOperation();
      case TokenType.SUMMARIZE:
        return this.parseSummarizeOperation();
      case TokenType.ORDER:
        return this.parseOrderOperation();
      case TokenType.TOP:
        return this.parseTopOperation();
      case TokenType.LIMIT:
        return this.parseLimitOperation();
      case TokenType.DISTINCT:
        return this.parseDistinctOperation();
      case TokenType.JOIN:
        return this.parseJoinOperation();
      case TokenType.UNION:
        return this.parseUnionOperation();
      default:
        throw new Error(`Unexpected operation: ${operationType.value}`);
    }
  }

  private parseWhereOperation(): WhereOperation {
    const predicate = this.parseExpression();
    return {
      type: 'WhereOperation',
      predicate
    };
  }

  private parseProjectOperation(): ProjectOperation {
    const columns: ProjectColumn[] = [];

    do {
      const expression = this.parseExpression();
      let alias: string | undefined;

      // Check for alias (expression as alias)
      if (this.check(TokenType.IDENTIFIER) && this.peek().value.toLowerCase() === 'as') {
        this.advance(); // consume 'as'
        alias = this.consume(TokenType.IDENTIFIER, 'Expected alias name').value;
      }

      columns.push({
        type: 'ProjectColumn',
        expression,
        alias
      });
    } while (this.match(TokenType.COMMA));

    return {
      type: 'ProjectOperation',
      columns
    };
  }

  private parseExtendOperation(): ExtendOperation {
    const assignments: Assignment[] = [];

    do {
      const name = this.consume(TokenType.IDENTIFIER, 'Expected column name').value;
      this.consume(TokenType.EQUAL, 'Expected \'=\' after column name');
      const expression = this.parseExpression();

      assignments.push({
        type: 'Assignment',
        name,
        expression
      });
    } while (this.match(TokenType.COMMA));

    return {
      type: 'ExtendOperation',
      assignments
    };
  }

  private parseSummarizeOperation(): SummarizeOperation {
    const aggregations: Aggregation[] = [];

    // Parse aggregations
    do {
      const functionName = this.consume(TokenType.IDENTIFIER, 'Expected aggregation function').value;
      let expression: Expression | undefined;
      let alias: string | undefined;

      if (this.match(TokenType.LPAREN)) {
        if (!this.check(TokenType.RPAREN)) {
          expression = this.parseExpression();
        }
        this.consume(TokenType.RPAREN, 'Expected \')\' after aggregation arguments');
      }

      // Check for alias
      if (this.check(TokenType.IDENTIFIER) && this.peek().value.toLowerCase() === 'as') {
        this.advance(); // consume 'as'
        alias = this.consume(TokenType.IDENTIFIER, 'Expected alias name').value;
      }

      aggregations.push({
        type: 'Aggregation',
        function: functionName as AggregationFunction,
        expression,
        alias
      });
    } while (this.match(TokenType.COMMA));

    // Parse BY clause
    let by: Expression[] | undefined;
    if (this.match(TokenType.BY)) {
      by = [];
      do {
        by.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    return {
      type: 'SummarizeOperation',
      aggregations,
      by
    };
  }

  private parseOrderOperation(): OrderOperation {
    this.consume(TokenType.BY, 'Expected \'by\' after \'order\'');
    const orderBy: OrderByExpression[] = [];

    do {
      const expression = this.parseExpression();
      let direction: 'asc' | 'desc' = 'asc';

      if (this.match(TokenType.ASC)) {
        direction = 'asc';
      } else if (this.match(TokenType.DESC)) {
        direction = 'desc';
      }

      orderBy.push({
        type: 'OrderByExpression',
        expression,
        direction
      });
    } while (this.match(TokenType.COMMA));

    return {
      type: 'OrderOperation',
      orderBy
    };
  }

  private parseTopOperation(): TopOperation {
    const count = this.parseExpression();
    let by: OrderByExpression[] | undefined;

    if (this.match(TokenType.BY)) {
      by = [];
      do {
        const expression = this.parseExpression();
        let direction: 'asc' | 'desc' = 'asc';

        if (this.match(TokenType.ASC)) {
          direction = 'asc';
        } else if (this.match(TokenType.DESC)) {
          direction = 'desc';
        }

        by.push({
          type: 'OrderByExpression',
          expression,
          direction
        });
      } while (this.match(TokenType.COMMA));
    }

    return {
      type: 'TopOperation',
      count,
      by
    };
  }

  private parseLimitOperation(): LimitOperation {
    const count = this.parseExpression();
    return {
      type: 'LimitOperation',
      count
    };
  }

  private parseDistinctOperation(): DistinctOperation {
    let columns: Expression[] | undefined;

    if (!this.checkPipe() && !this.isAtEnd()) {
      columns = [];
      do {
        columns.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    return {
      type: 'DistinctOperation',
      columns
    };
  }

  private parseJoinOperation(): JoinOperation {
    let joinKind: JoinKind = 'inner';

    // Check for join kind
    if (this.check(TokenType.INNER) || this.check(TokenType.LEFT) || 
        this.check(TokenType.RIGHT) || this.check(TokenType.FULL)) {
      joinKind = this.advance().value.toLowerCase() as JoinKind;
    }

    const table = this.parseTableExpression();
    this.consume(TokenType.ON, 'Expected \'on\' after join table');
    const on = this.parseExpression();

    return {
      type: 'JoinOperation',
      joinKind,
      table,
      on
    };
  }

  private parseUnionOperation(): UnionOperation {
    const tables: TableExpression[] = [];

    do {
      tables.push(this.parseTableExpression());
    } while (this.match(TokenType.COMMA));

    return {
      type: 'UnionOperation',
      tables
    };
  }

  // Expression parsing with precedence
  private parseExpression(): Expression {
    return this.parseOrExpression();
  }

  private parseOrExpression(): Expression {
    let expr = this.parseAndExpression();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseAndExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseAndExpression(): Expression {
    let expr = this.parseEqualityExpression();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseEqualityExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseEqualityExpression(): Expression {
    let expr = this.parseComparisonExpression();

    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseComparisonExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseComparisonExpression(): Expression {
    let expr = this.parseStringExpression();

    while (this.match(TokenType.LESS_THAN, TokenType.LESS_EQUAL, 
                     TokenType.GREATER_THAN, TokenType.GREATER_EQUAL,
                     TokenType.IN, TokenType.NOT_IN, TokenType.BETWEEN)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseStringExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseStringExpression(): Expression {
    let expr = this.parseArithmeticExpression();

    while (this.match(TokenType.CONTAINS, TokenType.NOT_CONTAINS,
                     TokenType.STARTSWITH, TokenType.ENDSWITH,
                     TokenType.MATCHES, TokenType.LIKE)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseArithmeticExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseArithmeticExpression(): Expression {
    let expr = this.parseTermExpression();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseTermExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseTermExpression(): Expression {
    let expr = this.parseUnaryExpression();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseUnaryExpression();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right
      };
    }

    return expr;
  }

  private parseUnaryExpression(): Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous().value as UnaryOperator;
      const operand = this.parseUnaryExpression();
      return {
        type: 'UnaryExpression',
        operator,
        operand
      };
    }

    return this.parsePostfixExpression();
  }

  private parsePostfixExpression(): Expression {
    let expr = this.parsePrimaryExpression();

    while (true) {
      if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, 'Expected property name after \'.\'');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: {
            type: 'Identifier',
            name: property.value
          },
          computed: false
        };
      } else if (this.match(TokenType.LBRACKET)) {
        const property = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected \']\' after array index');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property,
          computed: true
        };
      } else if (this.match(TokenType.LPAREN)) {
        // Function call
        const args: Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected \')\' after function arguments');
        
        if (expr.type === 'Identifier') {
          expr = {
            type: 'CallExpression',
            function: expr.name,
            arguments: args
          };
        } else {
          throw new Error('Invalid function call');
        }
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimaryExpression(): Expression {
    if (this.match(TokenType.TRUE, TokenType.FALSE)) {
      return {
        type: 'Literal',
        value: this.previous().value === 'true',
        dataType: 'boolean'
      };
    }

    if (this.match(TokenType.NULL)) {
      return {
        type: 'Literal',
        value: null,
        dataType: 'null'
      };
    }

    if (this.match(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return {
        type: 'Literal',
        value,
        dataType: 'number'
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        dataType: 'string'
      };
    }

    if (this.match(TokenType.DATETIME)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        dataType: 'datetime'
      };
    }

    if (this.match(TokenType.TIMESPAN)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        dataType: 'timespan'
      };
    }

    if (this.match(TokenType.GUID)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        dataType: 'guid'
      };
    }

    if (this.match(TokenType.IDENTIFIER, TokenType.QUOTED_IDENTIFIER)) {
      const token = this.previous();
      return {
        type: 'Identifier',
        name: token.value,
        quoted: token.type === TokenType.QUOTED_IDENTIFIER
      };
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, 'Expected \')\' after expression');
      return expr;
    }

    if (this.match(TokenType.CASE)) {
      return this.parseCaseExpression();
    }

    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayExpression();
    }

    throw new Error(`Unexpected token: ${this.peek().value}`);
  }

  private parseCaseExpression(): CaseExpression {
    const clauses: CaseClause[] = [];
    let elseClause: Expression | undefined;

    while (this.match(TokenType.WHEN)) {
      const when = this.parseExpression();
      this.consume(TokenType.THEN, 'Expected \'then\' after when condition');
      const then = this.parseExpression();
      clauses.push({
        type: 'CaseClause',
        when,
        then
      });
    }

    if (this.match(TokenType.ELSE)) {
      elseClause = this.parseExpression();
    }

    this.consume(TokenType.END, 'Expected \'end\' to close case expression');

    return {
      type: 'CaseExpression',
      clauses,
      elseClause
    };
  }

  private parseArrayExpression(): ArrayExpression {
    const elements: Expression[] = [];

    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RBRACKET, 'Expected \']\' after array elements');

    return {
      type: 'ArrayExpression',
      elements
    };
  }

  // Helper methods
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkPipe(): boolean {
    return this.check(TokenType.PIPE);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    this.addError(message, [type]);
    throw new Error(message);
  }

  private addError(message: string, expected?: TokenType[]): void {
    this.errors.push({
      message,
      token: this.peek(),
      expected
    });
  }
}