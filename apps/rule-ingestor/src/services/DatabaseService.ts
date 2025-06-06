// Database Service for Rule Ingestor
// Handles all database operations for community rules storage and management

import { Pool, PoolConfig } from 'pg';
import { Rule, RuleImportResult } from '@securewatch/rule-management';
import { logger } from '../utils/logger';

export interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface ImportBatch {
  source_type: string;
  source_url: string;
  source_version?: string;
  total_rules: number;
  successful_imports: number;
  failed_imports: number;
  skipped_rules: number;
  import_duration: number;
  error_summary?: any;
}

export interface RuleSearchParams {
  query?: string;
  source_type?: string;
  level?: string;
  category?: string;
  enabled?: boolean;
  limit: number;
  offset: number;
}

export interface RuleSearchResult {
  rules: Rule[];
  total: number;
}

export interface RuleStatistics {
  total_rules: number;
  enabled_rules: number;
  disabled_rules: number;
  rules_by_source: Record<string, number>;
  rules_by_level: Record<string, number>;
  rules_by_category: Record<string, number>;
  last_import?: string;
  avg_import_duration?: number;
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  errors: string[];
}

export class DatabaseService {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  // Initialize database connection and verify schema
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection
      const client = await this.pool.connect();
      
      // Verify detection_rules table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'detection_rules'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        throw new Error('detection_rules table not found. Please run the schema migration first.');
      }

      client.release();
      this.isInitialized = true;
      logger.info('Database service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  // Insert a new rule
  async insertRule(rule: Rule): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO detection_rules (
          rule_id, title, description, author, date, modified,
          category, product, service, level, severity,
          mitre_attack_techniques, mitre_attack_tactics,
          detection_query, condition, timeframe, 
          aggregation_field, aggregation_operation, aggregation_threshold,
          source_type, source_url, source_version, original_rule,
          tags, references, false_positives,
          enabled, custom_modified,
          created_at, updated_at, imported_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, $26,
          $27, $28,
          $29, $30, $31
        ) RETURNING id;
      `;

      const values = [
        rule.rule_id, rule.title, rule.description, rule.author, rule.date, rule.modified,
        rule.category, rule.product, rule.service, rule.level, rule.severity,
        rule.mitre_attack_techniques, rule.mitre_attack_tactics,
        rule.detection_query, rule.condition, rule.timeframe,
        rule.aggregation?.field, rule.aggregation?.operation, rule.aggregation?.threshold,
        rule.source_type, rule.source_url, rule.source_version, rule.original_rule,
        rule.tags, rule.references, rule.false_positives,
        rule.enabled, rule.custom_modified,
        rule.created_at, rule.updated_at, rule.imported_at
      ];

      const result = await client.query(query, values);
      return result.rows[0].id;

    } finally {
      client.release();
    }
  }

  // Update an existing rule
  async updateRule(rule: Rule): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE detection_rules SET
          title = $2, description = $3, author = $4, date = $5, modified = $6,
          category = $7, product = $8, service = $9, level = $10, severity = $11,
          mitre_attack_techniques = $12, mitre_attack_tactics = $13,
          detection_query = $14, condition = $15, timeframe = $16,
          aggregation_field = $17, aggregation_operation = $18, aggregation_threshold = $19,
          source_url = $20, source_version = $21, original_rule = $22,
          tags = $23, references = $24, false_positives = $25,
          updated_at = $26, imported_at = $27
        WHERE rule_id = $1 AND custom_modified = false;
      `;

      const values = [
        rule.rule_id, rule.title, rule.description, rule.author, rule.date, rule.modified,
        rule.category, rule.product, rule.service, rule.level, rule.severity,
        rule.mitre_attack_techniques, rule.mitre_attack_tactics,
        rule.detection_query, rule.condition, rule.timeframe,
        rule.aggregation?.field, rule.aggregation?.operation, rule.aggregation?.threshold,
        rule.source_url, rule.source_version, rule.original_rule,
        rule.tags, rule.references, rule.false_positives,
        new Date().toISOString(), rule.imported_at
      ];

      const result = await client.query(query, values);
      return result.rowCount > 0;

    } finally {
      client.release();
    }
  }

  // Get rule by rule_id
  async getRuleByRuleId(ruleId: string): Promise<Rule | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM detection_rules WHERE rule_id = $1;
      `;

      const result = await client.query(query, [ruleId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRule(result.rows[0]);

    } finally {
      client.release();
    }
  }

  // Search rules with filters
  async searchRules(params: RuleSearchParams): Promise<RuleSearchResult> {
    const client = await this.pool.connect();
    
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (params.query) {
        whereConditions.push(`search_vector @@ plainto_tsquery($${paramIndex})`);
        queryParams.push(params.query);
        paramIndex++;
      }

      if (params.source_type) {
        whereConditions.push(`source_type = $${paramIndex}`);
        queryParams.push(params.source_type);
        paramIndex++;
      }

      if (params.level) {
        whereConditions.push(`level = $${paramIndex}`);
        queryParams.push(params.level);
        paramIndex++;
      }

      if (params.category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(params.category);
        paramIndex++;
      }

      if (params.enabled !== undefined) {
        whereConditions.push(`enabled = $${paramIndex}`);
        queryParams.push(params.enabled);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM detection_rules ${whereClause};
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      const selectQuery = `
        SELECT * FROM detection_rules 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `;
      
      queryParams.push(params.limit, params.offset);
      const result = await client.query(selectQuery, queryParams);

      const rules = result.rows.map(row => this.mapRowToRule(row));

      return { rules, total };

    } finally {
      client.release();
    }
  }

  // Update rule status (enabled/disabled)
  async updateRuleStatus(ruleId: string, enabled: boolean): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE detection_rules 
        SET enabled = $2, updated_at = $3
        WHERE rule_id = $1;
      `;

      const result = await client.query(query, [ruleId, enabled, new Date().toISOString()]);
      return result.rowCount > 0;

    } finally {
      client.release();
    }
  }

  // Bulk update rule status
  async bulkUpdateRuleStatus(ruleIds: string[], enabled: boolean): Promise<BulkUpdateResult> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE detection_rules 
        SET enabled = $2, updated_at = $3
        WHERE rule_id = ANY($1);
      `;

      const result = await client.query(query, [ruleIds, enabled, new Date().toISOString()]);
      
      return {
        updated: result.rowCount,
        failed: ruleIds.length - result.rowCount,
        errors: []
      };

    } catch (error) {
      return {
        updated: 0,
        failed: ruleIds.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    } finally {
      client.release();
    }
  }

  // Delete rule
  async deleteRule(ruleId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = `DELETE FROM detection_rules WHERE rule_id = $1;`;
      const result = await client.query(query, [ruleId]);
      return result.rowCount > 0;

    } finally {
      client.release();
    }
  }

  // Record import batch
  async recordImportBatch(batch: ImportBatch): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO rule_import_batches (
          source_type, source_url, source_version,
          total_rules, successful_imports, failed_imports, skipped_rules,
          import_duration, error_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `;

      const values = [
        batch.source_type, batch.source_url, batch.source_version,
        batch.total_rules, batch.successful_imports, batch.failed_imports, batch.skipped_rules,
        `${batch.import_duration} milliseconds`, batch.error_summary
      ];

      const result = await client.query(query, values);
      return result.rows[0].id;

    } finally {
      client.release();
    }
  }

  // Get import history
  async getImportHistory(params: { limit: number; offset: number; source?: string }): Promise<any[]> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT * FROM rule_import_batches
      `;
      const queryParams = [];
      
      if (params.source) {
        query += ` WHERE source_type = $1`;
        queryParams.push(params.source);
        query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3;`;
        queryParams.push(params.limit, params.offset);
      } else {
        query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2;`;
        queryParams.push(params.limit, params.offset);
      }

      const result = await client.query(query, queryParams);
      return result.rows;

    } finally {
      client.release();
    }
  }

  // Get rule statistics
  async getRuleStatistics(): Promise<RuleStatistics> {
    const client = await this.pool.connect();
    
    try {
      // Basic counts
      const basicStats = await client.query(`
        SELECT 
          COUNT(*) as total_rules,
          COUNT(CASE WHEN enabled THEN 1 END) as enabled_rules,
          COUNT(CASE WHEN NOT enabled THEN 1 END) as disabled_rules
        FROM detection_rules;
      `);

      // Rules by source
      const sourceStats = await client.query(`
        SELECT source_type, COUNT(*) as count
        FROM detection_rules
        GROUP BY source_type;
      `);

      // Rules by level
      const levelStats = await client.query(`
        SELECT level, COUNT(*) as count
        FROM detection_rules
        GROUP BY level;
      `);

      // Rules by category
      const categoryStats = await client.query(`
        SELECT category, COUNT(*) as count
        FROM detection_rules
        GROUP BY category;
      `);

      // Import stats
      const importStats = await client.query(`
        SELECT 
          MAX(created_at) as last_import,
          AVG(EXTRACT(EPOCH FROM import_duration) * 1000) as avg_duration_ms
        FROM rule_import_batches;
      `);

      const basic = basicStats.rows[0];
      const importInfo = importStats.rows[0];

      return {
        total_rules: parseInt(basic.total_rules, 10),
        enabled_rules: parseInt(basic.enabled_rules, 10),
        disabled_rules: parseInt(basic.disabled_rules, 10),
        rules_by_source: sourceStats.rows.reduce((acc, row) => {
          acc[row.source_type] = parseInt(row.count, 10);
          return acc;
        }, {}),
        rules_by_level: levelStats.rows.reduce((acc, row) => {
          acc[row.level] = parseInt(row.count, 10);
          return acc;
        }, {}),
        rules_by_category: categoryStats.rows.reduce((acc, row) => {
          acc[row.category] = parseInt(row.count, 10);
          return acc;
        }, {}),
        last_import: importInfo.last_import,
        avg_import_duration: parseFloat(importInfo.avg_duration_ms) || 0
      };

    } finally {
      client.release();
    }
  }

  // Close database connection
  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
    logger.info('Database service closed');
  }

  // Map database row to Rule object
  private mapRowToRule(row: any): Rule {
    return {
      id: row.id,
      rule_id: row.rule_id,
      title: row.title,
      description: row.description,
      author: row.author,
      date: row.date,
      modified: row.modified,
      category: row.category,
      product: row.product,
      service: row.service,
      level: row.level,
      severity: row.severity,
      mitre_attack_techniques: row.mitre_attack_techniques || [],
      mitre_attack_tactics: row.mitre_attack_tactics || [],
      detection_query: row.detection_query,
      condition: row.condition,
      timeframe: row.timeframe,
      aggregation: row.aggregation_field ? {
        field: row.aggregation_field,
        operation: row.aggregation_operation,
        threshold: row.aggregation_threshold
      } : undefined,
      source_type: row.source_type,
      source_url: row.source_url,
      source_version: row.source_version,
      original_rule: row.original_rule,
      tags: row.tags || [],
      references: row.references || [],
      false_positives: row.false_positives || [],
      enabled: row.enabled,
      custom_modified: row.custom_modified,
      last_tested: row.last_tested,
      test_status: row.test_status,
      match_count: row.match_count,
      last_match: row.last_match,
      average_execution_time: row.average_execution_time,
      created_at: row.created_at,
      updated_at: row.updated_at,
      imported_at: row.imported_at
    };
  }
}