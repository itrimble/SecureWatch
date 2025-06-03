/**
 * SecureWatch Data Retention Policy Manager
 * Manages configurable data retention policies and enforcement
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { TieredStorageManager, StorageTier, StoredData } from './tiered-storage-manager';

// Retention Policy Configuration
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  version: number;
  dataTypes: string[];
  classification?: string[];
  tenantId?: string; // null for global policies
  enabled: boolean;
  tiers: {
    hot: {
      duration: number; // in days
      storageClass: string;
      autoTransition: boolean;
    };
    warm: {
      duration: number; // in days
      storageClass: string;
      autoTransition: boolean;
    };
    cold: {
      duration: number; // in days
      storageClass: string;
      autoTransition: boolean;
    };
    archive?: {
      duration: number; // in days
      storageClass: string;
      autoTransition: boolean;
    };
  };
  totalRetention: number; // in days
  gracePeriod: number; // additional days before final deletion
  legalHoldExempt: boolean;
  complianceFrameworks: string[];
  exceptions: {
    extendForAudits: boolean;
    extendForInvestigations: boolean;
    preserveOnSecurity: boolean;
  };
  notifications: {
    warnDaysBefore: number[];
    recipients: string[];
    channels: ('email' | 'slack' | 'webhook')[];
  };
  customRules?: {
    condition: string; // JSON Logic format
    action: 'extend' | 'accelerate' | 'hold' | 'preserve';
    parameters: Record<string, any>;
  }[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

// Retention Schedule Entry
export interface RetentionScheduleEntry {
  id: string;
  dataId: string;
  policyId: string;
  currentTier: StorageTier;
  nextTier?: StorageTier;
  scheduledAction: 'transition' | 'delete' | 'review';
  scheduledDate: Date;
  gracePeriodEnd?: Date;
  notificationsSent: Date[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  retryCount: number;
  lastError?: string;
  metadata: Record<string, any>;
}

// Retention Execution Result
export interface RetentionExecutionResult {
  policyId: string;
  processed: number;
  transitioned: {
    hotToWarm: number;
    warmToCold: number;
    coldToArchive: number;
  };
  deleted: number;
  errors: Array<{
    dataId: string;
    action: string;
    error: string;
  }>;
  warnings: Array<{
    dataId: string;
    warning: string;
  }>;
  totalTimeMs: number;
  spaceSaved: number; // bytes
}

// Retention Report
export interface RetentionReport {
  period: {
    start: Date;
    end: Date;
  };
  policies: Array<{
    policy: RetentionPolicy;
    dataCount: number;
    totalSize: number;
    tierDistribution: Record<StorageTier, number>;
    upcomingActions: {
      transitions: number;
      deletions: number;
      reviewsRequired: number;
    };
    compliance: {
      framework: string;
      status: 'compliant' | 'at_risk' | 'non_compliant';
      issues?: string[];
    }[];
  }>;
  spaceSummary: {
    total: number;
    byTier: Record<StorageTier, number>;
    projectedSavings: number;
  };
}

export class RetentionPolicyManager extends EventEmitter {
  private database: Pool;
  private storageManager: TieredStorageManager;
  private policies: Map<string, RetentionPolicy> = new Map();
  private scheduleCache: Map<string, RetentionScheduleEntry[]> = new Map();

  constructor(database: Pool, storageManager: TieredStorageManager) {
    super();
    this.database = database;
    this.storageManager = storageManager;
    this.loadPolicies();
  }

  /**
   * Create a new retention policy
   */
  async createPolicy(policy: Omit<RetentionPolicy, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<RetentionPolicy> {
    // Validate policy
    this.validatePolicy(policy as RetentionPolicy);
    
    // Generate ID and set metadata
    const newPolicy: RetentionPolicy = {
      ...policy,
      id: this.generatePolicyId(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as RetentionPolicy;
    
    // Store in database
    await this.storePolicyInDatabase(newPolicy);
    
    // Cache policy
    this.policies.set(newPolicy.id, newPolicy);
    
    // Generate initial schedule entries
    await this.generateScheduleForPolicy(newPolicy);
    
    this.emit('policyCreated', newPolicy);
    return newPolicy;
  }

  /**
   * Update retention policy
   */
  async updatePolicy(policyId: string, updates: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
    const existingPolicy = this.policies.get(policyId);
    if (!existingPolicy) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    
    const updatedPolicy: RetentionPolicy = {
      ...existingPolicy,
      ...updates,
      id: policyId, // Ensure ID doesn't change
      version: existingPolicy.version + 1,
      updatedAt: new Date(),
    };
    
    // Validate updated policy
    this.validatePolicy(updatedPolicy);
    
    // Update in database
    await this.updatePolicyInDatabase(updatedPolicy);
    
    // Update cache
    this.policies.set(policyId, updatedPolicy);
    
    // Regenerate schedule entries
    await this.regenerateScheduleForPolicy(updatedPolicy);
    
    this.emit('policyUpdated', { old: existingPolicy, new: updatedPolicy });
    return updatedPolicy;
  }

  /**
   * Apply retention policies to data
   */
  async applyRetentionPolicies(): Promise<RetentionExecutionResult[]> {
    const results: RetentionExecutionResult[] = [];
    
    for (const [policyId, policy] of this.policies) {
      if (!policy.enabled) continue;
      
      try {
        const result = await this.executePolicyRetention(policy);
        results.push(result);
      } catch (error) {
        console.error(`Failed to execute retention policy ${policyId}:`, error);
        results.push({
          policyId,
          processed: 0,
          transitioned: { hotToWarm: 0, warmToCold: 0, coldToArchive: 0 },
          deleted: 0,
          errors: [{ dataId: 'N/A', action: 'policy_execution', error: error instanceof Error ? error.message : 'Unknown error' }],
          warnings: [],
          totalTimeMs: 0,
          spaceSaved: 0,
        });
      }
    }
    
    this.emit('retentionPoliciesExecuted', results);
    return results;
  }

  /**
   * Execute retention for specific policy
   */
  private async executePolicyRetention(policy: RetentionPolicy): Promise<RetentionExecutionResult> {
    const startTime = Date.now();
    const result: RetentionExecutionResult = {
      policyId: policy.id,
      processed: 0,
      transitioned: { hotToWarm: 0, warmToCold: 0, coldToArchive: 0 },
      deleted: 0,
      errors: [],
      warnings: [],
      totalTimeMs: 0,
      spaceSaved: 0,
    };
    
    try {
      // Get scheduled actions for this policy
      const scheduledActions = await this.getScheduledActions(policy.id);
      
      for (const action of scheduledActions) {
        if (action.status !== 'pending' || action.scheduledDate > new Date()) {
          continue;
        }
        
        try {
          await this.updateScheduleStatus(action.id, 'processing');
          
          switch (action.scheduledAction) {
            case 'transition':
              await this.executeTransition(action, result);
              break;
            case 'delete':
              await this.executeDeletion(action, result);
              break;
            case 'review':
              await this.flagForReview(action);
              break;
          }
          
          await this.updateScheduleStatus(action.id, 'completed');
          result.processed++;
          
        } catch (error) {
          await this.updateScheduleStatus(action.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
          result.errors.push({
            dataId: action.dataId,
            action: action.scheduledAction,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      result.totalTimeMs = Date.now() - startTime;
      return result;
      
    } catch (error) {
      result.totalTimeMs = Date.now() - startTime;
      result.errors.push({
        dataId: 'N/A',
        action: 'policy_execution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute data transition
   */
  private async executeTransition(action: RetentionScheduleEntry, result: RetentionExecutionResult): Promise<void> {
    if (!action.nextTier) {
      throw new Error(`No target tier specified for transition: ${action.id}`);
    }
    
    const operationResult = await this.storageManager.moveDataBetweenTiers(action.dataId, action.nextTier);
    
    if (!operationResult.success) {
      throw new Error(operationResult.error || 'Transition failed');
    }
    
    // Update transition counters
    const fromTier = action.currentTier;
    const toTier = action.nextTier;
    
    if (fromTier === StorageTier.HOT && toTier === StorageTier.WARM) {
      result.transitioned.hotToWarm++;
    } else if (fromTier === StorageTier.WARM && toTier === StorageTier.COLD) {
      result.transitioned.warmToCold++;
    } else if (fromTier === StorageTier.COLD && toTier === StorageTier.ARCHIVE) {
      result.transitioned.coldToArchive++;
    }
    
    // Calculate space savings (cold/archive storage is typically cheaper)
    if (toTier === StorageTier.COLD || toTier === StorageTier.ARCHIVE) {
      result.spaceSaved += operationResult.size || 0;
    }
    
    // Schedule next action if needed
    await this.scheduleNextAction(action);
  }

  /**
   * Execute data deletion
   */
  private async executeDeletion(action: RetentionScheduleEntry, result: RetentionExecutionResult): Promise<void> {
    const operationResult = await this.storageManager.deleteData(action.dataId);
    
    if (!operationResult.success) {
      throw new Error(operationResult.error || 'Deletion failed');
    }
    
    result.deleted++;
    result.spaceSaved += operationResult.size || 0;
    
    // Remove from schedule
    await this.removeScheduleEntry(action.id);
  }

  /**
   * Flag data for manual review
   */
  private async flagForReview(action: RetentionScheduleEntry): Promise<void> {
    // Create review ticket or notification
    this.emit('reviewRequired', {
      dataId: action.dataId,
      policyId: action.policyId,
      reason: 'Scheduled review',
      scheduledDate: action.scheduledDate,
    });
    
    // Update schedule to review status
    await this.updateScheduleStatus(action.id, 'completed', 'Flagged for review');
  }

  /**
   * Generate retention schedule for policy
   */
  private async generateScheduleForPolicy(policy: RetentionPolicy): Promise<void> {
    // Find all data that matches this policy
    const matchingData = await this.findDataForPolicy(policy);
    
    for (const data of matchingData) {
      await this.createScheduleEntries(data, policy);
    }
  }

  /**
   * Create schedule entries for data item
   */
  private async createScheduleEntries(data: StoredData, policy: RetentionPolicy): Promise<void> {
    const entries: Omit<RetentionScheduleEntry, 'id'>[] = [];
    
    // Calculate transition dates
    const createdAt = data.createdAt.getTime();
    
    // Hot to Warm transition
    if (policy.tiers.warm.autoTransition && data.tier === StorageTier.HOT) {
      const transitionDate = new Date(createdAt + policy.tiers.hot.duration * 24 * 60 * 60 * 1000);
      entries.push({
        dataId: data.id,
        policyId: policy.id,
        currentTier: StorageTier.HOT,
        nextTier: StorageTier.WARM,
        scheduledAction: 'transition',
        scheduledDate: transitionDate,
        status: 'pending',
        retryCount: 0,
        notificationsSent: [],
        metadata: { transition: 'hot_to_warm' },
      });
    }
    
    // Warm to Cold transition
    if (policy.tiers.cold.autoTransition) {
      const transitionDate = new Date(createdAt + (policy.tiers.hot.duration + policy.tiers.warm.duration) * 24 * 60 * 60 * 1000);
      entries.push({
        dataId: data.id,
        policyId: policy.id,
        currentTier: StorageTier.WARM,
        nextTier: StorageTier.COLD,
        scheduledAction: 'transition',
        scheduledDate: transitionDate,
        status: 'pending',
        retryCount: 0,
        notificationsSent: [],
        metadata: { transition: 'warm_to_cold' },
      });
    }
    
    // Cold to Archive transition
    if (policy.tiers.archive?.autoTransition) {
      const transitionDate = new Date(createdAt + (policy.tiers.hot.duration + policy.tiers.warm.duration + policy.tiers.cold.duration) * 24 * 60 * 60 * 1000);
      entries.push({
        dataId: data.id,
        policyId: policy.id,
        currentTier: StorageTier.COLD,
        nextTier: StorageTier.ARCHIVE,
        scheduledAction: 'transition',
        scheduledDate: transitionDate,
        status: 'pending',
        retryCount: 0,
        notificationsSent: [],
        metadata: { transition: 'cold_to_archive' },
      });
    }
    
    // Final deletion
    const deletionDate = new Date(createdAt + policy.totalRetention * 24 * 60 * 60 * 1000);
    const gracePeriodEnd = new Date(deletionDate.getTime() + policy.gracePeriod * 24 * 60 * 60 * 1000);
    
    entries.push({
      dataId: data.id,
      policyId: policy.id,
      currentTier: StorageTier.ARCHIVE,
      scheduledAction: 'delete',
      scheduledDate: deletionDate,
      gracePeriodEnd,
      status: 'pending',
      retryCount: 0,
      notificationsSent: [],
      metadata: { final_deletion: true },
    });
    
    // Store schedule entries in database
    for (const entry of entries) {
      await this.storeScheduleEntry(entry as RetentionScheduleEntry);
    }
  }

  /**
   * Generate retention report
   */
  async generateRetentionReport(startDate: Date, endDate: Date): Promise<RetentionReport> {
    const report: RetentionReport = {
      period: { start: startDate, end: endDate },
      policies: [],
      spaceSummary: {
        total: 0,
        byTier: {
          [StorageTier.HOT]: 0,
          [StorageTier.WARM]: 0,
          [StorageTier.COLD]: 0,
          [StorageTier.ARCHIVE]: 0,
        },
        projectedSavings: 0,
      },
    };
    
    for (const [policyId, policy] of this.policies) {
      const policyData = await this.getPolicyData(policyId, startDate, endDate);
      const upcomingActions = await this.getUpcomingActions(policyId);
      const compliance = await this.checkPolicyCompliance(policy);
      
      report.policies.push({
        policy,
        dataCount: policyData.count,
        totalSize: policyData.totalSize,
        tierDistribution: policyData.tierDistribution,
        upcomingActions,
        compliance,
      });
      
      // Update space summary
      report.spaceSummary.total += policyData.totalSize;
      Object.keys(policyData.tierDistribution).forEach(tier => {
        report.spaceSummary.byTier[tier as StorageTier] += policyData.tierDistribution[tier as StorageTier];
      });
    }
    
    // Calculate projected savings
    report.spaceSummary.projectedSavings = await this.calculateProjectedSavings();
    
    return report;
  }

  /**
   * Apply legal hold to data
   */
  async applyLegalHold(dataIds: string[], holdId: string, reason: string): Promise<void> {
    const query = `
      UPDATE stored_data 
      SET legal_hold = true, 
          metadata = metadata || $1
      WHERE id = ANY($2)
    `;
    
    const holdMetadata = JSON.stringify({
      legalHold: {
        id: holdId,
        reason,
        appliedAt: new Date(),
        appliedBy: 'system', // Should be actual user
      },
    });
    
    await this.database.query(query, [holdMetadata, dataIds]);
    
    // Pause scheduled deletions for these data items
    await this.pauseScheduledActions(dataIds, 'Legal hold applied');
    
    this.emit('legalHoldApplied', { dataIds, holdId, reason });
  }

  /**
   * Remove legal hold from data
   */
  async removeLegalHold(dataIds: string[], holdId: string): Promise<void> {
    const query = `
      UPDATE stored_data 
      SET legal_hold = false,
          metadata = metadata - 'legalHold'
      WHERE id = ANY($1)
    `;
    
    await this.database.query(query, [dataIds]);
    
    // Resume scheduled actions
    await this.resumeScheduledActions(dataIds);
    
    this.emit('legalHoldRemoved', { dataIds, holdId });
  }

  /**
   * Helper methods for database operations
   */
  private async loadPolicies(): Promise<void> {
    const query = 'SELECT * FROM retention_policies WHERE enabled = true';
    const result = await this.database.query(query);
    
    for (const row of result.rows) {
      const policy = this.rowToRetentionPolicy(row);
      this.policies.set(policy.id, policy);
    }
  }

  private validatePolicy(policy: RetentionPolicy): void {
    // Validate tier durations sum to total retention
    const totalTierDuration = policy.tiers.hot.duration + policy.tiers.warm.duration + policy.tiers.cold.duration + (policy.tiers.archive?.duration || 0);
    
    if (totalTierDuration !== policy.totalRetention) {
      throw new Error('Tier durations must sum to total retention period');
    }
    
    // Validate data types are specified
    if (!policy.dataTypes || policy.dataTypes.length === 0) {
      throw new Error('At least one data type must be specified');
    }
    
    // Validate compliance frameworks
    const validFrameworks = ['PCI', 'HIPAA', 'GDPR', 'SOX', 'CCPA', 'SOC2'];
    for (const framework of policy.complianceFrameworks) {
      if (!validFrameworks.includes(framework)) {
        throw new Error(`Unsupported compliance framework: ${framework}`);
      }
    }
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async storePolicyInDatabase(policy: RetentionPolicy): Promise<void> {
    const query = `
      INSERT INTO retention_policies (
        id, name, description, version, data_types, classification, tenant_id,
        enabled, tiers, total_retention, grace_period, legal_hold_exempt,
        compliance_frameworks, exceptions, notifications, custom_rules,
        created_at, updated_at, created_by, approved_by, approved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `;
    
    await this.database.query(query, [
      policy.id, policy.name, policy.description, policy.version,
      policy.dataTypes, policy.classification, policy.tenantId,
      policy.enabled, JSON.stringify(policy.tiers), policy.totalRetention,
      policy.gracePeriod, policy.legalHoldExempt, policy.complianceFrameworks,
      JSON.stringify(policy.exceptions), JSON.stringify(policy.notifications),
      JSON.stringify(policy.customRules), policy.createdAt, policy.updatedAt,
      policy.createdBy, policy.approvedBy, policy.approvedAt
    ]);
  }

  private async updatePolicyInDatabase(policy: RetentionPolicy): Promise<void> {
    const query = `
      UPDATE retention_policies SET
        name = $2, description = $3, version = $4, data_types = $5,
        classification = $6, tenant_id = $7, enabled = $8, tiers = $9,
        total_retention = $10, grace_period = $11, legal_hold_exempt = $12,
        compliance_frameworks = $13, exceptions = $14, notifications = $15,
        custom_rules = $16, updated_at = $17, approved_by = $18, approved_at = $19
      WHERE id = $1
    `;
    
    await this.database.query(query, [
      policy.id, policy.name, policy.description, policy.version,
      policy.dataTypes, policy.classification, policy.tenantId,
      policy.enabled, JSON.stringify(policy.tiers), policy.totalRetention,
      policy.gracePeriod, policy.legalHoldExempt, policy.complianceFrameworks,
      JSON.stringify(policy.exceptions), JSON.stringify(policy.notifications),
      JSON.stringify(policy.customRules), policy.updatedAt,
      policy.approvedBy, policy.approvedAt
    ]);
  }

  private rowToRetentionPolicy(row: any): RetentionPolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      dataTypes: row.data_types,
      classification: row.classification,
      tenantId: row.tenant_id,
      enabled: row.enabled,
      tiers: row.tiers,
      totalRetention: row.total_retention,
      gracePeriod: row.grace_period,
      legalHoldExempt: row.legal_hold_exempt,
      complianceFrameworks: row.compliance_frameworks,
      exceptions: row.exceptions,
      notifications: row.notifications,
      customRules: row.custom_rules,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
    };
  }

  // Additional helper methods would be implemented here
  private async findDataForPolicy(policy: RetentionPolicy): Promise<StoredData[]> {
    // Implementation would query stored_data table with policy filters
    return [];
  }

  private async getScheduledActions(policyId: string): Promise<RetentionScheduleEntry[]> {
    // Implementation would query retention_schedule table
    return [];
  }

  private async storeScheduleEntry(entry: RetentionScheduleEntry): Promise<void> {
    // Implementation would insert into retention_schedule table
  }

  private async updateScheduleStatus(entryId: string, status: string, error?: string): Promise<void> {
    // Implementation would update retention_schedule table
  }

  private async scheduleNextAction(action: RetentionScheduleEntry): Promise<void> {
    // Implementation would create next schedule entry
  }

  private async removeScheduleEntry(entryId: string): Promise<void> {
    // Implementation would delete from retention_schedule table
  }

  private async regenerateScheduleForPolicy(policy: RetentionPolicy): Promise<void> {
    // Implementation would regenerate schedule entries for updated policy
  }

  private async getPolicyData(policyId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation would get policy statistics
    return { count: 0, totalSize: 0, tierDistribution: {} };
  }

  private async getUpcomingActions(policyId: string): Promise<any> {
    // Implementation would get upcoming scheduled actions
    return { transitions: 0, deletions: 0, reviewsRequired: 0 };
  }

  private async checkPolicyCompliance(policy: RetentionPolicy): Promise<any[]> {
    // Implementation would check compliance status
    return [];
  }

  private async calculateProjectedSavings(): Promise<number> {
    // Implementation would calculate projected storage cost savings
    return 0;
  }

  private async pauseScheduledActions(dataIds: string[], reason: string): Promise<void> {
    // Implementation would pause scheduled actions
  }

  private async resumeScheduledActions(dataIds: string[]): Promise<void> {
    // Implementation would resume scheduled actions
  }
}

// Export singleton
export const retentionPolicyManager = (database: Pool, storageManager: TieredStorageManager) =>
  new RetentionPolicyManager(database, storageManager);