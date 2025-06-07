/**
 * Schema Manager for KQL Analytics Engine
 * Manages data schema, field mappings, and metadata for the normalized data model
 */
import { Pool } from 'pg';
import { DataSchema, TableSchema, SchemaField, SchemaFunction, FieldType } from '../types/kql.types';
export declare class SchemaManager {
    private dbPool;
    private cachedSchema;
    private lastSchemaUpdate;
    private schemaCacheTTL;
    constructor(dbPool: Pool);
    /**
     * Get complete data schema with caching
     */
    getSchema(forceRefresh?: boolean): Promise<DataSchema>;
    /**
     * Get schema for a specific table
     */
    getTableSchema(tableName: string): Promise<TableSchema | null>;
    /**
     * Get all available functions
     */
    getFunctions(): Promise<SchemaFunction[]>;
    /**
     * Validate field exists in schema
     */
    validateField(tableName: string, fieldName: string): Promise<boolean>;
    /**
     * Get field type for validation
     */
    getFieldType(tableName: string, fieldName: string): Promise<FieldType | null>;
    /**
     * Get suggested fields for autocomplete
     */
    getSuggestedFields(tableName: string, prefix?: string): Promise<SchemaField[]>;
    /**
     * Get schema mapping for KQL to SQL translation
     */
    getSchemaMapping(): Promise<Record<string, string>>;
    /**
     * Load schema from database
     */
    private loadSchemaFromDatabase;
    /**
     * Load table schemas from database
     */
    private loadTables;
    /**
     * Load fields for a specific table
     */
    private loadTableFields;
    /**
     * Load indexes for a specific table
     */
    private loadTableIndexes;
    /**
     * Load available functions
     */
    private loadFunctions;
    /**
     * Map PostgreSQL data types to field types
     */
    private mapPostgreSQLTypeToFieldType;
    /**
     * Check if schema cache is valid
     */
    private isSchemaCacheValid;
    /**
     * Find field in schema (supports nested fields)
     */
    private findFieldInSchema;
    /**
     * Flatten nested fields for easy access
     */
    private flattenFields;
    /**
     * Get example values for a field
     */
    private getFieldExamples;
    /**
     * Check if field is indexed
     */
    private isFieldIndexed;
    /**
     * Load JSON field children (for nested objects)
     */
    private loadJSONFieldChildren;
    /**
     * Extract primary key from fields
     */
    private extractPrimaryKey;
    /**
     * Get partition column for time-series tables
     */
    private getPartitionColumn;
    /**
     * Get retention policy for table
     */
    private getRetentionPolicy;
    /**
     * Parse index columns from CREATE INDEX statement
     */
    private parseIndexColumns;
    /**
     * Determine index type from definition
     */
    private determineIndexType;
    /**
     * Refresh schema cache manually
     */
    refreshSchema(): Promise<DataSchema>;
    /**
     * Get schema version for compatibility checking
     */
    getSchemaVersion(): Promise<string>;
}
export { SchemaManager };
//# sourceMappingURL=schema-manager.d.ts.map