export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  filterText?: string;
  sortText?: string;
  range?: Range;
  command?: Command;
  additionalTextEdits?: TextEdit[];
  commitCharacters?: string[];
  data?: any;
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
  Table = 26,
  Column = 27
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  character: number;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface Command {
  title: string;
  command: string;
  arguments?: any[];
}

export interface CompletionContext {
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

export enum CompletionTriggerKind {
  Invoked = 1,
  TriggerCharacter = 2,
  TriggerForIncompleteCompletions = 3
}

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface HoverInfo {
  contents: string | MarkupContent;
  range?: Range;
}

export interface MarkupContent {
  kind: 'plaintext' | 'markdown';
  value: string;
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkupContent;
  parameters?: ParameterInformation[];
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkupContent;
}

export interface SchemaInfo {
  tables: TableInfo[];
  functions: FunctionInfo[];
  operators: OperatorInfo[];
  keywords: KeywordInfo[];
}

export interface TableInfo {
  name: string;
  description?: string;
  columns: ColumnInfo[];
  sampleQueries?: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  description?: string;
  nullable: boolean;
  examples?: any[];
}

export interface FunctionInfo {
  name: string;
  description?: string;
  parameters: ParameterInfo[];
  returnType: string;
  examples?: string[];
  category: 'aggregation' | 'scalar' | 'window' | 'table';
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface OperatorInfo {
  operator: string;
  description: string;
  leftType: string;
  rightType: string;
  returnType: string;
  examples: string[];
}

export interface KeywordInfo {
  keyword: string;
  description: string;
  category: 'command' | 'function' | 'operator' | 'type';
  examples: string[];
}

export interface QueryContext {
  position: Position;
  text: string;
  currentTable?: string;
  availableColumns?: string[];
  inOperator?: boolean;
  operatorContext?: string;
  functionContext?: {
    name: string;
    parameterIndex: number;
  };
}