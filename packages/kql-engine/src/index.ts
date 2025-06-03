// Export lexer components
export { KQLLexer } from './lexer/lexer';
export { TokenType, Token, LexerPosition, LexerError } from './lexer/types';

// Export parser components
export { KQLParser, ParseError } from './parser/parser';
export * from './parser/ast';

// Export execution engine
export { QueryExecutor } from './execution/query-executor';
export { SQLGenerator } from './execution/sql-generator';
export { QueryOptimizer } from './execution/query-optimizer';
export * from './execution/types';

// Export IntelliSense components
export { CompletionProvider } from './intellisense/completion-provider';
export { SchemaProvider } from './intellisense/schema-provider';
export * from './intellisense/types';

// Main KQL Engine class
export { KQLEngine } from './kql-engine';

// Security templates
export * from './templates/security-templates';

// Utility functions
export { validateKQLSyntax, formatKQLQuery, parseKQLToSQL } from './utils/kql-utils';