// Community Rule Service for Correlation Engine
// Loads and manages community-sourced detection rules alongside existing custom rules

import { Pool } from 'pg';
import { logger } from '../utils/logger';

export interface CommunityRule {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  detection_query: string;
  condition: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  severity: number;
  mitre_attack_techniques: string[];
  mitre_attack_tactics: string[];
  source_type: string;
  category: string;
  enabled: boolean;
  timeframe?: string;
  aggregation?: {
    field: string;
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    threshold: number;
  };
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface RuleExecutionResult {
  rule_id: string;
  matched: boolean;
  match_count: number;
  execution_time: number;
  error?: string;
  matched_events?: any[];
}

export interface CommunityRuleMetrics {
  total_rules: number;
  enabled_rules: number;
  rules_by_source: Record<string, number>;
  rules_by_severity: Record<string, number>;
  last_execution_stats: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    average_execution_time: number;
  };
}

export class CommunityRuleService {
  private dbPool: Pool;
  private communityRules: Map<string, CommunityRule> = new Map();
  private ruleCache: Map<string, CommunityRule[]> = new Map();
  private lastLoadTime: Date = new Date(0);
  private cacheRefreshInterval: number = 300000; // 5 minutes
  private isInitialized: boolean = false;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  // Initialize the service and load rules
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Community Rule Service...');
      
      // Load community rules from database
      await this.loadCommunityRules();
      
      // Setup periodic refresh
      this.setupPeriodicRefresh();
      
