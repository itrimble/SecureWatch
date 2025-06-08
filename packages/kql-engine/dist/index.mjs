// src/lexer/types.ts
var TokenType = /* @__PURE__ */ ((TokenType2) => {
  TokenType2["STRING"] = "STRING";
  TokenType2["NUMBER"] = "NUMBER";
  TokenType2["BOOLEAN"] = "BOOLEAN";
  TokenType2["DATETIME"] = "DATETIME";
  TokenType2["TIMESPAN"] = "TIMESPAN";
  TokenType2["GUID"] = "GUID";
  TokenType2["IDENTIFIER"] = "IDENTIFIER";
  TokenType2["QUOTED_IDENTIFIER"] = "QUOTED_IDENTIFIER";
  TokenType2["PIPE"] = "PIPE";
  TokenType2["EQUAL"] = "EQUAL";
  TokenType2["NOT_EQUAL"] = "NOT_EQUAL";
  TokenType2["LESS_THAN"] = "LESS_THAN";
  TokenType2["LESS_EQUAL"] = "LESS_EQUAL";
  TokenType2["GREATER_THAN"] = "GREATER_THAN";
  TokenType2["GREATER_EQUAL"] = "GREATER_EQUAL";
  TokenType2["CONTAINS"] = "CONTAINS";
  TokenType2["NOT_CONTAINS"] = "NOT_CONTAINS";
  TokenType2["STARTSWITH"] = "STARTSWITH";
  TokenType2["ENDSWITH"] = "ENDSWITH";
  TokenType2["MATCHES"] = "MATCHES";
  TokenType2["IN"] = "IN";
  TokenType2["NOT_IN"] = "NOT_IN";
  TokenType2["BETWEEN"] = "BETWEEN";
  TokenType2["LIKE"] = "LIKE";
  TokenType2["AND"] = "AND";
  TokenType2["OR"] = "OR";
  TokenType2["NOT"] = "NOT";
  TokenType2["PLUS"] = "PLUS";
  TokenType2["MINUS"] = "MINUS";
  TokenType2["MULTIPLY"] = "MULTIPLY";
  TokenType2["DIVIDE"] = "DIVIDE";
  TokenType2["MODULO"] = "MODULO";
  TokenType2["COMMA"] = "COMMA";
  TokenType2["SEMICOLON"] = "SEMICOLON";
  TokenType2["DOT"] = "DOT";
  TokenType2["LPAREN"] = "LPAREN";
  TokenType2["RPAREN"] = "RPAREN";
  TokenType2["LBRACKET"] = "LBRACKET";
  TokenType2["RBRACKET"] = "RBRACKET";
  TokenType2["LBRACE"] = "LBRACE";
  TokenType2["RBRACE"] = "RBRACE";
  TokenType2["WHERE"] = "WHERE";
  TokenType2["PROJECT"] = "PROJECT";
  TokenType2["EXTEND"] = "EXTEND";
  TokenType2["SUMMARIZE"] = "SUMMARIZE";
  TokenType2["ORDER"] = "ORDER";
  TokenType2["TOP"] = "TOP";
  TokenType2["LIMIT"] = "LIMIT";
  TokenType2["DISTINCT"] = "DISTINCT";
  TokenType2["COUNT"] = "COUNT";
  TokenType2["SUM"] = "SUM";
  TokenType2["AVG"] = "AVG";
  TokenType2["MIN"] = "MIN";
  TokenType2["MAX"] = "MAX";
  TokenType2["BY"] = "BY";
  TokenType2["ASC"] = "ASC";
  TokenType2["DESC"] = "DESC";
  TokenType2["JOIN"] = "JOIN";
  TokenType2["INNER"] = "INNER";
  TokenType2["LEFT"] = "LEFT";
  TokenType2["RIGHT"] = "RIGHT";
  TokenType2["FULL"] = "FULL";
  TokenType2["ON"] = "ON";
  TokenType2["UNION"] = "UNION";
  TokenType2["LET"] = "LET";
  TokenType2["IF"] = "IF";
  TokenType2["CASE"] = "CASE";
  TokenType2["WHEN"] = "WHEN";
  TokenType2["THEN"] = "THEN";
  TokenType2["ELSE"] = "ELSE";
  TokenType2["END"] = "END";
  TokenType2["NULL"] = "NULL";
  TokenType2["TRUE"] = "TRUE";
  TokenType2["FALSE"] = "FALSE";
  TokenType2["EOF"] = "EOF";
  TokenType2["NEWLINE"] = "NEWLINE";
  TokenType2["WHITESPACE"] = "WHITESPACE";
  TokenType2["COMMENT"] = "COMMENT";
  TokenType2["INVALID"] = "INVALID";
  return TokenType2;
})(TokenType || {});

