import { Token, TokenType, LexerPosition, LexerError } from './types';

export class KQLLexer {
  private input: string;
  private position: LexerPosition;
  private tokens: Token[] = [];
  private errors: LexerError[] = [];

  // Keywords mapping
  private static readonly KEYWORDS: Map<string, TokenType> = new Map([
    ['where', TokenType.WHERE],
    ['project', TokenType.PROJECT],
    ['extend', TokenType.EXTEND],
    ['summarize', TokenType.SUMMARIZE],
    ['order', TokenType.ORDER],
    ['top', TokenType.TOP],
    ['limit', TokenType.LIMIT],
    ['distinct', TokenType.DISTINCT],
    ['count', TokenType.COUNT],
    ['sum', TokenType.SUM],
    ['avg', TokenType.AVG],
    ['min', TokenType.MIN],
    ['max', TokenType.MAX],
    ['by', TokenType.BY],
    ['asc', TokenType.ASC],
    ['desc', TokenType.DESC],
    ['join', TokenType.JOIN],
    ['inner', TokenType.INNER],
    ['left', TokenType.LEFT],
    ['right', TokenType.RIGHT],
    ['full', TokenType.FULL],
    ['on', TokenType.ON],
    ['union', TokenType.UNION],
    ['let', TokenType.LET],
    ['if', TokenType.IF],
    ['case', TokenType.CASE],
    ['when', TokenType.WHEN],
    ['then', TokenType.THEN],
    ['else', TokenType.ELSE],
    ['end', TokenType.END],
    ['null', TokenType.NULL],
    ['true', TokenType.TRUE],
    ['false', TokenType.FALSE],
    ['and', TokenType.AND],
    ['or', TokenType.OR],
    ['not', TokenType.NOT],
    ['contains', TokenType.CONTAINS],
    ['startswith', TokenType.STARTSWITH],
    ['endswith', TokenType.ENDSWITH],
    ['matches', TokenType.MATCHES],
    ['in', TokenType.IN],
    ['between', TokenType.BETWEEN],
    ['like', TokenType.LIKE]
  ]);

  // Multi-character operators
  private static readonly OPERATORS: Map<string, TokenType> = new Map([
    ['==', TokenType.EQUAL],
    ['!=', TokenType.NOT_EQUAL],
    ['<>', TokenType.NOT_EQUAL],
    ['<=', TokenType.LESS_EQUAL],
    ['>=', TokenType.GREATER_EQUAL],
    ['!contains', TokenType.NOT_CONTAINS],
    ['!in', TokenType.NOT_IN]
  ]);

  constructor(input: string) {
    this.input = input;
    this.position = { index: 0, line: 1, column: 1 };
  }

  tokenize(): { tokens: Token[], errors: LexerError[] } {
    this.tokens = [];
    this.errors = [];
    this.position = { index: 0, line: 1, column: 1 };

    while (!this.isAtEnd()) {
      try {
        this.scanToken();
      } catch (error) {
        this.addError(`Unexpected character: ${this.peek()}`, this.position);
        this.advance();
      }
    }

    this.addToken(TokenType.EOF, '');
    return { tokens: this.tokens, errors: this.errors };
  }

