/**
 * SecureWatch Geographic Data Residency Service
 * Manages data location compliance and cross-border data transfer controls
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { TieredStorageManager } from './tiered-storage-manager';

// Geographic Regions
export enum GeographicRegion {
  NORTH_AMERICA = 'north_america',
  EUROPE = 'europe',
  ASIA_PACIFIC = 'asia_pacific',
  MIDDLE_EAST = 'middle_east',
  AFRICA = 'africa',
  SOUTH_AMERICA = 'south_america',
  OCEANIA = 'oceania'
}

// Data Jurisdictions
export enum DataJurisdiction {
  US = 'us',
  EU = 'eu',
  UK = 'uk',
  CANADA = 'canada',
  AUSTRALIA = 'australia',
  JAPAN = 'japan',
  SINGAPORE = 'singapore',
  BRAZIL = 'brazil',
  INDIA = 'india',
  CHINA = 'china',
  RUSSIA = 'russia',
  SOUTH_AFRICA = 'south_africa'
}

// Transfer Mechanisms
export enum TransferMechanism {
  ADEQUACY_DECISION = 'adequacy_decision',
  STANDARD_CONTRACTUAL_CLAUSES = 'standard_contractual_clauses',
  BINDING_CORPORATE_RULES = 'binding_corporate_rules',
  CERTIFICATION = 'certification',
  CODE_OF_CONDUCT = 'code_of_conduct',
  EXPLICIT_CONSENT = 'explicit_consent',
  CONTRACT_NECESSITY = 'contract_necessity',
  PUBLIC_INTEREST = 'public_interest',
  LEGAL_CLAIMS = 'legal_claims',
  VITAL_INTERESTS = 'vital_interests'
}

// Data Residency Policy
export interface DataResidencyPolicy {
  id: string;
  name: string;
  description: string;
  scope: {
    dataTypes: string[];
    classifications: string[];
    tenants?: string[];
    tags?: string[];
  };
  rules: ResidencyRule[];
  compliance: {
    regulations: string[]; // GDPR, CCPA, etc.
    certifications: string[]; // ISO 27001, SOC 2, etc.
    auditRequirements: string[];
  };
  notifications: {
    alertOnTransfer: boolean;
    alertOnViolation: boolean;
    recipients: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  enabled: boolean;
}

// Residency Rule
export interface ResidencyRule {
  id: string;
  priority: number;
  conditions: {
    userLocation?: DataJurisdiction[];
    dataOrigin?: DataJurisdiction[];
    dataClassification?: string[];
    userRoles?: string[];
    timeRestrictions?: {
      startTime?: string;
      endTime?: string;
      timezone?: string;
    };
  };
  restrictions: {
    allowedRegions: GeographicRegion[];
    allowedJurisdictions: DataJurisdiction[];
    prohibitedRegions?: GeographicRegion[];
    prohibitedJurisdictions?: DataJurisdiction[];
    requiresApproval: boolean;
    approvers?: string[];
    maxRetentionDays?: number;
  };
  transferRequirements?: {
    requiredMechanism: TransferMechanism[];
    additionalSafeguards: string[];
    contractualTerms: string[];
    technicalMeasures: string[];
  };
  enabled: boolean;
}

// Data Location
export interface DataLocation {
  id: string;
  dataId: string;
  region: GeographicRegion;
  jurisdiction: DataJurisdiction;
  facility: {
    name: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    certifications: string[];
  };
  storageProvider: {
    name: string;
    type: 'cloud' | 'on_premise' | 'hybrid';
    contractType: string;
    dataProcessingAgreement: boolean;
  };
  compliance: {
    localLaws: string[];
    dataProtectionLevel: 'adequate' | 'standard' | 'enhanced';
    encryptionInTransit: boolean;
    encryptionAtRest: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Cross-Border Transfer Request
export interface CrossBorderTransferRequest {
  id: string;
  dataId: string;
  sourceLocation: DataLocation;
  targetLocation: Partial<DataLocation>;
  requestedBy: string;
  purpose: string;
  legalBasis: TransferMechanism;
  duration?: number; // days
  recipientDetails: {
    organization: string;
    contact: string;
    jurisdiction: DataJurisdiction;
    dataProtectionOfficer?: string;
  };
  safeguards: {
    technicalMeasures: string[];
    organizationalMeasures: string[];
    contractualTerms: string[];
  };
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    identifiedRisks: string[];
    mitigationMeasures: string[];
  };
  status: 'pending' | 'approved' | 'denied' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  denialReason?: string;
  transferCompletedAt?: Date;
}

// Residency Compliance Report
export interface ResidencyComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalDataItems: number;
    dataByRegion: Record<GeographicRegion, number>;
    dataByJurisdiction: Record<DataJurisdiction, number>;
    complianceViolations: number;
    pendingTransfers: number;
    completedTransfers: number;
  };
  violations: Array<{
    dataId: string;
    violationType: 'unauthorized_location' | 'expired_transfer' | 'missing_safeguards';
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: Date;
    resolvedAt?: Date;
  }>;
  transfers: Array<{
    transferId: string;
    dataId: string;
    sourceJurisdiction: DataJurisdiction;
    targetJurisdiction: DataJurisdiction;
    mechanism: TransferMechanism;
    status: string;
    completedAt?: Date;
  }>;
  recommendations: string[];
}

export class GeographicResidencyService extends EventEmitter {
  private database: Pool;
  private storageManager: TieredStorageManager;
  private policies: Map<string, DataResidencyPolicy> = new Map();
  private dataLocations: Map<string, DataLocation> = new Map();
  private transferRequests: Map<string, CrossBorderTransferRequest> = new Map();

  // Jurisdiction mapping for adequacy decisions
  private adequacyDecisions: Map<DataJurisdiction, DataJurisdiction[]> = new Map([
    [DataJurisdiction.EU, [DataJurisdiction.UK, DataJurisdiction.CANADA, DataJurisdiction.JAPAN]],
    [DataJurisdiction.UK, [DataJurisdiction.EU]],
    // Add more adequacy decisions as they are established
  ]);

  constructor(database: Pool, storageManager: TieredStorageManager) {
    super();
    this.database = database;
    this.storageManager = storageManager;
    this.loadPolicies();
    this.loadDataLocations();
  }

  /**
   * Create data residency policy
   */
  async createResidencyPolicy(
    policy: Omit<DataResidencyPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DataResidencyPolicy> {
    const residencyPolicy: DataResidencyPolicy = {
      ...policy,
      id: this.generatePolicyId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate policy
    this.validateResidencyPolicy(residencyPolicy);

    // Store in database
    await this.storeResidencyPolicy(residencyPolicy);

    // Cache policy
    this.policies.set(residencyPolicy.id, residencyPolicy);

    this.emit('residencyPolicyCreated', residencyPolicy);

    return residencyPolicy;
  }

  /**
   * Check data residency compliance
   */
  async checkResidencyCompliance(
    dataId: string,
    targetLocation: {
      region: GeographicRegion;
      jurisdiction: DataJurisdiction;
    },
    userContext?: {
      jurisdiction: DataJurisdiction;
      roles: string[];
    }
  ): Promise<{
    compliant: boolean;
    violations: string[];
    requiredMechanisms: TransferMechanism[];
    recommendations: string[];
  }> {
    const currentLocation = this.dataLocations.get(dataId);
    if (!currentLocation) {
      throw new Error(`Data location not found: ${dataId}`);
    }

    const violations: string[] = [];
    const requiredMechanisms: TransferMechanism[] = [];
    const recommendations: string[] = [];

    // Check if cross-border transfer
    const isCrossBorder = currentLocation.jurisdiction !== targetLocation.jurisdiction;
    
    if (!isCrossBorder) {
      return {
        compliant: true,
        violations: [],
        requiredMechanisms: [],
        recommendations: ['Data transfer within same jurisdiction'],
      };
    }

    // Get applicable policies
    const applicablePolicies = await this.getApplicablePolicies(dataId);

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        // Check if rule conditions are met
        if (this.ruleConditionsMatch(rule, userContext)) {
          // Check jurisdiction restrictions
          if (rule.restrictions.prohibitedJurisdictions?.includes(targetLocation.jurisdiction)) {
            violations.push(`Transfer to ${targetLocation.jurisdiction} is prohibited by policy ${policy.name}`);
          }

          if (rule.restrictions.allowedJurisdictions.length > 0 && 
              !rule.restrictions.allowedJurisdictions.includes(targetLocation.jurisdiction)) {
            violations.push(`Transfer to ${targetLocation.jurisdiction} is not in allowed jurisdictions for policy ${policy.name}`);
          }

          // Check if approval is required
          if (rule.restrictions.requiresApproval) {
            recommendations.push('Transfer requires approval before proceeding');
          }

          // Check transfer requirements
          if (rule.transferRequirements) {
            requiredMechanisms.push(...rule.transferRequirements.requiredMechanism);
            
            if (rule.transferRequirements.additionalSafeguards.length > 0) {
              recommendations.push(`Additional safeguards required: ${rule.transferRequirements.additionalSafeguards.join(', ')}`);
            }
          }
        }
      }
    }

    // Check adequacy decisions
    if (!this.hasAdequacyDecision(currentLocation.jurisdiction, targetLocation.jurisdiction)) {
      if (requiredMechanisms.length === 0) {
        requiredMechanisms.push(TransferMechanism.STANDARD_CONTRACTUAL_CLAUSES);
        recommendations.push('Standard Contractual Clauses required due to lack of adequacy decision');
      }
    }

    const compliant = violations.length === 0;

    return {
      compliant,
      violations,
      requiredMechanisms: [...new Set(requiredMechanisms)],
      recommendations,
    };
  }

  /**
   * Request cross-border transfer
   */
  async requestCrossBorderTransfer(
    request: Omit<CrossBorderTransferRequest, 'id' | 'status' | 'requestedAt'>
  ): Promise<CrossBorderTransferRequest> {
    const transferRequest: CrossBorderTransferRequest = {
      ...request,
      id: this.generateTransferRequestId(),
      status: 'pending',
      requestedAt: new Date(),
    };

    // Validate transfer request
    await this.validateTransferRequest(transferRequest);

    // Store in database
    await this.storeTransferRequest(transferRequest);

    // Cache request
    this.transferRequests.set(transferRequest.id, transferRequest);

    // Check if auto-approval is possible
    const autoApprovalResult = await this.checkAutoApproval(transferRequest);
    if (autoApprovalResult.approved) {
      await this.approveTransfer(transferRequest.id, 'system', autoApprovalResult.reason);
    } else {
      // Send for manual review
      await this.sendForReview(transferRequest);
    }

    this.emit('crossBorderTransferRequested', transferRequest);

    return transferRequest;
  }

  /**
   * Approve cross-border transfer
   */
  async approveTransfer(
    transferRequestId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<void> {
    const request = this.transferRequests.get(transferRequestId);
    if (!request) {
      throw new Error(`Transfer request not found: ${transferRequestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Transfer request is not pending: ${transferRequestId}`);
    }

    request.status = 'approved';
    request.approvedAt = new Date();
    request.approvedBy = approvedBy;

    // Update in database
    await this.updateTransferRequest(request);

    // Execute transfer
    await this.executeTransfer(request);

    this.emit('crossBorderTransferApproved', { request, approvedBy, approvalNotes });
  }

  /**
   * Deny cross-border transfer
   */
  async denyTransfer(
    transferRequestId: string,
    deniedBy: string,
    reason: string
  ): Promise<void> {
    const request = this.transferRequests.get(transferRequestId);
    if (!request) {
      throw new Error(`Transfer request not found: ${transferRequestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Transfer request is not pending: ${transferRequestId}`);
    }

    request.status = 'denied';
    request.reviewedAt = new Date();
    request.reviewedBy = deniedBy;
    request.denialReason = reason;

    // Update in database
    await this.updateTransferRequest(request);

    this.emit('crossBorderTransferDenied', { request, deniedBy, reason });
  }

  /**
   * Execute approved transfer
   */
  private async executeTransfer(request: CrossBorderTransferRequest): Promise<void> {
    try {
      request.status = 'in_progress';
      await this.updateTransferRequest(request);

      // Create new data location record
      const newLocation: DataLocation = {
        id: this.generateLocationId(),
        dataId: request.dataId,
        region: request.targetLocation.region!,
        jurisdiction: request.targetLocation.jurisdiction!,
        facility: request.targetLocation.facility!,
        storageProvider: request.targetLocation.storageProvider!,
        compliance: request.targetLocation.compliance!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Move data in storage manager
      // Implementation would depend on storage architecture

      // Update data location
      await this.updateDataLocation(request.dataId, newLocation);

      // Mark transfer as completed
      request.status = 'completed';
      request.transferCompletedAt = new Date();
      await this.updateTransferRequest(request);

      // Log transfer event
      await this.logTransferEvent(request, 'completed');

      this.emit('crossBorderTransferCompleted', request);

    } catch (error) {
      request.status = 'cancelled';
      await this.updateTransferRequest(request);
      
      await this.logTransferEvent(request, 'failed', error instanceof Error ? error.message : 'Unknown error');
      
      this.emit('crossBorderTransferFailed', { request, error });
      throw error;
    }
  }

  /**
   * Register data location
   */
  async registerDataLocation(location: Omit<DataLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataLocation> {
    const dataLocation: DataLocation = {
      ...location,
      id: this.generateLocationId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in database
    await this.storeDataLocation(dataLocation);

    // Cache location
    this.dataLocations.set(dataLocation.dataId, dataLocation);

    this.emit('dataLocationRegistered', dataLocation);

    return dataLocation;
  }

  /**
   * Update data location
   */
  async updateDataLocation(dataId: string, location: DataLocation): Promise<void> {
    // Update in database
    await this.updateDataLocationInDatabase(location);

    // Update cache
    this.dataLocations.set(dataId, location);

    this.emit('dataLocationUpdated', { dataId, location });
  }

  /**
   * Generate residency compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ResidencyComplianceReport> {
    const summary = await this.calculateComplianceSummary(startDate, endDate);
    const violations = await this.getComplianceViolations(startDate, endDate);
    const transfers = await this.getCompletedTransfers(startDate, endDate);
    const recommendations = await this.generateRecommendations(violations);

    return {
      period: { start: startDate, end: endDate },
      summary,
      violations,
      transfers,
      recommendations,
    };
  }

  /**
   * Monitor data residency compliance
   */
  async monitorCompliance(): Promise<void> {
    // Check for data in unauthorized locations
    const unauthorizedData = await this.findUnauthorizedDataLocations();
    
    for (const data of unauthorizedData) {
      await this.handleComplianceViolation(data, 'unauthorized_location');
    }

    // Check for expired transfers
    const expiredTransfers = await this.findExpiredTransfers();
    
    for (const transfer of expiredTransfers) {
      await this.handleExpiredTransfer(transfer);
    }

    // Check for missing safeguards
    const unsafeTransfers = await this.findTransfersWithMissingSafeguards();
    
    for (const transfer of unsafeTransfers) {
      await this.handleComplianceViolation(transfer, 'missing_safeguards');
    }

    this.emit('complianceMonitoringCompleted');
  }

  /**
   * Helper methods
   */
  private ruleConditionsMatch(rule: ResidencyRule, userContext?: {
    jurisdiction: DataJurisdiction;
    roles: string[];
  }): boolean {
    if (!userContext) return true;

    if (rule.conditions.userLocation && !rule.conditions.userLocation.includes(userContext.jurisdiction)) {
      return false;
    }

    if (rule.conditions.userRoles && !rule.conditions.userRoles.some(role => userContext.roles.includes(role))) {
      return false;
    }

    // Add more condition checks as needed

    return true;
  }

  private hasAdequacyDecision(sourceJurisdiction: DataJurisdiction, targetJurisdiction: DataJurisdiction): boolean {
    const decisions = this.adequacyDecisions.get(sourceJurisdiction);
    return decisions ? decisions.includes(targetJurisdiction) : false;
  }

  private async checkAutoApproval(request: CrossBorderTransferRequest): Promise<{
    approved: boolean;
    reason: string;
  }> {
    // Check if transfer is between jurisdictions with adequacy decision
    if (this.hasAdequacyDecision(request.sourceLocation.jurisdiction, request.targetLocation.jurisdiction!)) {
      return {
        approved: true,
        reason: 'Adequacy decision exists between jurisdictions',
      };
    }

    // Check if risk level is low and proper mechanisms are in place
    if (request.riskAssessment.riskLevel === 'low' && 
        request.legalBasis === TransferMechanism.STANDARD_CONTRACTUAL_CLAUSES) {
      return {
        approved: true,
        reason: 'Low risk transfer with appropriate legal basis',
      };
    }

    return {
      approved: false,
      reason: 'Manual review required',
    };
  }

  private validateResidencyPolicy(policy: DataResidencyPolicy): void {
    if (!policy.name || policy.name.trim().length === 0) {
      throw new Error('Residency policy name is required');
    }

    if (!policy.rules || policy.rules.length === 0) {
      throw new Error('Residency policy must have at least one rule');
    }

    if (!policy.scope.dataTypes || policy.scope.dataTypes.length === 0) {
      throw new Error('Residency policy scope must specify at least one data type');
    }
  }

  private async validateTransferRequest(request: CrossBorderTransferRequest): Promise<void> {
    // Validate required fields
    if (!request.purpose || request.purpose.trim().length === 0) {
      throw new Error('Transfer purpose is required');
    }

    if (!request.legalBasis) {
      throw new Error('Legal basis for transfer is required');
    }

    // Validate data exists and location is known
    const currentLocation = this.dataLocations.get(request.dataId);
    if (!currentLocation) {
      throw new Error(`Data location not found for: ${request.dataId}`);
    }

    // Validate target location
    if (!request.targetLocation.jurisdiction || !request.targetLocation.region) {
      throw new Error('Target jurisdiction and region are required');
    }
  }

  // ID generators
  private generatePolicyId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateTransferRequestId(): string {
    return `xfer_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateLocationId(): string {
    return `loc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Database operation stubs - would be implemented with actual SQL
  private async loadPolicies(): Promise<void> {
    // Implementation would load policies from database
  }

  private async loadDataLocations(): Promise<void> {
    // Implementation would load data locations from database
  }

  private async storeResidencyPolicy(policy: DataResidencyPolicy): Promise<void> {
    // Implementation would insert into residency_policies table
  }

  private async storeTransferRequest(request: CrossBorderTransferRequest): Promise<void> {
    // Implementation would insert into transfer_requests table
  }

  private async updateTransferRequest(request: CrossBorderTransferRequest): Promise<void> {
    // Implementation would update transfer_requests table
  }

  private async storeDataLocation(location: DataLocation): Promise<void> {
    // Implementation would insert into data_locations table
  }

  private async updateDataLocationInDatabase(location: DataLocation): Promise<void> {
    // Implementation would update data_locations table
  }

  private async getApplicablePolicies(dataId: string): Promise<DataResidencyPolicy[]> {
    // Implementation would find policies that apply to the data
    return [];
  }

  private async sendForReview(request: CrossBorderTransferRequest): Promise<void> {
    // Implementation would send transfer request for manual review
  }

  private async logTransferEvent(request: CrossBorderTransferRequest, status: string, error?: string): Promise<void> {
    // Implementation would log transfer events for audit
  }

  private async calculateComplianceSummary(startDate: Date, endDate: Date): Promise<any> {
    // Implementation would calculate compliance summary statistics
    return {};
  }

  private async getComplianceViolations(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would get compliance violations in date range
    return [];
  }

  private async getCompletedTransfers(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would get completed transfers in date range
    return [];
  }

  private async generateRecommendations(violations: any[]): Promise<string[]> {
    // Implementation would generate recommendations based on violations
    return [];
  }

  private async findUnauthorizedDataLocations(): Promise<any[]> {
    // Implementation would find data in unauthorized locations
    return [];
  }

  private async findExpiredTransfers(): Promise<any[]> {
    // Implementation would find expired transfers
    return [];
  }

  private async findTransfersWithMissingSafeguards(): Promise<any[]> {
    // Implementation would find transfers missing required safeguards
    return [];
  }

  private async handleComplianceViolation(data: any, violationType: string): Promise<void> {
    // Implementation would handle compliance violations
  }

  private async handleExpiredTransfer(transfer: any): Promise<void> {
    // Implementation would handle expired transfers
  }
}

// Export factory function
export const createGeographicResidencyService = (database: Pool, storageManager: TieredStorageManager) =>
  new GeographicResidencyService(database, storageManager);