import { KQLLexer } from '../lexer/lexer';
import { TokenType } from '../lexer/types';
import { SchemaProvider } from './schema-provider';
import {
  CompletionItem, CompletionItemKind, CompletionContext, CompletionTriggerKind,
  Position, Range, QueryContext
} from './types';

export class CompletionProvider {
  private schemaProvider: SchemaProvider;

  constructor(schemaProvider: SchemaProvider) {
    this.schemaProvider = schemaProvider;
  }

  async provideCompletions(
    text: string,
    position: Position,
    context?: CompletionContext
  ): Promise<CompletionItem[]> {
    const queryContext = this.analyzeQueryContext(text, position);
    const completions: CompletionItem[] = [];

    // Determine what kind of completions to provide based on context
    if (this.isAtBeginning(queryContext)) {
      // Table names at the beginning
      completions.push(...this.getTableCompletions());
    } else if (this.isAfterPipe(queryContext)) {
      // Commands after pipe
      completions.push(...this.getCommandCompletions());
    } else if (this.isInWhereClause(queryContext)) {
      // Column names and operators in WHERE clause
      completions.push(...this.getColumnCompletions(queryContext.currentTable));
      completions.push(...this.getOperatorCompletions());
      completions.push(...this.getFunctionCompletions());
    } else if (this.isInProjectClause(queryContext)) {
      // Column names in PROJECT clause
      completions.push(...this.getColumnCompletions(queryContext.currentTable));
      completions.push(...this.getFunctionCompletions());
    } else if (this.isInSummarizeClause(queryContext)) {
      // Aggregation functions and columns
      completions.push(...this.getAggregationCompletions());
      completions.push(...this.getColumnCompletions(queryContext.currentTable));
    } else if (this.isInFunctionCall(queryContext)) {
      // Function parameters
      completions.push(...this.getFunctionParameterCompletions(queryContext.functionContext!));
    } else {
      // General completions
      completions.push(...this.getGeneralCompletions(queryContext));
    }

    return this.filterAndSortCompletions(completions, queryContext);
  }

