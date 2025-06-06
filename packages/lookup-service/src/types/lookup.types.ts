export interface LookupTable {
  id: string;
  name: string;
  description?: string;
  filename: string;
  keyField: string;
  fields: LookupField[];
  recordCount: number;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  tags: string[];
}

export interface LookupField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url';
  description?: string;
  isKey: boolean;
  sampleValues: string[];
}

export interface LookupRecord {
  [key: string]: any;
}

export interface LookupQuery {
  tableName: string;
  keyField: string;
  keyValue: string;
  returnFields?: string[];
}

export interface LookupResult {
  found: boolean;
  record?: LookupRecord;
  tableName: string;
  keyField: string;
  keyValue: string;
  timestamp: Date;
}

export interface EnrichmentRule {
  id: string;
  name: string;
  description?: string;
  sourceField: string;
  lookupTable: string;
  lookupKeyField: string;
  outputFields: EnrichmentOutputField[];
  conditions?: EnrichmentCondition[];
  isActive: boolean;
  priority: number;
}

export interface EnrichmentOutputField {
  sourceField: string;
  outputField: string;
  defaultValue?: any;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'capitalize';
}

export interface EnrichmentCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
}

export interface LookupUploadOptions {
  filename: string;
  keyField: string;
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  encoding?: string;
  tags?: string[];
  description?: string;
}

export interface LookupStats {
  totalTables: number;
  totalRecords: number;
  totalQueries: number;
  cacheHitRate: number;
  averageQueryTime: number;
  topTables: Array<{
    name: string;
    queryCount: number;
    lastUsed: Date;
  }>;
}

export interface APILookupConfig {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  timeout: number;
  cacheTTL: number;
  retryConfig: {
    attempts: number;
    backoff: number;
  };
  fieldMapping: {
    input: string;
    output: Record<string, string>;
  };
}

export interface ExternalLookupResult {
  found: boolean;
  data?: Record<string, any>;
  source: string;
  cached: boolean;
  responseTime: number;
  error?: string;
}