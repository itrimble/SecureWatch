/**
 * Schema Manager for KQL Analytics Engine
 * Manages data schema, field mappings, and metadata for the normalized data model
 */

import { Pool } from 'pg';
import { 
  DataSchema, 
  TableSchema, 
  SchemaField, 
  SchemaFunction, 
  IndexDefinition,
  RetentionPolicy,
  FieldType
} from '../types/kql.types';

export class SchemaManager {
  private dbPool: Pool;
  private cachedSchema: DataSchema | null = null;
  private lastSchemaUpdate: Date | null = null;
  private schemaCacheTTL = 300000; // 5 minutes in milliseconds
  
  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }
  
  /**
   * Get complete data schema with caching
   */
  public async getSchema(forceRefresh = false): Promise<DataSchema> {
    if (!forceRefresh && this.isSchemaCacheValid()) {
      return this.cachedSchema!;
    }
    
    const schema = await this.loadSchemaFromDatabase();
    this.cachedSchema = schema;
    this.lastSchemaUpdate = new Date();
    
    return schema;
  }
  
  /**
   * Get schema for a specific table
   */
  public async getTableSchema(tableName: string): Promise<TableSchema | null> {
    const schema = await this.getSchema();
    return schema.tables.find(table => table.name === tableName) || null;
  }
  
  /**
   * Get all available functions
   */
  public async getFunctions(): Promise<SchemaFunction[]> {
    const schema = await this.getSchema();
    return schema.functions;
  }
  
  /**
   * Validate field exists in schema
   */
  public async validateField(tableName: string, fieldName: string): Promise<boolean> {
    const tableSchema = await this.getTableSchema(tableName);
    
    if (!tableSchema) {
      return false;
    }
    
    return this.findFieldInSchema(tableSchema.fields, fieldName) !== null;
  }
  
  /**
   * Get field type for validation
   */
  public async getFieldType(tableName: string, fieldName: string): Promise<FieldType | null> {
    const tableSchema = await this.getTableSchema(tableName);
    
    if (!tableSchema) {
      return null;
    }
    
    const field = this.findFieldInSchema(tableSchema.fields, fieldName);
    return field ? field.type : null;
  }
  
  /**
   * Get suggested fields for autocomplete
   */
  public async getSuggestedFields(
    tableName: string, 
    prefix: string = ''
  ): Promise<SchemaField[]> {
    const tableSchema = await this.getTableSchema(tableName);
    
    if (!tableSchema) {
      return [];
    }
    
    const allFields = this.flattenFields(tableSchema.fields);
    
    if (!prefix) {
      return allFields;
    }
    
    const lowercasePrefix = prefix.toLowerCase();
    return allFields.filter(field => 
      field.name.toLowerCase().startsWith(lowercasePrefix)
    );
  }
  
  /**
   * Get schema mapping for KQL to SQL translation
   */
  public async getSchemaMapping(): Promise<Record<string, string>> {
    const schema = await this.getSchema();
    const mapping: Record<string, string> = {};
    
    for (const table of schema.tables) {
      const flatFields = this.flattenFields(table.fields);
      
      for (const field of flatFields) {
        // Map common KQL field names to actual database columns
        mapping[field.name] = `"${field.name}"`;
        
        // Add common aliases
        if (field.name.includes('timestamp') || field.name.includes('time')) {
          mapping['TimeGenerated'] = `"${field.name}"`;
        }
        
        if (field.name.includes('user')) {
          mapping['User'] = `"${field.name}"`;
        }
        
        if (field.name.includes('source_ip') || field.name.includes('client_ip')) {
          mapping['SourceIP'] = `"${field.name}"`;
        }
      }
    }
    
    return mapping;
  }
  
  /**
   * Load schema from database
   */
  private async loadSchemaFromDatabase(): Promise<DataSchema> {
    const tables = await this.loadTables();
    const functions = await this.loadFunctions();
    
    return {
      version: '1.0.0',
      tables,
      functions,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Load table schemas from database
   */
  private async loadTables(): Promise<TableSchema[]> {
    const client = await this.dbPool.connect();
    
    try {
      // Get all tables
      const tablesQuery = `
        SELECT 
          t.table_name,
          t.table_type,
          obj_description(c.oid) as table_comment
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables: TableSchema[] = [];
      
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        
        // Get columns for this table
        const fields = await this.loadTableFields(client, tableName);
        const indexes = await this.loadTableIndexes(client, tableName);
        
        tables.push({
          name: tableName,
          description: row.table_comment || `Table: ${tableName}`,
          fields,
          indexes,
          primaryKey: this.extractPrimaryKey(fields),
          partitionBy: this.getPartitionColumn(tableName),
          retentionPolicy: this.getRetentionPolicy(tableName)
        });
      }
      
      return tables;
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Load fields for a specific table
   */
  private async loadTableFields(client: any, tableName: string): Promise<SchemaField[]> {
    const fieldsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        col_description(pgc.oid, c.ordinal_position) as column_comment
      FROM information_schema.columns c
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      WHERE c.table_name = $1
      AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `;
    
    const result = await client.query(fieldsQuery, [tableName]);
    const fields: SchemaField[] = [];
    
    for (const row of result.rows) {
      const field: SchemaField = {
        name: row.column_name,
        type: this.mapPostgreSQLTypeToFieldType(row.data_type),
        description: row.column_comment || `Field: ${row.column_name}`,
        indexed: await this.isFieldIndexed(client, tableName, row.column_name),
        nullable: row.is_nullable === 'YES',
        examples: await this.getFieldExamples(client, tableName, row.column_name)
      };
      
      // Handle nested JSON fields
      if (field.type === 'json' || field.type === 'object') {
        field.children = await this.loadJSONFieldChildren(client, tableName, row.column_name);
      }
      
      fields.push(field);
    }
    
    return fields;
  }
  
  /**
   * Load indexes for a specific table
   */
  private async loadTableIndexes(client: any, tableName: string): Promise<IndexDefinition[]> {
    const indexQuery = `
      SELECT 
        i.indexname,
        i.indexdef,
        i.indexname LIKE '%_pkey' as is_primary,
        i.indexname LIKE '%_unique%' as is_unique
      FROM pg_indexes i
      WHERE i.tablename = $1
      AND i.schemaname = 'public'
    `;
    
    const result = await client.query(indexQuery, [tableName]);
    const indexes: IndexDefinition[] = [];
    
    for (const row of result.rows) {
      // Parse index definition to extract columns
      const columns = this.parseIndexColumns(row.indexdef);
      
      indexes.push({
        name: row.indexname,
        columns,
        type: this.determineIndexType(row.indexdef),
        unique: row.is_unique || row.is_primary
      });
    }
    
    return indexes;
  }
  
  /**
   * Load available functions
   */
  private async loadFunctions(): Promise<SchemaFunction[]> {
    // Return built-in KQL functions
    return [
      {
        name: 'count',
        category: 'aggregation',
        description: 'Returns the number of records in the input record set',
        parameters: [],
        returnType: 'number',
        examples: ['count()', 'summarize count() by category']
      },
      {
        name: 'sum',
        category: 'aggregation',
        description: 'Returns the sum of the expression across the group',
        parameters: [
          { name: 'expression', type: 'number', required: true, description: 'Numeric expression to sum' }
        ],
        returnType: 'number',
        examples: ['sum(bytes)', 'summarize sum(revenue) by product']
      },
      {
        name: 'avg',
        category: 'aggregation',
        description: 'Returns the average of the expression across the group',
        parameters: [
          { name: 'expression', type: 'number', required: true, description: 'Numeric expression to average' }
        ],
        returnType: 'number',
        examples: ['avg(response_time)', 'summarize avg(score) by team']
      },
      {
        name: 'min',
        category: 'aggregation',
        description: 'Returns the minimum value of the expression across the group',
        parameters: [
          { name: 'expression', type: 'string', required: true, description: 'Expression to find minimum of' }
        ],
        returnType: 'string',
        examples: ['min(timestamp)', 'summarize min(price) by category']
      },
      {
        name: 'max',
        category: 'aggregation',
        description: 'Returns the maximum value of the expression across the group',
        parameters: [
          { name: 'expression', type: 'string', required: true, description: 'Expression to find maximum of' }
        ],
        returnType: 'string',
        examples: ['max(timestamp)', 'summarize max(temperature) by location']
      },
      {
        name: 'dcount',
        category: 'aggregation',
        description: 'Returns the number of distinct values of the expression',
        parameters: [
          { name: 'expression', type: 'string', required: true, description: 'Expression to count distinct values' }
        ],
        returnType: 'number',
        examples: ['dcount(user_id)', 'summarize dcount(ip_address) by country']
      },
      {
        name: 'make_set',
        category: 'aggregation',
        description: 'Returns a set of distinct values of the expression',
        parameters: [
          { name: 'expression', type: 'string', required: true, description: 'Expression to create set from' }
        ],
        returnType: 'array',
        examples: ['make_set(category)', 'summarize make_set(error_code) by application']
      },
      {
        name: 'make_list',
        category: 'aggregation',
        description: 'Returns a list of all values of the expression',
        parameters: [
          { name: 'expression', type: 'string', required: true, description: 'Expression to create list from' }
        ],
        returnType: 'array',
        examples: ['make_list(timestamp)', 'summarize make_list(message) by session_id']
      },
      {
        name: 'ago',
        category: 'datetime',
        description: 'Returns a time period before the current time',
        parameters: [
          { name: 'duration', type: 'string', required: true, description: 'Time duration (e.g., "1h", "30m", "7d")' }
        ],
        returnType: 'timestamp',
        examples: ['ago(1h)', 'where timestamp > ago(24h)']
      },
      {
        name: 'now',
        category: 'datetime',
        description: 'Returns the current UTC time',
        parameters: [],
        returnType: 'timestamp',
        examples: ['now()', 'extend time_diff = now() - timestamp']
      },
      {
        name: 'bin',
        category: 'datetime',
        description: 'Rounds values down to a multiple of the given bin size',
        parameters: [
          { name: 'value', type: 'timestamp', required: true, description: 'Value to bin' },
          { name: 'roundTo', type: 'string', required: true, description: 'Bin size (e.g., "5m", "1h", "1d")' }
        ],
        returnType: 'timestamp',
        examples: ['bin(timestamp, 5m)', 'summarize count() by bin(timestamp, 1h)']
      },
      {
        name: 'startofday',
        category: 'datetime',
        description: 'Returns the start of the day containing the date',
        parameters: [
          { name: 'date', type: 'timestamp', required: true, description: 'Date value' }
        ],
        returnType: 'timestamp',
        examples: ['startofday(timestamp)', 'where timestamp >= startofday(ago(7d))']
      },
      {
        name: 'endofday',
        category: 'datetime',
        description: 'Returns the end of the day containing the date',
        parameters: [
          { name: 'date', type: 'timestamp', required: true, description: 'Date value' }
        ],
        returnType: 'timestamp',
        examples: ['endofday(timestamp)', 'where timestamp <= endofday(now())']
      },
      {
        name: 'contains',
        category: 'string',
        description: 'Checks if a string contains a substring (case-sensitive)',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'Source string' },
          { name: 'substring', type: 'string', required: true, description: 'Substring to search for' }
        ],
        returnType: 'boolean',
        examples: ['where message contains "error"', 'where filename contains ".log"']
      },
      {
        name: 'startswith',
        category: 'string',
        description: 'Checks if a string starts with a specific substring',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'Source string' },
          { name: 'prefix', type: 'string', required: true, description: 'Prefix to check for' }
        ],
        returnType: 'boolean',
        examples: ['where filename startswith "log_"', 'where user_agent startswith "Mozilla"']
      },
      {
        name: 'endswith',
        category: 'string',
        description: 'Checks if a string ends with a specific substring',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'Source string' },
          { name: 'suffix', type: 'string', required: true, description: 'Suffix to check for' }
        ],
        returnType: 'boolean',
        examples: ['where filename endswith ".txt"', 'where domain endswith ".com"']
      },
      {
        name: 'has_any',
        category: 'string',
        description: 'Checks if a string contains any of the specified values',
        parameters: [
          { name: 'source', type: 'string', required: true, description: 'Source string' },
          { name: 'values', type: 'array', required: true, description: 'Array of values to search for' }
        ],
        returnType: 'boolean',
        examples: ['where message has_any ("error", "warning", "critical")', 'where category has_any (categories)']
      }
    ];
  }
  
  /**
   * Map PostgreSQL data types to field types
   */
  private mapPostgreSQLTypeToFieldType(pgType: string): FieldType {
    switch (pgType.toLowerCase()) {
      case 'bigint':
      case 'integer':
      case 'smallint':
      case 'numeric':
      case 'decimal':
      case 'real':
      case 'double precision':
        return 'number';
        
      case 'boolean':
        return 'boolean';
        
      case 'date':
        return 'date';
        
      case 'timestamp':
      case 'timestamp with time zone':
      case 'timestamp without time zone':
        return 'timestamp';
        
      case 'json':
      case 'jsonb':
        return 'json';
        
      case 'inet':
        return 'ip_address';
        
      case 'uuid':
        return 'uuid';
        
      case 'text':
      case 'varchar':
      case 'character':
      case 'character varying':
      default:
        return 'string';
    }
  }
  
  /**
   * Check if schema cache is valid
   */
  private isSchemaCacheValid(): boolean {
    if (!this.cachedSchema || !this.lastSchemaUpdate) {
      return false;
    }
    
    return (Date.now() - this.lastSchemaUpdate.getTime()) < this.schemaCacheTTL;
  }
  
  /**
   * Find field in schema (supports nested fields)
   */
  private findFieldInSchema(fields: SchemaField[], fieldName: string): SchemaField | null {
    for (const field of fields) {
      if (field.name === fieldName) {
        return field;
      }
      
      // Search in nested fields
      if (field.children) {
        const nestedField = this.findFieldInSchema(field.children, fieldName);
        if (nestedField) {
          return nestedField;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Flatten nested fields for easy access
   */
  private flattenFields(fields: SchemaField[], prefix = ''): SchemaField[] {
    const flattened: SchemaField[] = [];
    
    for (const field of fields) {
      const fullName = prefix ? `${prefix}.${field.name}` : field.name;
      
      flattened.push({
        ...field,
        name: fullName
      });
      
      if (field.children) {
        flattened.push(...this.flattenFields(field.children, fullName));
      }
    }
    
    return flattened;
  }
  
  /**
   * Get example values for a field
   */
  private async getFieldExamples(client: any, tableName: string, fieldName: string): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT "${fieldName}" as value
        FROM "${tableName}"
        WHERE "${fieldName}" IS NOT NULL
        LIMIT 5
      `;
      
      const result = await client.query(query);
      return result.rows.map((row: any) => row.value);
      
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Check if field is indexed
   */
  private async isFieldIndexed(client: any, tableName: string, fieldName: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM pg_indexes
      WHERE tablename = $1
      AND indexdef LIKE '%' || $2 || '%'
      LIMIT 1
    `;
    
    const result = await client.query(query, [tableName, fieldName]);
    return result.rowCount > 0;
  }
  
  /**
   * Load JSON field children (for nested objects)
   */
  private async loadJSONFieldChildren(client: any, tableName: string, fieldName: string): Promise<SchemaField[]> {
    // This would analyze JSON structure to provide nested field suggestions
    // Implementation would depend on specific JSON structure analysis
    return [];
  }
  
  /**
   * Extract primary key from fields
   */
  private extractPrimaryKey(fields: SchemaField[]): string[] | undefined {
    // This would analyze constraints to find primary key
    const pkField = fields.find(f => f.name === 'id' || f.name.endsWith('_id'));
    return pkField ? [pkField.name] : undefined;
  }
  
  /**
   * Get partition column for time-series tables
   */
  private getPartitionColumn(tableName: string): string | undefined {
    // For TimescaleDB hypertables, this would be the time column
    if (tableName.includes('events') || tableName.includes('logs')) {
      return 'timestamp';
    }
    return undefined;
  }
  
  /**
   * Get retention policy for table
   */
  private getRetentionPolicy(tableName: string): RetentionPolicy | undefined {
    // Define retention policies based on table type
    if (tableName.includes('events') || tableName.includes('logs')) {
      return {
        duration: '90d',
        action: 'delete'
      };
    }
    return undefined;
  }
  
  /**
   * Parse index columns from CREATE INDEX statement
   */
  private parseIndexColumns(indexDef: string): string[] {
    const match = indexDef.match(/\((.*?)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim().replace(/"/g, ''));
    }
    return [];
  }
  
  /**
   * Determine index type from definition
   */
  private determineIndexType(indexDef: string): 'btree' | 'hash' | 'gin' | 'gist' | 'fulltext' {
    if (indexDef.includes('gin')) return 'gin';
    if (indexDef.includes('gist')) return 'gist';
    if (indexDef.includes('hash')) return 'hash';
    return 'btree'; // Default
  }
  
  /**
   * Refresh schema cache manually
   */
  public async refreshSchema(): Promise<DataSchema> {
    return this.getSchema(true);
  }
  
  /**
   * Get schema version for compatibility checking
   */
  public async getSchemaVersion(): Promise<string> {
    const schema = await this.getSchema();
    return schema.version;
  }
}