  private analyzeQueryContext(text: string, position: Position): QueryContext {
    const lines = text.split('\n');
    const currentLine = lines[position.line] || '';
    const beforeCursor = currentLine.substring(0, position.character);
    
    // Tokenize the text up to the cursor position
    const textToCursor = lines.slice(0, position.line).join('\n') + 
                        (position.line < lines.length ? '\n' + beforeCursor : beforeCursor);
    
    const lexer = new KQLLexer(textToCursor);
    const { tokens } = lexer.tokenize();

    // Find current table
    let currentTable: string | undefined;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.IDENTIFIER && 
          (i === 0 || tokens[i - 1].type === TokenType.PIPE)) {
        const tableName = tokens[i].value;
        if (this.schemaProvider.getTable(tableName)) {
          currentTable = tableName;
        }
      }
    }

    // Determine context
    const context: QueryContext = {
      position,
      text: textToCursor,
      currentTable,
      availableColumns: currentTable ? 
        this.schemaProvider.getColumns(currentTable).map(c => c.name) : []
    };

    // Check if we're in a function call
    context.functionContext = this.getFunctionContext(tokens, position);

    return context;
  }

  private isAtBeginning(context: QueryContext): boolean {
    const trimmed = context.text.trim();
    return trimmed === '' || !trimmed.includes('|');
  }

  private isAfterPipe(context: QueryContext): boolean {
    const lastPipeIndex = context.text.lastIndexOf('|');
    if (lastPipeIndex === -1) return false;
    
    const afterPipe = context.text.substring(lastPipeIndex + 1).trim();
    return afterPipe === '' || afterPipe.split(/\s+/).length === 1;
  }

  private isInWhereClause(context: QueryContext): boolean {
    const lastPipeIndex = context.text.lastIndexOf('|');
    const afterPipe = lastPipeIndex >= 0 ? context.text.substring(lastPipeIndex + 1) : context.text;
    return /\\bwhere\\b/i.test(afterPipe) && !this.isAfterPipe(context);
  }

  private isInProjectClause(context: QueryContext): boolean {
    const lastPipeIndex = context.text.lastIndexOf('|');
    const afterPipe = lastPipeIndex >= 0 ? context.text.substring(lastPipeIndex + 1) : context.text;
    return /\\bproject\\b/i.test(afterPipe) && !this.isAfterPipe(context);
  }

  private isInSummarizeClause(context: QueryContext): boolean {
    const lastPipeIndex = context.text.lastIndexOf('|');
    const afterPipe = lastPipeIndex >= 0 ? context.text.substring(lastPipeIndex + 1) : context.text;
    return /\\bsummarize\\b/i.test(afterPipe) && !this.isAfterPipe(context);
  }

  private isInFunctionCall(context: QueryContext): boolean {
    return context.functionContext !== undefined;
  }

  private getFunctionContext(tokens: any[], position: Position): { name: string; parameterIndex: number } | undefined {
    // Find the most recent function call that contains the cursor position
    let functionName = '';
    let parameterIndex = 0;
    let parenDepth = 0;
    let inFunction = false;

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      
      if (token.type === TokenType.RPAREN) {
        parenDepth++;
      } else if (token.type === TokenType.LPAREN) {
        parenDepth--;
        if (parenDepth < 0 && i > 0 && tokens[i - 1].type === TokenType.IDENTIFIER) {
          functionName = tokens[i - 1].value;
          inFunction = true;
          break;
        }
      } else if (token.type === TokenType.COMMA && parenDepth === 0) {
        parameterIndex++;
      }
    }

    return inFunction ? { name: functionName, parameterIndex } : undefined;
  }

  private getTableCompletions(): CompletionItem[] {
    return this.schemaProvider.getTables().map(table => ({
      label: table.name,
      kind: CompletionItemKind.Table,
      detail: 'Table',
      documentation: table.description,
      insertText: table.name,
      sortText: `0_${table.name}`
    }));
  }

  private getCommandCompletions(): CompletionItem[] {
    const commands = [
      'where', 'project', 'extend', 'summarize', 'order', 'top', 'limit', 
      'distinct', 'join', 'union', 'let'
    ];

    return commands.map(cmd => ({
      label: cmd,
      kind: CompletionItemKind.Keyword,
      detail: 'Command',
      documentation: this.getCommandDocumentation(cmd),
      insertText: cmd + ' ',
      sortText: `1_${cmd}`
    }));
  }

  private getColumnCompletions(tableName?: string): CompletionItem[] {
    if (!tableName) return [];

    const columns = this.schemaProvider.getColumns(tableName);
    return columns.map(column => ({
      label: column.name,
      kind: CompletionItemKind.Field,
      detail: `${column.type}${column.nullable ? ' (nullable)' : ''}`,
      documentation: column.description,
      insertText: column.name,
      sortText: `2_${column.name}`
    }));
  }

  private getOperatorCompletions(): CompletionItem[] {
    const operators = this.schemaProvider.getOperators();
    return operators.map(op => ({
      label: op.operator,
      kind: CompletionItemKind.Operator,
      detail: `${op.leftType} ${op.operator} ${op.rightType} -> ${op.returnType}`,
      documentation: op.description,
      insertText: op.operator,
      sortText: `3_${op.operator}`
    }));
  }

  private getFunctionCompletions(): CompletionItem[] {
    const functions = this.schemaProvider.getFunctions();
    return functions.map(func => ({
      label: func.name,
      kind: CompletionItemKind.Function,
      detail: this.getFunctionSignature(func),
      documentation: func.description,
      insertText: this.getFunctionInsertText(func),
      sortText: `4_${func.name}`
    }));
  }

  private getAggregationCompletions(): CompletionItem[] {
    const functions = this.schemaProvider.getFunctions().filter(f => f.category === 'aggregation');
    return functions.map(func => ({
      label: func.name,
      kind: CompletionItemKind.Function,
      detail: this.getFunctionSignature(func),
      documentation: func.description,
      insertText: this.getFunctionInsertText(func),
      sortText: `1_${func.name}` // Higher priority for aggregations in summarize
    }));
  }

  private getFunctionParameterCompletions(functionContext: { name: string; parameterIndex: number }): CompletionItem[] {
    const func = this.schemaProvider.getFunction(functionContext.name);
    if (!func || functionContext.parameterIndex >= func.parameters.length) {
      return [];
    }

    const parameter = func.parameters[functionContext.parameterIndex];
    const completions: CompletionItem[] = [];

    // Add type-specific completions
    if (parameter.type === 'timespan') {
      completions.push(...this.getTimespanCompletions());
    } else if (parameter.type === 'string' && parameter.name === 'column') {
      // Column suggestions for column parameters
      completions.push(...this.getColumnCompletions());
    }

    return completions;
  }

  private getTimespanCompletions(): CompletionItem[] {
    const timespans = ['1s', '30s', '1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d', '7d', '30d'];
    return timespans.map(ts => ({
      label: ts,
      kind: CompletionItemKind.Value,
      detail: 'Timespan',
      insertText: ts,
      sortText: `1_${ts}`
    }));
  }

  private getGeneralCompletions(context: QueryContext): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    // Add keywords
    completions.push(...this.getKeywordCompletions());
    
    // Add columns if we have a current table
    if (context.currentTable) {
      completions.push(...this.getColumnCompletions(context.currentTable));
    }
    
    // Add functions
    completions.push(...this.getFunctionCompletions());
    
    return completions;
  }

  private getKeywordCompletions(): CompletionItem[] {
    const keywords = this.schemaProvider.getKeywords();
    return keywords.map(keyword => ({
      label: keyword.keyword,
      kind: CompletionItemKind.Keyword,
      detail: keyword.category,
      documentation: keyword.description,
      insertText: keyword.keyword,
      sortText: `5_${keyword.keyword}`
    }));
  }

  private getFunctionSignature(func: any): string {
    const params = func.parameters.map((p: any) => 
      `${p.name}: ${p.type}${p.optional ? '?' : ''}`
    ).join(', ');
    return `${func.name}(${params}) -> ${func.returnType}`;
  }

  private getFunctionInsertText(func: any): string {
    const requiredParams = func.parameters.filter((p: any) => !p.optional);
    if (requiredParams.length === 0) {
      return `${func.name}()`;
    }
    
    const paramPlaceholders = requiredParams.map((_: any, index: number) => `$${index + 1}`).join(', ');
    return `${func.name}(${paramPlaceholders})`;
  }

  private getCommandDocumentation(command: string): string {
    const docs: Record<string, string> = {
      where: 'Filters a table to the subset of rows that satisfy a predicate',
      project: 'Select what columns to include, rename or drop, and insert new computed columns',
      extend: 'Create calculated columns and append them to the result set',
      summarize: 'Produce a table that aggregates the content of the input table',
      order: 'Sort the rows of the input table by one or more columns',
      top: 'Returns the first N records sorted by the specified columns',
      limit: 'Return up to the specified number of rows',
      distinct: 'Produces a table with the distinct combination of the provided columns',
      join: 'Merge the rows of two tables to form a new table',
      union: 'Takes two or more tables and returns the rows of all of them'
    };
    return docs[command] || '';
  }

  private filterAndSortCompletions(completions: CompletionItem[], context: QueryContext): CompletionItem[] {
    // Get the current word being typed
    const currentWord = this.getCurrentWord(context);
    
    if (!currentWord) {
      return completions.sort((a, b) => (a.sortText || a.label).localeCompare(b.sortText || b.label));
    }

    // Filter completions that start with the current word
    const filtered = completions.filter(item => 
      item.label.toLowerCase().startsWith(currentWord.toLowerCase()) ||
      (item.filterText && item.filterText.toLowerCase().startsWith(currentWord.toLowerCase()))
    );

    // Sort by relevance
    return filtered.sort((a, b) => {
      // Exact matches first
      const aExact = a.label.toLowerCase() === currentWord.toLowerCase() ? 0 : 1;
      const bExact = b.label.toLowerCase() === currentWord.toLowerCase() ? 0 : 1;
      
      if (aExact !== bExact) return aExact - bExact;
      
      // Then by sort text
      return (a.sortText || a.label).localeCompare(b.sortText || b.label);
    });
  }

  private getCurrentWord(context: QueryContext): string {
    const line = context.text.split('\n')[context.position.line] || '';
    const beforeCursor = line.substring(0, context.position.character);
    const match = beforeCursor.match(/[\w_]+$/);
    return match ? match[0] : '';
  }
}