/**
 * KQL Analytics Engine Types
 * Comprehensive type definitions for KQL parsing, execution, and query management
 */

// KQL Query Structure
export interface KQLQuery {
  id?: string;
  query: string;
  timeRange?: TimeRange;
  parameters?: Record<string, any>;
  metadata?: QueryMetadata;
}

export interface TimeRange {
  start: Date | string;
  end: Date | string;
  duration?: string; // e.g., "1h", "24h", "7d"
}

export interface QueryMetadata {
  title?: string;
  description?: string;
  category?: QueryCategory;
  severity?: SeverityLevel;
  mitreAttack?: MitreAttackInfo;
  requiredFields?: string[];
  tags?: string[];
  author?: string;
  version?: string;
  lastModified?: Date;
}

// Query Categories (aligned with 50 use cases)
export type QueryCategory = 
  | 'threat-detection'
  | 'ueba'
  | 'compliance'
  | 'network-analysis'
  | 'endpoint-security'
  | 'authentication'
  | 'data-exfiltration'
  | 'malware-analysis'
  | 'insider-threat'
  | 'vulnerability-management'
  | 'incident-response'
  | 'forensics'
  | 'threat-hunting'
  | 'asset-discovery'
  | 'performance-monitoring';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface MitreAttackInfo {
  tactic: string;
  technique: string;
  subtechnique?: string;
  description?: string;
}

// KQL AST (Abstract Syntax Tree) Types
export interface KQLNode {
  type: string;
  children?: KQLNode[];
  value?: any;
  metadata?: Record<string, any>;
}

export interface TableExpression extends KQLNode {
  type: 'table';
  tableName: string;
  schema?: string;
}

export interface WhereExpression extends KQLNode {
  type: 'where';
  condition: FilterExpression;
}

export interface FilterExpression extends KQLNode {
  type: 'filter';
  operator: FilterOperator;
  left: KQLNode;
  right: KQLNode;
}

export type FilterOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'startswith' | 'endswith' | 'matches'
  | 'in' | 'not_in' | 'between' | 'is_null' | 'is_not_null'
  | 'and' | 'or' | 'not';

export interface SummarizeExpression extends KQLNode {
  type: 'summarize';
  aggregations: AggregationExpression[];
  groupBy?: string[];
}

export interface AggregationExpression extends KQLNode {
  type: 'aggregation';
  function: AggregationFunction;
  column: string;
  alias?: string;
}

export type AggregationFunction = 
  | 'count' | 'sum' | 'avg' | 'min' | 'max'
  | 'countif' | 'sumif' | 'avgif'
  | 'dcount' | 'stdev' | 'variance'
  | 'percentile' | 'median'
  | 'make_list' | 'make_set'
  | 'arg_min' | 'arg_max';

export interface ProjectExpression extends KQLNode {
  type: 'project';
  columns: ProjectColumn[];
}

export interface ProjectColumn {
  name: string;
  alias?: string;
  expression?: KQLNode;
}

export interface ExtendExpression extends KQLNode {
  type: 'extend';
  extensions: ExtendColumn[];
}

export interface ExtendColumn {
  name: string;
  expression: KQLNode;
}

export interface SortExpression extends KQLNode {
  type: 'sort';
  columns: SortColumn[];
}

export interface SortColumn {
  name: string;
  direction: 'asc' | 'desc';
}

export interface TopExpression extends KQLNode {
  type: 'top';
  count: number;
  columns?: SortColumn[];
}

export interface JoinExpression extends KQLNode {
  type: 'join';
  joinType: JoinType;
  rightTable: TableExpression;
  onCondition: FilterExpression;
}

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'anti' | 'semi';

// Query Execution Types
export interface QueryExecutionPlan {
  id: string;
  originalQuery: string;
  optimizedQuery: string;
  steps: ExecutionStep[];
  estimatedCost: number;
  estimatedRows: number;
  cacheKey?: string;
}

export interface ExecutionStep {
  id: string;
  type: ExecutionStepType;
  description: string;
  sql?: string;
  parameters?: Record<string, any>;
  estimatedCost: number;
  estimatedRows: number;
  dependencies?: string[];
}

export type ExecutionStepType = 
  | 'table_scan' | 'index_scan' | 'filter' | 'aggregation' 
  | 'sort' | 'join' | 'projection' | 'cache_lookup';

