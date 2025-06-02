export interface ExecutionContext {
  organizationId: string;
  userId: string;
  timeRange?: TimeRange;
  maxRows?: number;
  timeout?: number;
  cache?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface QueryResult {
  columns: ResultColumn[];
  rows: ResultRow[];
  metadata: QueryMetadata;
  executionTime: number;
  fromCache: boolean;
}

export interface ResultColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ResultRow {
  [columnName: string]: any;
}

export interface QueryMetadata {
  totalRows: number;
  scannedRows: number;
  executionPlan: ExecutionPlan;
  performance: PerformanceMetrics;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimatedCost: number;
  optimizations: string[];
}

export interface ExecutionStep {
  operation: string;
  description: string;
  estimatedRows: number;
  estimatedCost: number;
  index?: number;
}

export interface PerformanceMetrics {
  parseTime: number;
  planTime: number;
  executionTime: number;
  totalTime: number;
  memoryUsage: number;
  cpuTime: number;
  ioOperations: number;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  partitions?: PartitionSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  description?: string;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  unique: boolean;
  partial?: string;
}

export interface PartitionSchema {
  column: string;
  type: 'range' | 'list' | 'hash';
  values?: any[];
}

export interface QueryOptimization {
  type: OptimizationType;
  description: string;
  estimatedImprovement: number;
  applied: boolean;
}

export enum OptimizationType {
  INDEX_USAGE = 'index_usage',
  PREDICATE_PUSHDOWN = 'predicate_pushdown',
  PROJECTION_PUSHDOWN = 'projection_pushdown',
  JOIN_REORDER = 'join_reorder',
  AGGREGATION_PUSHDOWN = 'aggregation_pushdown',
  PARTITION_ELIMINATION = 'partition_elimination',
  CONSTANT_FOLDING = 'constant_folding',
  DEAD_CODE_ELIMINATION = 'dead_code_elimination'
}

export interface CacheKey {
  query: string;
  organizationId: string;
  timeRange?: TimeRange;
  parameters?: Record<string, any>;
}

export interface CacheEntry {
  key: CacheKey;
  result: QueryResult;
  createdAt: Date;
  expiresAt: Date;
  size: number;
}