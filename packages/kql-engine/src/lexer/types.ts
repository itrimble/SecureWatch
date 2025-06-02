export enum TokenType {
  // Literals
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATETIME = 'DATETIME',
  TIMESPAN = 'TIMESPAN',
  GUID = 'GUID',
  
  // Identifiers
  IDENTIFIER = 'IDENTIFIER',
  QUOTED_IDENTIFIER = 'QUOTED_IDENTIFIER',
  
  // Operators
  PIPE = 'PIPE',
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTSWITH = 'STARTSWITH',
  ENDSWITH = 'ENDSWITH',
  MATCHES = 'MATCHES',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  BETWEEN = 'BETWEEN',
  LIKE = 'LIKE',
  
  // Logical operators
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // Arithmetic operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  
  // Punctuation
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  DOT = 'DOT',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  
  // Keywords
  WHERE = 'WHERE',
  PROJECT = 'PROJECT',
  EXTEND = 'EXTEND',
  SUMMARIZE = 'SUMMARIZE',
  ORDER = 'ORDER',
  TOP = 'TOP',
  LIMIT = 'LIMIT',
  DISTINCT = 'DISTINCT',
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  BY = 'BY',
  ASC = 'ASC',
  DESC = 'DESC',
  JOIN = 'JOIN',
  INNER = 'INNER',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FULL = 'FULL',
  ON = 'ON',
  UNION = 'UNION',
  LET = 'LET',
  IF = 'IF',
  CASE = 'CASE',
  WHEN = 'WHEN',
  THEN = 'THEN',
  ELSE = 'ELSE',
  END = 'END',
  NULL = 'NULL',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE',
  COMMENT = 'COMMENT',
  
  // Error
  INVALID = 'INVALID'
}

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface LexerPosition {
  index: number;
  line: number;
  column: number;
}

export interface LexerError {
  message: string;
  position: LexerPosition;
  token?: Token;
}