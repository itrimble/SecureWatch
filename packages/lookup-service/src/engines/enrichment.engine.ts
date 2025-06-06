import { Pool } from 'pg';
import { LookupService } from '../services/lookup.service';
import { 
  EnrichmentRule, 
  LookupQuery,
  APILookupConfig,
  ExternalLookupResult 
} from '../types/lookup.types';

export interface EnrichmentRequest {
  data: Record<string, any>[];
  rules?: string[]; // Specific rule IDs to apply
  enableExternalLookups?: boolean;
}

export interface EnrichmentResult {
  enrichedData: Record<string, any>[];
  appliedRules: string[];
  lookupCount: number;
  externalLookupCount: number;
  processingTime: number;
  errors: string[];
}

export class EnrichmentEngine {
  private db: Pool;
  private lookupService: LookupService;
  private enrichmentRules: Map<string, EnrichmentRule> = new Map();
  private apiConfigs: Map<string, APILookupConfig> = new Map();
  private lastRulesLoad = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(dbPool: Pool, lookupService: LookupService) {
    this.db = dbPool;
    this.lookupService = lookupService;
  }

  /**
   * Enrich data using configured lookup rules
   */
  async enrichData(request: EnrichmentRequest): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const result: EnrichmentResult = {
      enrichedData: [],
      appliedRules: [],
      lookupCount: 0,
      externalLookupCount: 0,
      processingTime: 0,
      errors: []
    };