// src/lexer/lexer.ts
var KQLLexer = class _KQLLexer {
  input;
  position;
  tokens = [];
  errors = [];
  // Keywords mapping
  static KEYWORDS = /* @__PURE__ */ new Map([
    ["where", "WHERE" /* WHERE */],
    ["project", "PROJECT" /* PROJECT */],
    ["extend", "EXTEND" /* EXTEND */],
    ["summarize", "SUMMARIZE" /* SUMMARIZE */],
    ["order", "ORDER" /* ORDER */],
    ["top", "TOP" /* TOP */],
    ["limit", "LIMIT" /* LIMIT */],
    ["distinct", "DISTINCT" /* DISTINCT */],
    ["count", "COUNT" /* COUNT */],
    ["sum", "SUM" /* SUM */],
    ["avg", "AVG" /* AVG */],
    ["min", "MIN" /* MIN */],
    ["max", "MAX" /* MAX */],
    ["by", "BY" /* BY */],
    ["asc", "ASC" /* ASC */],
    ["desc", "DESC" /* DESC */],
    ["join", "JOIN" /* JOIN */],
    ["inner", "INNER" /* INNER */],
    ["left", "LEFT" /* LEFT */],
    ["right", "RIGHT" /* RIGHT */],
    ["full", "FULL" /* FULL */],
    ["on", "ON" /* ON */],
    ["union", "UNION" /* UNION */],
    ["let", "LET" /* LET */],
    ["if", "IF" /* IF */],
    ["case", "CASE" /* CASE */],
    ["when", "WHEN" /* WHEN */],
    ["then", "THEN" /* THEN */],
    ["else", "ELSE" /* ELSE */],
    ["end", "END" /* END */],
    ["null", "NULL" /* NULL */],
    ["true", "TRUE" /* TRUE */],
    ["false", "FALSE" /* FALSE */],
    ["and", "AND" /* AND */],
    ["or", "OR" /* OR */],
    ["not", "NOT" /* NOT */],
    ["contains", "CONTAINS" /* CONTAINS */],
    ["startswith", "STARTSWITH" /* STARTSWITH */],
    ["endswith", "ENDSWITH" /* ENDSWITH */],
    ["matches", "MATCHES" /* MATCHES */],
    ["in", "IN" /* IN */],
    ["between", "BETWEEN" /* BETWEEN */],
    ["like", "LIKE" /* LIKE */]
  ]);
  // Multi-character operators
  static OPERATORS = /* @__PURE__ */ new Map([
    ["==", "EQUAL" /* EQUAL */],
    ["!=", "NOT_EQUAL" /* NOT_EQUAL */],
    ["<>", "NOT_EQUAL" /* NOT_EQUAL */],
    ["<=", "LESS_EQUAL" /* LESS_EQUAL */],
    [">=", "GREATER_EQUAL" /* GREATER_EQUAL */],
    ["!contains", "NOT_CONTAINS" /* NOT_CONTAINS */],
    ["!in", "NOT_IN" /* NOT_IN */]
  ]);
  constructor(input) {
    this.input = input;
    this.position = { index: 0, line: 1, column: 1 };
  }
  tokenize() {
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
    this.addToken("EOF" /* EOF */, "");
    return { tokens: this.tokens, errors: this.errors };
  }
  scanToken() {
    const start = this.position;
    const char = this.advance();
    switch (char) {
      case " ":
      case "\r":
      case "	":
        break;
      case "\n":
        this.addToken("NEWLINE" /* NEWLINE */, char);
        this.position.line++;
        this.position.column = 1;
        break;
      case "|":
        this.addToken("PIPE" /* PIPE */, char);
        break;
      case ",":
        this.addToken("COMMA" /* COMMA */, char);
        break;
      case ";":
        this.addToken("SEMICOLON" /* SEMICOLON */, char);
        break;
      case ".":
        this.addToken("DOT" /* DOT */, char);
        break;
      case "(":
        this.addToken("LPAREN" /* LPAREN */, char);
        break;
      case ")":
        this.addToken("RPAREN" /* RPAREN */, char);
        break;
      case "[":
        this.addToken("LBRACKET" /* LBRACKET */, char);
        break;
      case "]":
        this.addToken("RBRACKET" /* RBRACKET */, char);
        break;
      case "{":
        this.addToken("LBRACE" /* LBRACE */, char);
        break;
      case "}":
        this.addToken("RBRACE" /* RBRACE */, char);
        break;
      case "+":
        this.addToken("PLUS" /* PLUS */, char);
        break;
      case "-":
        this.addToken("MINUS" /* MINUS */, char);
        break;
      case "*":
        this.addToken("MULTIPLY" /* MULTIPLY */, char);
        break;
      case "/":
        if (this.match("/")) {
          this.scanComment();
        } else if (this.match("*")) {
          this.scanMultilineComment();
        } else {
          this.addToken("DIVIDE" /* DIVIDE */, char);
        }
        break;
      case "%":
        this.addToken("MODULO" /* MODULO */, char);
        break;
      case "=":
        if (this.match("=")) {
          this.addToken("EQUAL" /* EQUAL */, "==");
        } else {
          this.addError("Unexpected character: =", start);
        }
        break;
      case "!":
        if (this.match("=")) {
          this.addToken("NOT_EQUAL" /* NOT_EQUAL */, "!=");
        } else if (this.matchWord("contains")) {
          this.addToken("NOT_CONTAINS" /* NOT_CONTAINS */, "!contains");
        } else if (this.matchWord("in")) {
          this.addToken("NOT_IN" /* NOT_IN */, "!in");
        } else {
          this.addError("Unexpected character: !", start);
        }
        break;
      case "<":
        if (this.match("=")) {
          this.addToken("LESS_EQUAL" /* LESS_EQUAL */, "<=");
        } else if (this.match(">")) {
          this.addToken("NOT_EQUAL" /* NOT_EQUAL */, "<>");
        } else {
          this.addToken("LESS_THAN" /* LESS_THAN */, char);
        }
        break;
      case ">":
        if (this.match("=")) {
          this.addToken("GREATER_EQUAL" /* GREATER_EQUAL */, ">=");
        } else {
          this.addToken("GREATER_THAN" /* GREATER_THAN */, char);
        }
        break;
      case '"':
        this.scanString('"');
        break;
      case "'":
        this.scanString("'");
        break;
      case "`":
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
  scanString(quote) {
    const start = this.position.index - 1;
    let value = "";
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === "\n") {
        this.position.line++;
        this.position.column = 1;
      }
      if (this.peek() === "\\") {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case "n":
            value += "\n";
            break;
          case "t":
            value += "	";
            break;
          case "r":
            value += "\r";
            break;
          case "\\":
            value += "\\";
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += escaped;
            break;
        }
      } else {
        value += this.advance();
      }
    }
    if (this.isAtEnd()) {
      this.addError("Unterminated string", { index: start, line: this.position.line, column: this.position.column });
      return;
    }
    this.advance();
    this.addToken("STRING" /* STRING */, value);
  }
  scanQuotedIdentifier() {
    const start = this.position.index - 1;
    let value = "";
    while (!this.isAtEnd() && this.peek() !== "`") {
      value += this.advance();
    }
    if (this.isAtEnd()) {
      this.addError("Unterminated quoted identifier", { index: start, line: this.position.line, column: this.position.column });
      return;
    }
    this.advance();
    this.addToken("QUOTED_IDENTIFIER" /* QUOTED_IDENTIFIER */, value);
  }
  scanNumber() {
    let value = "";
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      value += this.advance();
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    if (this.peek() === "e" || this.peek() === "E") {
      value += this.advance();
      if (this.peek() === "+" || this.peek() === "-") {
        value += this.advance();
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    if (this.isAlpha(this.peek())) {
      const suffix = this.scanTimespanSuffix();
      if (suffix) {
        this.addToken("TIMESPAN" /* TIMESPAN */, value + suffix);
        return;
      }
    }
    this.addToken("NUMBER" /* NUMBER */, value);
  }
  scanTimespanSuffix() {
    const suffixes = ["d", "h", "m", "s", "ms", "microsecond", "nanosecond"];
    let match = "";
    for (const suffix of suffixes) {
      if (this.matchString(suffix)) {
        return suffix;
      }
    }
    return null;
  }
  scanIdentifier() {
    let value = "";
    while (this.isAlphaNumeric(this.peek()) || this.peek() === "_") {
      value += this.advance();
    }
    if (value === "datetime" && this.peek() === "(") {
      this.scanDatetime();
      return;
    }
    if (this.isGuid(value)) {
      this.addToken("GUID" /* GUID */, value);
      return;
    }
    const tokenType = _KQLLexer.KEYWORDS.get(value.toLowerCase()) || "IDENTIFIER" /* IDENTIFIER */;
    this.addToken(tokenType, value);
  }
  scanDatetime() {
    let value = "datetime";
    if (this.match("(")) {
      value += "(";
      while (!this.isAtEnd() && this.peek() !== ")") {
        value += this.advance();
      }
      if (this.match(")")) {
        value += ")";
        this.addToken("DATETIME" /* DATETIME */, value);
      } else {
        this.addError("Unterminated datetime literal", this.position);
      }
    }
  }
  scanComment() {
    while (!this.isAtEnd() && this.peek() !== "\n") {
      this.advance();
    }
  }
  scanMultilineComment() {
    while (!this.isAtEnd()) {
      if (this.peek() === "*" && this.peekNext() === "/") {
        this.advance();
        this.advance();
        break;
      }
      if (this.peek() === "\n") {
        this.position.line++;
        this.position.column = 1;
      }
      this.advance();
    }
  }
  isDigit(char) {
    return char >= "0" && char <= "9";
  }
  isAlpha(char) {
    return char >= "a" && char <= "z" || char >= "A" && char <= "Z" || char === "_";
  }
  isAlphaNumeric(char) {
    return this.isAlpha(char) || this.isDigit(char);
  }
  isGuid(value) {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(value);
  }
  match(expected) {
    if (this.isAtEnd() || this.peek() !== expected) {
      return false;
    }
    this.advance();
    return true;
  }
  matchWord(word) {
    const start = this.position.index;
    for (let i = 0; i < word.length; i++) {
      if (this.isAtEnd() || this.peek().toLowerCase() !== word[i].toLowerCase()) {
        this.position.index = start;
        return false;
      }
      this.advance();
    }
    if (this.isAlphaNumeric(this.peek())) {
      this.position.index = start;
      return false;
    }
    return true;
  }
  matchString(str) {
    for (let i = 0; i < str.length; i++) {
      if (this.isAtEnd() || this.peek() !== str[i]) {
        return false;
      }
      this.advance();
    }
    return true;
  }
  peek() {
    if (this.isAtEnd()) return "\0";
    return this.input[this.position.index];
  }
  peekNext() {
    if (this.position.index + 1 >= this.input.length) return "\0";
    return this.input[this.position.index + 1];
  }
  advance() {
    if (this.isAtEnd()) return "\0";
    const char = this.input[this.position.index];
    this.position.index++;
    this.position.column++;
    return char;
  }
  isAtEnd() {
    return this.position.index >= this.input.length;
  }
  addToken(type, value) {
    const start = this.position.index - value.length;
    const token = {
      type,
      value,
      start,
      end: this.position.index,
      line: this.position.line,
      column: this.position.column - value.length
    };
    this.tokens.push(token);
  }
  addError(message, position) {
    this.errors.push({ message, position });
  }
};

// src/parser/parser.ts
var KQLParser = class {
  tokens;
  current = 0;
  errors = [];
  constructor(tokens) {
    this.tokens = tokens.filter(
      (t) => t.type !== "WHITESPACE" /* WHITESPACE */ && t.type !== "COMMENT" /* COMMENT */ && t.type !== "NEWLINE" /* NEWLINE */
    );
  }
  parse() {
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
  parseQuery() {
    const letStatements = [];
    while (this.match("LET" /* LET */)) {
      letStatements.push(this.parseLetStatement());
      this.consume("SEMICOLON" /* SEMICOLON */, "Expected ';' after let statement");
    }
    const tableExpression = this.parseTableExpression();
    const operations = [];
    while (this.match("PIPE" /* PIPE */)) {
      operations.push(this.parseOperation());
    }
    const query = {
      type: "Query",
      tableExpression,
      operations,
      start: tableExpression.start,
      end: this.previous().end
    };
    return query;
  }
  parseLetStatement() {
    const name = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected variable name").value;
    this.consume("EQUAL" /* EQUAL */, "Expected '=' after variable name");
    const expression = this.parseExpression();
    return {
      type: "LetStatement",
      name,
      expression
    };
  }
  parseTableExpression() {
    const nameToken = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected table name");
    let alias;
    if (this.check("IDENTIFIER" /* IDENTIFIER */) && !this.checkPipe()) {
      alias = this.advance().value;
    }
    return {
      type: "TableExpression",
      name: nameToken.value,
      alias,
      start: nameToken.start,
      end: this.previous().end
    };
  }
  parseOperation() {
    const operationType = this.advance();
    switch (operationType.type) {
      case "WHERE" /* WHERE */:
        return this.parseWhereOperation();
      case "PROJECT" /* PROJECT */:
        return this.parseProjectOperation();
      case "EXTEND" /* EXTEND */:
        return this.parseExtendOperation();
      case "SUMMARIZE" /* SUMMARIZE */:
        return this.parseSummarizeOperation();
      case "ORDER" /* ORDER */:
        return this.parseOrderOperation();
      case "TOP" /* TOP */:
        return this.parseTopOperation();
      case "LIMIT" /* LIMIT */:
        return this.parseLimitOperation();
      case "DISTINCT" /* DISTINCT */:
        return this.parseDistinctOperation();
      case "JOIN" /* JOIN */:
        return this.parseJoinOperation();
      case "UNION" /* UNION */:
        return this.parseUnionOperation();
      default:
        throw new Error(`Unexpected operation: ${operationType.value}`);
    }
  }
  parseWhereOperation() {
    const predicate = this.parseExpression();
    return {
      type: "WhereOperation",
      predicate
    };
  }
  parseProjectOperation() {
    const columns = [];
    do {
      const expression = this.parseExpression();
      let alias;
      if (this.check("IDENTIFIER" /* IDENTIFIER */) && this.peek().value.toLowerCase() === "as") {
        this.advance();
        alias = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected alias name").value;
      }
      columns.push({
        type: "ProjectColumn",
        expression,
        alias
      });
    } while (this.match("COMMA" /* COMMA */));
    return {
      type: "ProjectOperation",
      columns
    };
  }
  parseExtendOperation() {
    const assignments = [];
    do {
      const name = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected column name").value;
      this.consume("EQUAL" /* EQUAL */, "Expected '=' after column name");
      const expression = this.parseExpression();
      assignments.push({
        type: "Assignment",
        name,
        expression
      });
    } while (this.match("COMMA" /* COMMA */));
    return {
      type: "ExtendOperation",
      assignments
    };
  }
  parseSummarizeOperation() {
    const aggregations = [];
    do {
      const functionName = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected aggregation function").value;
      let expression;
      let alias;
      if (this.match("LPAREN" /* LPAREN */)) {
        if (!this.check("RPAREN" /* RPAREN */)) {
          expression = this.parseExpression();
        }
        this.consume("RPAREN" /* RPAREN */, "Expected ')' after aggregation arguments");
      }
      if (this.check("IDENTIFIER" /* IDENTIFIER */) && this.peek().value.toLowerCase() === "as") {
        this.advance();
        alias = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected alias name").value;
      }
      aggregations.push({
        type: "Aggregation",
        function: functionName,
        expression,
        alias
      });
    } while (this.match("COMMA" /* COMMA */));
    let by;
    if (this.match("BY" /* BY */)) {
      by = [];
      do {
        by.push(this.parseExpression());
      } while (this.match("COMMA" /* COMMA */));
    }
    return {
      type: "SummarizeOperation",
      aggregations,
      by
    };
  }
  parseOrderOperation() {
    this.consume("BY" /* BY */, "Expected 'by' after 'order'");
    const orderBy = [];
    do {
      const expression = this.parseExpression();
      let direction = "asc";
      if (this.match("ASC" /* ASC */)) {
        direction = "asc";
      } else if (this.match("DESC" /* DESC */)) {
        direction = "desc";
      }
      orderBy.push({
        type: "OrderByExpression",
        expression,
        direction
      });
    } while (this.match("COMMA" /* COMMA */));
    return {
      type: "OrderOperation",
      orderBy
    };
  }
  parseTopOperation() {
    const count = this.parseExpression();
    let by;
    if (this.match("BY" /* BY */)) {
      by = [];
      do {
        const expression = this.parseExpression();
        let direction = "asc";
        if (this.match("ASC" /* ASC */)) {
          direction = "asc";
        } else if (this.match("DESC" /* DESC */)) {
          direction = "desc";
        }
        by.push({
          type: "OrderByExpression",
          expression,
          direction
        });
      } while (this.match("COMMA" /* COMMA */));
    }
    return {
      type: "TopOperation",
      count,
      by
    };
  }
  parseLimitOperation() {
    const count = this.parseExpression();
    return {
      type: "LimitOperation",
      count
    };
  }
  parseDistinctOperation() {
    let columns;
    if (!this.checkPipe() && !this.isAtEnd()) {
      columns = [];
      do {
        columns.push(this.parseExpression());
      } while (this.match("COMMA" /* COMMA */));
    }
    return {
      type: "DistinctOperation",
      columns
    };
  }
  parseJoinOperation() {
    let joinKind = "inner";
    if (this.check("INNER" /* INNER */) || this.check("LEFT" /* LEFT */) || this.check("RIGHT" /* RIGHT */) || this.check("FULL" /* FULL */)) {
      joinKind = this.advance().value.toLowerCase();
    }
    const table = this.parseTableExpression();
    this.consume("ON" /* ON */, "Expected 'on' after join table");
    const on = this.parseExpression();
    return {
      type: "JoinOperation",
      joinKind,
      table,
      on
    };
  }
  parseUnionOperation() {
    const tables = [];
    do {
      tables.push(this.parseTableExpression());
    } while (this.match("COMMA" /* COMMA */));
    return {
      type: "UnionOperation",
      tables
    };
  }
  // Expression parsing with precedence
  parseExpression() {
    return this.parseOrExpression();
  }
  parseOrExpression() {
    let expr = this.parseAndExpression();
    while (this.match("OR" /* OR */)) {
      const operator = this.previous().value;
      const right = this.parseAndExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseAndExpression() {
    let expr = this.parseEqualityExpression();
    while (this.match("AND" /* AND */)) {
      const operator = this.previous().value;
      const right = this.parseEqualityExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseEqualityExpression() {
    let expr = this.parseComparisonExpression();
    while (this.match("EQUAL" /* EQUAL */, "NOT_EQUAL" /* NOT_EQUAL */)) {
      const operator = this.previous().value;
      const right = this.parseComparisonExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseComparisonExpression() {
    let expr = this.parseStringExpression();
    while (this.match(
      "LESS_THAN" /* LESS_THAN */,
      "LESS_EQUAL" /* LESS_EQUAL */,
      "GREATER_THAN" /* GREATER_THAN */,
      "GREATER_EQUAL" /* GREATER_EQUAL */,
      "IN" /* IN */,
      "NOT_IN" /* NOT_IN */,
      "BETWEEN" /* BETWEEN */
    )) {
      const operator = this.previous().value;
      const right = this.parseStringExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseStringExpression() {
    let expr = this.parseArithmeticExpression();
    while (this.match(
      "CONTAINS" /* CONTAINS */,
      "NOT_CONTAINS" /* NOT_CONTAINS */,
      "STARTSWITH" /* STARTSWITH */,
      "ENDSWITH" /* ENDSWITH */,
      "MATCHES" /* MATCHES */,
      "LIKE" /* LIKE */
    )) {
      const operator = this.previous().value;
      const right = this.parseArithmeticExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseArithmeticExpression() {
    let expr = this.parseTermExpression();
    while (this.match("PLUS" /* PLUS */, "MINUS" /* MINUS */)) {
      const operator = this.previous().value;
      const right = this.parseTermExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseTermExpression() {
    let expr = this.parseUnaryExpression();
    while (this.match("MULTIPLY" /* MULTIPLY */, "DIVIDE" /* DIVIDE */, "MODULO" /* MODULO */)) {
      const operator = this.previous().value;
      const right = this.parseUnaryExpression();
      expr = {
        type: "BinaryExpression",
        operator,
        left: expr,
        right
      };
    }
    return expr;
  }
  parseUnaryExpression() {
    if (this.match("NOT" /* NOT */, "MINUS" /* MINUS */, "PLUS" /* PLUS */)) {
      const operator = this.previous().value;
      const operand = this.parseUnaryExpression();
      return {
        type: "UnaryExpression",
        operator,
        operand
      };
    }
    return this.parsePostfixExpression();
  }
  parsePostfixExpression() {
    let expr = this.parsePrimaryExpression();
    while (true) {
      if (this.match("DOT" /* DOT */)) {
        const property = this.consume("IDENTIFIER" /* IDENTIFIER */, "Expected property name after '.'");
        expr = {
          type: "MemberExpression",
          object: expr,
          property: {
            type: "Identifier",
            name: property.value
          },
          computed: false
        };
      } else if (this.match("LBRACKET" /* LBRACKET */)) {
        const property = this.parseExpression();
        this.consume("RBRACKET" /* RBRACKET */, "Expected ']' after array index");
        expr = {
          type: "MemberExpression",
          object: expr,
          property,
          computed: true
        };
      } else if (this.match("LPAREN" /* LPAREN */)) {
        const args = [];
        if (!this.check("RPAREN" /* RPAREN */)) {
          do {
            args.push(this.parseExpression());
          } while (this.match("COMMA" /* COMMA */));
        }
        this.consume("RPAREN" /* RPAREN */, "Expected ')' after function arguments");
        if (expr.type === "Identifier") {
          expr = {
            type: "CallExpression",
            function: expr.name,
            arguments: args
          };
        } else {
          throw new Error("Invalid function call");
        }
      } else {
        break;
      }
    }
    return expr;
  }
  parsePrimaryExpression() {
    if (this.match("TRUE" /* TRUE */, "FALSE" /* FALSE */)) {
      return {
        type: "Literal",
        value: this.previous().value === "true",
        dataType: "boolean"
      };
    }
    if (this.match("NULL" /* NULL */)) {
      return {
        type: "Literal",
        value: null,
        dataType: "null"
      };
    }
    if (this.match("NUMBER" /* NUMBER */)) {
      const value = parseFloat(this.previous().value);
      return {
        type: "Literal",
        value,
        dataType: "number"
      };
    }
    if (this.match("STRING" /* STRING */)) {
      return {
        type: "Literal",
        value: this.previous().value,
        dataType: "string"
      };
    }
    if (this.match("DATETIME" /* DATETIME */)) {
      return {
        type: "Literal",
        value: this.previous().value,
        dataType: "datetime"
      };
    }
    if (this.match("TIMESPAN" /* TIMESPAN */)) {
      return {
        type: "Literal",
        value: this.previous().value,
        dataType: "timespan"
      };
    }
    if (this.match("GUID" /* GUID */)) {
      return {
        type: "Literal",
        value: this.previous().value,
        dataType: "guid"
      };
    }
    if (this.match("IDENTIFIER" /* IDENTIFIER */, "QUOTED_IDENTIFIER" /* QUOTED_IDENTIFIER */)) {
      const token = this.previous();
      return {
        type: "Identifier",
        name: token.value,
        quoted: token.type === "QUOTED_IDENTIFIER" /* QUOTED_IDENTIFIER */
      };
    }
    if (this.match("LPAREN" /* LPAREN */)) {
      const expr = this.parseExpression();
      this.consume("RPAREN" /* RPAREN */, "Expected ')' after expression");
      return expr;
    }
    if (this.match("CASE" /* CASE */)) {
      return this.parseCaseExpression();
    }
    if (this.match("LBRACKET" /* LBRACKET */)) {
      return this.parseArrayExpression();
    }
    throw new Error(`Unexpected token: ${this.peek().value}`);
  }
  parseCaseExpression() {
    const clauses = [];
    let elseClause;
    while (this.match("WHEN" /* WHEN */)) {
      const when = this.parseExpression();
      this.consume("THEN" /* THEN */, "Expected 'then' after when condition");
      const then = this.parseExpression();
      clauses.push({
        type: "CaseClause",
        when,
        then
      });
    }
    if (this.match("ELSE" /* ELSE */)) {
      elseClause = this.parseExpression();
    }
    this.consume("END" /* END */, "Expected 'end' to close case expression");
    return {
      type: "CaseExpression",
      clauses,
      elseClause
    };
  }
  parseArrayExpression() {
    const elements = [];
    if (!this.check("RBRACKET" /* RBRACKET */)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match("COMMA" /* COMMA */));
    }
    this.consume("RBRACKET" /* RBRACKET */, "Expected ']' after array elements");
    return {
      type: "ArrayExpression",
      elements
    };
  }
  // Helper methods
  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  checkPipe() {
    return this.check("PIPE" /* PIPE */);
  }
  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }
  isAtEnd() {
    return this.peek().type === "EOF" /* EOF */;
  }
  peek() {
    return this.tokens[this.current];
  }
  previous() {
    return this.tokens[this.current - 1];
  }
  consume(type, message) {
    if (this.check(type)) return this.advance();
    this.addError(message, [type]);
    throw new Error(message);
  }
  addError(message, expected) {
    this.errors.push({
      message,
      token: this.peek(),
      expected
    });
  }
};

// src/execution/query-executor.ts
import { LRUCache } from "lru-cache";

// src/execution/sql-generator.ts
var SQLGenerator = class {
  organizationId;
  aliases = /* @__PURE__ */ new Map();
  parameterIndex = 1;
  parameters = [];
  constructor(organizationId) {
    this.organizationId = organizationId;
  }
  generateSQL(query) {
    this.aliases.clear();
    this.parameterIndex = 1;
    this.parameters = [];
    const sql = this.visitQuery(query);
    return { sql, parameters: this.parameters };
  }
  visitQuery(query) {
    let sql = this.visitTableExpression(query.tableExpression);
    for (const operation of query.operations) {
      sql = this.visitOperation(sql, operation);
    }
    return sql;
  }
  visitTableExpression(table) {
    const tableName = this.escapeIdentifier(table.name);
    let sql = `SELECT * FROM ${tableName}`;
    sql += ` WHERE organization_id = $${this.parameterIndex++}`;
    this.parameters.push(this.organizationId);
    if (table.alias) {
      this.aliases.set(table.name, table.alias);
      sql += ` AS ${this.escapeIdentifier(table.alias)}`;
    }
    return `(${sql})`;
  }
  visitOperation(baseSql, operation) {
    switch (operation.type) {
      case "WhereOperation":
        return this.visitWhereOperation(baseSql, operation);
      case "ProjectOperation":
        return this.visitProjectOperation(baseSql, operation);
      case "ExtendOperation":
        return this.visitExtendOperation(baseSql, operation);
      case "SummarizeOperation":
        return this.visitSummarizeOperation(baseSql, operation);
      case "OrderOperation":
        return this.visitOrderOperation(baseSql, operation);
      case "TopOperation":
        return this.visitTopOperation(baseSql, operation);
      case "LimitOperation":
        return this.visitLimitOperation(baseSql, operation);
      case "DistinctOperation":
        return this.visitDistinctOperation(baseSql, operation);
      case "JoinOperation":
        return this.visitJoinOperation(baseSql, operation);
      default:
        throw new Error(`Unsupported operation: ${operation.type}`);
    }
  }
  visitWhereOperation(baseSql, operation) {
    const condition = this.visitExpression(operation.predicate);
    return `SELECT * FROM (${baseSql}) base WHERE ${condition}`;
  }
  visitProjectOperation(baseSql, operation) {
    const columns = operation.columns.map((col) => this.visitProjectColumn(col)).join(", ");
    return `SELECT ${columns} FROM (${baseSql}) base`;
  }
  visitProjectColumn(column) {
    const expr = this.visitExpression(column.expression);
    if (column.alias) {
      return `${expr} AS ${this.escapeIdentifier(column.alias)}`;
    }
    return expr;
  }
  visitExtendOperation(baseSql, operation) {
    const baseColumns = "base.*";
    const extensions = operation.assignments.map((assignment) => {
      const expr = this.visitExpression(assignment.expression);
      return `${expr} AS ${this.escapeIdentifier(assignment.name)}`;
    }).join(", ");
    return `SELECT ${baseColumns}, ${extensions} FROM (${baseSql}) base`;
  }
  visitSummarizeOperation(baseSql, operation) {
    const aggregations = operation.aggregations.map((agg) => this.visitAggregation(agg)).join(", ");
    let sql = `SELECT ${aggregations}`;
    if (operation.by && operation.by.length > 0) {
      const groupBy = operation.by.map((expr) => this.visitExpression(expr)).join(", ");
      sql += `, ${groupBy}`;
      sql += ` FROM (${baseSql}) base GROUP BY ${groupBy}`;
    } else {
      sql += ` FROM (${baseSql}) base`;
    }
    return sql;
  }
  visitAggregation(aggregation) {
    let sql = "";
    switch (aggregation.function) {
      case "count":
        if (aggregation.expression) {
          sql = `COUNT(${this.visitExpression(aggregation.expression)})`;
        } else {
          sql = "COUNT(*)";
        }
        break;
      case "sum":
        sql = `SUM(${this.visitExpression(aggregation.expression)})`;
        break;
      case "avg":
        sql = `AVG(${this.visitExpression(aggregation.expression)})`;
        break;
      case "min":
        sql = `MIN(${this.visitExpression(aggregation.expression)})`;
        break;
      case "max":
        sql = `MAX(${this.visitExpression(aggregation.expression)})`;
        break;
      case "dcount":
        sql = `COUNT(DISTINCT ${this.visitExpression(aggregation.expression)})`;
        break;
      default:
        throw new Error(`Unsupported aggregation function: ${aggregation.function}`);
    }
    if (aggregation.alias) {
      sql += ` AS ${this.escapeIdentifier(aggregation.alias)}`;
    }
    return sql;
  }
  visitOrderOperation(baseSql, operation) {
    const orderBy = operation.orderBy.map((expr) => this.visitOrderByExpression(expr)).join(", ");
    return `SELECT * FROM (${baseSql}) base ORDER BY ${orderBy}`;
  }
  visitOrderByExpression(orderBy) {
    const expr = this.visitExpression(orderBy.expression);
    return `${expr} ${orderBy.direction.toUpperCase()}`;
  }
  visitTopOperation(baseSql, operation) {
    const limit = this.visitExpression(operation.count);
    let sql = `SELECT * FROM (${baseSql}) base`;
    if (operation.by && operation.by.length > 0) {
      const orderBy = operation.by.map((expr) => this.visitOrderByExpression(expr)).join(", ");
      sql += ` ORDER BY ${orderBy}`;
    }
    sql += ` LIMIT ${limit}`;
    return sql;
  }
  visitLimitOperation(baseSql, operation) {
    const limit = this.visitExpression(operation.count);
    return `SELECT * FROM (${baseSql}) base LIMIT ${limit}`;
  }
  visitDistinctOperation(baseSql, operation) {
    if (operation.columns && operation.columns.length > 0) {
      const columns = operation.columns.map((col) => this.visitExpression(col)).join(", ");
      return `SELECT DISTINCT ${columns} FROM (${baseSql}) base`;
    } else {
      return `SELECT DISTINCT * FROM (${baseSql}) base`;
    }
  }
  visitJoinOperation(baseSql, operation) {
    const joinType = this.mapJoinKind(operation.joinKind);
    const rightTable = this.visitTableExpression(operation.table);
    const condition = this.visitExpression(operation.on);
    return `SELECT * FROM (${baseSql}) base ${joinType} JOIN (${rightTable}) joined ON ${condition}`;
  }
  mapJoinKind(joinKind) {
    switch (joinKind) {
      case "inner":
        return "INNER";
      case "left":
        return "LEFT";
      case "right":
        return "RIGHT";
      case "full":
        return "FULL OUTER";
      case "leftanti":
        return "LEFT";
      case "rightsemi":
        return "RIGHT";
      default:
        return "INNER";
    }
  }
  visitExpression(expression) {
    switch (expression.type) {
      case "BinaryExpression":
        return this.visitBinaryExpression(expression);
      case "UnaryExpression":
        return this.visitUnaryExpression(expression);
      case "CallExpression":
        return this.visitCallExpression(expression);
      case "MemberExpression":
        return this.visitMemberExpression(expression);
      case "Identifier":
        return this.visitIdentifier(expression);
      case "Literal":
        return this.visitLiteral(expression);
      default:
        throw new Error(`Unsupported expression type: ${expression.type}`);
    }
  }
  visitBinaryExpression(expression) {
    const left = this.visitExpression(expression.left);
    const right = this.visitExpression(expression.right);
    const operator = this.mapBinaryOperator(expression.operator);
    return `(${left} ${operator} ${right})`;
  }
  mapBinaryOperator(operator) {
    switch (operator) {
      case "==":
        return "=";
      case "!=":
        return "!=";
      case "<":
        return "<";
      case "<=":
        return "<=";
      case ">":
        return ">";
      case ">=":
        return ">=";
      case "and":
        return "AND";
      case "or":
        return "OR";
      case "+":
        return "+";
      case "-":
        return "-";
      case "*":
        return "*";
      case "/":
        return "/";
      case "%":
        return "%";
      case "contains":
        return "ILIKE";
      case "!contains":
        return "NOT ILIKE";
      case "startswith":
        return "ILIKE";
      case "endswith":
        return "ILIKE";
      case "matches":
        return "~*";
      case "in":
        return "IN";
      case "!in":
        return "NOT IN";
      case "like":
        return "LIKE";
      default:
        throw new Error(`Unsupported binary operator: ${operator}`);
    }
  }
  visitUnaryExpression(expression) {
    const operand = this.visitExpression(expression.operand);
    const operator = this.mapUnaryOperator(expression.operator);
    return `${operator}${operand}`;
  }
  mapUnaryOperator(operator) {
    switch (operator) {
      case "not":
        return "NOT ";
      case "-":
        return "-";
      case "+":
        return "+";
      default:
        throw new Error(`Unsupported unary operator: ${operator}`);
    }
  }
  visitCallExpression(expression) {
    const args = expression.arguments.map((arg) => this.visitExpression(arg)).join(", ");
    const functionName = this.mapFunction(expression.function);
    return `${functionName}(${args})`;
  }
  mapFunction(functionName) {
    const functionMap = {
      "strlen": "LENGTH",
      "substring": "SUBSTRING",
      "toupper": "UPPER",
      "tolower": "LOWER",
      "trim": "TRIM",
      "replace": "REPLACE",
      "split": "STRING_TO_ARRAY",
      "strcat": "CONCAT",
      "now": "NOW",
      "floor": "FLOOR",
      "ceil": "CEIL",
      "round": "ROUND",
      "abs": "ABS",
      "sqrt": "SQRT",
      "log": "LN",
      "pow": "POWER",
      "coalesce": "COALESCE",
      "isnull": "IS NULL",
      "isnotnull": "IS NOT NULL",
      "case": "CASE"
    };
    return functionMap[functionName.toLowerCase()] || functionName.toUpperCase();
  }
  visitMemberExpression(expression) {
    const object = this.visitExpression(expression.object);
    if (expression.computed) {
      const property = this.visitExpression(expression.property);
      return `${object}[${property}]`;
    } else {
      const property = this.visitExpression(expression.property);
      return `${object}.${property}`;
    }
  }
  visitIdentifier(expression) {
    if (expression.quoted) {
      return this.escapeIdentifier(expression.name);
    }
    return this.escapeIdentifier(expression.name);
  }
  visitLiteral(expression) {
    if (expression.value === null) {
      return "NULL";
    }
    switch (expression.dataType) {
      case "string":
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case "number":
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case "boolean":
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case "datetime":
        const dateMatch = expression.value.match(/datetime\(([^)]+)\)/);
        if (dateMatch) {
          this.parameters.push(dateMatch[1]);
          return `$${this.parameterIndex++}::timestamp`;
        }
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
      case "timespan":
        this.parameters.push(this.convertTimespanToInterval(expression.value));
        return `$${this.parameterIndex++}::interval`;
      case "guid":
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}::uuid`;
      default:
        this.parameters.push(expression.value);
        return `$${this.parameterIndex++}`;
    }
  }
  convertTimespanToInterval(timespan) {
    const timespanMap = {
      "d": "day",
      "h": "hour",
      "m": "minute",
      "s": "second",
      "ms": "millisecond"
    };
    for (const [suffix, unit] of Object.entries(timespanMap)) {
      if (timespan.endsWith(suffix)) {
        const value = timespan.slice(0, -suffix.length);
        return `${value} ${unit}`;
      }
    }
    return timespan;
  }
  escapeIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
};

// src/execution/types.ts
var OptimizationType = /* @__PURE__ */ ((OptimizationType2) => {
  OptimizationType2["INDEX_USAGE"] = "index_usage";
  OptimizationType2["PREDICATE_PUSHDOWN"] = "predicate_pushdown";
  OptimizationType2["PROJECTION_PUSHDOWN"] = "projection_pushdown";
  OptimizationType2["JOIN_REORDER"] = "join_reorder";
  OptimizationType2["AGGREGATION_PUSHDOWN"] = "aggregation_pushdown";
  OptimizationType2["PARTITION_ELIMINATION"] = "partition_elimination";
  OptimizationType2["CONSTANT_FOLDING"] = "constant_folding";
  OptimizationType2["DEAD_CODE_ELIMINATION"] = "dead_code_elimination";
  return OptimizationType2;
})(OptimizationType || {});

// src/execution/query-optimizer.ts
var QueryOptimizer = class {
  optimizations = [];
  optimize(query) {
    this.optimizations = [];
    let optimizedQuery = { ...query };
    optimizedQuery = this.applyPredicatePushdown(optimizedQuery);
    optimizedQuery = this.applyProjectionPushdown(optimizedQuery);
    optimizedQuery = this.applyConstantFolding(optimizedQuery);
    optimizedQuery = this.applyDeadCodeElimination(optimizedQuery);
    optimizedQuery = this.reorderOperations(optimizedQuery);
    const plan = this.generateExecutionPlan(optimizedQuery);
    return { optimizedQuery, plan };
  }
  applyPredicatePushdown(query) {
    const whereOperations = [];
    const otherOperations = [];
    for (const operation of query.operations) {
      if (operation.type === "WhereOperation") {
        whereOperations.push(operation);
      } else {
        otherOperations.push(operation);
      }
    }
    if (whereOperations.length > 1) {
      const combinedPredicate = this.combinePredicates(whereOperations.map((op) => op.predicate));
      const combinedWhere = {
        type: "WhereOperation",
        predicate: combinedPredicate
      };
      this.optimizations.push({
        type: "predicate_pushdown" /* PREDICATE_PUSHDOWN */,
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
  applyProjectionPushdown(query) {
    const projectOperations = [];
    const otherOperations = [];
    for (const operation of query.operations) {
      if (operation.type === "ProjectOperation") {
        projectOperations.push(operation);
      } else {
        otherOperations.push(operation);
      }
    }
    if (projectOperations.length > 0) {
      const lastProject = projectOperations[projectOperations.length - 1];
      const canMoveEarlier = this.canMoveProjectionEarlier(lastProject, otherOperations);
      if (canMoveEarlier) {
        this.optimizations.push({
          type: "projection_pushdown" /* PROJECTION_PUSHDOWN */,
          description: "Moved projection earlier in pipeline",
          estimatedImprovement: 0.2,
          applied: true
        });
        const whereOps = otherOperations.filter((op) => op.type === "WhereOperation");
        const nonWhereOps = otherOperations.filter((op) => op.type !== "WhereOperation");
        return {
          ...query,
          operations: [...whereOps, lastProject, ...nonWhereOps]
        };
      }
    }
    return query;
  }
  applyConstantFolding(query) {
    const foldedQuery = this.foldConstants(query);
    if (foldedQuery !== query) {
      this.optimizations.push({
        type: "constant_folding" /* CONSTANT_FOLDING */,
        description: "Folded constant expressions",
        estimatedImprovement: 0.05,
        applied: true
      });
    }
    return foldedQuery;
  }
  applyDeadCodeElimination(query) {
    const usedColumns = this.findUsedColumns(query);
    const eliminatedQuery = this.eliminateDeadCode(query, usedColumns);
    if (eliminatedQuery !== query) {
      this.optimizations.push({
        type: "dead_code_elimination" /* DEAD_CODE_ELIMINATION */,
        description: "Eliminated unused columns and operations",
        estimatedImprovement: 0.1,
        applied: true
      });
    }
    return eliminatedQuery;
  }
  reorderOperations(query) {
    const reorderedOperations = [...query.operations];
    reorderedOperations.sort((a, b) => {
      const costA = this.getOperationCost(a);
      const costB = this.getOperationCost(b);
      return costA - costB;
    });
    const whereOps = reorderedOperations.filter((op) => op.type === "WhereOperation");
    const projectOps = reorderedOperations.filter((op) => op.type === "ProjectOperation");
    const otherOps = reorderedOperations.filter(
      (op) => op.type !== "WhereOperation" && op.type !== "ProjectOperation"
    );
    const finalOrder = [...whereOps, ...projectOps, ...otherOps];
    if (JSON.stringify(finalOrder) !== JSON.stringify(query.operations)) {
      this.optimizations.push({
        type: "join_reorder" /* JOIN_REORDER */,
        description: "Reordered operations for better performance",
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
  combinePredicates(predicates) {
    if (predicates.length === 1) {
      return predicates[0];
    }
    return predicates.reduce((combined, predicate) => ({
      type: "BinaryExpression",
      operator: "and",
      left: combined,
      right: predicate
    }));
  }
  canMoveProjectionEarlier(project, operations) {
    const projectColumns = project.columns.map((col) => {
      if (col.expression.type === "Identifier") {
        return col.expression.name;
      }
      return null;
    }).filter(Boolean);
    for (const operation of operations) {
      const usedColumns = this.getOperationColumns(operation);
      const hasUnprojectedColumns = usedColumns.some((col) => !projectColumns.includes(col));
      if (hasUnprojectedColumns) {
        return false;
      }
    }
    return true;
  }
  foldConstants(query) {
    return {
      ...query,
      operations: query.operations.map((op) => this.foldOperationConstants(op))
    };
  }
  foldOperationConstants(operation) {
    switch (operation.type) {
      case "WhereOperation":
        return {
          ...operation,
          predicate: this.foldExpressionConstants(operation.predicate)
        };
      case "ProjectOperation":
        return {
          ...operation,
          columns: operation.columns.map((col) => ({
            ...col,
            expression: this.foldExpressionConstants(col.expression)
          }))
        };
      case "ExtendOperation":
        return {
          ...operation,
          assignments: operation.assignments.map((assignment) => ({
            ...assignment,
            expression: this.foldExpressionConstants(assignment.expression)
          }))
        };
      default:
        return operation;
    }
  }
  foldExpressionConstants(expression) {
    if (expression.type === "BinaryExpression") {
      const left = this.foldExpressionConstants(expression.left);
      const right = this.foldExpressionConstants(expression.right);
      if (left.type === "Literal" && right.type === "Literal") {
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
  evaluateBinaryExpression(operator, left, right) {
    const leftVal = left.value;
    const rightVal = right.value;
    switch (operator) {
      case "+":
        return { type: "Literal", value: leftVal + rightVal, dataType: "number" };
      case "-":
        return { type: "Literal", value: leftVal - rightVal, dataType: "number" };
      case "*":
        return { type: "Literal", value: leftVal * rightVal, dataType: "number" };
      case "/":
        return { type: "Literal", value: leftVal / rightVal, dataType: "number" };
      case "==":
        return { type: "Literal", value: leftVal === rightVal, dataType: "boolean" };
      case "!=":
        return { type: "Literal", value: leftVal !== rightVal, dataType: "boolean" };
      case "<":
        return { type: "Literal", value: leftVal < rightVal, dataType: "boolean" };
      case "<=":
        return { type: "Literal", value: leftVal <= rightVal, dataType: "boolean" };
      case ">":
        return { type: "Literal", value: leftVal > rightVal, dataType: "boolean" };
      case ">=":
        return { type: "Literal", value: leftVal >= rightVal, dataType: "boolean" };
      default:
        return left;
    }
  }
  findUsedColumns(query) {
    const usedColumns = /* @__PURE__ */ new Set();
    usedColumns.add("*");
    for (const operation of query.operations) {
      const operationColumns = this.getOperationColumns(operation);
      operationColumns.forEach((col) => usedColumns.add(col));
    }
    return usedColumns;
  }
  getOperationColumns(operation) {
    const columns = [];
    switch (operation.type) {
      case "WhereOperation":
        columns.push(...this.getExpressionColumns(operation.predicate));
        break;
      case "ProjectOperation":
        operation.columns.forEach((col) => {
          columns.push(...this.getExpressionColumns(col.expression));
        });
        break;
      case "ExtendOperation":
        operation.assignments.forEach((assignment) => {
          columns.push(...this.getExpressionColumns(assignment.expression));
        });
        break;
      case "SummarizeOperation":
        operation.aggregations.forEach((agg) => {
          if (agg.expression) {
            columns.push(...this.getExpressionColumns(agg.expression));
          }
        });
        if (operation.by) {
          operation.by.forEach((expr) => {
            columns.push(...this.getExpressionColumns(expr));
          });
        }
        break;
      case "OrderOperation":
        operation.orderBy.forEach((orderBy) => {
          columns.push(...this.getExpressionColumns(orderBy.expression));
        });
        break;
    }
    return columns;
  }
  getExpressionColumns(expression) {
    const columns = [];
    switch (expression.type) {
      case "Identifier":
        columns.push(expression.name);
        break;
      case "BinaryExpression":
        columns.push(...this.getExpressionColumns(expression.left));
        columns.push(...this.getExpressionColumns(expression.right));
        break;
      case "UnaryExpression":
        columns.push(...this.getExpressionColumns(expression.operand));
        break;
      case "CallExpression":
        expression.arguments.forEach((arg) => {
          columns.push(...this.getExpressionColumns(arg));
        });
        break;
      case "MemberExpression":
        columns.push(...this.getExpressionColumns(expression.object));
        if (expression.computed) {
          columns.push(...this.getExpressionColumns(expression.property));
        }
        break;
    }
    return columns;
  }
  eliminateDeadCode(query, usedColumns) {
    return query;
  }
  getOperationCost(operation) {
    switch (operation.type) {
      case "WhereOperation":
        return 1;
      case "ProjectOperation":
        return 2;
      case "ExtendOperation":
        return 3;
      case "OrderOperation":
        return 8;
      case "TopOperation":
        return 6;
      case "LimitOperation":
        return 1;
      case "DistinctOperation":
        return 7;
      case "SummarizeOperation":
        return 9;
      case "JoinOperation":
        return 10;
      case "UnionOperation":
        return 5;
      default:
        return 5;
    }
  }
  generateExecutionPlan(query) {
    const steps = [];
    let currentRows = 1e6;
    let totalCost = 0;
    steps.push({
      operation: "TableScan",
      description: `Scan table: ${query.tableExpression.name}`,
      estimatedRows: currentRows,
      estimatedCost: 10,
      index: 0
    });
    totalCost += 10;
    query.operations.forEach((operation, index) => {
      const step = this.createExecutionStep(operation, currentRows, index + 1);
      steps.push(step);
      currentRows = step.estimatedRows;
      totalCost += step.estimatedCost;
    });
    return {
      steps,
      estimatedCost: totalCost,
      optimizations: this.optimizations.filter((opt) => opt.applied).map((opt) => opt.description)
    };
  }
  createExecutionStep(operation, inputRows, index) {
    let estimatedRows = inputRows;
    let estimatedCost = 0;
    let description = "";
    switch (operation.type) {
      case "WhereOperation":
        estimatedRows = Math.floor(inputRows * 0.1);
        estimatedCost = inputRows * 1e-3;
        description = "Filter rows with WHERE condition";
        break;
      case "ProjectOperation":
        estimatedCost = inputRows * 1e-4;
        description = `Project ${operation.columns.length} columns`;
        break;
      case "SummarizeOperation":
        estimatedRows = Math.floor(inputRows * 0.01);
        estimatedCost = inputRows * 0.01;
        description = `Summarize with ${operation.aggregations.length} aggregations`;
        break;
      case "OrderOperation":
        estimatedCost = inputRows * Math.log2(inputRows) * 1e-3;
        description = `Sort by ${operation.orderBy.length} columns`;
        break;
      case "TopOperation":
        estimatedRows = Math.min(inputRows, 1e3);
        estimatedCost = inputRows * Math.log2(inputRows) * 1e-3;
        description = "Take top N rows";
        break;
      case "LimitOperation":
        estimatedRows = Math.min(inputRows, 1e3);
        estimatedCost = 1;
        description = "Limit result set";
        break;
      case "DistinctOperation":
        estimatedRows = Math.floor(inputRows * 0.8);
        estimatedCost = inputRows * 0.01;
        description = "Remove duplicate rows";
        break;
      default:
        estimatedCost = inputRows * 1e-3;
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
  getOptimizations() {
    return this.optimizations;
  }
};

// src/execution/query-executor.ts
var QueryExecutor = class {
  db;
  cache;
  optimizer;
  constructor(db, cacheOptions) {
    this.db = db;
    this.cache = new LRUCache({
      max: cacheOptions?.max || 1e3,
      ttl: cacheOptions?.ttl || 5 * 60 * 1e3,
      // 5 minutes default
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
    this.optimizer = new QueryOptimizer();
  }
  async executeKQL(kqlQuery, context) {
    const startTime = Date.now();
    let client = null;
    try {
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
      const parseStartTime = Date.now();
      const lexer = new KQLLexer(kqlQuery);
      const { tokens, errors: lexErrors } = lexer.tokenize();
      if (lexErrors.length > 0) {
        throw new Error(`Lexical errors: ${lexErrors.map((e) => e.message).join(", ")}`);
      }
      const parser = new KQLParser(tokens);
      const { query, errors: parseErrors } = parser.parse();
      if (parseErrors.length > 0 || !query) {
        throw new Error(`Parse errors: ${parseErrors.map((e) => e.message).join(", ")}`);
      }
      const parseTime = Date.now() - parseStartTime;
      const planStartTime = Date.now();
      const { optimizedQuery, plan } = this.optimizer.optimize(query);
      const planTime = Date.now() - planStartTime;
      const sqlGenerator = new SQLGenerator(context.organizationId);
      const { sql, parameters } = sqlGenerator.generateSQL(optimizedQuery);
      let finalSql = sql;
      let finalParameters = [...parameters];
      if (context.timeRange) {
        finalSql += ` AND timestamp BETWEEN $${parameters.length + 1} AND $${parameters.length + 2}`;
        finalParameters.push(context.timeRange.start, context.timeRange.end);
      }
      if (context.maxRows) {
        finalSql += ` LIMIT $${finalParameters.length + 1}`;
        finalParameters.push(context.maxRows);
      }
      const executionStartTime = Date.now();
      client = await this.db.connect();
      if (context.timeout) {
        await client.query(`SET statement_timeout = ${context.timeout}`);
      }
      const result = await client.query(finalSql, finalParameters);
      const executionTime = Date.now() - executionStartTime;
      const queryResult = this.processResults(result, {
        parseTime,
        planTime,
        executionTime,
        totalTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuTime: process.cpuUsage().system + process.cpuUsage().user,
        ioOperations: 0
        // Would need to be tracked separately
      }, plan);
      if (context.cache !== false) {
        const cacheKey = this.createCacheKey(kqlQuery, context);
        this.setCache(cacheKey, queryResult);
      }
      return queryResult;
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  async explainKQL(kqlQuery, context) {
    try {
      const lexer = new KQLLexer(kqlQuery);
      const { tokens, errors: lexErrors } = lexer.tokenize();
      if (lexErrors.length > 0) {
        throw new Error(`Lexical errors: ${lexErrors.map((e) => e.message).join(", ")}`);
      }
      const parser = new KQLParser(tokens);
      const { query, errors: parseErrors } = parser.parse();
      if (parseErrors.length > 0 || !query) {
        throw new Error(`Parse errors: ${parseErrors.map((e) => e.message).join(", ")}`);
      }
      const { optimizedQuery, plan } = this.optimizer.optimize(query);
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
      const pgPlan = result.rows[0]["QUERY PLAN"][0];
      return {
        totalRows: 0,
        scannedRows: pgPlan["Plan"]["Plan Rows"] || 0,
        executionPlan: plan,
        performance: {
          parseTime: 0,
          planTime: 0,
          executionTime: pgPlan["Plan"]["Total Cost"] || 0,
          totalTime: 0,
          memoryUsage: 0,
          cpuTime: 0,
          ioOperations: 0
        }
      };
    } catch (error) {
      throw new Error(`Query explanation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async validateKQL(kqlQuery) {
    try {
      const lexer = new KQLLexer(kqlQuery);
      const { tokens, errors: lexErrors } = lexer.tokenize();
      if (lexErrors.length > 0) {
        return {
          valid: false,
          errors: lexErrors.map((e) => e.message)
        };
      }
      const parser = new KQLParser(tokens);
      const { query, errors: parseErrors } = parser.parse();
      if (parseErrors.length > 0 || !query) {
        return {
          valid: false,
          errors: parseErrors.map((e) => e.message)
        };
      }
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Unknown validation error"]
      };
    }
  }
  processResults(pgResult, performance, plan) {
    const columns = pgResult.fields.map((field) => ({
      name: field.name,
      type: this.mapPostgreSQLType(field.dataTypeID),
      nullable: true
      // PostgreSQL doesn't provide nullable info in result
    }));
    const rows = pgResult.rows.map((row) => {
      const resultRow = {};
      columns.forEach((col) => {
        resultRow[col.name] = row[col.name];
      });
      return resultRow;
    });
    const metadata = {
      totalRows: pgResult.rowCount || 0,
      scannedRows: pgResult.rowCount || 0,
      // Would need to be tracked separately
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
  mapPostgreSQLType(dataTypeID) {
    const typeMap = {
      16: "boolean",
      // bool
      20: "bigint",
      // int8
      21: "smallint",
      // int2
      23: "integer",
      // int4
      25: "text",
      // text
      700: "real",
      // float4
      701: "double",
      // float8
      1043: "varchar",
      // varchar
      1082: "date",
      // date
      1114: "timestamp",
      // timestamp
      1184: "timestamptz",
      // timestamptz
      2950: "uuid",
      // uuid
      3802: "jsonb"
      // jsonb
    };
    return typeMap[dataTypeID] || "unknown";
  }
  createCacheKey(kqlQuery, context) {
    const key = {
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
  getFromCache(keyStr) {
    const entry = this.cache.get(keyStr);
    if (entry && entry.expiresAt > /* @__PURE__ */ new Date()) {
      return entry;
    }
    if (entry) {
      this.cache.delete(keyStr);
    }
    return null;
  }
  setCache(keyStr, result) {
    const entry = {
      key: JSON.parse(keyStr),
      result,
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1e3),
      // 5 minutes
      size: JSON.stringify(result).length
    };
    this.cache.set(keyStr, entry);
  }
  // Statistics and monitoring methods
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: 0,
      // LRU cache doesn't provide this by default
      misses: 0
      // Would need to track separately
    };
  }
  clearCache() {
    this.cache.clear();
  }
  async getTableSchemas(_organizationId) {
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
      const schemas = {};
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
          nullable: row.is_nullable === "YES",
          defaultValue: row.column_default
        });
      }
      return schemas;
    } finally {
      client.release();
    }
  }
};

// src/intellisense/types.ts
var CompletionItemKind = /* @__PURE__ */ ((CompletionItemKind2) => {
  CompletionItemKind2[CompletionItemKind2["Text"] = 1] = "Text";
  CompletionItemKind2[CompletionItemKind2["Method"] = 2] = "Method";
  CompletionItemKind2[CompletionItemKind2["Function"] = 3] = "Function";
  CompletionItemKind2[CompletionItemKind2["Constructor"] = 4] = "Constructor";
  CompletionItemKind2[CompletionItemKind2["Field"] = 5] = "Field";
  CompletionItemKind2[CompletionItemKind2["Variable"] = 6] = "Variable";
  CompletionItemKind2[CompletionItemKind2["Class"] = 7] = "Class";
  CompletionItemKind2[CompletionItemKind2["Interface"] = 8] = "Interface";
  CompletionItemKind2[CompletionItemKind2["Module"] = 9] = "Module";
  CompletionItemKind2[CompletionItemKind2["Property"] = 10] = "Property";
  CompletionItemKind2[CompletionItemKind2["Unit"] = 11] = "Unit";
  CompletionItemKind2[CompletionItemKind2["Value"] = 12] = "Value";
  CompletionItemKind2[CompletionItemKind2["Enum"] = 13] = "Enum";
  CompletionItemKind2[CompletionItemKind2["Keyword"] = 14] = "Keyword";
  CompletionItemKind2[CompletionItemKind2["Snippet"] = 15] = "Snippet";
  CompletionItemKind2[CompletionItemKind2["Color"] = 16] = "Color";
  CompletionItemKind2[CompletionItemKind2["File"] = 17] = "File";
  CompletionItemKind2[CompletionItemKind2["Reference"] = 18] = "Reference";
  CompletionItemKind2[CompletionItemKind2["Folder"] = 19] = "Folder";
  CompletionItemKind2[CompletionItemKind2["EnumMember"] = 20] = "EnumMember";
  CompletionItemKind2[CompletionItemKind2["Constant"] = 21] = "Constant";
  CompletionItemKind2[CompletionItemKind2["Struct"] = 22] = "Struct";
  CompletionItemKind2[CompletionItemKind2["Event"] = 23] = "Event";
  CompletionItemKind2[CompletionItemKind2["Operator"] = 24] = "Operator";
  CompletionItemKind2[CompletionItemKind2["TypeParameter"] = 25] = "TypeParameter";
  CompletionItemKind2[CompletionItemKind2["Table"] = 26] = "Table";
  CompletionItemKind2[CompletionItemKind2["Column"] = 27] = "Column";
  return CompletionItemKind2;
})(CompletionItemKind || {});
var CompletionTriggerKind = /* @__PURE__ */ ((CompletionTriggerKind3) => {
  CompletionTriggerKind3[CompletionTriggerKind3["Invoked"] = 1] = "Invoked";
  CompletionTriggerKind3[CompletionTriggerKind3["TriggerCharacter"] = 2] = "TriggerCharacter";
  CompletionTriggerKind3[CompletionTriggerKind3["TriggerForIncompleteCompletions"] = 3] = "TriggerForIncompleteCompletions";
  return CompletionTriggerKind3;
})(CompletionTriggerKind || {});
var DiagnosticSeverity = /* @__PURE__ */ ((DiagnosticSeverity2) => {
  DiagnosticSeverity2[DiagnosticSeverity2["Error"] = 1] = "Error";
  DiagnosticSeverity2[DiagnosticSeverity2["Warning"] = 2] = "Warning";
  DiagnosticSeverity2[DiagnosticSeverity2["Information"] = 3] = "Information";
  DiagnosticSeverity2[DiagnosticSeverity2["Hint"] = 4] = "Hint";
  return DiagnosticSeverity2;
})(DiagnosticSeverity || {});

// src/intellisense/completion-provider.ts
var CompletionProvider = class {
  schemaProvider;
  constructor(schemaProvider) {
    this.schemaProvider = schemaProvider;
  }
  async provideCompletions(text, position, context) {
    const queryContext = this.analyzeQueryContext(text, position);
    const completions = [];
    if (this.isAtBeginning(queryContext)) {
      completions.push(...this.getTableCompletions());
    } else if (this.isAfterPipe(queryContext)) {
      completions.push(...this.getCommandCompletions());
    } else if (this.isInWhereClause(queryContext)) {
      completions.push(...this.getColumnCompletions(queryContext.currentTable));
      completions.push(...this.getOperatorCompletions());
      completions.push(...this.getFunctionCompletions());
    } else if (this.isInProjectClause(queryContext)) {
      completions.push(...this.getColumnCompletions(queryContext.currentTable));
      completions.push(...this.getFunctionCompletions());
    } else if (this.isInSummarizeClause(queryContext)) {
      completions.push(...this.getAggregationCompletions());
      completions.push(...this.getColumnCompletions(queryContext.currentTable));
    } else if (this.isInFunctionCall(queryContext)) {
      completions.push(...this.getFunctionParameterCompletions(queryContext.functionContext));
    } else {
      completions.push(...this.getGeneralCompletions(queryContext));
    }
    return this.filterAndSortCompletions(completions, queryContext);
  }
  analyzeQueryContext(text, position) {
    const lines = text.split("\n");
    const currentLine = lines[position.line] || "";
    const beforeCursor = currentLine.substring(0, position.character);
    const textToCursor = lines.slice(0, position.line).join("\n") + (position.line < lines.length ? "\n" + beforeCursor : beforeCursor);
    const lexer = new KQLLexer(textToCursor);
    const { tokens } = lexer.tokenize();
    let currentTable;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "IDENTIFIER" /* IDENTIFIER */ && (i === 0 || tokens[i - 1].type === "PIPE" /* PIPE */)) {
        const tableName = tokens[i].value;
        if (this.schemaProvider.getTable(tableName)) {
          currentTable = tableName;
        }
      }
    }
    const context = {
      position,
      text: textToCursor,
      currentTable,
      availableColumns: currentTable ? this.schemaProvider.getColumns(currentTable).map((c) => c.name) : []
    };
    context.functionContext = this.getFunctionContext(tokens, position);
    return context;
  }
  isAtBeginning(context) {
    const trimmed = context.text.trim();
    return trimmed === "" || !trimmed.includes("|");
  }
  isAfterPipe(context) {
    const lastPipeIndex = context.text.lastIndexOf("|");
    if (lastPipeIndex === -1) return false;
    const afterPipe = context.text.substring(lastPipeIndex + 1).trim();
    return afterPipe === "" || afterPipe.split(/\s+/).length === 1;
  }
  isInWhereClause(context) {
    const lastPipeIndex = context.text.lastIndexOf("|");
    const afterPipe = lastPipeIndex >= 0 ? context.text.substring(lastPipeIndex + 1) : context.text;
    return /\\bwhere\\b/i.test(afterPipe) && !this.isAfterPipe(context);
  }
  isInProjectClause(context) {
    const lastPipeIndex = context.text.lastIndexOf("|");
    const afterPipe = lastPipeIndex >= 0 ? context.text.substring(lastPipeIndex + 1) : context.text;
    return /\\bproject\\b/i.test(afterPipe) && !this.isAfterPipe(context);
  }
  isInSummarizeClause(context) {
    const lastPipeIndex = context.text.lastIndexOf("|");
    const afterPipe = lastPipeIndex >= 0 ? context.text.substring(lastPipeIndex + 1) : context.text;
    return /\\bsummarize\\b/i.test(afterPipe) && !this.isAfterPipe(context);
  }
  isInFunctionCall(context) {
    return context.functionContext !== void 0;
  }
  getFunctionContext(tokens, position) {
    let functionName = "";
    let parameterIndex = 0;
    let parenDepth = 0;
    let inFunction = false;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.type === "RPAREN" /* RPAREN */) {
        parenDepth++;
      } else if (token.type === "LPAREN" /* LPAREN */) {
        parenDepth--;
        if (parenDepth < 0 && i > 0 && tokens[i - 1].type === "IDENTIFIER" /* IDENTIFIER */) {
          functionName = tokens[i - 1].value;
          inFunction = true;
          break;
        }
      } else if (token.type === "COMMA" /* COMMA */ && parenDepth === 0) {
        parameterIndex++;
      }
    }
    return inFunction ? { name: functionName, parameterIndex } : void 0;
  }
  getTableCompletions() {
    return this.schemaProvider.getTables().map((table) => ({
      label: table.name,
      kind: 26 /* Table */,
      detail: "Table",
      documentation: table.description,
      insertText: table.name,
      sortText: `0_${table.name}`
    }));
  }
  getCommandCompletions() {
    const commands = [
      "where",
      "project",
      "extend",
      "summarize",
      "order",
      "top",
      "limit",
      "distinct",
      "join",
      "union",
      "let"
    ];
    return commands.map((cmd) => ({
      label: cmd,
      kind: 14 /* Keyword */,
      detail: "Command",
      documentation: this.getCommandDocumentation(cmd),
      insertText: cmd + " ",
      sortText: `1_${cmd}`
    }));
  }
  getColumnCompletions(tableName) {
    if (!tableName) return [];
    const columns = this.schemaProvider.getColumns(tableName);
    return columns.map((column) => ({
      label: column.name,
      kind: 5 /* Field */,
      detail: `${column.type}${column.nullable ? " (nullable)" : ""}`,
      documentation: column.description,
      insertText: column.name,
      sortText: `2_${column.name}`
    }));
  }
  getOperatorCompletions() {
    const operators = this.schemaProvider.getOperators();
    return operators.map((op) => ({
      label: op.operator,
      kind: 24 /* Operator */,
      detail: `${op.leftType} ${op.operator} ${op.rightType} -> ${op.returnType}`,
      documentation: op.description,
      insertText: op.operator,
      sortText: `3_${op.operator}`
    }));
  }
  getFunctionCompletions() {
    const functions = this.schemaProvider.getFunctions();
    return functions.map((func) => ({
      label: func.name,
      kind: 3 /* Function */,
      detail: this.getFunctionSignature(func),
      documentation: func.description,
      insertText: this.getFunctionInsertText(func),
      sortText: `4_${func.name}`
    }));
  }
  getAggregationCompletions() {
    const functions = this.schemaProvider.getFunctions().filter((f) => f.category === "aggregation");
    return functions.map((func) => ({
      label: func.name,
      kind: 3 /* Function */,
      detail: this.getFunctionSignature(func),
      documentation: func.description,
      insertText: this.getFunctionInsertText(func),
      sortText: `1_${func.name}`
      // Higher priority for aggregations in summarize
    }));
  }
  getFunctionParameterCompletions(functionContext) {
    const func = this.schemaProvider.getFunction(functionContext.name);
    if (!func || functionContext.parameterIndex >= func.parameters.length) {
      return [];
    }
    const parameter = func.parameters[functionContext.parameterIndex];
    const completions = [];
    if (parameter.type === "timespan") {
      completions.push(...this.getTimespanCompletions());
    } else if (parameter.type === "string" && parameter.name === "column") {
      completions.push(...this.getColumnCompletions());
    }
    return completions;
  }
  getTimespanCompletions() {
    const timespans = ["1s", "30s", "1m", "5m", "15m", "30m", "1h", "6h", "12h", "1d", "7d", "30d"];
    return timespans.map((ts) => ({
      label: ts,
      kind: 12 /* Value */,
      detail: "Timespan",
      insertText: ts,
      sortText: `1_${ts}`
    }));
  }
  getGeneralCompletions(context) {
    const completions = [];
    completions.push(...this.getKeywordCompletions());
    if (context.currentTable) {
      completions.push(...this.getColumnCompletions(context.currentTable));
    }
    completions.push(...this.getFunctionCompletions());
    return completions;
  }
  getKeywordCompletions() {
    const keywords = this.schemaProvider.getKeywords();
    return keywords.map((keyword) => ({
      label: keyword.keyword,
      kind: 14 /* Keyword */,
      detail: keyword.category,
      documentation: keyword.description,
      insertText: keyword.keyword,
      sortText: `5_${keyword.keyword}`
    }));
  }
  getFunctionSignature(func) {
    const params = func.parameters.map(
      (p) => `${p.name}: ${p.type}${p.optional ? "?" : ""}`
    ).join(", ");
    return `${func.name}(${params}) -> ${func.returnType}`;
  }
  getFunctionInsertText(func) {
    const requiredParams = func.parameters.filter((p) => !p.optional);
    if (requiredParams.length === 0) {
      return `${func.name}()`;
    }
    const paramPlaceholders = requiredParams.map((_, index) => `$${index + 1}`).join(", ");
    return `${func.name}(${paramPlaceholders})`;
  }
  getCommandDocumentation(command) {
    const docs = {
      where: "Filters a table to the subset of rows that satisfy a predicate",
      project: "Select what columns to include, rename or drop, and insert new computed columns",
      extend: "Create calculated columns and append them to the result set",
      summarize: "Produce a table that aggregates the content of the input table",
      order: "Sort the rows of the input table by one or more columns",
      top: "Returns the first N records sorted by the specified columns",
      limit: "Return up to the specified number of rows",
      distinct: "Produces a table with the distinct combination of the provided columns",
      join: "Merge the rows of two tables to form a new table",
      union: "Takes two or more tables and returns the rows of all of them"
    };
    return docs[command] || "";
  }
  filterAndSortCompletions(completions, context) {
    const currentWord = this.getCurrentWord(context);
    if (!currentWord) {
      return completions.sort((a, b) => (a.sortText || a.label).localeCompare(b.sortText || b.label));
    }
    const filtered = completions.filter(
      (item) => item.label.toLowerCase().startsWith(currentWord.toLowerCase()) || item.filterText && item.filterText.toLowerCase().startsWith(currentWord.toLowerCase())
    );
    return filtered.sort((a, b) => {
      const aExact = a.label.toLowerCase() === currentWord.toLowerCase() ? 0 : 1;
      const bExact = b.label.toLowerCase() === currentWord.toLowerCase() ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (a.sortText || a.label).localeCompare(b.sortText || b.label);
    });
  }
  getCurrentWord(context) {
    const line = context.text.split("\n")[context.position.line] || "";
    const beforeCursor = line.substring(0, context.position.character);
    const match = beforeCursor.match(/[\w_]+$/);
    return match ? match[0] : "";
  }
};

// src/intellisense/schema-provider.ts
var SchemaProvider = class {
  schema;
  constructor() {
    this.schema = this.initializeSchema();
  }
  getSchema() {
    return this.schema;
  }
  getTables() {
    return this.schema.tables;
  }
  getTable(name) {
    return this.schema.tables.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }
  getColumns(tableName) {
    const table = this.getTable(tableName);
    return table ? table.columns : [];
  }
  getColumn(tableName, columnName) {
    const columns = this.getColumns(tableName);
    return columns.find((c) => c.name.toLowerCase() === columnName.toLowerCase());
  }
  getFunctions() {
    return this.schema.functions;
  }
  getFunction(name) {
    return this.schema.functions.find((f) => f.name.toLowerCase() === name.toLowerCase());
  }
  getOperators() {
    return this.schema.operators;
  }
  getKeywords() {
    return this.schema.keywords;
  }
  initializeSchema() {
    return {
      tables: this.initializeTables(),
      functions: this.initializeFunctions(),
      operators: this.initializeOperators(),
      keywords: this.initializeKeywords()
    };
  }
  initializeTables() {
    return [
      {
        name: "logs",
        description: "Main table containing all normalized log events",
        columns: [
          { name: "id", type: "string", description: "Unique event identifier", nullable: false },
          { name: "timestamp", type: "datetime", description: "Event timestamp", nullable: false, examples: ["2024-01-01T12:00:00Z"] },
          { name: "organization_id", type: "string", description: "Organization identifier", nullable: false },
          { name: "source_identifier", type: "string", description: "Log source identifier", nullable: false, examples: ["macos_auth_events", "windows_security", "syslog"] },
          { name: "source_type", type: "string", description: "Log source type", nullable: false, examples: ["macos-agent", "windows", "syslog"] },
          { name: "log_level", type: "string", description: "Log level", nullable: true, examples: ["INFO", "WARN", "ERROR", "DEBUG"] },
          { name: "message", type: "string", description: "Event message or description", nullable: true },
          { name: "facility", type: "string", description: "Syslog facility", nullable: true },
          { name: "severity", type: "int", description: "Syslog severity level", nullable: true },
          { name: "hostname", type: "string", description: "Source hostname", nullable: true },
          { name: "process_name", type: "string", description: "Process name", nullable: true },
          { name: "process_id", type: "int", description: "Process ID", nullable: true },
          { name: "user_name", type: "string", description: "Associated username", nullable: true },
          { name: "event_id", type: "string", description: "Event ID", nullable: true },
          { name: "event_category", type: "string", description: "Event category", nullable: true, examples: ["authentication", "network", "process", "file"] },
          { name: "event_subcategory", type: "string", description: "Event subcategory", nullable: true },
          { name: "source_ip", type: "string", description: "Source IP address", nullable: true },
          { name: "destination_ip", type: "string", description: "Destination IP address", nullable: true },
          { name: "source_port", type: "int", description: "Source port", nullable: true },
          { name: "destination_port", type: "int", description: "Destination port", nullable: true },
          { name: "protocol", type: "string", description: "Network protocol", nullable: true },
          { name: "file_path", type: "string", description: "File path", nullable: true },
          { name: "file_hash", type: "string", description: "File hash", nullable: true },
          { name: "auth_user", type: "string", description: "Authentication user", nullable: true },
          { name: "auth_domain", type: "string", description: "Authentication domain", nullable: true },
          { name: "auth_method", type: "string", description: "Authentication method", nullable: true },
          { name: "auth_result", type: "string", description: "Authentication result", nullable: true },
          { name: "attributes", type: "dynamic", description: "Additional event attributes as JSON", nullable: true },
          { name: "ingested_at", type: "datetime", description: "Ingestion timestamp", nullable: true },
          { name: "processed_at", type: "datetime", description: "Processing timestamp", nullable: true },
          { name: "normalized", type: "bool", description: "Whether the log is normalized", nullable: true },
          { name: "enriched", type: "bool", description: "Whether the log is enriched", nullable: true },
          { name: "search_vector", type: "string", description: "Full-text search vector", nullable: true }
        ],
        sampleQueries: [
          'logs | where log_level == "ERROR"',
          "logs | where timestamp > ago(1h)",
          "logs | summarize count() by source_type",
          'logs | where user_name contains "admin"',
          'logs | where hostname contains "server"',
          'logs | where source_identifier == "macos_auth_events"'
        ]
      },
      {
        name: "log_events_warm",
        description: "Warm tier storage for older log events (8-30 days)",
        columns: [
          { name: "id", type: "string", description: "Unique event identifier", nullable: false },
          { name: "timestamp", type: "datetime", description: "Event timestamp", nullable: false },
          { name: "organization_id", type: "string", description: "Organization identifier", nullable: false },
          { name: "source", type: "string", description: "Log source system", nullable: false },
          { name: "severity", type: "string", description: "Event severity level", nullable: false },
          { name: "category", type: "string", description: "Event category", nullable: false },
          { name: "message", type: "string", description: "Event message or description", nullable: true },
          { name: "event_data", type: "dynamic", description: "Additional event data as JSON", nullable: true },
          { name: "risk_score", type: "int", description: "Risk score (0-100)", nullable: true }
        ]
      },
      {
        name: "log_events_cold",
        description: "Cold tier storage for archived log events (31-90 days)",
        columns: [
          { name: "id", type: "string", description: "Unique event identifier", nullable: false },
          { name: "timestamp", type: "datetime", description: "Event timestamp", nullable: false },
          { name: "organization_id", type: "string", description: "Organization identifier", nullable: false },
          { name: "source", type: "string", description: "Log source system", nullable: false },
          { name: "severity", type: "string", description: "Event severity level", nullable: false },
          { name: "category", type: "string", description: "Event category", nullable: false },
          { name: "message", type: "string", description: "Event message or description", nullable: true },
          { name: "event_data", type: "dynamic", description: "Additional event data as JSON", nullable: true },
          { name: "risk_score", type: "int", description: "Risk score (0-100)", nullable: true }
        ]
      },
      {
        name: "log_events_hourly",
        description: "Hourly aggregated view of log events",
        columns: [
          { name: "hour", type: "datetime", description: "Hour bucket", nullable: false },
          { name: "organization_id", type: "string", description: "Organization identifier", nullable: false },
          { name: "source", type: "string", description: "Log source system", nullable: false },
          { name: "severity", type: "string", description: "Event severity level", nullable: false },
          { name: "category", type: "string", description: "Event category", nullable: false },
          { name: "event_count", type: "long", description: "Number of events in the hour", nullable: false },
          { name: "avg_risk_score", type: "real", description: "Average risk score", nullable: true },
          { name: "max_risk_score", type: "int", description: "Maximum risk score", nullable: true },
          { name: "unique_hosts", type: "long", description: "Number of unique hosts", nullable: false },
          { name: "unique_users", type: "long", description: "Number of unique users", nullable: false }
        ]
      },
      {
        name: "log_events_daily",
        description: "Daily aggregated view of log events",
        columns: [
          { name: "day", type: "datetime", description: "Day bucket", nullable: false },
          { name: "organization_id", type: "string", description: "Organization identifier", nullable: false },
          { name: "source", type: "string", description: "Log source system", nullable: false },
          { name: "severity", type: "string", description: "Event severity level", nullable: false },
          { name: "category", type: "string", description: "Event category", nullable: false },
          { name: "event_count", type: "long", description: "Number of events in the day", nullable: false },
          { name: "avg_risk_score", type: "real", description: "Average risk score", nullable: true },
          { name: "max_risk_score", type: "int", description: "Maximum risk score", nullable: true },
          { name: "unique_hosts", type: "long", description: "Number of unique hosts", nullable: false },
          { name: "unique_users", type: "long", description: "Number of unique users", nullable: false },
          { name: "severity_breakdown", type: "dynamic", description: "Breakdown by severity", nullable: true }
        ]
      }
    ];
  }
  initializeFunctions() {
    return [
      // Aggregation functions
      {
        name: "count",
        description: "Returns the number of records in the group",
        parameters: [
          { name: "expression", type: "any", optional: true, description: "Expression to count (optional)" }
        ],
        returnType: "long",
        category: "aggregation",
        examples: ["count()", "count(user_name)"]
      },
      {
        name: "sum",
        description: "Returns the sum of the expression across the group",
        parameters: [
          { name: "expression", type: "numeric", optional: false, description: "Numeric expression to sum" }
        ],
        returnType: "numeric",
        category: "aggregation",
        examples: ["sum(risk_score)", "sum(event_data.bytes)"]
      },
      {
        name: "avg",
        description: "Returns the average value of the expression across the group",
        parameters: [
          { name: "expression", type: "numeric", optional: false, description: "Numeric expression to average" }
        ],
        returnType: "real",
        category: "aggregation",
        examples: ["avg(risk_score)", "avg(event_data.duration)"]
      },
      {
        name: "min",
        description: "Returns the minimum value of the expression across the group",
        parameters: [
          { name: "expression", type: "any", optional: false, description: "Expression to find minimum" }
        ],
        returnType: "any",
        category: "aggregation",
        examples: ["min(timestamp)", "min(risk_score)"]
      },
      {
        name: "max",
        description: "Returns the maximum value of the expression across the group",
        parameters: [
          { name: "expression", type: "any", optional: false, description: "Expression to find maximum" }
        ],
        returnType: "any",
        category: "aggregation",
        examples: ["max(timestamp)", "max(risk_score)"]
      },
      {
        name: "dcount",
        description: "Returns the number of distinct values of the expression",
        parameters: [
          { name: "expression", type: "any", optional: false, description: "Expression to count distinct values" }
        ],
        returnType: "long",
        category: "aggregation",
        examples: ["dcount(user_name)", "dcount(host_ip)"]
      },
      // Scalar functions
      {
        name: "ago",
        description: "Returns the time duration before the current UTC time",
        parameters: [
          { name: "timespan", type: "timespan", optional: false, description: "Time duration to subtract" }
        ],
        returnType: "datetime",
        category: "scalar",
        examples: ["ago(1h)", "ago(7d)", "ago(30m)"]
      },
      {
        name: "now",
        description: "Returns the current UTC time",
        parameters: [],
        returnType: "datetime",
        category: "scalar",
        examples: ["now()"]
      },
      {
        name: "strlen",
        description: "Returns the length of the string",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" }
        ],
        returnType: "int",
        category: "scalar",
        examples: ["strlen(message)", "strlen(user_name)"]
      },
      {
        name: "substring",
        description: "Returns a substring starting at the specified index",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" },
          { name: "start", type: "int", optional: false, description: "Start index (0-based)" },
          { name: "length", type: "int", optional: true, description: "Length of substring" }
        ],
        returnType: "string",
        category: "scalar",
        examples: ["substring(message, 0, 10)", "substring(host_name, 3)"]
      },
      {
        name: "toupper",
        description: "Converts string to uppercase",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" }
        ],
        returnType: "string",
        category: "scalar",
        examples: ["toupper(user_name)", "toupper(source)"]
      },
      {
        name: "tolower",
        description: "Converts string to lowercase",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" }
        ],
        returnType: "string",
        category: "scalar",
        examples: ["tolower(user_name)", "tolower(message)"]
      },
      {
        name: "replace",
        description: "Replaces all occurrences of a substring with another string",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" },
          { name: "pattern", type: "string", optional: false, description: "Pattern to replace" },
          { name: "replacement", type: "string", optional: false, description: "Replacement string" }
        ],
        returnType: "string",
        category: "scalar",
        examples: ['replace(message, "error", "ERROR")', 'replace(host_name, ".local", "")']
      },
      {
        name: "split",
        description: "Splits a string by a delimiter and returns an array",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" },
          { name: "delimiter", type: "string", optional: false, description: "Delimiter string" }
        ],
        returnType: "dynamic",
        category: "scalar",
        examples: ['split(host_name, ".")', 'split(message, " ")']
      },
      {
        name: "trim",
        description: "Removes leading and trailing whitespace",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" }
        ],
        returnType: "string",
        category: "scalar",
        examples: ["trim(message)", "trim(user_name)"]
      },
      {
        name: "isempty",
        description: "Returns true if the string is empty or null",
        parameters: [
          { name: "string", type: "string", optional: false, description: "Input string" }
        ],
        returnType: "bool",
        category: "scalar",
        examples: ["isempty(user_name)", "isempty(message)"]
      },
      {
        name: "isnull",
        description: "Returns true if the expression is null",
        parameters: [
          { name: "expression", type: "any", optional: false, description: "Expression to check" }
        ],
        returnType: "bool",
        category: "scalar",
        examples: ["isnull(user_name)", "isnull(event_data.field)"]
      },
      {
        name: "coalesce",
        description: "Returns the first non-null expression",
        parameters: [
          { name: "expression1", type: "any", optional: false, description: "First expression" },
          { name: "expression2", type: "any", optional: false, description: "Second expression" }
        ],
        returnType: "any",
        category: "scalar",
        examples: ['coalesce(user_name, "unknown")', "coalesce(event_data.user, user_name)"]
      }
    ];
  }
  initializeOperators() {
    return [
      {
        operator: "==",
        description: "Equals comparison",
        leftType: "any",
        rightType: "any",
        returnType: "bool",
        examples: ['severity == "critical"', "risk_score == 100"]
      },
      {
        operator: "!=",
        description: "Not equals comparison",
        leftType: "any",
        rightType: "any",
        returnType: "bool",
        examples: ['severity != "info"', 'user_name != ""']
      },
      {
        operator: "<",
        description: "Less than comparison",
        leftType: "numeric",
        rightType: "numeric",
        returnType: "bool",
        examples: ["risk_score < 50", "timestamp < ago(1h)"]
      },
      {
        operator: "<=",
        description: "Less than or equal comparison",
        leftType: "numeric",
        rightType: "numeric",
        returnType: "bool",
        examples: ["risk_score <= 75", "timestamp <= now()"]
      },
      {
        operator: ">",
        description: "Greater than comparison",
        leftType: "numeric",
        rightType: "numeric",
        returnType: "bool",
        examples: ["risk_score > 80", "timestamp > ago(24h)"]
      },
      {
        operator: ">=",
        description: "Greater than or equal comparison",
        leftType: "numeric",
        rightType: "numeric",
        returnType: "bool",
        examples: ["risk_score >= 90", "timestamp >= ago(1d)"]
      },
      {
        operator: "contains",
        description: "String contains substring (case-insensitive)",
        leftType: "string",
        rightType: "string",
        returnType: "bool",
        examples: ['message contains "error"', 'user_name contains "admin"']
      },
      {
        operator: "!contains",
        description: "String does not contain substring (case-insensitive)",
        leftType: "string",
        rightType: "string",
        returnType: "bool",
        examples: ['message !contains "debug"', 'host_name !contains "test"']
      },
      {
        operator: "startswith",
        description: "String starts with substring (case-insensitive)",
        leftType: "string",
        rightType: "string",
        returnType: "bool",
        examples: ['user_name startswith "admin"', 'host_name startswith "web"']
      },
      {
        operator: "endswith",
        description: "String ends with substring (case-insensitive)",
        leftType: "string",
        rightType: "string",
        returnType: "bool",
        examples: ['host_name endswith ".com"', 'message endswith "failed"']
      },
      {
        operator: "matches",
        description: "String matches regular expression",
        leftType: "string",
        rightType: "string",
        returnType: "bool",
        examples: ['host_ip matches @"\\d+\\.\\d+\\.\\d+\\.\\d+"', 'user_name matches @"[a-zA-Z]+"']
      },
      {
        operator: "in",
        description: "Value is in a list of values",
        leftType: "any",
        rightType: "array",
        returnType: "bool",
        examples: ['severity in ("critical", "high")', 'source in ("Windows", "Linux")']
      },
      {
        operator: "!in",
        description: "Value is not in a list of values",
        leftType: "any",
        rightType: "array",
        returnType: "bool",
        examples: ['severity !in ("info", "debug")', 'user_name !in ("guest", "anonymous")']
      },
      {
        operator: "between",
        description: "Value is between two values (inclusive)",
        leftType: "numeric",
        rightType: "numeric",
        returnType: "bool",
        examples: ["risk_score between (50 .. 90)", "timestamp between (ago(2h) .. ago(1h))"]
      },
      {
        operator: "and",
        description: "Logical AND operation",
        leftType: "bool",
        rightType: "bool",
        returnType: "bool",
        examples: ['severity == "critical" and risk_score > 80', 'timestamp > ago(1h) and user_name != ""']
      },
      {
        operator: "or",
        description: "Logical OR operation",
        leftType: "bool",
        rightType: "bool",
        returnType: "bool",
        examples: ['severity == "critical" or risk_score > 90', 'source == "Windows" or source == "Linux"']
      },
      {
        operator: "not",
        description: "Logical NOT operation",
        leftType: "bool",
        rightType: "",
        returnType: "bool",
        examples: ['not (severity == "info")', "not isempty(user_name)"]
      }
    ];
  }
  initializeKeywords() {
    return [
      {
        keyword: "where",
        description: "Filters rows based on a predicate",
        category: "command",
        examples: ['| where severity == "critical"', "| where timestamp > ago(1h)"]
      },
      {
        keyword: "project",
        description: "Selects specific columns to include in the output",
        category: "command",
        examples: ["| project timestamp, severity, message", "| project user_name, risk_score"]
      },
      {
        keyword: "extend",
        description: "Adds computed columns to the result set",
        category: "command",
        examples: ["| extend hour = bin(timestamp, 1h)", '| extend is_admin = user_name contains "admin"']
      },
      {
        keyword: "summarize",
        description: "Aggregates data by grouping and applying aggregation functions",
        category: "command",
        examples: ["| summarize count() by severity", "| summarize avg(risk_score) by source"]
      },
      {
        keyword: "order",
        description: "Sorts the result set by one or more columns",
        category: "command",
        examples: ["| order by timestamp desc", "| order by risk_score desc, timestamp asc"]
      },
      {
        keyword: "top",
        description: "Returns the top N rows, optionally ordered by specific columns",
        category: "command",
        examples: ["| top 10 by risk_score desc", "| top 100 by timestamp desc"]
      },
      {
        keyword: "limit",
        description: "Limits the number of rows returned",
        category: "command",
        examples: ["| limit 1000", "| limit 50"]
      },
      {
        keyword: "distinct",
        description: "Returns unique rows or unique values for specified columns",
        category: "command",
        examples: ["| distinct user_name", "| distinct source, severity"]
      },
      {
        keyword: "join",
        description: "Joins two tables based on matching columns",
        category: "command",
        examples: ["| join kind=inner other_table on user_name", "| join kind=left users on $left.user_name == $right.name"]
      },
      {
        keyword: "union",
        description: "Combines the results of multiple tables",
        category: "command",
        examples: ["| union log_events_warm, log_events_cold", "| union table1, table2"]
      },
      {
        keyword: "let",
        description: "Binds a name to an expression for reuse in the query",
        category: "command",
        examples: ["let timeRange = ago(1h);", 'let criticalEvents = log_events | where severity == "critical";']
      },
      {
        keyword: "by",
        description: "Specifies grouping columns in summarize operations",
        category: "function",
        examples: ["summarize count() by source", "summarize avg(risk_score) by severity, source"]
      },
      {
        keyword: "asc",
        description: "Ascending sort order",
        category: "function",
        examples: ["order by timestamp asc", "top 10 by risk_score asc"]
      },
      {
        keyword: "desc",
        description: "Descending sort order",
        category: "function",
        examples: ["order by timestamp desc", "top 10 by risk_score desc"]
      }
    ];
  }
};

