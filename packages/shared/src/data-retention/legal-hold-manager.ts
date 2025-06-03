/**
 * SecureWatch Legal Hold Manager
 * Manages legal holds and litigation holds on data
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { TieredStorageManager } from './tiered-storage-manager';

// Legal Hold Status
export enum LegalHoldStatus {
  ACTIVE = 'active',
  RELEASED = 'released',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended'
}

// Hold Type
export enum HoldType {
  LITIGATION = 'litigation',
  INVESTIGATION = 'investigation',
  AUDIT = 'audit',
  REGULATORY = 'regulatory',
  PRESERVATION = 'preservation',
  DISCOVERY = 'discovery'
}

// Legal Hold
export interface LegalHold {
  id: string;
  name: string;
  description: string;
  type: HoldType;
  status: LegalHoldStatus;
  matter: {
    id: string;
    name: string;
    type: string;
    jurisdiction: string;
    court?: string;
    caseNumber?: string;
  };
  custodians: Custodian[];
  scope: {
    dataTypes: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    keywords?: string[];
    classifications?: string[];
    locations?: string[];
    tags?: string[];
    includeMetadata: boolean;
    includeSystemData: boolean;
  };
  notifications: {
    sendToUsers: boolean;
    sendToAdmins: boolean;
    template: string;
    frequency: 'immediate' | 'daily' | 'weekly';
    channels: ('email' | 'portal' | 'sms')[];
  };
  compliance: {
    retainIndefinitely: boolean;
    overrideRetentionPolicies: boolean;
    preventDeletion: boolean;
    preventModification: boolean;
    requireApprovalForAccess: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  effectiveDate: Date;
  expirationDate?: Date;
  releasedAt?: Date;
  releasedBy?: string;
  releaseReason?: string;
}

// Custodian (person responsible for data)
export interface Custodian {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  notified: boolean;
  notifiedAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  escalated: boolean;
  escalatedAt?: Date;
  dataPreserved: boolean;
  preservationConfirmedAt?: Date;
}

// Hold Notice
export interface HoldNotice {
  id: string;
  holdId: string;
  custodianId: string;
  type: 'initial' | 'reminder' | 'release' | 'escalation';
  channel: 'email' | 'portal' | 'sms';
  template: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  acknowledgedAt?: Date;
  bounced: boolean;
  error?: string;
}

// Data Under Hold
export interface DataUnderHold {
  holdId: string;
  dataId: string;
  originalRetentionPolicy?: string;
  holdAppliedAt: Date;
  metadata: {
    dataType: string;
    size: number;
    classification: string;
    location: string;
    custodian: string;
    preservationMethod: string;
  };
}

// Hold Report
export interface HoldReport {
  hold: LegalHold;
  summary: {
    totalDataItems: number;
    totalSize: number;
    custodianCount: number;
    acknowledgedCustodians: number;
    dataPreserved: number;
    dataPending: number;
  };
  custodianStatus: Array<{
    custodian: Custodian;
    dataCount: number;
    preservationStatus: 'complete' | 'partial' | 'pending';
    lastActivity: Date;
  }>;
  dataBreakdown: {
    byType: Record<string, number>;
    byClassification: Record<string, number>;
    byLocation: Record<string, number>;
  };
  compliance: {
    overriddenPolicies: number;
    preventedDeletions: number;
    riskLevel: 'low' | 'medium' | 'high';
    issues: string[];
  };
}

export class LegalHoldManager extends EventEmitter {
  private database: Pool;
  private storageManager: TieredStorageManager;
  private holds: Map<string, LegalHold> = new Map();
  private dataUnderHold: Map<string, DataUnderHold[]> = new Map();

  constructor(database: Pool, storageManager: TieredStorageManager) {
    super();
    this.database = database;
    this.storageManager = storageManager;
    this.loadActiveHolds();
  }

  /**
   * Create legal hold
   */
  async createLegalHold(hold: Omit<LegalHold, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<LegalHold> {
    const legalHold: LegalHold = {
      ...hold,
      id: this.generateHoldId(),
      status: LegalHoldStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate hold
    this.validateLegalHold(legalHold);

    // Store in database
    await this.storeLegalHold(legalHold);

    // Cache hold
    this.holds.set(legalHold.id, legalHold);

    // Apply hold to existing data
    await this.applyHoldToExistingData(legalHold);

    // Send notifications to custodians
    await this.sendHoldNotifications(legalHold);

    this.emit('legalHoldCreated', legalHold);

    return legalHold;
  }

  /**
   * Apply hold to existing data
   */
  private async applyHoldToExistingData(hold: LegalHold): Promise<void> {
    // Query data matching hold scope
    const matchingData = await this.findDataMatchingHoldScope(hold);

    const dataUnderHold: DataUnderHold[] = [];

    for (const data of matchingData) {
      // Apply legal hold flag to data
      await this.storageManager.applyLegalHold([data.id], hold.id, hold.description);

      // Track data under hold
      const holdData: DataUnderHold = {
        holdId: hold.id,
        dataId: data.id,
        originalRetentionPolicy: data.retentionPolicyId,
        holdAppliedAt: new Date(),
        metadata: {
          dataType: data.type,
          size: data.size,
          classification: data.classification,
          location: data.location,
          custodian: data.metadata.custodian || 'unknown',
          preservationMethod: 'legal_hold',
        },
      };

      dataUnderHold.push(holdData);
    }

    // Store hold data relationships
    this.dataUnderHold.set(hold.id, dataUnderHold);
    await this.storeDataUnderHold(dataUnderHold);

    this.emit('holdAppliedToData', { hold, dataCount: dataUnderHold.length });
  }

  /**
   * Release legal hold
   */
  async releaseLegalHold(
    holdId: string,
    releasedBy: string,
    reason: string,
    releaseData: boolean = false
  ): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    if (hold.status !== LegalHoldStatus.ACTIVE) {
      throw new Error(`Legal hold is not active: ${holdId}`);
    }

    // Update hold status
    hold.status = LegalHoldStatus.RELEASED;
    hold.releasedAt = new Date();
    hold.releasedBy = releasedBy;
    hold.releaseReason = reason;
    hold.updatedAt = new Date();

    // Update in database
    await this.updateLegalHold(hold);

    // Release data from hold if requested
    if (releaseData) {
      await this.releaseDataFromHold(holdId);
    }

    // Send release notifications
    await this.sendReleaseNotifications(hold);

    this.emit('legalHoldReleased', { hold, releasedBy, reason });
  }

  /**
   * Release data from hold
   */
  private async releaseDataFromHold(holdId: string): Promise<void> {
    const dataUnderHold = this.dataUnderHold.get(holdId) || [];

    for (const holdData of dataUnderHold) {
      try {
        // Remove legal hold flag from data
        await this.storageManager.removeLegalHold([holdData.dataId], holdId);

        // Restore original retention policy if needed
        if (holdData.originalRetentionPolicy) {
          // Would need to reapply original retention policy
        }
      } catch (error) {
        console.error(`Failed to release data ${holdData.dataId} from hold:`, error);
      }
    }

    // Remove from tracking
    this.dataUnderHold.delete(holdId);
    await this.removeDataUnderHold(holdId);

    this.emit('dataReleasedFromHold', { holdId, dataCount: dataUnderHold.length });
  }

  /**
   * Update legal hold
   */
  async updateLegalHold(
    holdId: string,
    updates: Partial<LegalHold>,
    updatedBy: string
  ): Promise<LegalHold> {
    const existingHold = this.holds.get(holdId);
    if (!existingHold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const updatedHold: LegalHold = {
      ...existingHold,
      ...updates,
      id: holdId,
      lastModifiedBy: updatedBy,
      updatedAt: new Date(),
    };

    // Validate updated hold
    this.validateLegalHold(updatedHold);

    // Update in database
    await this.updateLegalHold(updatedHold);

    // Update cache
    this.holds.set(holdId, updatedHold);

    // If scope changed, reapply to data
    if (this.holdScopeChanged(existingHold, updatedHold)) {
      await this.reapplyHoldToData(updatedHold);
    }

    this.emit('legalHoldUpdated', { old: existingHold, new: updatedHold });

    return updatedHold;
  }

  /**
   * Add custodian to hold
   */
  async addCustodian(holdId: string, custodian: Omit<Custodian, 'id' | 'notified' | 'acknowledged' | 'escalated' | 'dataPreserved'>): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const newCustodian: Custodian = {
      ...custodian,
      id: this.generateCustodianId(),
      notified: false,
      acknowledged: false,
      escalated: false,
      dataPreserved: false,
    };

    hold.custodians.push(newCustodian);
    hold.updatedAt = new Date();

    // Update in database
    await this.updateLegalHold(hold);

    // Send notification to new custodian
    await this.sendCustodianNotification(hold, newCustodian, 'initial');

    this.emit('custodianAdded', { hold, custodian: newCustodian });
  }

  /**
   * Remove custodian from hold
   */
  async removeCustodian(holdId: string, custodianId: string): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const custodianIndex = hold.custodians.findIndex(c => c.id === custodianId);
    if (custodianIndex === -1) {
      throw new Error(`Custodian not found: ${custodianId}`);
    }

    const removedCustodian = hold.custodians.splice(custodianIndex, 1)[0];
    hold.updatedAt = new Date();

    // Update in database
    await this.updateLegalHold(hold);

    this.emit('custodianRemoved', { hold, custodian: removedCustodian });
  }

  /**
   * Acknowledge hold notice
   */
  async acknowledgeCustodianNotice(holdId: string, custodianId: string, acknowledgedBy: string): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const custodian = hold.custodians.find(c => c.id === custodianId);
    if (!custodian) {
      throw new Error(`Custodian not found: ${custodianId}`);
    }

    custodian.acknowledged = true;
    custodian.acknowledgedAt = new Date();
    hold.updatedAt = new Date();

    // Update in database
    await this.updateLegalHold(hold);

    this.emit('holdNoticeAcknowledged', { hold, custodian, acknowledgedBy });
  }

  /**
   * Confirm data preservation
   */
  async confirmDataPreservation(holdId: string, custodianId: string, confirmedBy: string): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const custodian = hold.custodians.find(c => c.id === custodianId);
    if (!custodian) {
      throw new Error(`Custodian not found: ${custodianId}`);
    }

    custodian.dataPreserved = true;
    custodian.preservationConfirmedAt = new Date();
    hold.updatedAt = new Date();

    // Update in database
    await this.updateLegalHold(hold);

    this.emit('dataPreservationConfirmed', { hold, custodian, confirmedBy });
  }

  /**
   * Generate hold report
   */
  async generateHoldReport(holdId: string): Promise<HoldReport> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const dataUnderHold = this.dataUnderHold.get(holdId) || [];
    
    // Calculate summary
    const summary = {
      totalDataItems: dataUnderHold.length,
      totalSize: dataUnderHold.reduce((sum, data) => sum + data.metadata.size, 0),
      custodianCount: hold.custodians.length,
      acknowledgedCustodians: hold.custodians.filter(c => c.acknowledged).length,
      dataPreserved: hold.custodians.filter(c => c.dataPreserved).length,
      dataPending: hold.custodians.filter(c => !c.dataPreserved).length,
    };

    // Generate custodian status
    const custodianStatus = hold.custodians.map(custodian => {
      const custodianData = dataUnderHold.filter(d => d.metadata.custodian === custodian.userId);
      return {
        custodian,
        dataCount: custodianData.length,
        preservationStatus: custodian.dataPreserved ? 'complete' as const : 
                           custodian.acknowledged ? 'partial' as const : 'pending' as const,
        lastActivity: custodian.preservationConfirmedAt || custodian.acknowledgedAt || custodian.notifiedAt || hold.createdAt,
      };
    });

    // Generate data breakdown
    const dataBreakdown = {
      byType: this.groupDataBy(dataUnderHold, 'dataType'),
      byClassification: this.groupDataBy(dataUnderHold, 'classification'),
      byLocation: this.groupDataBy(dataUnderHold, 'location'),
    };

    // Assess compliance
    const compliance = {
      overriddenPolicies: dataUnderHold.filter(d => d.originalRetentionPolicy).length,
      preventedDeletions: await this.countPreventedDeletions(holdId),
      riskLevel: this.assessRiskLevel(hold, summary) as 'low' | 'medium' | 'high',
      issues: await this.identifyComplianceIssues(hold, summary),
    };

    return {
      hold,
      summary,
      custodianStatus,
      dataBreakdown,
      compliance,
    };
  }

  /**
   * Send hold notifications
   */
  private async sendHoldNotifications(hold: LegalHold): Promise<void> {
    if (!hold.notifications.sendToUsers) return;

    for (const custodian of hold.custodians) {
      await this.sendCustodianNotification(hold, custodian, 'initial');
    }
  }

  /**
   * Send custodian notification
   */
  private async sendCustodianNotification(
    hold: LegalHold,
    custodian: Custodian,
    type: HoldNotice['type']
  ): Promise<void> {
    const notice: HoldNotice = {
      id: this.generateNoticeId(),
      holdId: hold.id,
      custodianId: custodian.id,
      type,
      channel: 'email', // Default to email
      template: hold.notifications.template,
      sentAt: new Date(),
      bounced: false,
    };

    try {
      // Send notification (implementation would use email service)
      await this.sendNotification(notice, hold, custodian);
      
      // Update custodian status
      custodian.notified = true;
      custodian.notifiedAt = new Date();
      
      // Store notice
      await this.storeHoldNotice(notice);
      
      this.emit('holdNotificationSent', { hold, custodian, notice });
      
    } catch (error) {
      notice.bounced = true;
      notice.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Store failed notice
      await this.storeHoldNotice(notice);
      
      this.emit('holdNotificationFailed', { hold, custodian, notice, error });
    }
  }

  /**
   * Send release notifications
   */
  private async sendReleaseNotifications(hold: LegalHold): Promise<void> {
    for (const custodian of hold.custodians) {
      if (custodian.notified) {
        await this.sendCustodianNotification(hold, custodian, 'release');
      }
    }
  }

  /**
   * Helper methods
   */
  private validateLegalHold(hold: LegalHold): void {
    if (!hold.name || hold.name.trim().length === 0) {
      throw new Error('Legal hold name is required');
    }

    if (!hold.matter.id || !hold.matter.name) {
      throw new Error('Legal matter information is required');
    }

    if (!hold.scope.dataTypes || hold.scope.dataTypes.length === 0) {
      throw new Error('Legal hold scope must specify at least one data type');
    }

    if (hold.custodians.length === 0) {
      throw new Error('Legal hold must have at least one custodian');
    }

    if (hold.expirationDate && hold.expirationDate <= hold.effectiveDate) {
      throw new Error('Expiration date must be after effective date');
    }
  }

  private holdScopeChanged(oldHold: LegalHold, newHold: LegalHold): boolean {
    return JSON.stringify(oldHold.scope) !== JSON.stringify(newHold.scope);
  }

  private async reapplyHoldToData(hold: LegalHold): Promise<void> {
    // Remove existing hold data
    await this.releaseDataFromHold(hold.id);
    
    // Reapply with new scope
    await this.applyHoldToExistingData(hold);
  }

  private groupDataBy(data: DataUnderHold[], field: keyof DataUnderHold['metadata']): Record<string, number> {
    return data.reduce((acc, item) => {
      const key = String(item.metadata[field]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private assessRiskLevel(hold: LegalHold, summary: HoldReport['summary']): string {
    const acknowledgmentRate = summary.acknowledgedCustodians / summary.custodianCount;
    const preservationRate = summary.dataPreserved / summary.custodianCount;
    
    if (acknowledgmentRate < 0.5 || preservationRate < 0.5) {
      return 'high';
    } else if (acknowledgmentRate < 0.8 || preservationRate < 0.8) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async identifyComplianceIssues(hold: LegalHold, summary: HoldReport['summary']): Promise<string[]> {
    const issues: string[] = [];
    
    if (summary.acknowledgedCustodians < summary.custodianCount) {
      issues.push(`${summary.custodianCount - summary.acknowledgedCustodians} custodians have not acknowledged the hold`);
    }
    
    if (summary.dataPreserved < summary.custodianCount) {
      issues.push(`${summary.custodianCount - summary.dataPreserved} custodians have not confirmed data preservation`);
    }
    
    // Check for expired hold
    if (hold.expirationDate && hold.expirationDate < new Date()) {
      issues.push('Legal hold has expired but is still active');
    }
    
    return issues;
  }

  // ID generators
  private generateHoldId(): string {
    return `hold_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateCustodianId(): string {
    return `cust_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateNoticeId(): string {
    return `notice_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Database operation stubs - would be implemented with actual SQL
  private async loadActiveHolds(): Promise<void> {
    // Implementation would load active holds from database
  }

  private async storeLegalHold(hold: LegalHold): Promise<void> {
    // Implementation would insert into legal_holds table
  }

  private async updateLegalHold(hold: LegalHold): Promise<void> {
    // Implementation would update legal_holds table
  }

  private async storeDataUnderHold(data: DataUnderHold[]): Promise<void> {
    // Implementation would insert into data_under_hold table
  }

  private async removeDataUnderHold(holdId: string): Promise<void> {
    // Implementation would delete from data_under_hold table
  }

  private async storeHoldNotice(notice: HoldNotice): Promise<void> {
    // Implementation would insert into hold_notices table
  }

  private async findDataMatchingHoldScope(hold: LegalHold): Promise<any[]> {
    // Implementation would query data matching hold scope criteria
    return [];
  }

  private async sendNotification(notice: HoldNotice, hold: LegalHold, custodian: Custodian): Promise<void> {
    // Implementation would send notification via email/SMS/portal
  }

  private async countPreventedDeletions(holdId: string): Promise<number> {
    // Implementation would count deletions prevented by this hold
    return 0;
  }
}

// Export factory function
export const createLegalHoldManager = (database: Pool, storageManager: TieredStorageManager) =>
  new LegalHoldManager(database, storageManager);