export interface QueryResult {
  id: string;
  query: string;
  executionTime: number;
  totalRows: number;
  columns: ResultColumn[];
  data: ResultRow[];
  metadata: ResultMetadata;
  cached?: boolean;
  cacheHit?: boolean;
}

export interface ResultColumn {
  name: string;
  type: string;
  displayName?: string;
}

export interface ResultRow {
  [columnName: string]: any;
}

export interface ResultMetadata {
  executionPlan?: QueryExecutionPlan;
  warnings?: string[];
  performance: PerformanceMetrics;
  dataSource: string;
  queryHash: string;
}

export interface PerformanceMetrics {
  parseTime: number;
  planTime: number;
  executionTime: number;
  totalTime: number;
  memoryUsed: number;
  ioOperations: number;
  cacheHits: number;
  cacheMisses: number;
}

// Saved Queries
export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  category: QueryCategory;
  severity: SeverityLevel;
  tags: string[];
  parameters: QueryParameter[];
  metadata: QueryMetadata;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  isPublic: boolean;
  executionCount: number;
  avgExecutionTime: number;
}

export interface QueryParameter {
  name: string;
  type: ParameterType;
  defaultValue?: any;
  description?: string;
  required: boolean;
  options?: any[]; // For enum-type parameters
}

export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';

// Scheduled Queries
export interface ScheduledQuery {
  id: string;
  savedQueryId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  parameters: Record<string, any>;
  alertConfig?: AlertConfiguration;
  outputConfig: OutputConfiguration;
  lastRun?: Date;
  nextRun: Date;
  createdBy: string;
  createdAt: Date;
}

export interface AlertConfiguration {
  enabled: boolean;
  threshold?: number;
  condition?: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains_results';
  severity: SeverityLevel;
  notificationChannels: string[];
  suppressionWindow?: number; // minutes
}

export interface OutputConfiguration {
  format: 'json' | 'csv' | 'arrow' | 'dashboard';
  destination: 'email' | 'webhook' | 'file' | 'dashboard' | 'correlation_engine';
  settings: Record<string, any>;
}

// Schema Definition
export interface SchemaField {
  name: string;
  type: FieldType;
  description?: string;
  indexed?: boolean;
  nullable?: boolean;
  examples?: any[];
  children?: SchemaField[]; // For nested objects
}

export type FieldType = 
  | 'string' | 'number' | 'boolean' | 'date' | 'timestamp'
  | 'ip_address' | 'email' | 'url' | 'hash' | 'uuid'
  | 'object' | 'array' | 'geo_location' | 'json';

export interface DataSchema {
  version: string;
  tables: TableSchema[];
  functions: SchemaFunction[];
  lastUpdated: Date;
}

export interface TableSchema {
  name: string;
  description?: string;
  fields: SchemaField[];
  primaryKey?: string[];
  indexes?: IndexDefinition[];
  partitionBy?: string;
  retentionPolicy?: RetentionPolicy;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'fulltext';
  unique?: boolean;
}

export interface RetentionPolicy {
  duration: string; // e.g., "90d", "1y"
  action: 'delete' | 'archive' | 'compress';
}

export interface SchemaFunction {
  name: string;
  category: 'string' | 'datetime' | 'math' | 'aggregation' | 'conversion' | 'conditional';
  description: string;
  parameters: FunctionParameter[];
  returnType: FieldType;
  examples: string[];
}

export interface FunctionParameter {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
}

// Resource Management
export interface ResourceLimits {
  maxQueryTime: number; // seconds
  maxMemoryUsage: number; // MB
  maxResultRows: number;
  maxConcurrentQueries: number;
  maxQueryComplexity: number;
}

export interface QueryResource {
  queryId: string;
  startTime: Date;
  memoryUsed: number;
  cpuTime: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  priority: 'low' | 'normal' | 'high' | 'critical';
}

// Error Types
export interface KQLError {
  type: KQLErrorType;
  message: string;
  line?: number;
  column?: number;
  query?: string;
  suggestions?: string[];
}

export type KQLErrorType = 
  | 'syntax_error' | 'semantic_error' | 'execution_error' 
  | 'timeout_error' | 'resource_error' | 'permission_error'
  | 'schema_error' | 'parameter_error';

// Cache Types
export interface CacheEntry {
  key: string;
  query: string;
  result: QueryResult;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number; // bytes
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  evictions: number;
  averageQueryTime: number;
  cacheEnabled: boolean;
}