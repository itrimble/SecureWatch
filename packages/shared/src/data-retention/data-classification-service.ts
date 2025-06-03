/**
 * SecureWatch Data Classification and Tagging Service
 * Automatically classifies data and applies appropriate tags and metadata
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { createHash } from 'crypto';

// Data Classification Levels
export enum ClassificationLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

// Classification Confidence
export enum ClassificationConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERIFIED = 'verified'
}

// Data Sensitivity
export enum DataSensitivity {
  NON_SENSITIVE = 'non_sensitive',
  SENSITIVE = 'sensitive',
  HIGHLY_SENSITIVE = 'highly_sensitive',
  CRITICAL = 'critical'
}

// Classification Rule
export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: ClassificationCondition[];
  classification: ClassificationLevel;
  sensitivity: DataSensitivity;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Classification Condition
export interface ClassificationCondition {
  type: 'content' | 'metadata' | 'filename' | 'size' | 'source' | 'user' | 'location';
  operator: 'contains' | 'regex' | 'equals' | 'greater_than' | 'less_than' | 'in_list' | 'not_in_list';
  field?: string;
  value: any;
  weight: number;
  caseSensitive?: boolean;
}

// Classification Result
export interface ClassificationResult {
  classification: ClassificationLevel;
  sensitivity: DataSensitivity;
  confidence: ClassificationConfidence;
  score: number;
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    weight: number;
    matchedConditions: number;
  }>;
  suggestedTags: string[];
  metadata: Record<string, any>;
  reasons: string[];
}

// Data Tag
export interface DataTag {
  id: string;
  name: string;
  category: string;
  description: string;
  color?: string;
  icon?: string;
  autoApplied: boolean;
  rules: TagRule[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Tag Rule
export interface TagRule {
  condition: ClassificationCondition;
  weight: number;
}

// Classification Policy
export interface ClassificationPolicy {
  id: string;
  name: string;
  description: string;
  scope: {
    dataTypes?: string[];
    sources?: string[];
    tenants?: string[];
  };
  rules: ClassificationRule[];
  defaultClassification: ClassificationLevel;
  requiresReview: boolean;
  autoApprove: boolean;
  reviewers: string[];
  validityPeriod?: number; // days
  createdAt: Date;
  updatedAt: Date;
}

// Data Item for Classification
export interface DataItem {
  id: string;
  type: string;
  content?: string;
  filename?: string;
  size: number;
  source: string;
  metadata: Record<string, any>;
  userId?: string;
  location?: string;
  createdAt: Date;
}

// Classification History
export interface ClassificationHistory {
  id: string;
  dataId: string;
  previousClassification?: ClassificationLevel;
  newClassification: ClassificationLevel;
  previousTags: string[];
  newTags: string[];
  method: 'automatic' | 'manual' | 'review';
  confidence: ClassificationConfidence;
  ruleId?: string;
  userId?: string;
  reason: string;
  timestamp: Date;
}

export class DataClassificationService extends EventEmitter {
  private database: Pool;
  private policies: Map<string, ClassificationPolicy> = new Map();
  private rules: Map<string, ClassificationRule> = new Map();
  private tags: Map<string, DataTag> = new Map();
  private classificationCache: Map<string, ClassificationResult> = new Map();

  constructor(database: Pool) {
    super();
    this.database = database;
    this.loadPolicies();
    this.loadRules();
    this.loadTags();
  }

  /**
   * Classify data item
   */
  async classifyData(dataItem: DataItem, policyId?: string): Promise<ClassificationResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(dataItem);
    const cached = this.classificationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get applicable policy
    const policy = policyId ? 
      this.policies.get(policyId) : 
      this.getApplicablePolicy(dataItem);

    if (!policy) {
      throw new Error('No applicable classification policy found');
    }

    // Evaluate classification rules
    const result = await this.evaluateClassificationRules(dataItem, policy);

    // Cache result
    this.classificationCache.set(cacheKey, result);

    // Store classification history
    await this.storeClassificationHistory(dataItem, result, 'automatic');

    this.emit('dataClassified', { dataItem, result, policy });

    return result;
  }

  /**
   * Evaluate classification rules
   */
  private async evaluateClassificationRules(
    dataItem: DataItem,
    policy: ClassificationPolicy
  ): Promise<ClassificationResult> {
    const matchedRules: ClassificationResult['matchedRules'] = [];
    let totalScore = 0;
    let maxClassificationLevel = ClassificationLevel.PUBLIC;
    let maxSensitivity = DataSensitivity.NON_SENSITIVE;
    const allTags: string[] = [];
    const metadata: Record<string, any> = {};
    const reasons: string[] = [];

    // Sort rules by priority
    const sortedRules = policy.rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      const ruleMatch = await this.evaluateRule(rule, dataItem);
      
      if (ruleMatch.matches) {
        matchedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          weight: ruleMatch.totalWeight,
          matchedConditions: ruleMatch.matchedConditions,
        });

        totalScore += ruleMatch.totalWeight;

        // Update classification level (take highest)
        if (this.getClassificationPriority(rule.classification) > this.getClassificationPriority(maxClassificationLevel)) {
          maxClassificationLevel = rule.classification;
        }

        // Update sensitivity (take highest)
        if (this.getSensitivityPriority(rule.sensitivity) > this.getSensitivityPriority(maxSensitivity)) {
          maxSensitivity = rule.sensitivity;
        }

        // Collect tags
        allTags.push(...rule.tags);

        // Merge metadata
        Object.assign(metadata, rule.metadata);

        // Add reason
        reasons.push(`Matched rule: ${rule.name} (${ruleMatch.matchedConditions}/${rule.conditions.length} conditions)`);
      }
    }

    // If no rules matched, use default
    if (matchedRules.length === 0) {
      maxClassificationLevel = policy.defaultClassification;
      reasons.push(`Default classification applied: ${policy.defaultClassification}`);
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(totalScore, matchedRules.length, policy.rules.length);

    // Auto-apply tags based on tag rules
    const autoTags = await this.getAutoAppliedTags(dataItem);
    allTags.push(...autoTags);

    // Remove duplicates
    const uniqueTags = [...new Set(allTags)];

    return {
      classification: maxClassificationLevel,
      sensitivity: maxSensitivity,
      confidence,
      score: totalScore,
      matchedRules,
      suggestedTags: uniqueTags,
      metadata,
      reasons,
    };
  }

  /**
   * Evaluate individual rule
   */
  private async evaluateRule(rule: ClassificationRule, dataItem: DataItem): Promise<{
    matches: boolean;
    totalWeight: number;
    matchedConditions: number;
  }> {
    let totalWeight = 0;
    let matchedConditions = 0;

    for (const condition of rule.conditions) {
      if (await this.evaluateCondition(condition, dataItem)) {
        matchedConditions++;
        totalWeight += condition.weight;
      }
    }

    // Rule matches if at least one condition matches (OR logic)
    // Could be modified to require all conditions (AND logic) based on rule configuration
    const matches = matchedConditions > 0;

    return {
      matches,
      totalWeight,
      matchedConditions,
    };
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(condition: ClassificationCondition, dataItem: DataItem): Promise<boolean> {
    let fieldValue: any;

    // Get field value based on condition type
    switch (condition.type) {
      case 'content':
        fieldValue = dataItem.content || '';
        break;
      case 'metadata':
        fieldValue = condition.field ? dataItem.metadata[condition.field] : dataItem.metadata;
        break;
      case 'filename':
        fieldValue = dataItem.filename || '';
        break;
      case 'size':
        fieldValue = dataItem.size;
        break;
      case 'source':
        fieldValue = dataItem.source;
        break;
      case 'user':
        fieldValue = dataItem.userId || '';
        break;
      case 'location':
        fieldValue = dataItem.location || '';
        break;
      default:
        return false;
    }

    // Apply operator
    return this.evaluateOperator(condition.operator, fieldValue, condition.value, condition.caseSensitive);
  }

  /**
   * Evaluate operator
   */
  private evaluateOperator(
    operator: ClassificationCondition['operator'],
    fieldValue: any,
    conditionValue: any,
    caseSensitive: boolean = true
  ): boolean {
    const normalizeString = (str: string) => 
      caseSensitive ? str : str.toLowerCase();

    switch (operator) {
      case 'contains':
        return normalizeString(String(fieldValue)).includes(normalizeString(String(conditionValue)));
        
      case 'regex':
        const flags = caseSensitive ? 'g' : 'gi';
        return new RegExp(conditionValue, flags).test(String(fieldValue));
        
      case 'equals':
        return caseSensitive ? 
          fieldValue === conditionValue : 
          normalizeString(String(fieldValue)) === normalizeString(String(conditionValue));
          
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
        
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
        
      case 'in_list':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
        
      case 'not_in_list':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
        
      default:
        return false;
    }
  }

  /**
   * Get auto-applied tags
   */
  private async getAutoAppliedTags(dataItem: DataItem): Promise<string[]> {
    const tags: string[] = [];

    for (const tag of this.tags.values()) {
      if (!tag.autoApplied) continue;

      // Check if any tag rule matches
      for (const tagRule of tag.rules) {
        if (await this.evaluateCondition(tagRule.condition, dataItem)) {
          tags.push(tag.name);
          break; // Only add tag once
        }
      }
    }

    return tags;
  }

  /**
   * Manually classify data
   */
  async manuallyClassifyData(
    dataId: string,
    classification: ClassificationLevel,
    sensitivity: DataSensitivity,
    tags: string[],
    userId: string,
    reason: string
  ): Promise<void> {
    const result: ClassificationResult = {
      classification,
      sensitivity,
      confidence: ClassificationConfidence.VERIFIED,
      score: 100,
      matchedRules: [],
      suggestedTags: tags,
      metadata: { manualClassification: true },
      reasons: [reason],
    };

    // Store classification history
    await this.storeClassificationHistory(
      { id: dataId } as DataItem,
      result,
      'manual',
      userId
    );

    // Update data classification in storage
    await this.updateDataClassification(dataId, result);

    this.emit('dataManuallyClassified', { dataId, result, userId, reason });
  }

  /**
   * Create classification rule
   */
  async createClassificationRule(rule: Omit<ClassificationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassificationRule> {
    const newRule: ClassificationRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate rule
    this.validateClassificationRule(newRule);

    // Store in database
    await this.storeClassificationRule(newRule);

    // Cache rule
    this.rules.set(newRule.id, newRule);

    this.emit('classificationRuleCreated', newRule);

    return newRule;
  }

  /**
   * Create data tag
   */
  async createDataTag(tag: Omit<DataTag, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataTag> {
    const newTag: DataTag = {
      ...tag,
      id: this.generateTagId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate tag
    this.validateDataTag(newTag);

    // Store in database
    await this.storeDataTag(newTag);

    // Cache tag
    this.tags.set(newTag.id, newTag);

    this.emit('dataTagCreated', newTag);

    return newTag;
  }

  /**
   * Create classification policy
   */
  async createClassificationPolicy(policy: Omit<ClassificationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassificationPolicy> {
    const newPolicy: ClassificationPolicy = {
      ...policy,
      id: this.generatePolicyId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate policy
    this.validateClassificationPolicy(newPolicy);

    // Store in database
    await this.storeClassificationPolicy(newPolicy);

    // Cache policy
    this.policies.set(newPolicy.id, newPolicy);

    this.emit('classificationPolicyCreated', newPolicy);

    return newPolicy;
  }

  /**
   * Bulk classify data
   */
  async bulkClassifyData(dataItems: DataItem[], policyId?: string): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();

    // Process in batches to avoid overwhelming the system
    const batchSize = 100;
    for (let i = 0; i < dataItems.length; i += batchSize) {
      const batch = dataItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (dataItem) => {
        try {
          const result = await this.classifyData(dataItem, policyId);
          results.set(dataItem.id, result);
        } catch (error) {
          console.error(`Failed to classify data ${dataItem.id}:`, error);
        }
      });

      await Promise.all(batchPromises);

      // Emit progress event
      this.emit('bulkClassificationProgress', {
        processed: Math.min(i + batchSize, dataItems.length),
        total: dataItems.length,
        percentage: Math.round((Math.min(i + batchSize, dataItems.length) / dataItems.length) * 100),
      });
    }

    this.emit('bulkClassificationCompleted', { totalProcessed: dataItems.length, results });

    return results;
  }

  /**
   * Get classification suggestions
   */
  async getClassificationSuggestions(dataItem: DataItem): Promise<{
    suggestions: Array<{
      classification: ClassificationLevel;
      sensitivity: DataSensitivity;
      confidence: ClassificationConfidence;
      reason: string;
    }>;
    recommendedTags: string[];
  }> {
    const suggestions: any[] = [];
    const recommendedTags: string[] = [];

    // Get classification from different policies
    for (const policy of this.policies.values()) {
      try {
        const result = await this.evaluateClassificationRules(dataItem, policy);
        
        if (result.score > 0) {
          suggestions.push({
            classification: result.classification,
            sensitivity: result.sensitivity,
            confidence: result.confidence,
            reason: `Based on policy: ${policy.name}`,
          });
          
          recommendedTags.push(...result.suggestedTags);
        }
      } catch (error) {
        console.error(`Error evaluating policy ${policy.id}:`, error);
      }
    }

    // Remove duplicate tags
    const uniqueTags = [...new Set(recommendedTags)];

    return {
      suggestions,
      recommendedTags: uniqueTags,
    };
  }

  /**
   * Helper methods
   */
  private getApplicablePolicy(dataItem: DataItem): ClassificationPolicy | undefined {
    for (const policy of this.policies.values()) {
      if (this.policyApplies(policy, dataItem)) {
        return policy;
      }
    }
    return undefined;
  }

  private policyApplies(policy: ClassificationPolicy, dataItem: DataItem): boolean {
    // Check if policy scope matches data item
    if (policy.scope.dataTypes && !policy.scope.dataTypes.includes(dataItem.type)) {
      return false;
    }
    
    if (policy.scope.sources && !policy.scope.sources.includes(dataItem.source)) {
      return false;
    }
    
    // Add more scope checks as needed
    
    return true;
  }

  private getClassificationPriority(classification: ClassificationLevel): number {
    const priorities = {
      [ClassificationLevel.PUBLIC]: 1,
      [ClassificationLevel.INTERNAL]: 2,
      [ClassificationLevel.CONFIDENTIAL]: 3,
      [ClassificationLevel.RESTRICTED]: 4,
      [ClassificationLevel.TOP_SECRET]: 5,
    };
    return priorities[classification] || 0;
  }

  private getSensitivityPriority(sensitivity: DataSensitivity): number {
    const priorities = {
      [DataSensitivity.NON_SENSITIVE]: 1,
      [DataSensitivity.SENSITIVE]: 2,
      [DataSensitivity.HIGHLY_SENSITIVE]: 3,
      [DataSensitivity.CRITICAL]: 4,
    };
    return priorities[sensitivity] || 0;
  }

  private calculateConfidence(
    score: number,
    matchedRules: number,
    totalRules: number
  ): ClassificationConfidence {
    const ruleMatchRatio = matchedRules / Math.max(totalRules, 1);
    
    if (score >= 80 && ruleMatchRatio >= 0.5) {
      return ClassificationConfidence.HIGH;
    } else if (score >= 50 && ruleMatchRatio >= 0.3) {
      return ClassificationConfidence.MEDIUM;
    } else {
      return ClassificationConfidence.LOW;
    }
  }

  private generateCacheKey(dataItem: DataItem): string {
    const content = JSON.stringify({
      type: dataItem.type,
      size: dataItem.size,
      source: dataItem.source,
      filename: dataItem.filename,
      contentHash: dataItem.content ? createHash('md5').update(dataItem.content).digest('hex') : null,
    });
    
    return createHash('sha256').update(content).digest('hex');
  }

  private validateClassificationRule(rule: ClassificationRule): void {
    if (!rule.name || rule.name.trim().length === 0) {
      throw new Error('Classification rule name is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error('Classification rule must have at least one condition');
    }

    if (rule.priority < 0 || rule.priority > 1000) {
      throw new Error('Rule priority must be between 0 and 1000');
    }
  }

  private validateDataTag(tag: DataTag): void {
    if (!tag.name || tag.name.trim().length === 0) {
      throw new Error('Data tag name is required');
    }

    if (!tag.category || tag.category.trim().length === 0) {
      throw new Error('Data tag category is required');
    }
  }

  private validateClassificationPolicy(policy: ClassificationPolicy): void {
    if (!policy.name || policy.name.trim().length === 0) {
      throw new Error('Classification policy name is required');
    }

    if (!policy.rules || policy.rules.length === 0) {
      throw new Error('Classification policy must have at least one rule');
    }
  }

  // ID generators
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateTagId(): string {
    return `tag_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Database operation stubs - would be implemented with actual SQL
  private async loadPolicies(): Promise<void> {
    // Implementation would load policies from database
  }

  private async loadRules(): Promise<void> {
    // Implementation would load rules from database
  }

  private async loadTags(): Promise<void> {
    // Implementation would load tags from database
  }

  private async storeClassificationRule(rule: ClassificationRule): Promise<void> {
    // Implementation would insert into classification_rules table
  }

  private async storeDataTag(tag: DataTag): Promise<void> {
    // Implementation would insert into data_tags table
  }

  private async storeClassificationPolicy(policy: ClassificationPolicy): Promise<void> {
    // Implementation would insert into classification_policies table
  }

  private async storeClassificationHistory(
    dataItem: DataItem,
    result: ClassificationResult,
    method: ClassificationHistory['method'],
    userId?: string
  ): Promise<void> {
    // Implementation would insert into classification_history table
  }

  private async updateDataClassification(dataId: string, result: ClassificationResult): Promise<void> {
    // Implementation would update data classification in storage
  }
}

// Export factory function
export const createDataClassificationService = (database: Pool) =>
  new DataClassificationService(database);