// src/kql-engine.ts
var KQLEngine = class {
  queryExecutor;
  completionProvider;
  schemaProvider;
  constructor(config) {
    this.schemaProvider = new SchemaProvider();
    this.queryExecutor = new QueryExecutor(
      config.database,
      config.cache?.enabled ? {
        max: config.cache.maxSize || 1e3,
        ttl: config.cache.ttl || 5 * 60 * 1e3
      } : void 0
    );
    this.completionProvider = new CompletionProvider(this.schemaProvider);
  }
  // Query execution methods
  async executeQuery(kqlQuery, context) {
    return this.queryExecutor.executeKQL(kqlQuery, context);
  }
  async explainQuery(kqlQuery, context) {
    return this.queryExecutor.explainKQL(kqlQuery, context);
  }
  async validateQuery(kqlQuery) {
    return this.queryExecutor.validateKQL(kqlQuery);
  }
  // IntelliSense methods
  async getCompletions(text, position, context) {
    return this.completionProvider.provideCompletions(text, position, context);
  }
  // Schema methods
  getTableSchemas() {
    return this.schemaProvider.getSchema();
  }
  getTables() {
    return this.schemaProvider.getTables();
  }
  getTable(name) {
    return this.schemaProvider.getTable(name);
  }
  getColumns(tableName) {
    return this.schemaProvider.getColumns(tableName);
  }
  getFunctions() {
    return this.schemaProvider.getFunctions();
  }
  // Utility methods
  tokenize(kqlQuery) {
    const lexer = new KQLLexer(kqlQuery);
    return lexer.tokenize();
  }
  parse(kqlQuery) {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    if (lexErrors.length > 0) {
      return { query: null, errors: lexErrors.map((e) => e.message) };
    }
    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();
    return {
      query,
      errors: parseErrors.map((e) => e.message)
    };
  }
  // Performance and monitoring
  getCacheStats() {
    return this.queryExecutor.getCacheStats();
  }
  clearCache() {
    this.queryExecutor.clearCache();
  }
  async getDbSchemas(organizationId) {
    return this.queryExecutor.getTableSchemas(organizationId);
  }
};

