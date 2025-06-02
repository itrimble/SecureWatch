// Abstract Syntax Tree (AST) Node Types for KQL

export interface ASTNode {
  type: string;
  start?: number;
  end?: number;
}

// Base query structure
export interface Query extends ASTNode {
  type: 'Query';
  tableExpression: TableExpression;
  operations: Operation[];
}

// Table expressions
export interface TableExpression extends ASTNode {
  type: 'TableExpression';
  name: string;
  alias?: string;
}

// Operations (after pipe |)
export type Operation = 
  | WhereOperation
  | ProjectOperation
  | ExtendOperation
  | SummarizeOperation
  | OrderOperation
  | TopOperation
  | LimitOperation
  | DistinctOperation
  | JoinOperation
  | UnionOperation;

export interface WhereOperation extends ASTNode {
  type: 'WhereOperation';
  predicate: Expression;
}

export interface ProjectOperation extends ASTNode {
  type: 'ProjectOperation';
  columns: ProjectColumn[];
}

export interface ProjectColumn extends ASTNode {
  type: 'ProjectColumn';
  expression: Expression;
  alias?: string;
}

export interface ExtendOperation extends ASTNode {
  type: 'ExtendOperation';
  assignments: Assignment[];
}

export interface Assignment extends ASTNode {
  type: 'Assignment';
  name: string;
  expression: Expression;
}

export interface SummarizeOperation extends ASTNode {
  type: 'SummarizeOperation';
  aggregations: Aggregation[];
  by?: Expression[];
}

export interface Aggregation extends ASTNode {
  type: 'Aggregation';
  function: AggregationFunction;
  expression?: Expression;
  alias?: string;
}

export type AggregationFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'dcount' | 'countif' | 'sumif' | 'avgif';

export interface OrderOperation extends ASTNode {
  type: 'OrderOperation';
  orderBy: OrderByExpression[];
}

export interface OrderByExpression extends ASTNode {
  type: 'OrderByExpression';
  expression: Expression;
  direction: 'asc' | 'desc';
}

export interface TopOperation extends ASTNode {
  type: 'TopOperation';
  count: Expression;
  by?: OrderByExpression[];
}

export interface LimitOperation extends ASTNode {
  type: 'LimitOperation';
  count: Expression;
}

export interface DistinctOperation extends ASTNode {
  type: 'DistinctOperation';
  columns?: Expression[];
}

export interface JoinOperation extends ASTNode {
  type: 'JoinOperation';
  joinKind: JoinKind;
  table: TableExpression;
  on: Expression;
}

export type JoinKind = 'inner' | 'left' | 'right' | 'full' | 'leftanti' | 'rightsemi';

export interface UnionOperation extends ASTNode {
  type: 'UnionOperation';
  tables: TableExpression[];
}

// Expressions
export type Expression = 
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression
  | ConditionalExpression
  | Identifier
  | Literal;

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator = 
  | '==' | '!=' | '<' | '<=' | '>' | '>='
  | 'contains' | '!contains' | 'startswith' | 'endswith' | 'matches'
  | 'in' | '!in' | 'between' | 'like'
  | 'and' | 'or'
  | '+' | '-' | '*' | '/' | '%';

export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}

export type UnaryOperator = 'not' | '-' | '+';

export interface CallExpression extends ASTNode {
  type: 'CallExpression';
  function: string;
  arguments: Expression[];
}

export interface MemberExpression extends ASTNode {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean; // true for a[b], false for a.b
}

export interface ConditionalExpression extends ASTNode {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
  quoted?: boolean;
}

export interface Literal extends ASTNode {
  type: 'Literal';
  value: any;
  dataType: LiteralType;
}

export type LiteralType = 'string' | 'number' | 'boolean' | 'datetime' | 'timespan' | 'guid' | 'null';

// Let statements
export interface LetStatement extends ASTNode {
  type: 'LetStatement';
  name: string;
  expression: Expression;
}

// Case expressions
export interface CaseExpression extends ASTNode {
  type: 'CaseExpression';
  clauses: CaseClause[];
  elseClause?: Expression;
}

export interface CaseClause extends ASTNode {
  type: 'CaseClause';
  when: Expression;
  then: Expression;
}

// Array expressions
export interface ArrayExpression extends ASTNode {
  type: 'ArrayExpression';
  elements: Expression[];
}

// Object expressions (for dynamic objects)
export interface ObjectExpression extends ASTNode {
  type: 'ObjectExpression';
  properties: ObjectProperty[];
}

export interface ObjectProperty extends ASTNode {
  type: 'ObjectProperty';
  key: Expression;
  value: Expression;
}

// Type information for semantic analysis
export interface TypeInfo {
  dataType: DataType;
  nullable?: boolean;
  array?: boolean;
}

export type DataType = 
  | 'string' | 'int' | 'long' | 'real' | 'bool' | 'datetime' | 'timespan' | 'guid' | 'dynamic' | 'decimal';

// Metadata for query optimization
export interface QueryMetadata {
  tables: string[];
  columns: string[];
  functions: string[];
  complexity: number;
  estimatedRows?: number;
}