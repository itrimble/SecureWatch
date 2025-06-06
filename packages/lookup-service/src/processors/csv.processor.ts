import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  LookupTable, 
  LookupField, 
  LookupUploadOptions,
  LookupRecord 
} from '../types/lookup.types';

export class CSVProcessor {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Process and upload a CSV file as a lookup table
   */
  async processCSVUpload(
    filePath: string,
    options: LookupUploadOptions,
    createdBy: string
  ): Promise<LookupTable> {
    const tableId = uuidv4();
    const tableName = this.sanitizeTableName(options.filename);
    const dbTableName = `lookup_${tableName}`;

    try {
      // First pass: analyze the CSV structure
      const analysis = await this.analyzeCSV(filePath, options);
      
      // Validate key field exists
      if (!analysis.fields.find(f => f.name === options.keyField)) {
        throw new Error(`Key field '${options.keyField}' not found in CSV`);
      }

      // Create the lookup table metadata
      const lookupTable: LookupTable = {
        id: tableId,
        name: tableName,
        description: options.description || `Lookup table from ${options.filename}`,
        filename: options.filename,
        keyField: options.keyField,
        fields: analysis.fields,
        recordCount: 0,
        fileSize: analysis.fileSize,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        isActive: true,
        tags: options.tags || []
      };

      // Create database table
      await this.createDatabaseTable(dbTableName, analysis.fields);

      // Insert metadata
      await this.insertLookupTableMetadata(lookupTable);

      // Second pass: import data
      const recordCount = await this.importCSVData(
        filePath, 
        dbTableName, 
        analysis.fields,
        options
      );

      // Update record count
      lookupTable.recordCount = recordCount;
      await this.updateRecordCount(tableId, recordCount);

      // Create indexes for performance
      await this.createTableIndexes(dbTableName, options.keyField, analysis.fields);

      return lookupTable;

    } catch (error) {
      // Cleanup on failure
      await this.cleanupFailedUpload(tableId, dbTableName);
      throw error;
    }
  }

  /**
   * Analyze CSV structure and infer field types
   */
  private async analyzeCSV(
    filePath: string, 
    options: LookupUploadOptions
  ): Promise<{ fields: LookupField[]; fileSize: number }> {
    return new Promise((resolve, reject) => {
      const fields: Map<string, LookupField> = new Map();
      const sampleData: Map<string, string[]> = new Map();
      let rowCount = 0;
      const maxSamples = 10;
      let fileSize = 0;

      try {
        const stats = require('fs').statSync(filePath);
        fileSize = stats.size;
      } catch (error) {
        // Continue without file size if stat fails
      }

      createReadStream(filePath)
        .pipe(csv({
          separator: options.delimiter || ',',
          skipEmptyLines: options.skipEmptyLines !== false,
          headers: options.hasHeader !== false
        }))
        .on('data', (row: Record<string, string>) => {
          rowCount++;
          
          // Analyze only first 1000 rows for performance
          if (rowCount <= 1000) {
            Object.entries(row).forEach(([fieldName, value]) => {
              if (!fields.has(fieldName)) {
                fields.set(fieldName, {
                  name: fieldName,
                  type: 'string',
                  isKey: fieldName === options.keyField,
                  sampleValues: []
                });
                sampleData.set(fieldName, []);
              }

              // Collect sample values
              const samples = sampleData.get(fieldName)!;
              if (samples.length < maxSamples && value && !samples.includes(value)) {
                samples.push(value);
              }

              // Infer type from sample values
              const field = fields.get(fieldName)!;
              field.type = this.inferFieldType(value, field.type);
            });
          }
        })
        .on('end', () => {
          // Set sample values
          fields.forEach((field, fieldName) => {
            field.sampleValues = sampleData.get(fieldName) || [];
          });

          resolve({
            fields: Array.from(fields.values()),
            fileSize
          });
        })
        .on('error', reject);
    });
  }