// src/templates/security-templates.ts
var SecurityCategory = /* @__PURE__ */ ((SecurityCategory2) => {
  SecurityCategory2["AUTHENTICATION"] = "Authentication";
  SecurityCategory2["NETWORK_SECURITY"] = "Network Security";
  SecurityCategory2["MALWARE_DETECTION"] = "Malware Detection";
  SecurityCategory2["DATA_EXFILTRATION"] = "Data Exfiltration";
  SecurityCategory2["PRIVILEGE_ESCALATION"] = "Privilege Escalation";
  SecurityCategory2["LATERAL_MOVEMENT"] = "Lateral Movement";
  SecurityCategory2["PERSISTENCE"] = "Persistence";
  SecurityCategory2["RECONNAISSANCE"] = "Reconnaissance";
  SecurityCategory2["THREAT_HUNTING"] = "Threat Hunting";
  SecurityCategory2["COMPLIANCE"] = "Compliance";
  SecurityCategory2["INCIDENT_RESPONSE"] = "Incident Response";
  SecurityCategory2["ANOMALY_DETECTION"] = "Anomaly Detection";
  return SecurityCategory2;
})(SecurityCategory || {});
var SECURITY_TEMPLATES = [
  {
    id: "failed-logins-high-volume",
    name: "High Volume Failed Login Attempts",
    description: "Detect accounts with an unusually high number of failed login attempts within a time window",
    category: "Authentication" /* AUTHENTICATION */,
    query: `log_events
| where timestamp > ago({timeRange})
| where category == "authentication" 
| where severity in ("medium", "high", "critical")
| where message contains "failed" or message contains "denied"
| summarize FailedAttempts = count(), 
           DistinctSources = dcount(host_ip),
           FirstAttempt = min(timestamp),
           LastAttempt = max(timestamp)
    by user_name
| where FailedAttempts > {threshold}
| order by FailedAttempts desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Time window to analyze",
        defaultValue: "1h",
        required: true,
        options: ["15m", "30m", "1h", "6h", "24h"]
      },
      {
        name: "threshold",
        type: "number",
        description: "Minimum number of failed attempts to alert on",
        defaultValue: 10,
        required: true
      }
    ],
    tags: ["brute-force", "authentication", "security-monitoring"],
    mitreTactics: ["Credential Access"],
    mitreAttackIds: ["T1110"],
    difficulty: "beginner",
    useCase: "Identify potential brute force attacks against user accounts"
  },
  {
    id: "suspicious-network-connections",
    name: "Suspicious Outbound Network Connections",
    description: "Detect unusual outbound network connections to suspicious domains or IP ranges",
    category: "Network Security" /* NETWORK_SECURITY */,
    query: `log_events
| where timestamp > ago({timeRange})
| where category == "network"
| where event_data.direction == "outbound"
| where event_data.destination_ip !startswith "10."
    and event_data.destination_ip !startswith "192.168."
    and event_data.destination_ip !startswith "172.16."
| summarize ConnectionCount = count(),
           DistinctPorts = dcount(event_data.destination_port),
           Ports = make_set(event_data.destination_port),
           BytesTransferred = sum(event_data.bytes)
    by host_name, event_data.destination_ip, event_data.destination_domain
| where ConnectionCount > {connectionThreshold} or BytesTransferred > {bytesThreshold}
| extend RiskScore = case(
    BytesTransferred > 1000000, 90,
    ConnectionCount > 100, 80,
    DistinctPorts > 10, 70,
    60
)
| order by RiskScore desc, BytesTransferred desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Time window to analyze",
        defaultValue: "1h",
        required: true
      },
      {
        name: "connectionThreshold",
        type: "number",
        description: "Minimum connection count to alert on",
        defaultValue: 50,
        required: true
      },
      {
        name: "bytesThreshold",
        type: "number",
        description: "Minimum bytes transferred to alert on",
        defaultValue: 1e5,
        required: true
      }
    ],
    tags: ["network", "data-exfiltration", "c2-communication"],
    mitreTactics: ["Command and Control", "Exfiltration"],
    mitreAttackIds: ["T1041", "T1071"],
    difficulty: "intermediate",
    useCase: "Detect potential data exfiltration or command and control communications"
  },
  {
    id: "privilege-escalation-detection",
    name: "Privilege Escalation Attempts",
    description: "Identify attempts to escalate privileges or access sensitive resources",
    category: "Privilege Escalation" /* PRIVILEGE_ESCALATION */,
    query: `log_events
| where timestamp > ago({timeRange})
| where category in ("authentication", "process", "file")
| where message contains "privilege" 
    or message contains "admin" 
    or message contains "root"
    or message contains "escalation"
    or event_data.process_name in ("sudo", "su", "runas", "psexec")
| extend IsHighPrivilegeProcess = event_data.process_name in ("sudo", "su", "runas", "psexec", "cmd.exe", "powershell.exe")
| extend IsAdminUser = user_name contains "admin" or user_name contains "root"
| extend IsSuspiciousTime = hourofday(timestamp) < 6 or hourofday(timestamp) > 22
| summarize EventCount = count(),
           DistinctProcesses = dcount(event_data.process_name),
           Processes = make_set(event_data.process_name),
           FirstEvent = min(timestamp),
           LastEvent = max(timestamp),
           HighPrivilegeEvents = countif(IsHighPrivilegeProcess),
           SuspiciousTimeEvents = countif(IsSuspiciousTime)
    by user_name, host_name
| extend RiskScore = case(
    HighPrivilegeEvents > 10 and SuspiciousTimeEvents > 5, 95,
    HighPrivilegeEvents > 5, 80,
    EventCount > 20, 70,
    50
)
| where RiskScore >= {riskThreshold}
| order by RiskScore desc, EventCount desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Time window to analyze",
        defaultValue: "6h",
        required: true
      },
      {
        name: "riskThreshold",
        type: "number",
        description: "Minimum risk score to alert on (0-100)",
        defaultValue: 70,
        required: true
      }
    ],
    tags: ["privilege-escalation", "process-monitoring", "insider-threat"],
    mitreTactics: ["Privilege Escalation", "Defense Evasion"],
    mitreAttackIds: ["T1068", "T1134", "T1548"],
    difficulty: "advanced",
    useCase: "Detect unauthorized attempts to gain elevated privileges"
  },
  {
    id: "malware-process-indicators",
    name: "Malware Process Indicators",
    description: "Detect processes with characteristics commonly associated with malware",
    category: "Malware Detection" /* MALWARE_DETECTION */,
    query: `log_events
| where timestamp > ago({timeRange})
| where category == "process"
| where event_data.action in ("created", "started")
| extend ProcessPath = tolower(event_data.process_path)
| extend ProcessName = tolower(event_data.process_name)
| extend IsSuspiciousLocation = ProcessPath contains "temp" 
    or ProcessPath contains "downloads" 
    or ProcessPath contains "appdata\\\\local\\\\temp"
    or ProcessPath contains "recycle"
| extend HasSuspiciousName = ProcessName matches regex @"^[a-f0-9]{8,}\\\\.(exe|dll|scr)$"
    or ProcessName contains "svchost" and not ProcessPath contains "system32"
    or ProcessName contains "rundll32" and event_data.command_line contains ".tmp"
| extend IsUnsignedBinary = event_data.signed == false or isnull(event_data.signature)
| extend HasSuspiciousCommandLine = event_data.command_line contains "powershell -enc"
    or event_data.command_line contains "cmd /c echo"
    or event_data.command_line contains "wscript"
    or event_data.command_line contains "cscript"
| extend RiskIndicators = toint(IsSuspiciousLocation) + toint(HasSuspiciousName) + 
                         toint(IsUnsignedBinary) + toint(HasSuspiciousCommandLine)
| where RiskIndicators >= {indicatorThreshold}
| summarize ProcessCount = count(),
           DistinctHosts = dcount(host_name),
           Hosts = make_set(host_name),
           FirstSeen = min(timestamp),
           LastSeen = max(timestamp)
    by ProcessName, event_data.process_path, event_data.parent_process, RiskIndicators
| extend RiskScore = case(
    RiskIndicators >= 3, 90,
    RiskIndicators >= 2, 75,
    60
)
| order by RiskScore desc, ProcessCount desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Time window to analyze",
        defaultValue: "24h",
        required: true
      },
      {
        name: "indicatorThreshold",
        type: "number",
        description: "Minimum number of risk indicators to alert on",
        defaultValue: 2,
        required: true,
        options: [1, 2, 3, 4]
      }
    ],
    tags: ["malware", "process-analysis", "threat-hunting"],
    mitreTactics: ["Execution", "Defense Evasion"],
    mitreAttackIds: ["T1055", "T1036", "T1027"],
    difficulty: "advanced",
    useCase: "Identify potentially malicious processes based on behavioral indicators"
  },
  {
    id: "data-exfiltration-patterns",
    name: "Data Exfiltration Patterns",
    description: "Detect patterns indicative of large-scale data theft or unauthorized data movement",
    category: "Data Exfiltration" /* DATA_EXFILTRATION */,
    query: `log_events
| where timestamp > ago({timeRange})
| where category in ("file", "network")
| where event_data.action in ("read", "copy", "upload", "transfer", "download")
| extend FileSize = tolong(event_data.file_size)
| extend IsLargeFile = FileSize > {fileSizeThreshold}
| extend IsSensitiveFile = event_data.file_path contains "confidential"
    or event_data.file_path contains "secret"
    or event_data.file_extension in (".xlsx", ".docx", ".pdf", ".sql", ".csv")
| extend IsExternalTransfer = event_data.destination_ip !startswith "10."
    and event_data.destination_ip !startswith "192.168."
    and event_data.destination_ip !startswith "172.16."
| summarize TotalFiles = count(),
           TotalBytes = sum(FileSize),
           LargeFiles = countif(IsLargeFile),
           SensitiveFiles = countif(IsSensitiveFile),
           ExternalTransfers = countif(IsExternalTransfer),
           DistinctDestinations = dcount(event_data.destination_ip),
           FilePaths = make_set(event_data.file_path, 20)
    by user_name, host_name, bin(timestamp, {timeBin})
| extend DataVolumeMB = TotalBytes / (1024 * 1024)
| extend RiskScore = case(
    DataVolumeMB > 1000 and ExternalTransfers > 0, 95,
    SensitiveFiles > 10 and ExternalTransfers > 0, 90,
    DataVolumeMB > 500, 80,
    LargeFiles > 20, 70,
    50
)
| where RiskScore >= {riskThreshold}
| order by RiskScore desc, DataVolumeMB desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Time window to analyze",
        defaultValue: "6h",
        required: true
      },
      {
        name: "fileSizeThreshold",
        type: "number",
        description: "File size threshold in bytes for large files",
        defaultValue: 10485760,
        required: true
      },
      {
        name: "timeBin",
        type: "timespan",
        description: "Time bin for aggregation",
        defaultValue: "1h",
        required: true,
        options: ["15m", "30m", "1h", "2h"]
      },
      {
        name: "riskThreshold",
        type: "number",
        description: "Minimum risk score to alert on",
        defaultValue: 70,
        required: true
      }
    ],
    tags: ["data-exfiltration", "file-monitoring", "insider-threat"],
    mitreTactics: ["Collection", "Exfiltration"],
    mitreAttackIds: ["T1005", "T1041", "T1052"],
    difficulty: "intermediate",
    useCase: "Detect unauthorized movement of sensitive data"
  },
  {
    id: "lateral-movement-detection",
    name: "Lateral Movement Detection",
    description: "Identify attempts to move laterally through the network using compromised credentials",
    category: "Lateral Movement" /* LATERAL_MOVEMENT */,
    query: `log_events
| where timestamp > ago({timeRange})
| where category in ("authentication", "network", "process")
| where event_data.action in ("logon", "connect", "execute_remote")
| extend SourceHost = coalesce(event_data.source_host, host_name)
| extend TargetHost = coalesce(event_data.target_host, event_data.destination_host)
| extend IsRemoteAccess = isnotnull(TargetHost) and SourceHost != TargetHost
| extend IsAdminLogin = user_name contains "admin" or event_data.logon_type in ("2", "10")
| extend IsSuspiciousService = event_data.service_name in ("psexec", "wmi", "winrm", "rdp", "ssh")
| where IsRemoteAccess
| summarize RemoteConnections = count(),
           DistinctTargets = dcount(TargetHost),
           DistinctSources = dcount(SourceHost),
           Targets = make_set(TargetHost),
           Sources = make_set(SourceHost),
           AdminLogins = countif(IsAdminLogin),
           SuspiciousServices = countif(IsSuspiciousService),
           FirstConnection = min(timestamp),
           LastConnection = max(timestamp)
    by user_name
| extend ConnectionVelocity = RemoteConnections / (datetime_diff('minute', LastConnection, FirstConnection) + 1)
| extend RiskScore = case(
    DistinctTargets > 10 and AdminLogins > 5, 95,
    ConnectionVelocity > 5 and DistinctTargets > 5, 90,
    SuspiciousServices > 0 and DistinctTargets > 3, 85,
    DistinctTargets > 5, 75,
    50
)
| where RiskScore >= {riskThreshold}
| order by RiskScore desc, DistinctTargets desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Time window to analyze",
        defaultValue: "4h",
        required: true
      },
      {
        name: "riskThreshold",
        type: "number",
        description: "Minimum risk score to alert on",
        defaultValue: 75,
        required: true
      }
    ],
    tags: ["lateral-movement", "network-analysis", "threat-hunting"],
    mitreTactics: ["Lateral Movement"],
    mitreAttackIds: ["T1021", "T1047", "T1028"],
    difficulty: "advanced",
    useCase: "Detect attackers moving laterally through the network"
  },
  {
    id: "anomalous-user-behavior",
    name: "Anomalous User Behavior Detection",
    description: "Identify users exhibiting unusual behavior patterns that may indicate compromise",
    category: "Anomaly Detection" /* ANOMALY_DETECTION */,
    query: `let UserBaseline = log_events
| where timestamp between (ago({baselineWindow}) .. ago({timeRange}))
| where category in ("authentication", "file", "process", "network")
| summarize BaselineLogins = dcount(host_name),
           BaselineProcesses = dcount(event_data.process_name),
           BaselineFiles = dcount(event_data.file_path),
           BaselineHours = dcount(hourofday(timestamp))
    by user_name;
log_events
| where timestamp > ago({timeRange})
| where category in ("authentication", "file", "process", "network")
| summarize CurrentLogins = dcount(host_name),
           CurrentProcesses = dcount(event_data.process_name),
           CurrentFiles = dcount(event_data.file_path),
           CurrentHours = dcount(hourofday(timestamp)),
           TotalEvents = count(),
           OffHoursEvents = countif(hourofday(timestamp) < 6 or hourofday(timestamp) > 22),
           WeekendEvents = countif(dayofweek(timestamp) in (0, 6))
    by user_name
| join kind=inner UserBaseline on user_name
| extend LoginAnomaly = todouble(CurrentLogins) / (BaselineLogins + 1)
| extend ProcessAnomaly = todouble(CurrentProcesses) / (BaselineProcesses + 1)
| extend FileAnomaly = todouble(CurrentFiles) / (BaselineFiles + 1)
| extend TimeAnomaly = todouble(CurrentHours) / (BaselineHours + 1)
| extend OffHoursRatio = todouble(OffHoursEvents) / TotalEvents
| extend WeekendRatio = todouble(WeekendEvents) / TotalEvents
| extend AnomalyScore = case(
    LoginAnomaly > 3 or ProcessAnomaly > 3 or FileAnomaly > 3, 90,
    OffHoursRatio > 0.5 and WeekendRatio > 0.3, 85,
    LoginAnomaly > 2 or ProcessAnomaly > 2, 75,
    TimeAnomaly > 2, 70,
    50
)
| where AnomalyScore >= {anomalyThreshold}
| project user_name, AnomalyScore, LoginAnomaly, ProcessAnomaly, FileAnomaly, 
          OffHoursRatio, WeekendRatio, TotalEvents
| order by AnomalyScore desc`,
    parameters: [
      {
        name: "timeRange",
        type: "timespan",
        description: "Recent time window to analyze",
        defaultValue: "24h",
        required: true
      },
      {
        name: "baselineWindow",
        type: "timespan",
        description: "Historical baseline window",
        defaultValue: "7d",
        required: true
      },
      {
        name: "anomalyThreshold",
        type: "number",
        description: "Minimum anomaly score to alert on",
        defaultValue: 70,
        required: true
      }
    ],
    tags: ["behavioral-analysis", "user-monitoring", "anomaly-detection"],
    mitreTactics: ["Initial Access", "Persistence"],
    mitreAttackIds: ["T1078", "T1133"],
    difficulty: "advanced",
    useCase: "Detect compromised user accounts through behavioral analysis"
  }
];
var SecurityTemplateProvider = class {
  templates;
  constructor() {
    this.templates = SECURITY_TEMPLATES;
  }
  getTemplates() {
    return this.templates;
  }
  getTemplatesByCategory(category) {
    return this.templates.filter((t) => t.category === category);
  }
  getTemplatesByTag(tag) {
    return this.templates.filter((t) => t.tags.includes(tag));
  }
  getTemplatesByDifficulty(difficulty) {
    return this.templates.filter((t) => t.difficulty === difficulty);
  }
  getTemplate(id) {
    return this.templates.find((t) => t.id === id);
  }
  renderTemplate(templateId, parameters) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    let query = template.query;
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      query = query.replace(new RegExp(placeholder.replace(/[{}]/g, "\\\\$&"), "g"), String(value));
    }
    return query;
  }
  getCategories() {
    return Object.values(SecurityCategory);
  }
  searchTemplates(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.templates.filter(
      (t) => t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term) || t.tags.some((tag) => tag.toLowerCase().includes(term)) || t.useCase.toLowerCase().includes(term)
    );
  }
};

