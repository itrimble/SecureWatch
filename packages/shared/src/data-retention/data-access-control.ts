/**
 * SecureWatch Data Access Control Service
 * Implements fine-grained access controls for data retention and compliance
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { Request } from 'express';

// Access Control Types
export enum AccessType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXPORT = 'export',
  SHARE = 'share',
  ADMIN = 'admin'
}

// Data Classification Levels
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

// Access Context
export interface AccessContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    region: string;
    timezone: string;
  };
  mfaVerified: boolean;
  deviceTrusted: boolean;
  accessTime: Date;
}

// Data Resource
export interface DataResource {
  id: string;
  type: string;
  classification: DataClassification;
  tenantId: string;
  owner: string;
  tags: string[];
  metadata: Record<string, any>;
  location: {
    region: string;
    jurisdiction: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Access Policy
export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: AccessCondition[];
  actions: AccessAction[];
  effect: 'allow' | 'deny';
  timeRestrictions?: {
    startTime?: string; // HH:MM format
    endTime?: string;
    daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
    timezone?: string;
  };
  locationRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
    allowedRegions?: string[];
    blockedRegions?: string[];
  };
  deviceRestrictions?: {
    requireMFA?: boolean;
    requireTrustedDevice?: boolean;
    blockedUserAgents?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Access Condition
export interface AccessCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'regex' | 'greater_than' | 'less_than';
  value: any;
  caseSensitive?: boolean;
}

// Access Action
export interface AccessAction {
  type: AccessType;
  resource?: {
    type?: string;
    classification?: DataClassification;
    tags?: string[];
  };
}

// Access Decision
export interface AccessDecision {
  decision: 'allow' | 'deny';
  reason: string;
  matchedPolicies: string[];
  conditions: {
    timeValid: boolean;
    locationValid: boolean;
    deviceValid: boolean;
    mfaValid: boolean;
  };
  metadata: {
    evaluationTime: number;
    riskScore: number;
    requiresApproval: boolean;
  };
}

// Access Request
export interface AccessRequest {
  id: string;
  context: AccessContext;
  resource: DataResource;
  action: AccessType;
  purpose?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  approver?: string;
  approvedAt?: Date;
  denialReason?: string;
}

// Audit Event for Access Control
export interface AccessAuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  tenantId: string;
  resourceId: string;
  action: AccessType;
  decision: 'allow' | 'deny';
  reason: string;
  riskScore: number;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  duration?: number; // for session-based access
  metadata: Record<string, any>;
}

export class DataAccessControlService extends EventEmitter {
  private database: Pool;
  private policies: Map<string, AccessPolicy> = new Map();
  private accessRequests: Map<string, AccessRequest> = new Map();
  private activeSessions: Map<string, AccessContext> = new Map();

  constructor(database: Pool) {
    super();
    this.database = database;
    this.loadPolicies();
  }

  /**
   * Evaluate access request
   */
  async evaluateAccess(
    context: AccessContext,
    resource: DataResource,
    action: AccessType
  ): Promise<AccessDecision> {
    const startTime = Date.now();
    
    // Get applicable policies
    const applicablePolicies = this.getApplicablePolicies(context, resource, action);
    
    // Sort by priority (higher priority first)
    applicablePolicies.sort((a, b) => b.priority - a.priority);
    
    let decision: 'allow' | 'deny' = 'deny'; // Default deny
    let reason = 'No applicable policies found';
    const matchedPolicies: string[] = [];
    
    // Evaluate conditions
    const conditions = {
      timeValid: this.evaluateTimeRestrictions(context),
      locationValid: this.evaluateLocationRestrictions(context),
      deviceValid: this.evaluateDeviceRestrictions(context),
      mfaValid: this.evaluateMFARequirements(context, resource),
    };
    
    // Evaluate policies
    for (const policy of applicablePolicies) {
      if (!policy.enabled) continue;
      
      const policyMatches = this.evaluatePolicy(policy, context, resource, action);
      
      if (policyMatches) {
        matchedPolicies.push(policy.id);
        
        if (policy.effect === 'deny') {
          decision = 'deny';
          reason = `Access denied by policy: ${policy.name}`;
          break; // Explicit deny takes precedence
        } else if (policy.effect === 'allow') {
          decision = 'allow';
          reason = `Access allowed by policy: ${policy.name}`;
          // Continue to check for deny policies
        }
      }
    }
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(context, resource, action);
    
    // Check if approval is required
    const requiresApproval = this.requiresApproval(context, resource, action, riskScore);
    
    const result: AccessDecision = {
      decision: requiresApproval ? 'deny' : decision,
      reason: requiresApproval ? 'Access requires approval' : reason,
      matchedPolicies,
      conditions,
      metadata: {
        evaluationTime: Date.now() - startTime,
        riskScore,
        requiresApproval,
      },
    };
    
    // Log access attempt
    await this.logAccessAttempt(context, resource, action, result);
    
    this.emit('accessEvaluated', { context, resource, action, decision: result });
    
    return result;
  }

  /**
   * Request access approval
   */
  async requestAccess(
    context: AccessContext,
    resource: DataResource,
    action: AccessType,
    purpose?: string,
    urgency: AccessRequest['urgency'] = 'medium'
  ): Promise<AccessRequest> {
    const request: AccessRequest = {
      id: this.generateRequestId(),
      context,
      resource,
      action,
      purpose,
      urgency,
      requestedAt: new Date(),
      expiresAt: this.calculateExpirationTime(urgency),
      status: 'pending',
    };
    
    this.accessRequests.set(request.id, request);
    
    // Store in database
    await this.storeAccessRequest(request);
    
    // Notify approvers
    await this.notifyApprovers(request);
    
    this.emit('accessRequested', request);
    
    return request;
  }

  /**
   * Approve access request
   */
  async approveAccess(requestId: string, approverId: string, reason?: string): Promise<void> {
    const request = this.accessRequests.get(requestId);
    if (!request) {
      throw new Error(`Access request not found: ${requestId}`);
    }
    
    if (request.status !== 'pending') {
      throw new Error(`Access request is not pending: ${requestId}`);
    }
    
    request.status = 'approved';
    request.approver = approverId;
    request.approvedAt = new Date();
    
    // Update in database
    await this.updateAccessRequest(request);
    
    // Grant temporary access
    await this.grantTemporaryAccess(request);
    
    this.emit('accessApproved', { request, approverId, reason });
  }

  /**
   * Deny access request
   */
  async denyAccess(requestId: string, approverId: string, reason: string): Promise<void> {
    const request = this.accessRequests.get(requestId);
    if (!request) {
      throw new Error(`Access request not found: ${requestId}`);
    }
    
    if (request.status !== 'pending') {
      throw new Error(`Access request is not pending: ${requestId}`);
    }
    
    request.status = 'denied';
    request.approver = approverId;
    request.denialReason = reason;
    
    // Update in database
    await this.updateAccessRequest(request);
    
    this.emit('accessDenied', { request, approverId, reason });
  }

  /**
   * Create access policy
   */
  async createPolicy(policy: Omit<AccessPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccessPolicy> {
    const newPolicy: AccessPolicy = {
      ...policy,
      id: this.generatePolicyId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Validate policy
    this.validatePolicy(newPolicy);
    
    // Store in database
    await this.storePolicyInDatabase(newPolicy);
    
    // Cache policy
    this.policies.set(newPolicy.id, newPolicy);
    
    this.emit('policyCreated', newPolicy);
    
    return newPolicy;
  }

  /**
   * Update access policy
   */
  async updatePolicy(policyId: string, updates: Partial<AccessPolicy>): Promise<AccessPolicy> {
    const existingPolicy = this.policies.get(policyId);
    if (!existingPolicy) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    
    const updatedPolicy: AccessPolicy = {
      ...existingPolicy,
      ...updates,
      id: policyId,
      updatedAt: new Date(),
    };
    
    // Validate policy
    this.validatePolicy(updatedPolicy);
    
    // Update in database
    await this.updatePolicyInDatabase(updatedPolicy);
    
    // Update cache
    this.policies.set(policyId, updatedPolicy);
    
    this.emit('policyUpdated', { old: existingPolicy, new: updatedPolicy });
    
    return updatedPolicy;
  }

  /**
   * Get applicable policies for context and resource
   */
  private getApplicablePolicies(
    context: AccessContext,
    resource: DataResource,
    action: AccessType
  ): AccessPolicy[] {
    const applicable: AccessPolicy[] = [];
    
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      
      // Check if policy applies to this action
      const actionMatches = policy.actions.some(policyAction => {
        if (policyAction.type !== action) return false;
        
        // Check resource filters
        if (policyAction.resource) {
          if (policyAction.resource.type && policyAction.resource.type !== resource.type) {
            return false;
          }
          if (policyAction.resource.classification && policyAction.resource.classification !== resource.classification) {
            return false;
          }
          if (policyAction.resource.tags && !policyAction.resource.tags.some(tag => resource.tags.includes(tag))) {
            return false;
          }
        }
        
        return true;
      });
      
      if (actionMatches) {
        applicable.push(policy);
      }
    }
    
    return applicable;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluatePolicy(
    policy: AccessPolicy,
    context: AccessContext,
    resource: DataResource,
    action: AccessType
  ): boolean {
    // Evaluate all conditions
    return policy.conditions.every(condition => 
      this.evaluateCondition(condition, context, resource, action)
    );
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(
    condition: AccessCondition,
    context: AccessContext,
    resource: DataResource,
    action: AccessType
  ): boolean {
    let fieldValue: any;
    
    // Get field value from context or resource
    if (condition.field.startsWith('context.')) {
      const contextField = condition.field.substring(8);
      fieldValue = (context as any)[contextField];
    } else if (condition.field.startsWith('resource.')) {
      const resourceField = condition.field.substring(9);
      fieldValue = (resource as any)[resourceField];
    } else {
      fieldValue = (context as any)[condition.field] || (resource as any)[condition.field];
    }
    
    // Evaluate condition
    switch (condition.operator) {
      case 'equals':
        return condition.caseSensitive !== false ? 
          fieldValue === condition.value : 
          String(fieldValue).toLowerCase() === String(condition.value).toLowerCase();
          
      case 'not_equals':
        return condition.caseSensitive !== false ? 
          fieldValue !== condition.value : 
          String(fieldValue).toLowerCase() !== String(condition.value).toLowerCase();
          
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
        
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
        
      case 'greater_than':
        return fieldValue > condition.value;
        
      case 'less_than':
        return fieldValue < condition.value;
        
      default:
        return false;
    }
  }

  /**
   * Evaluate time restrictions
   */
  private evaluateTimeRestrictions(context: AccessContext): boolean {
    // For now, always return true
    // Implementation would check current time against policy restrictions
    return true;
  }

  /**
   * Evaluate location restrictions
   */
  private evaluateLocationRestrictions(context: AccessContext): boolean {
    // For now, always return true
    // Implementation would check user location against policy restrictions
    return true;
  }

  /**
   * Evaluate device restrictions
   */
  private evaluateDeviceRestrictions(context: AccessContext): boolean {
    // Check basic device requirements
    return context.deviceTrusted;
  }

  /**
   * Evaluate MFA requirements
   */
  private evaluateMFARequirements(context: AccessContext, resource: DataResource): boolean {
    // Require MFA for restricted and top secret data
    if (resource.classification === DataClassification.RESTRICTED || 
        resource.classification === DataClassification.TOP_SECRET) {
      return context.mfaVerified;
    }
    
    return true;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(context: AccessContext, resource: DataResource, action: AccessType): number {
    let riskScore = 0;
    
    // Classification risk
    switch (resource.classification) {
      case DataClassification.TOP_SECRET:
        riskScore += 40;
        break;
      case DataClassification.RESTRICTED:
        riskScore += 30;
        break;
      case DataClassification.CONFIDENTIAL:
        riskScore += 20;
        break;
      case DataClassification.INTERNAL:
        riskScore += 10;
        break;
      case DataClassification.PUBLIC:
        riskScore += 0;
        break;
    }
    
    // Action risk
    switch (action) {
      case AccessType.DELETE:
        riskScore += 25;
        break;
      case AccessType.EXPORT:
        riskScore += 20;
        break;
      case AccessType.WRITE:
        riskScore += 15;
        break;
      case AccessType.SHARE:
        riskScore += 10;
        break;
      case AccessType.READ:
        riskScore += 5;
        break;
      case AccessType.ADMIN:
        riskScore += 30;
        break;
    }
    
    // Security factors
    if (!context.mfaVerified) riskScore += 15;
    if (!context.deviceTrusted) riskScore += 10;
    
    return Math.min(100, riskScore);
  }

  /**
   * Check if approval is required
   */
  private requiresApproval(
    context: AccessContext,
    resource: DataResource,
    action: AccessType,
    riskScore: number
  ): boolean {
    // High-risk actions require approval
    if (riskScore > 70) return true;
    
    // Certain actions always require approval
    if (action === AccessType.DELETE || action === AccessType.ADMIN) return true;
    
    // Top secret data requires approval
    if (resource.classification === DataClassification.TOP_SECRET) return true;
    
    return false;
  }

  /**
   * Log access attempt
   */
  private async logAccessAttempt(
    context: AccessContext,
    resource: DataResource,
    action: AccessType,
    decision: AccessDecision
  ): Promise<void> {
    const auditEvent: AccessAuditEvent = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: context.userId,
      tenantId: context.tenantId,
      resourceId: resource.id,
      action,
      decision: decision.decision,
      reason: decision.reason,
      riskScore: decision.metadata.riskScore,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      metadata: {
        matchedPolicies: decision.matchedPolicies,
        conditions: decision.conditions,
        evaluationTime: decision.metadata.evaluationTime,
      },
    };
    
    // Store in database
    await this.storeAuditEvent(auditEvent);
    
    this.emit('accessLogged', auditEvent);
  }

  /**
   * Helper methods for database operations
   */
  private async loadPolicies(): Promise<void> {
    const query = 'SELECT * FROM access_policies WHERE enabled = true';
    const result = await this.database.query(query);
    
    for (const row of result.rows) {
      const policy = this.rowToAccessPolicy(row);
      this.policies.set(policy.id, policy);
    }
  }

  private validatePolicy(policy: AccessPolicy): void {
    if (!policy.name || policy.name.trim().length === 0) {
      throw new Error('Policy name is required');
    }
    
    if (!policy.conditions || policy.conditions.length === 0) {
      throw new Error('Policy must have at least one condition');
    }
    
    if (!policy.actions || policy.actions.length === 0) {
      throw new Error('Policy must have at least one action');
    }
    
    if (policy.priority < 0 || policy.priority > 1000) {
      throw new Error('Policy priority must be between 0 and 1000');
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generatePolicyId(): string {
    return `pol_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateAuditId(): string {
    return `aud_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private calculateExpirationTime(urgency: AccessRequest['urgency']): Date {
    const now = new Date();
    switch (urgency) {
      case 'critical':
        return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      case 'high':
        return new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
      case 'medium':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case 'low':
        return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    }
  }

  // Database operation stubs - would be implemented with actual SQL
  private async storePolicyInDatabase(policy: AccessPolicy): Promise<void> {
    // Implementation would insert into access_policies table
  }

  private async updatePolicyInDatabase(policy: AccessPolicy): Promise<void> {
    // Implementation would update access_policies table
  }

  private async storeAccessRequest(request: AccessRequest): Promise<void> {
    // Implementation would insert into access_requests table
  }

  private async updateAccessRequest(request: AccessRequest): Promise<void> {
    // Implementation would update access_requests table
  }

  private async storeAuditEvent(event: AccessAuditEvent): Promise<void> {
    // Implementation would insert into access_audit_log table
  }

  private async notifyApprovers(request: AccessRequest): Promise<void> {
    // Implementation would send notifications to appropriate approvers
  }

  private async grantTemporaryAccess(request: AccessRequest): Promise<void> {
    // Implementation would create temporary access token or session
  }

  private rowToAccessPolicy(row: any): AccessPolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priority: row.priority,
      enabled: row.enabled,
      conditions: row.conditions,
      actions: row.actions,
      effect: row.effect,
      timeRestrictions: row.time_restrictions,
      locationRestrictions: row.location_restrictions,
      deviceRestrictions: row.device_restrictions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Express middleware for access control
export function accessControlMiddleware(accessControl: DataAccessControlService) {
  return async (req: Request, res: any, next: any) => {
    try {
      // Extract access context from request
      const context: AccessContext = {
        userId: (req as any).user?.id || 'anonymous',
        tenantId: (req as any).tenantContext?.tenant?.id || 'default',
        roles: (req as any).user?.roles || [],
        permissions: (req as any).user?.permissions || [],
        sessionId: (req as any).session?.id || 'no-session',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        mfaVerified: (req as any).user?.mfaVerified || false,
        deviceTrusted: (req as any).user?.deviceTrusted || false,
        accessTime: new Date(),
      };
      
      // Extract resource information (would be more sophisticated in practice)
      const resource: DataResource = {
        id: req.params.resourceId || 'unknown',
        type: req.params.resourceType || 'data',
        classification: DataClassification.INTERNAL,
        tenantId: context.tenantId,
        owner: 'system',
        tags: [],
        metadata: {},
        location: {
          region: 'us-east-1',
          jurisdiction: 'US',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Determine action from HTTP method
      const actionMap: Record<string, AccessType> = {
        'GET': AccessType.READ,
        'POST': AccessType.WRITE,
        'PUT': AccessType.WRITE,
        'PATCH': AccessType.WRITE,
        'DELETE': AccessType.DELETE,
      };
      
      const action = actionMap[req.method] || AccessType.READ;
      
      // Evaluate access
      const decision = await accessControl.evaluateAccess(context, resource, action);
      
      if (decision.decision === 'deny') {
        return res.status(403).json({
          error: 'Access denied',
          reason: decision.reason,
          riskScore: decision.metadata.riskScore,
        });
      }
      
      // Add access context to request for downstream use
      (req as any).accessContext = context;
      (req as any).accessDecision = decision;
      
      next();
      
    } catch (error) {
      console.error('Access control middleware error:', error);
      res.status(500).json({ error: 'Access control evaluation failed' });
    }
  };
}

// Export factory function
export const createAccessControlService = (database: Pool) => 
  new DataAccessControlService(database);