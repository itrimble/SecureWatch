import { Pool } from 'pg';
import { QueryExecutor } from './execution/query-executor';
import { CompletionProvider } from './intellisense/completion-provider';
import { SchemaProvider } from './intellisense/schema-provider';
import { KQLLexer } from './lexer/lexer';
import { KQLParser } from './parser/parser';
import { ExecutionContext, QueryResult, CompletionItem, Position, CompletionContext } from './index';

export interface KQLEngineConfig {
  database: Pool;
  cache?: {
    enabled: boolean;
    maxSize?: number;
    ttl?: number;
  };
  timeout?: number;
  maxRows?: number;
}

export class KQLEngine {
  private queryExecutor: QueryExecutor;
  private completionProvider: CompletionProvider;
  private schemaProvider: SchemaProvider;

  constructor(config: KQLEngineConfig) {
    this.schemaProvider = new SchemaProvider();
    this.queryExecutor = new QueryExecutor(
      config.database,
      config.cache?.enabled ? {
        max: config.cache.maxSize || 1000,
        ttl: config.cache.ttl || 5 * 60 * 1000
      } : undefined
    );
    this.completionProvider = new CompletionProvider(this.schemaProvider);
  }

  // Query execution methods
  async executeQuery(kqlQuery: string, context: ExecutionContext): Promise<QueryResult> {
    return this.queryExecutor.executeKQL(kqlQuery, context);
  }

  async explainQuery(kqlQuery: string, context: ExecutionContext) {
    return this.queryExecutor.explainKQL(kqlQuery, context);
  }

  async validateQuery(kqlQuery: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.queryExecutor.validateKQL(kqlQuery);
  }

  // IntelliSense methods
  async getCompletions(
    text: string,
    position: Position,
    context?: CompletionContext
  ): Promise<CompletionItem[]> {
    return this.completionProvider.provideCompletions(text, position, context);
  }

  // Schema methods
  getTableSchemas() {
    return this.schemaProvider.getSchema();
  }

  getTables() {
    return this.schemaProvider.getTables();
  }

  getTable(name: string) {
    return this.schemaProvider.getTable(name);
  }

  getColumns(tableName: string) {
    return this.schemaProvider.getColumns(tableName);
  }

  getFunctions() {
    return this.schemaProvider.getFunctions();
  }

  // Utility methods
  tokenize(kqlQuery: string) {
    const lexer = new KQLLexer(kqlQuery);
    return lexer.tokenize();
  }

  parse(kqlQuery: string) {
    const lexer = new KQLLexer(kqlQuery);
    const { tokens, errors: lexErrors } = lexer.tokenize();
    
    if (lexErrors.length > 0) {
      return { query: null, errors: lexErrors.map(e => e.message) };
    }

    const parser = new KQLParser(tokens);
    const { query, errors: parseErrors } = parser.parse();
    
    return { 
      query, 
      errors: parseErrors.map(e => e.message) 
    };
  }

  // Performance and monitoring
  getCacheStats() {
    return this.queryExecutor.getCacheStats();
  }

  clearCache() {
    this.queryExecutor.clearCache();
  }

  async getDbSchemas(organizationId: string) {
    return this.queryExecutor.getTableSchemas(organizationId);
  }
}