  /**
   * Import CSV data into database table
   */
  private async importCSVData(
    filePath: string,
    tableName: string,
    fields: LookupField[],
    options: LookupUploadOptions
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const records: LookupRecord[] = [];
      const batchSize = 1000;
      let totalRecords = 0;

      createReadStream(filePath)
        .pipe(csv({
          separator: options.delimiter || ',',
          skipEmptyLines: options.skipEmptyLines !== false,
          headers: options.hasHeader !== false
        }))
        .on('data', async (row: Record<string, string>) => {
          // Convert row data according to field types
          const convertedRow: LookupRecord = {};
          fields.forEach(field => {
            const value = row[field.name];
            convertedRow[field.name] = this.convertValue(value, field.type);
          });

          records.push(convertedRow);

          // Insert in batches
          if (records.length >= batchSize) {
            try {
              await this.insertBatch(tableName, fields, records);
              totalRecords += records.length;
              records.length = 0; // Clear array
            } catch (error) {
              reject(error);
              return;
            }
          }
        })
        .on('end', async () => {
          try {
            // Insert remaining records
            if (records.length > 0) {
              await this.insertBatch(tableName, fields, records);
              totalRecords += records.length;
            }
            resolve(totalRecords);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Insert batch of records
   */
  private async insertBatch(
    tableName: string,
    fields: LookupField[],
    records: LookupRecord[]
  ): Promise<void> {
    if (records.length === 0) return;

    const fieldNames = fields.map(f => `"${f.name}"`).join(', ');
    const placeholders = records.map((_, index) => {
      const rowPlaceholders = fields.map((_, fieldIndex) => 
        `$${index * fields.length + fieldIndex + 1}`
      ).join(', ');
      return `(${rowPlaceholders})`;
    }).join(', ');

    const values: any[] = [];
    records.forEach(record => {
      fields.forEach(field => {
        values.push(record[field.name]);
      });
    });

    const sql = `INSERT INTO ${tableName} (${fieldNames}) VALUES ${placeholders}`;
    
    try {
      await this.db.query(sql, values);
    } catch (error) {
      console.error('Batch insert failed:', error);
      throw error;
    }
  }

  /**
   * Create database table for lookup data
   */
  private async createDatabaseTable(
    tableName: string,
    fields: LookupField[]
  ): Promise<void> {
    const columns = fields.map(field => {
      const sqlType = this.getSQLType(field.type);
      return `"${field.name}" ${sqlType}`;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    
    try {
      await this.db.query(sql);
    } catch (error) {
      console.error('Failed to create table:', error);
      throw error;
    }
  }

  /**
   * Create indexes for better lookup performance
   */
  private async createTableIndexes(
    tableName: string,
    keyField: string,
    fields: LookupField[]
  ): Promise<void> {
    try {
      // Primary index on key field
      await this.db.query(
        `CREATE INDEX IF NOT EXISTS idx_${tableName}_${keyField.toLowerCase()} ON ${tableName} ("${keyField}")`
      );

      // Additional indexes on common lookup fields
      const indexableFields = fields.filter(f => 
        f.type === 'string' || f.type === 'ip' || f.type === 'email'
      );

      for (const field of indexableFields.slice(0, 3)) { // Limit to 3 additional indexes
        if (field.name !== keyField) {
          await this.db.query(
            `CREATE INDEX IF NOT EXISTS idx_${tableName}_${field.name.toLowerCase()} ON ${tableName} ("${field.name}")`
          );
        }
      }
    } catch (error) {
      console.error('Failed to create indexes:', error);
      // Don't throw - indexes are optimization, not critical
    }
  }

  /**
   * Insert lookup table metadata
   */
  private async insertLookupTableMetadata(table: LookupTable): Promise<void> {
    const sql = `
      INSERT INTO lookup_tables (
        id, name, description, filename, key_field, fields, record_count,
        file_size, created_at, updated_at, created_by, is_active, tags,
        query_count, last_used
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, NOW()
      )
    `;

    try {
      await this.db.query(sql, [
        table.id,
        table.name,
        table.description,
        table.filename,
        table.keyField,
        JSON.stringify(table.fields),
        table.recordCount,
        table.fileSize,
        table.createdAt,
        table.updatedAt,
        table.createdBy,
        table.isActive,
        JSON.stringify(table.tags)
      ]);
    } catch (error) {
      console.error('Failed to insert metadata:', error);
      throw error;
    }
  }

  /**
   * Update record count after import
   */
  private async updateRecordCount(tableId: string, recordCount: number): Promise<void> {
    try {
      await this.db.query(
        'UPDATE lookup_tables SET record_count = $1, updated_at = NOW() WHERE id = $2',
        [recordCount, tableId]
      );
    } catch (error) {
      console.error('Failed to update record count:', error);
      throw error;
    }
  }

  /**
   * Cleanup failed upload
   */
  private async cleanupFailedUpload(tableId: string, dbTableName: string): Promise<void> {
    try {
      await this.db.query('DROP TABLE IF EXISTS ' + dbTableName);
      await this.db.query('DELETE FROM lookup_tables WHERE id = $1', [tableId]);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Infer field type from value
   */
  private inferFieldType(value: string, currentType: string): string {
    if (!value || value.trim() === '') return currentType;

    // Once a field is determined to be string, keep it as string
    if (currentType === 'string') return 'string';

    // Check for specific patterns
    if (this.isValidIP(value)) return 'ip';
    if (this.isValidEmail(value)) return 'email';
    if (this.isValidURL(value)) return 'url';
    if (this.isValidDate(value)) return 'date';
    if (this.isValidBoolean(value)) return 'boolean';
    if (this.isValidNumber(value)) return 'number';

    return 'string';
  }

  /**
   * Convert value according to type
   */
  private convertValue(value: string, type: string): any {
    if (!value || value.trim() === '') return null;

    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      default:
        return value.trim();
    }
  }

  /**
   * Get SQL type for field type
   */
  private getSQLType(type: string): string {
    switch (type) {
      case 'number': return 'NUMERIC';
      case 'boolean': return 'BOOLEAN';
      case 'date': return 'TIMESTAMP';
      case 'ip': return 'INET';
      default: return 'TEXT';
    }
  }

  /**
   * Sanitize table name for database
   */
  private sanitizeTableName(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Validation helpers
  private isValidIP(value: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(value) || ipv6Regex.test(value);
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isValidURL(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isValidDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.length > 6;
  }

  private isValidBoolean(value: string): boolean {
    const lower = value.toLowerCase();
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(lower);
  }

  private isValidNumber(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }
}