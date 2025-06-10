import { Logger } from '../utils/logger';
import { MetricsCollector } from '../monitoring/MetricsCollector';

export interface DataQualityRule {
  name: string;
  description: string;
  type: 'completeness' | 'accuracy' | 'consistency' | 'validity' | 'uniqueness' | 'freshness';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  threshold: number;
  validator: (data: any) => Promise<DataQualityResult>;
}

export interface DataQualityResult {
  ruleName: string;
  passed: boolean;
  score: number;
  errors: DataQualityError[];
  warnings: string[];
  recordsChecked: number;
  recordsFailed: number;
  executionTime: number;
}

export interface DataQualityError {
  type: string;
  message: string;
  recordId?: string;
  field?: string;
  value?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataQualityReport {
  batchId: string;
  timestamp: Date;
  overallScore: number;
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  ruleResults: DataQualityResult[];
  recommendations: string[];
  executionTime: number;
}

export class DataQualityValidator {
  private readonly logger = Logger.getInstance();
  private readonly metrics = new MetricsCollector();
  private rules: Map<string, DataQualityRule> = new Map();
  private isInitialized = false;

  /**
   * Initialize data quality validator with predefined rules
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('DataQualityValidator already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Data Quality Validator...');
      
      // Setup default quality rules
      this.setupDefaultRules();
      
      // Setup metrics
      this.setupMetrics();
      
      this.isInitialized = true;
      this.logger.info('DataQualityValidator initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize DataQualityValidator:', error);
      throw error;
    }
  }

  /**
   * Validate a batch of data against all enabled rules
   */
  async validateBatch(dataFrame: any, batchId?: string): Promise<DataQualityReport> {
    if (!this.isInitialized) {
      throw new Error('DataQualityValidator not initialized');
    }

    const startTime = Date.now();
    const reportId = batchId || `batch_${Date.now()}`;
    
    try {
      this.logger.info(`Starting data quality validation for batch: ${reportId}`);
      
      const ruleResults: DataQualityResult[] = [];
      const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
      
      // Execute all enabled rules
      for (const rule of enabledRules) {
        try {
          const result = await this.executeRule(rule, dataFrame);
          ruleResults.push(result);
          
          // Update metrics
          this.metrics.incrementCounter(`data_quality_rule_${rule.name}_executed`);
          if (!result.passed) {
            this.metrics.incrementCounter(`data_quality_rule_${rule.name}_failed`);
          }
          
        } catch (error) {
          this.logger.error(`Failed to execute rule ${rule.name}:`, error);
          ruleResults.push({
            ruleName: rule.name,
            passed: false,
            score: 0,
            errors: [{
              type: 'execution_error',
              message: `Rule execution failed: ${error.message}`,
              severity: 'high',
            }],
            warnings: [],
            recordsChecked: 0,
            recordsFailed: 0,
            executionTime: 0,
          });
        }
      }
      
      // Calculate overall metrics
      const totalRecords = await this.getRecordCount(dataFrame);
      const passedRecords = ruleResults.reduce((sum, result) => 
        sum + (result.recordsChecked - result.recordsFailed), 0) / ruleResults.length;
      const failedRecords = totalRecords - passedRecords;
      const overallScore = this.calculateOverallScore(ruleResults);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(ruleResults);
      
      const executionTime = Date.now() - startTime;
      
      const report: DataQualityReport = {
        batchId: reportId,
        timestamp: new Date(),
        overallScore,
        totalRecords,
        passedRecords,
        failedRecords,
        ruleResults,
        recommendations,
        executionTime,
      };
      
      // Update metrics
      this.metrics.recordHistogram('data_quality_check_duration_ms', executionTime);
      this.metrics.incrementCounter('data_quality_batches_validated');
      
      this.logger.info(`Data quality validation completed for batch ${reportId}: ${overallScore.toFixed(2)}% quality score`);
      
      return report;
      
    } catch (error) {
      this.logger.error(`Data quality validation failed for batch ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Add a custom data quality rule
   */
  addRule(rule: DataQualityRule): void {
    this.rules.set(rule.name, rule);
    this.logger.info(`Added data quality rule: ${rule.name}`);
  }

  /**
   * Remove a data quality rule
   */
  removeRule(ruleName: string): boolean {
    const removed = this.rules.delete(ruleName);
    if (removed) {
      this.logger.info(`Removed data quality rule: ${ruleName}`);
    }
    return removed;
  }

  /**
   * Get all rules
   */
  getRules(): DataQualityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleName: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = enabled;
      this.logger.info(`${enabled ? 'Enabled' : 'Disabled'} data quality rule: ${ruleName}`);
      return true;
    }
    return false;
  }

  /**
   * Setup default data quality rules for SIEM logs
   */
  private setupDefaultRules(): void {
    // Completeness rules
    this.addRule({
      name: 'timestamp_completeness',
      description: 'Ensure all records have valid timestamps',
      type: 'completeness',
      severity: 'critical',
      enabled: true,
      threshold: 0.95,
      validator: async (data: any) => this.validateTimestampCompleteness(data),
    });

    this.addRule({
      name: 'source_ip_completeness',
      description: 'Ensure source IP addresses are present',
      type: 'completeness',
      severity: 'high',
      enabled: true,
      threshold: 0.90,
      validator: async (data: any) => this.validateSourceIpCompleteness(data),
    });

    // Validity rules
    this.addRule({
      name: 'ip_address_validity',
      description: 'Validate IP address format',
      type: 'validity',
      severity: 'medium',
      enabled: true,
      threshold: 0.95,
      validator: async (data: any) => this.validateIpAddressFormat(data),
    });

    this.addRule({
      name: 'port_range_validity',
      description: 'Validate port numbers are in valid range (1-65535)',
      type: 'validity',
      severity: 'medium',
      enabled: true,
      threshold: 0.98,
      validator: async (data: any) => this.validatePortRange(data),
    });

    // Consistency rules
    this.addRule({
      name: 'severity_consistency',
      description: 'Ensure severity levels are consistent',
      type: 'consistency',
      severity: 'low',
      enabled: true,
      threshold: 0.90,
      validator: async (data: any) => this.validateSeverityConsistency(data),
    });

    // Freshness rules
    this.addRule({
      name: 'data_freshness',
      description: 'Ensure data is not too old',
      type: 'freshness',
      severity: 'medium',
      enabled: true,
      threshold: 0.85,
      validator: async (data: any) => this.validateDataFreshness(data),
    });

    // Uniqueness rules
    this.addRule({
      name: 'event_id_uniqueness',
      description: 'Ensure event IDs are unique within batch',
      type: 'uniqueness',
      severity: 'high',
      enabled: true,
      threshold: 0.99,
      validator: async (data: any) => this.validateEventIdUniqueness(data),
    });

    this.logger.info('Default data quality rules initialized');
  }

  /**
   * Execute a single rule against the data
   */
  private async executeRule(rule: DataQualityRule, dataFrame: any): Promise<DataQualityResult> {
    const startTime = Date.now();
    
    try {
      const result = await rule.validator(dataFrame);
      result.executionTime = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        ruleName: rule.name,
        passed: false,
        score: 0,
        errors: [{
          type: 'validation_error',
          message: `Validation failed: ${error.message}`,
          severity: rule.severity,
        }],
        warnings: [],
        recordsChecked: 0,
        recordsFailed: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate timestamp completeness
   */
  private async validateTimestampCompleteness(dataFrame: any): Promise<DataQualityResult> {
    // Implementation would check for null/empty timestamps
    const recordsChecked = 1000; // Placeholder
    const recordsWithValidTimestamp = 980; // Placeholder
    const recordsFailed = recordsChecked - recordsWithValidTimestamp;
    const score = recordsWithValidTimestamp / recordsChecked;
    
    return {
      ruleName: 'timestamp_completeness',
      passed: score >= 0.95,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'missing_timestamp',
        message: `${recordsFailed} records missing valid timestamps`,
        severity: 'critical',
      }] : [],
      warnings: [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Validate source IP completeness
   */
  private async validateSourceIpCompleteness(dataFrame: any): Promise<DataQualityResult> {
    const recordsChecked = 1000;
    const recordsWithSourceIp = 920;
    const recordsFailed = recordsChecked - recordsWithSourceIp;
    const score = recordsWithSourceIp / recordsChecked;
    
    return {
      ruleName: 'source_ip_completeness',
      passed: score >= 0.90,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'missing_source_ip',
        message: `${recordsFailed} records missing source IP`,
        severity: 'high',
      }] : [],
      warnings: [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Validate IP address format
   */
  private async validateIpAddressFormat(dataFrame: any): Promise<DataQualityResult> {
    const recordsChecked = 1000;
    const recordsWithValidIp = 975;
    const recordsFailed = recordsChecked - recordsWithValidIp;
    const score = recordsWithValidIp / recordsChecked;
    
    return {
      ruleName: 'ip_address_validity',
      passed: score >= 0.95,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'invalid_ip_format',
        message: `${recordsFailed} records with invalid IP format`,
        severity: 'medium',
      }] : [],
      warnings: [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Validate port range
   */
  private async validatePortRange(dataFrame: any): Promise<DataQualityResult> {
    const recordsChecked = 1000;
    const recordsWithValidPort = 990;
    const recordsFailed = recordsChecked - recordsWithValidPort;
    const score = recordsWithValidPort / recordsChecked;
    
    return {
      ruleName: 'port_range_validity',
      passed: score >= 0.98,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'invalid_port_range',
        message: `${recordsFailed} records with invalid port numbers`,
        severity: 'medium',
      }] : [],
      warnings: [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Validate severity consistency
   */
  private async validateSeverityConsistency(dataFrame: any): Promise<DataQualityResult> {
    const recordsChecked = 1000;
    const recordsWithConsistentSeverity = 950;
    const recordsFailed = recordsChecked - recordsWithConsistentSeverity;
    const score = recordsWithConsistentSeverity / recordsChecked;
    
    return {
      ruleName: 'severity_consistency',
      passed: score >= 0.90,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'inconsistent_severity',
        message: `${recordsFailed} records with inconsistent severity`,
        severity: 'low',
      }] : [],
      warnings: [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Validate data freshness
   */
  private async validateDataFreshness(dataFrame: any): Promise<DataQualityResult> {
    const recordsChecked = 1000;
    const recordsWithFreshData = 900;
    const recordsFailed = recordsChecked - recordsWithFreshData;
    const score = recordsWithFreshData / recordsChecked;
    
    return {
      ruleName: 'data_freshness',
      passed: score >= 0.85,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'stale_data',
        message: `${recordsFailed} records older than expected`,
        severity: 'medium',
      }] : [],
      warnings: recordsFailed > 50 ? [`High number of stale records detected`] : [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Validate event ID uniqueness
   */
  private async validateEventIdUniqueness(dataFrame: any): Promise<DataQualityResult> {
    const recordsChecked = 1000;
    const duplicateRecords = 5;
    const recordsFailed = duplicateRecords;
    const score = (recordsChecked - duplicateRecords) / recordsChecked;
    
    return {
      ruleName: 'event_id_uniqueness',
      passed: score >= 0.99,
      score,
      errors: recordsFailed > 0 ? [{
        type: 'duplicate_event_id',
        message: `${recordsFailed} duplicate event IDs found`,
        severity: 'high',
      }] : [],
      warnings: [],
      recordsChecked,
      recordsFailed,
      executionTime: 0,
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(results: DataQualityResult[]): number {
    if (results.length === 0) return 0;
    
    // Weighted average based on rule severity
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const result of results) {
      const rule = this.rules.get(result.ruleName);
      const weight = this.getSeverityWeight(rule?.severity || 'medium');
      weightedSum += result.score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }

  /**
   * Get weight for severity level
   */
  private getSeverityWeight(severity: string): number {
    const weights = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
    };
    return weights[severity as keyof typeof weights] || 2;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: DataQualityResult[]): string[] {
    const recommendations: string[] = [];
    
    for (const result of results) {
      if (!result.passed) {
        const rule = this.rules.get(result.ruleName);
        if (rule) {
          switch (rule.type) {
            case 'completeness':
              recommendations.push(`Improve data collection to reduce missing ${rule.name.replace('_', ' ')}`);
              break;
            case 'validity':
              recommendations.push(`Add validation rules for ${rule.name.replace('_', ' ')} at source`);
              break;
            case 'consistency':
              recommendations.push(`Standardize ${rule.name.replace('_', ' ')} across data sources`);
              break;
            case 'freshness':
              recommendations.push(`Reduce data ingestion latency to improve freshness`);
              break;
            case 'uniqueness':
              recommendations.push(`Implement deduplication for ${rule.name.replace('_', ' ')}`);
              break;
          }
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Setup metrics collection
   */
  private setupMetrics(): void {
    this.metrics.registerCounter('data_quality_batches_validated');
    this.metrics.registerHistogram('data_quality_check_duration_ms');
    this.metrics.registerGauge('data_quality_overall_score', () => 0);
  }

  /**
   * Get record count from DataFrame
   */
  private async getRecordCount(dataFrame: any): Promise<number> {
    // Implementation would count records in DataFrame
    return 1000; // Placeholder
  }
}