    try {
      // Load active rules if cache is stale
      await this.loadRulesIfNeeded();

      // Get applicable rules
      const rules = request.rules 
        ? Array.from(this.enrichmentRules.values()).filter(r => request.rules!.includes(r.id))
        : Array.from(this.enrichmentRules.values()).filter(r => r.isActive);

      // Sort by priority
      rules.sort((a, b) => a.priority - b.priority);

      // Process each data record
      for (const record of request.data) {
        const enrichedRecord = { ...record };
        
        for (const rule of rules) {
          try {
            const applied = await this.applyRule(rule, enrichedRecord, request.enableExternalLookups || false);
            if (applied) {
              if (!result.appliedRules.includes(rule.id)) {
                result.appliedRules.push(rule.id);
              }
              result.lookupCount++;
            }
          } catch (error) {
            result.errors.push(`Rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        result.enrichedData.push(enrichedRecord);
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      result.errors.push(`Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Apply a single enrichment rule to a record
   */
  private async applyRule(
    rule: EnrichmentRule, 
    record: Record<string, any>,
    enableExternalLookups: boolean
  ): Promise<boolean> {
    // Check if source field exists
    const sourceValue = record[rule.sourceField];
    if (sourceValue === undefined || sourceValue === null || sourceValue === '') {
      return false;
    }

    // Check conditions
    if (rule.conditions && rule.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(rule.conditions, record);
      if (!conditionsMet) {
        return false;
      }
    }

    // Check if this is an external API lookup
    const apiConfig = this.apiConfigs.get(rule.lookupTable);
    if (apiConfig && enableExternalLookups) {
      return await this.applyExternalLookup(apiConfig, rule, record, sourceValue);
    }

    // Standard lookup table query
    const query: LookupQuery = {
      tableName: rule.lookupTable,
      keyField: rule.lookupKeyField,
      keyValue: String(sourceValue),
      returnFields: rule.outputFields.map(f => f.sourceField)
    };

    try {
      const lookupResult = await this.lookupService.lookup(query);
      
      if (lookupResult.found && lookupResult.record) {
        // Apply output field mappings
        rule.outputFields.forEach(outputField => {
          let value = lookupResult.record![outputField.sourceField];
          
          // Apply transformations
          if (value !== undefined && value !== null && outputField.transform) {
            value = this.applyTransformation(String(value), outputField.transform);
          }
          
          // Use default value if lookup value is empty
          if ((value === undefined || value === null || value === '') && outputField.defaultValue !== undefined) {
            value = outputField.defaultValue;
          }
          
          if (value !== undefined && value !== null) {
            record[outputField.outputField] = value;
          }
        });
        
        return true;
      }
      
      // Apply default values if lookup failed
      rule.outputFields.forEach(outputField => {
        if (outputField.defaultValue !== undefined && record[outputField.outputField] === undefined) {
          record[outputField.outputField] = outputField.defaultValue;
        }
      });
      
      return false;

    } catch (error) {
      console.error(`Lookup failed for rule ${rule.name}:`, error);
      
      // Apply default values on error
      rule.outputFields.forEach(outputField => {
        if (outputField.defaultValue !== undefined && record[outputField.outputField] === undefined) {
          record[outputField.outputField] = outputField.defaultValue;
        }
      });
      
      return false;
    }
  }

  /**
   * Apply external API lookup
   */
  private async applyExternalLookup(
    apiConfig: APILookupConfig,
    rule: EnrichmentRule,
    record: Record<string, any>,
    sourceValue: any
  ): Promise<boolean> {
    try {
      const result: ExternalLookupResult = await this.lookupService.externalLookup(
        String(sourceValue),
        apiConfig
      );

      if (result.found && result.data) {
        // Apply output field mappings
        rule.outputFields.forEach(outputField => {
          let value = result.data![outputField.sourceField];
          
          if (value !== undefined && value !== null && outputField.transform) {
            value = this.applyTransformation(String(value), outputField.transform);
          }
          
          if ((value === undefined || value === null || value === '') && outputField.defaultValue !== undefined) {
            value = outputField.defaultValue;
          }
          
          if (value !== undefined && value !== null) {
            record[outputField.outputField] = value;
          }
        });

        // Add metadata about the external lookup
        record._enrichment_external = {
          source: apiConfig.name,
          responseTime: result.responseTime,
          cached: result.cached
        };
        
        return true;
      }

      return false;

    } catch (error) {
      console.error(`External lookup failed for rule ${rule.name}:`, error);
      return false;
    }
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(
    conditions: any[], 
    record: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const fieldValue = String(record[condition.field] || '');
      const conditionValue = String(condition.value);

      switch (condition.operator) {
        case 'equals':
          return fieldValue === conditionValue;
        case 'contains':
          return fieldValue.includes(conditionValue);
        case 'startsWith':
          return fieldValue.startsWith(conditionValue);
        case 'endsWith':
          return fieldValue.endsWith(conditionValue);
        case 'regex':
          try {
            const regex = new RegExp(conditionValue, 'i');
            return regex.test(fieldValue);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });
  }

  /**
   * Apply field transformations
   */
  private applyTransformation(
    value: string, 
    transform: 'uppercase' | 'lowercase' | 'trim' | 'capitalize'
  ): string {
    switch (transform) {
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'trim':
        return value.trim();
      case 'capitalize':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      default:
        return value;
    }
  }

  /**
   * Load enrichment rules from database
   */
  private async loadRulesIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRulesLoad < this.cacheTimeout) {
      return;
    }

    try {
      // Load enrichment rules
      const rulesResult = await this.db.query(`
        SELECT * FROM enrichment_rules 
        WHERE is_active = true 
        ORDER BY priority ASC
      `);

      this.enrichmentRules.clear();
      rulesResult.rows.forEach(row => {
        const rule: EnrichmentRule = {
          id: row.id,
          name: row.name,
          description: row.description,
          sourceField: row.source_field,
          lookupTable: row.lookup_table,
          lookupKeyField: row.lookup_key_field,
          outputFields: row.output_fields,
          conditions: row.conditions || [],
          isActive: row.is_active,
          priority: row.priority
        };
        this.enrichmentRules.set(rule.id, rule);
      });

      // Load API configurations
      const apiResult = await this.db.query(`
        SELECT * FROM api_lookup_configs 
        WHERE is_active = true
      `);

      this.apiConfigs.clear();
      apiResult.rows.forEach(row => {
        const config: APILookupConfig = {
          id: row.id,
          name: row.name,
          description: row.description,
          baseUrl: row.base_url,
          apiKey: row.api_key,
          headers: row.headers || {},
          queryParams: row.query_params || {},
          rateLimit: {
            requests: row.rate_limit_requests,
            window: row.rate_limit_window
          },
          timeout: row.timeout_ms,
          cacheTTL: row.cache_ttl,
          retryConfig: {
            attempts: row.retry_attempts,
            backoff: row.retry_backoff
          },
          fieldMapping: row.field_mapping
        };
        this.apiConfigs.set(config.name, config);
      });

      this.lastRulesLoad = now;

    } catch (error) {
      console.error('Failed to load enrichment rules:', error);
      throw error;
    }
  }

  /**
   * Get all active enrichment rules
   */
  async getActiveRules(): Promise<EnrichmentRule[]> {
    await this.loadRulesIfNeeded();
    return Array.from(this.enrichmentRules.values());
  }

  /**
   * Get all active API configurations
   */
  async getActiveAPIConfigs(): Promise<APILookupConfig[]> {
    await this.loadRulesIfNeeded();
    return Array.from(this.apiConfigs.values());
  }

  /**
   * Create a new enrichment rule
   */
  async createRule(rule: Omit<EnrichmentRule, 'id'>, createdBy: string): Promise<string> {
    try {
      const result = await this.db.query(`
        INSERT INTO enrichment_rules (
          name, description, source_field, lookup_table, lookup_key_field,
          output_fields, conditions, is_active, priority, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        rule.name,
        rule.description,
        rule.sourceField,
        rule.lookupTable,
        rule.lookupKeyField,
        JSON.stringify(rule.outputFields),
        JSON.stringify(rule.conditions),
        rule.isActive,
        rule.priority,
        createdBy
      ]);

      // Invalidate cache
      this.lastRulesLoad = 0;

      return result.rows[0].id;

    } catch (error) {
      console.error('Failed to create enrichment rule:', error);
      throw error;
    }
  }

  /**
   * Update an enrichment rule
   */
  async updateRule(ruleId: string, updates: Partial<EnrichmentRule>): Promise<void> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setParts.push(`${dbKey} = $${paramIndex}`);
          
          if (key === 'outputFields' || key === 'conditions') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setParts.length === 0) {
        return;
      }

      setParts.push(`updated_at = NOW()`);
      values.push(ruleId);

      await this.db.query(
        `UPDATE enrichment_rules SET ${setParts.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      // Invalidate cache
      this.lastRulesLoad = 0;

    } catch (error) {
      console.error('Failed to update enrichment rule:', error);
      throw error;
    }
  }

  /**
   * Delete an enrichment rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      await this.db.query('DELETE FROM enrichment_rules WHERE id = $1', [ruleId]);
      
      // Invalidate cache
      this.lastRulesLoad = 0;

    } catch (error) {
      console.error('Failed to delete enrichment rule:', error);
      throw error;
    }
  }
}