      this.isInitialized = true;
      logger.info(`Community Rule Service initialized with ${this.communityRules.size} rules`);
      
    } catch (error) {
      logger.error('Failed to initialize Community Rule Service:', error);
      throw error;
    }
  }

  // Load community rules from database
  async loadCommunityRules(): Promise<void> {
    const client = await this.dbPool.connect();
    
    try {
      const query = `
        SELECT 
          id, rule_id, title, description, detection_query, condition,
          level, severity, mitre_attack_techniques, mitre_attack_tactics,
          source_type, category, enabled, timeframe,
          aggregation_field, aggregation_operation, aggregation_threshold,
          tags, created_at, updated_at
        FROM detection_rules
        WHERE enabled = true
        ORDER BY severity DESC, created_at DESC;
      `;

      const result = await client.query(query);
      
      // Clear existing rules
      this.communityRules.clear();
      this.ruleCache.clear();
      
      // Load rules into memory
      for (const row of result.rows) {
        const rule: CommunityRule = {
          id: row.id,
          rule_id: row.rule_id,
          title: row.title,
          description: row.description,
          detection_query: row.detection_query,
          condition: row.condition,
          level: row.level,
          severity: row.severity,
          mitre_attack_techniques: row.mitre_attack_techniques || [],
          mitre_attack_tactics: row.mitre_attack_tactics || [],
          source_type: row.source_type,
          category: row.category,
          enabled: row.enabled,
          timeframe: row.timeframe,
          aggregation: row.aggregation_field ? {
            field: row.aggregation_field,
            operation: row.aggregation_operation,
            threshold: row.aggregation_threshold
          } : undefined,
          tags: row.tags || [],
          created_at: row.created_at,
          updated_at: row.updated_at
        };

        this.communityRules.set(rule.rule_id, rule);
        
        // Cache by category for faster lookups
        const categoryKey = rule.category || 'unknown';
        if (!this.ruleCache.has(categoryKey)) {
          this.ruleCache.set(categoryKey, []);
        }
        this.ruleCache.get(categoryKey)!.push(rule);
      }

      this.lastLoadTime = new Date();
      logger.info(`Loaded ${result.rows.length} enabled community rules`);
      
    } finally {
      client.release();
    }
  }

  // Get all community rules
  getCommunityRules(): CommunityRule[] {
    return Array.from(this.communityRules.values());
  }

  // Get rules by category
  getRulesByCategory(category: string): CommunityRule[] {
    return this.ruleCache.get(category) || [];
  }

  // Get rules by source type
  getRulesBySource(sourceType: string): CommunityRule[] {
    return Array.from(this.communityRules.values())
      .filter(rule => rule.source_type === sourceType);
  }

  // Get rules by severity level
  getRulesBySeverity(level: 'low' | 'medium' | 'high' | 'critical'): CommunityRule[] {
    return Array.from(this.communityRules.values())
      .filter(rule => rule.level === level);
  }

  // Get high-priority rules (critical and high severity)
  getHighPriorityRules(): CommunityRule[] {
    return Array.from(this.communityRules.values())
      .filter(rule => rule.level === 'critical' || rule.level === 'high')
      .sort((a, b) => b.severity - a.severity);
  }

  // Get rules that match MITRE ATT&CK techniques
  getRulesByMitreTechniques(techniques: string[]): CommunityRule[] {
    return Array.from(this.communityRules.values())
      .filter(rule => 
        rule.mitre_attack_techniques.some(tech => techniques.includes(tech))
      );
  }

  // Evaluate event against community rules
  async evaluateEvent(event: any, categories?: string[]): Promise<RuleExecutionResult[]> {
    const results: RuleExecutionResult[] = [];
    
    // Determine which rules to evaluate
    let rulesToEvaluate: CommunityRule[];
    
    if (categories && categories.length > 0) {
      // Only evaluate rules for specific categories
      rulesToEvaluate = [];
      for (const category of categories) {
        rulesToEvaluate.push(...this.getRulesByCategory(category));
      }
    } else {
      // Evaluate all rules
      rulesToEvaluate = this.getCommunityRules();
    }

    // Sort by severity (critical first)
    rulesToEvaluate.sort((a, b) => b.severity - a.severity);

    // Evaluate each rule
    for (const rule of rulesToEvaluate) {
      const startTime = Date.now();
      
      try {
        const result = await this.evaluateRuleAgainstEvent(rule, event);
        result.execution_time = Date.now() - startTime;
        results.push(result);
        
        // Record execution metrics
        await this.recordRuleExecution(rule.rule_id, result);
        
      } catch (error) {
        logger.warn(`Error evaluating rule ${rule.rule_id}:`, error);
        results.push({
          rule_id: rule.rule_id,
          matched: false,
          match_count: 0,
          execution_time: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Evaluate a specific rule against an event
  private async evaluateRuleAgainstEvent(rule: CommunityRule, event: any): Promise<RuleExecutionResult> {
    try {
      // Convert our KQL-like query to a simple evaluation
      // This is a simplified implementation - in production you'd want a proper KQL engine
      const matched = await this.executeKQLQuery(rule.detection_query, event);
      
      return {
        rule_id: rule.rule_id,
        matched,
        match_count: matched ? 1 : 0,
        execution_time: 0, // Will be set by caller
        matched_events: matched ? [event] : []
      };
      
    } catch (error) {
      return {
        rule_id: rule.rule_id,
        matched: false,
        match_count: 0,
        execution_time: 0,
        error: error instanceof Error ? error.message : 'Evaluation failed'
      };
    }
  }

  // Simple KQL query execution (simplified for demo)
  private async executeKQLQuery(kqlQuery: string, event: any): Promise<boolean> {
    try {
      // This is a very simplified KQL evaluator
      // In production, you'd want to use a proper KQL parser/engine
      
      // Handle basic field comparisons
      if (kqlQuery.includes('==')) {
        const parts = kqlQuery.split('==');
        if (parts.length === 2) {
          const field = parts[0].trim();
          const value = parts[1].trim().replace(/"/g, '');
          return this.getNestedValue(event, field) === value;
        }
      }
      
      // Handle contains operations
      if (kqlQuery.includes('contains')) {
        const containsMatch = kqlQuery.match(/(\w+(?:\.\w+)*)\s+contains\s+"([^"]+)"/);
        if (containsMatch) {
          const field = containsMatch[1];
          const value = containsMatch[2];
          const fieldValue = this.getNestedValue(event, field);
          return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
        }
      }
      
      // Handle startswith operations
      if (kqlQuery.includes('startswith')) {
        const startsMatch = kqlQuery.match(/(\w+(?:\.\w+)*)\s+startswith\s+"([^"]+)"/);
        if (startsMatch) {
          const field = startsMatch[1];
          const value = startsMatch[2];
          const fieldValue = this.getNestedValue(event, field);
          return fieldValue && fieldValue.toString().toLowerCase().startsWith(value.toLowerCase());
        }
      }
      
      // Handle regex operations
      if (kqlQuery.includes('matches regex')) {
        const regexMatch = kqlQuery.match(/(\w+(?:\.\w+)*)\s+matches\s+regex\s+"([^"]+)"/);
        if (regexMatch) {
          const field = regexMatch[1];
          const pattern = regexMatch[2];
          const fieldValue = this.getNestedValue(event, field);
          if (fieldValue) {
            const regex = new RegExp(pattern, 'i');
            return regex.test(fieldValue.toString());
          }
        }
      }
      
      return false;
      
    } catch (error) {
      logger.warn(`KQL query execution failed: ${kqlQuery}`, error);
      return false;
    }
  }

  // Get nested value from object using dot notation
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Record rule execution metrics
  private async recordRuleExecution(ruleId: string, result: RuleExecutionResult): Promise<void> {
    try {
      const client = await this.dbPool.connect();
      
      const query = `
        INSERT INTO rule_execution_history (
          rule_id, execution_time, matches_found, events_processed, executed_at, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6);
      `;

      await client.query(query, [
        ruleId,
        result.execution_time,
        result.match_count,
        1, // One event processed
        new Date().toISOString(),
        result.error || null
      ]);

      client.release();
      
    } catch (error) {
      logger.warn(`Failed to record rule execution for ${ruleId}:`, error);
    }
  }

  // Get community rule metrics
  async getMetrics(): Promise<CommunityRuleMetrics> {
    const client = await this.dbPool.connect();
    
    try {
      // Basic rule counts
      const ruleCountsQuery = `
        SELECT 
          COUNT(*) as total_rules,
          COUNT(CASE WHEN enabled THEN 1 END) as enabled_rules
        FROM detection_rules;
      `;
      const ruleCounts = await client.query(ruleCountsQuery);

      // Rules by source
      const sourceQuery = `
        SELECT source_type, COUNT(*) as count
        FROM detection_rules
        WHERE enabled = true
        GROUP BY source_type;
      `;
      const sourceResult = await client.query(sourceQuery);

      // Rules by severity
      const severityQuery = `
        SELECT level, COUNT(*) as count
        FROM detection_rules
        WHERE enabled = true
        GROUP BY level;
      `;
      const severityResult = await client.query(severityQuery);

      // Execution stats (last 24 hours)
      const executionQuery = `
        SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN error_message IS NULL THEN 1 END) as successful_executions,
          COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as failed_executions,
          AVG(execution_time) as avg_execution_time
        FROM rule_execution_history
        WHERE executed_at >= NOW() - INTERVAL '24 hours';
      `;
      const executionResult = await client.query(executionQuery);

      const ruleData = ruleCounts.rows[0];
      const execData = executionResult.rows[0];

      return {
        total_rules: parseInt(ruleData.total_rules, 10),
        enabled_rules: parseInt(ruleData.enabled_rules, 10),
        rules_by_source: sourceResult.rows.reduce((acc, row) => {
          acc[row.source_type] = parseInt(row.count, 10);
          return acc;
        }, {}),
        rules_by_severity: severityResult.rows.reduce((acc, row) => {
          acc[row.level] = parseInt(row.count, 10);
          return acc;
        }, {}),
        last_execution_stats: {
          total_executions: parseInt(execData.total_executions, 10) || 0,
          successful_executions: parseInt(execData.successful_executions, 10) || 0,
          failed_executions: parseInt(execData.failed_executions, 10) || 0,
          average_execution_time: parseFloat(execData.avg_execution_time) || 0
        }
      };

    } finally {
      client.release();
    }
  }

  // Setup periodic refresh of rules
  private setupPeriodicRefresh(): void {
    setInterval(async () => {
      try {
        logger.debug('Refreshing community rules cache...');
        await this.loadCommunityRules();
      } catch (error) {
        logger.error('Failed to refresh community rules:', error);
      }
    }, this.cacheRefreshInterval);
  }

  // Force refresh of rules
  async refreshRules(): Promise<void> {
    await this.loadCommunityRules();
  }

  // Check if service needs rule refresh
  needsRefresh(): boolean {
    const now = new Date();
    return (now.getTime() - this.lastLoadTime.getTime()) > this.cacheRefreshInterval;
  }

  // Get specific rule by ID
  getRule(ruleId: string): CommunityRule | undefined {
    return this.communityRules.get(ruleId);
  }

  // Get rule count
  getRuleCount(): number {
    return this.communityRules.size;
  }

  // Check if service is initialized
  isReady(): boolean {
    return this.isInitialized;
  }
}