// src/utils/kql-utils.ts
function validateKQLSyntax(kqlQuery) {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    if (lexErrors.length > 0) {
      return {
        valid: false,
        errors: lexErrors.map((e) => e.message)
      };
    }
    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();
    if (parseErrors.length > 0 || !query) {
      return {
        valid: false,
        errors: parseErrors.map((e) => e.message)
      };
    }
    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Unknown validation error"]
    };
  }
}
function parseKQLToSQL(kqlQuery, organizationId) {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    if (lexErrors.length > 0) {
      return {
        sql: "",
        parameters: [],
        errors: lexErrors.map((e) => e.message)
      };
    }
    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();
    if (parseErrors.length > 0 || !query) {
      return {
        sql: "",
        parameters: [],
        errors: parseErrors.map((e) => e.message)
      };
    }
    const sqlGenerator = new SQLGenerator(organizationId);
    const { sql, parameters } = sqlGenerator.generateSQL(query);
    return { sql, parameters, errors: [] };
  } catch (error) {
    return {
      sql: "",
      parameters: [],
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
function formatKQLQuery(kqlQuery) {
  try {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors } = lexer.tokenize();
    if (errors.length > 0) {
      return kqlQuery;
    }
    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();
    if (parseErrors.length > 0 || !query) {
      return kqlQuery;
    }
    return formatQuery(query);
  } catch (error) {
    return kqlQuery;
  }
}
function formatQuery(query, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  let formatted = "";
  formatted += query.tableExpression.name;
  if (query.tableExpression.alias) {
    formatted += ` as ${query.tableExpression.alias}`;
  }
  for (const operation of query.operations) {
    formatted += "\n" + indent + "| " + formatOperation(operation, indentLevel + 1);
  }
  return formatted;
}
function formatOperation(operation, indentLevel) {
  const indent = "  ".repeat(indentLevel);
  switch (operation.type) {
    case "WhereOperation":
      return `where ${formatExpression(operation.predicate)}`;
    case "ProjectOperation":
      const columns = operation.columns.map((col) => {
        let result = formatExpression(col.expression);
        if (col.alias) {
          result += ` as ${col.alias}`;
        }
        return result;
      }).join(",\n" + indent + "    ");
      return operation.columns.length > 3 ? `project
${indent}    ${columns}` : `project ${columns.replace(/\n\s+/g, " ")}`;
    case "ExtendOperation":
      const assignments = operation.assignments.map(
        (assignment) => `${assignment.name} = ${formatExpression(assignment.expression)}`
      ).join(",\n" + indent + "    ");
      return operation.assignments.length > 2 ? `extend
${indent}    ${assignments}` : `extend ${assignments.replace(/\n\s+/g, " ")}`;
    case "SummarizeOperation":
      const aggregations = operation.aggregations.map((agg) => {
        let result = agg.function;
        if (agg.expression) {
          result += `(${formatExpression(agg.expression)})`;
        } else {
          result += "()";
        }
        if (agg.alias) {
          result += ` as ${agg.alias}`;
        }
        return result;
      }).join(", ");
      let summarizeResult = `summarize ${aggregations}`;
      if (operation.by && operation.by.length > 0) {
        const byColumns = operation.by.map((expr) => formatExpression(expr)).join(", ");
        summarizeResult += ` by ${byColumns}`;
      }
      return summarizeResult;
    case "OrderOperation":
      const orderBy = operation.orderBy.map(
        (orderExpr) => `${formatExpression(orderExpr.expression)} ${orderExpr.direction}`
      ).join(", ");
      return `order by ${orderBy}`;
    case "TopOperation":
      let topResult = `top ${formatExpression(operation.count)}`;
      if (operation.by && operation.by.length > 0) {
        const byColumns = operation.by.map(
          (orderExpr) => `${formatExpression(orderExpr.expression)} ${orderExpr.direction}`
        ).join(", ");
        topResult += ` by ${byColumns}`;
      }
      return topResult;
    case "LimitOperation":
      return `limit ${formatExpression(operation.count)}`;
    case "DistinctOperation":
      if (operation.columns && operation.columns.length > 0) {
        const distinctColumns = operation.columns.map((col) => formatExpression(col)).join(", ");
        return `distinct ${distinctColumns}`;
      }
      return "distinct";
    default:
      return operation.type.replace("Operation", "").toLowerCase();
  }
}
function formatExpression(expression) {
  if (!expression) return "";
  switch (expression.type) {
    case "BinaryExpression":
      const left = formatExpression(expression.left);
      const right = formatExpression(expression.right);
      if (needsParentheses(expression)) {
        return `(${left} ${expression.operator} ${right})`;
      }
      return `${left} ${expression.operator} ${right}`;
    case "UnaryExpression":
      const operand = formatExpression(expression.operand);
      return `${expression.operator}${operand}`;
    case "CallExpression":
      const args = expression.arguments.map((arg) => formatExpression(arg)).join(", ");
      return `${expression.function}(${args})`;
    case "MemberExpression":
      const object = formatExpression(expression.object);
      const property = formatExpression(expression.property);
      if (expression.computed) {
        return `${object}[${property}]`;
      }
      return `${object}.${property}`;
    case "Identifier":
      return expression.quoted ? `\`${expression.name}\`` : expression.name;
    case "Literal":
      if (expression.dataType === "string") {
        return `"${expression.value}"`;
      }
      return String(expression.value);
    default:
      return "";
  }
}
function needsParentheses(expression) {
  return expression.operator === "and" || expression.operator === "or";
}
export {
  CompletionItemKind,
  CompletionProvider,
  CompletionTriggerKind,
  DiagnosticSeverity,
  KQLEngine,
  KQLLexer,
  KQLParser,
  OptimizationType,
  QueryExecutor,
  QueryOptimizer,
  SECURITY_TEMPLATES,
  SQLGenerator,
  SchemaProvider,
  SecurityCategory,
  SecurityTemplateProvider,
  TokenType,
  formatKQLQuery,
  parseKQLToSQL,
  validateKQLSyntax
};
//# sourceMappingURL=index.mjs.map