  private scanToken(): void {
    const start = this.position;
    const char = this.advance();

    switch (char) {
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace
        break;
      case '\n':
        this.addToken(TokenType.NEWLINE, char);
        this.position.line++;
        this.position.column = 1;
        break;
      case '|':
        this.addToken(TokenType.PIPE, char);
        break;
      case ',':
        this.addToken(TokenType.COMMA, char);
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON, char);
        break;
      case '.':
        this.addToken(TokenType.DOT, char);
        break;
      case '(':
        this.addToken(TokenType.LPAREN, char);
        break;
      case ')':
        this.addToken(TokenType.RPAREN, char);
        break;
      case '[':
        this.addToken(TokenType.LBRACKET, char);
        break;
      case ']':
        this.addToken(TokenType.RBRACKET, char);
        break;
      case '{':
        this.addToken(TokenType.LBRACE, char);
        break;
      case '}':
        this.addToken(TokenType.RBRACE, char);
        break;
      case '+':
        this.addToken(TokenType.PLUS, char);
        break;
      case '-':
        this.addToken(TokenType.MINUS, char);
        break;
      case '*':
        this.addToken(TokenType.MULTIPLY, char);
        break;
      case '/':
        if (this.match('/')) {
          // Single line comment
          this.scanComment();
        } else if (this.match('*')) {
          // Multi-line comment
          this.scanMultilineComment();
        } else {
          this.addToken(TokenType.DIVIDE, char);
        }
        break;
      case '%':
        this.addToken(TokenType.MODULO, char);
        break;
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQUAL, '==');
        } else {
          this.addError('Unexpected character: =', start);
        }
        break;
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NOT_EQUAL, '!=');
        } else if (this.matchWord('contains')) {
          this.addToken(TokenType.NOT_CONTAINS, '!contains');
        } else if (this.matchWord('in')) {
          this.addToken(TokenType.NOT_IN, '!in');
        } else {
          this.addError('Unexpected character: !', start);
        }
        break;
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LESS_EQUAL, '<=');
        } else if (this.match('>')) {
          this.addToken(TokenType.NOT_EQUAL, '<>');
        } else {
          this.addToken(TokenType.LESS_THAN, char);
        }
        break;
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GREATER_EQUAL, '>=');
        } else {
          this.addToken(TokenType.GREATER_THAN, char);
        }
        break;
      case '"':
        this.scanString('"');
        break;
      case "'":
        this.scanString("'");
        break;
      case '`':
        this.scanQuotedIdentifier();
        break;
      default:
        if (this.isDigit(char)) {
          this.scanNumber();
        } else if (this.isAlpha(char)) {
          this.scanIdentifier();
        } else {
          this.addError(`Unexpected character: ${char}`, start);
        }
        break;
    }
  }

  private scanString(quote: string): void {
    const start = this.position.index - 1;
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        this.position.line++;
        this.position.column = 1;
      }
      
      if (this.peek() === '\\') {
        this.advance(); // consume backslash
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped; break;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated string', { index: start, line: this.position.line, column: this.position.column });
      return;
    }

    this.advance(); // consume closing quote
    this.addToken(TokenType.STRING, value);
  }

  private scanQuotedIdentifier(): void {
    const start = this.position.index - 1;
    let value = '';

    while (!this.isAtEnd() && this.peek() !== '`') {
      value += this.advance();
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated quoted identifier', { index: start, line: this.position.line, column: this.position.column });
      return;
    }

    this.advance(); // consume closing backtick
    this.addToken(TokenType.QUOTED_IDENTIFIER, value);
  }

  private scanNumber(): void {
    let value = '';
    
    // Integer part
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Check for timespan suffix
    if (this.isAlpha(this.peek())) {
      const suffix = this.scanTimespanSuffix();
      if (suffix) {
        this.addToken(TokenType.TIMESPAN, value + suffix);
        return;
      }
    }

    this.addToken(TokenType.NUMBER, value);
  }

  private scanTimespanSuffix(): string | null {
    const suffixes = ['d', 'h', 'm', 's', 'ms', 'microsecond', 'nanosecond'];
    const match = '';
    
    for (const suffix of suffixes) {
      if (this.matchString(suffix)) {
        return suffix;
      }
    }
    
    return null;
  }

  private scanIdentifier(): void {
    let value = '';
    
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      value += this.advance();
    }

    // Check for datetime literal
    if (value === 'datetime' && this.peek() === '(') {
      this.scanDatetime();
      return;
    }

    // Check for GUID literal
    if (this.isGuid(value)) {
      this.addToken(TokenType.GUID, value);
      return;
    }

    // Check if it's a keyword
    const tokenType = KQLLexer.KEYWORDS.get(value.toLowerCase()) || TokenType.IDENTIFIER;
    this.addToken(tokenType, value);
  }

  private scanDatetime(): void {
    // datetime(2023-01-01T00:00:00Z)
    let value = 'datetime';
    
    if (this.match('(')) {
      value += '(';
      
      while (!this.isAtEnd() && this.peek() !== ')') {
        value += this.advance();
      }
      
      if (this.match(')')) {
        value += ')';
        this.addToken(TokenType.DATETIME, value);
      } else {
        this.addError('Unterminated datetime literal', this.position);
      }
    }
  }

  private scanComment(): void {
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
  }

  private scanMultilineComment(): void {
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // consume '*'
        this.advance(); // consume '/'
        break;
      }
      if (this.peek() === '\n') {
        this.position.line++;
        this.position.column = 1;
      }
      this.advance();
    }
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isGuid(value: string): boolean {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(value);
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.peek() !== expected) {
      return false;
    }
    this.advance();
    return true;
  }

  private matchWord(word: string): boolean {
    const start = this.position.index;
    
    for (let i = 0; i < word.length; i++) {
      if (this.isAtEnd() || this.peek().toLowerCase() !== word[i].toLowerCase()) {
        this.position.index = start;
        return false;
      }
      this.advance();
    }
    
    // Make sure it's a complete word (not part of a larger identifier)
    if (this.isAlphaNumeric(this.peek())) {
      this.position.index = start;
      return false;
    }
    
    return true;
  }

  private matchString(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
      if (this.isAtEnd() || this.peek() !== str[i]) {
        return false;
      }
      this.advance();
    }
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position.index];
  }

  private peekNext(): string {
    if (this.position.index + 1 >= this.input.length) return '\0';
    return this.input[this.position.index + 1];
  }

  private advance(): string {
    if (this.isAtEnd()) return '\0';
    const char = this.input[this.position.index];
    this.position.index++;
    this.position.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.position.index >= this.input.length;
  }

  private addToken(type: TokenType, value: string): void {
    const start = this.position.index - value.length;
    const token: Token = {
      type,
      value,
      start,
      end: this.position.index,
      line: this.position.line,
      column: this.position.column - value.length
    };
    this.tokens.push(token);
  }

  private addError(message: string, position: LexerPosition): void {
    this.errors.push({ message, position });
  }
}