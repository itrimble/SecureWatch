// src/lib/kql_ast.ts
export interface AstNode { type: string; }

export interface QueryNode extends AstNode {
  type: 'Query';
  source: string; // Table name
  operations: OperationNode[];
}

// --- Operation Nodes ---
export type OperationNode =
  | WhereNode
  | ProjectNode
  | TakeNode
  | SummarizeNode
  | SortNode
  | SearchNode    // New
  | ExtendNode    // New
  | DistinctNode  // New
  | TopNode;      // New

export interface WhereNode extends AstNode {
  type: 'Where';
  condition: ConditionNode;
}

export interface ProjectNode extends AstNode {
  type: 'Project';
  fields: string[]; // Array of resulting column names or expressions
}

export interface TakeNode extends AstNode {
  type: 'Take'; // KQL 'take' or 'limit'
  count: number;
}

// --- Summarize Node ---
export type AggFunctionType = 'count' | 'dcount' | 'min' | 'max' | 'avg' | 'sum'; // Add more as needed

export interface Aggregation {
  newColumnName: string;
  function: AggFunctionType;
  field?: string; // Field to aggregate over, not needed for count()
}

export type GroupByItem = string | GroupByExpression;

export interface GroupByExpression extends AstNode {
    type: 'FunctionCall';
    functionName: 'date_trunc'; // For now, only support date_trunc
    arguments: [string, string]; // e.g., ['hour', 'timestamp']
    alias: string; // e.g., 'timestamp_hour'
}

export interface SummarizeNode extends AstNode {
  type: 'Summarize';
  aggregations: Aggregation[];
  groupByFields: GroupByItem[];
}

// --- Sort Node ---
export type SortOrder = 'asc' | 'desc';
export type NullsOrder = 'first' | 'last';

export interface SortClause {
  field: string; // Field name or alias
  order?: SortOrder;
  nulls?: NullsOrder;
}

export interface SortNode extends AstNode {
  type: 'Sort';
  clauses: SortClause[];
}

// --- New Operation Nodes ---
export interface SearchNode extends AstNode {
    type: 'Search';
    searchTerm: string;
    columns: string[] | null; // Optional: specific columns to search in
}

export interface ExtendedColumn {
    name: string;
    expression: string; // For PoC, store as string; ideally a mini-AST for the expression
}
export interface ExtendNode extends AstNode {
    type: 'Extend';
    newColumns: ExtendedColumn[];
}

export interface DistinctNode extends AstNode {
    type: 'Distinct';
    columns: string[];
}

export interface TopNode extends AstNode {
    type: 'Top';
    count: number;
    byField: string; // Field to determine the top records by
    order?: SortOrder; // Usually 'desc' for 'top', 'asc' for 'bottom'
    withOthers?: boolean; // KQL `withothers` parameter
}


// --- Condition Nodes (for WhereNode) ---
export type ConditionNode =
  | EqualityConditionNode
  | ComparisonConditionNode
  | StringOperationConditionNode
  | LogicalConditionNode
  | InConditionNode             // New
  | MatchesRegexConditionNode;  // New


export interface EqualityConditionNode extends AstNode {
  type: 'Equals';
  field: string;
  value: string | number | boolean | null; // Allow null for `field == null`
}

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '!=';

export interface ComparisonConditionNode extends AstNode {
  type: 'Compare';
  field: string;
  operator: ComparisonOperator;
  value: string | number;
}

export type StringOperationType = 'contains' | 'startswith' | 'endswith';

export interface StringOperationConditionNode extends AstNode {
  type: 'StringOperation';
  field: string;
  operator: StringOperationType;
  value: string;
  caseSensitive?: boolean;
}

export type LogicalOperator = 'and' | 'or';

export interface LogicalConditionNode extends AstNode {
  type: 'Logical';
  operator: LogicalOperator;
  conditions: ConditionNode[];
}

// New Condition Node types
export interface InConditionNode extends AstNode {
    type: 'In';
    field: string;
    values: (string | number | boolean | null)[]; // Array of literal values
    caseSensitive?: boolean; // For string comparisons within the 'in' set
}

export interface MatchesRegexConditionNode extends AstNode {
    type: 'MatchesRegex';
    field: string;
    regex: string; // The regex pattern as a string
}
