/**
 * Comprehensive Security Audit Logger for SecureWatch SIEM
 * Provides centralized audit logging for all security events
 */

import winston from 'winston';
import { DatabaseService } from '../services/database.service';

export interface SecurityEvent {
  // Core identification
  eventId: string;
  eventType: SecurityEventType;
  eventCategory: SecurityEventCategory;
  timestamp: Date;
  
  // User context
  userId?: string;
  username?: string;
  userEmail?: string;
  sessionId?: string;
  organizationId?: string;
  
  // Authentication context
  authMethod?: 'password' | 'mfa' | 'api_key' | 'sso' | 'token';
  mfaMethod?: 'totp' | 'sms' | 'email' | 'backup_code';
  
  // Request context
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  httpMethod?: string;
  
  // Event details
  eventStatus: 'success' | 'failure' | 'warning' | 'info';
  eventDescription: string;
  resource?: string;
  action?: string;
  
  // Security context
  riskScore?: number;
  threatIndicators?: string[];
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
  
  // Additional metadata
  metadata?: Record<string, any>;
  correlationId?: string;
  parentEventId?: string;
  
  // Compliance fields
  sensitiveDataAccessed?: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceFlags?: string[];
}

export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_TIMEOUT = 'session_timeout',
  
  // MFA events
  MFA_SETUP_INITIATED = 'mfa_setup_initiated',
  MFA_SETUP_COMPLETED = 'mfa_setup_completed',
  MFA_VERIFICATION_SUCCESS = 'mfa_verification_success',
  MFA_VERIFICATION_FAILURE = 'mfa_verification_failure',
  MFA_BACKUP_CODE_USED = 'mfa_backup_code_used',
  
  // Authorization events
  AUTHORIZATION_SUCCESS = 'authorization_success',
  AUTHORIZATION_FAILURE = 'authorization_failure',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
  ROLE_ASSIGNMENT = 'role_assignment',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  
  // API access events
  API_KEY_CREATED = 'api_key_created',
  API_KEY_USED = 'api_key_used',
  API_KEY_INVALID = 'api_key_invalid',
  API_KEY_EXPIRED = 'api_key_expired',
  API_KEY_REVOKED = 'api_key_revoked',
  
  // Data access events
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  
  // Query events
  QUERY_EXECUTED = 'query_executed',
  QUERY_BLOCKED = 'query_blocked',
  COMPLEX_QUERY_EXECUTED = 'complex_query_executed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Multi-tenant events
  ORGANIZATION_ACCESS = 'organization_access',
  CROSS_TENANT_ACCESS_ATTEMPT = 'cross_tenant_access_attempt',
  ORGANIZATION_SWITCH = 'organization_switch',
  
  // Security violations
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  IP_BLACKLIST_HIT = 'ip_blacklist_hit',
  
  // Configuration changes
  SECURITY_CONFIG_CHANGE = 'security_config_change',
  USER_CREATED = 'user_created',
  USER_MODIFIED = 'user_modified',
  USER_DELETED = 'user_deleted',
  
  // Incident response
  SECURITY_INCIDENT_CREATED = 'security_incident_created',
  SECURITY_ALERT_TRIGGERED = 'security_alert_triggered',
  ALERT_ACKNOWLEDGED = 'alert_acknowledged',
  INCIDENT_RESOLVED = 'incident_resolved'
}

export enum SecurityEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  SECURITY_VIOLATION = 'security_violation',
  CONFIGURATION = 'configuration',
  INCIDENT_RESPONSE = 'incident_response',
  API_ACCESS = 'api_access',
  QUERY_EXECUTION = 'query_execution',
  MULTI_TENANT = 'multi_tenant'
}

class SecurityAuditLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'security-audit' },
      transports: [
        // Console output for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // File output for security audit trail
        new winston.transports.File({
          filename: '/tmp/security-audit.log',
          format: winston.format.json(),
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
          tailable: true
        }),
        // Critical security events file
        new winston.transports.File({
          filename: '/tmp/security-critical.log',
          level: 'error',
          format: winston.format.json()
        })
      ]
    });
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Generate event ID if not provided
      if (!event.eventId) {
        event.eventId = this.generateEventId();
      }

      // Ensure timestamp is set
      if (!event.timestamp) {
        event.timestamp = new Date();
      }

      // Calculate risk score if not provided
      if (event.riskScore === undefined) {
        event.riskScore = this.calculateRiskScore(event);
      }

      // Add geolocation if IP address is provided
      if (event.ipAddress && !event.geolocation) {
        event.geolocation = await this.getGeolocation(event.ipAddress);
      }

      // Log to Winston
      const logLevel = this.getLogLevel(event.eventStatus, event.riskScore);
      this.logger.log(logLevel, 'Security Event', {
        securityEvent: event,
        timestamp: event.timestamp.toISOString(),
        eventId: event.eventId
      });

      // Store in database for persistence and analysis
      await this.storeEventInDatabase(event);

      // Check for incident creation triggers
      await this.checkIncidentTriggers(event);

      // Check for real-time alerting
      await this.checkAlertTriggers(event);

    } catch (error) {
      // Ensure audit logging failures don't break the application
      this.logger.error('Failed to log security event', {
        error: error instanceof Error ? error.message : String(error),
        originalEvent: event
      });
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(params: {
    eventType: SecurityEventType;
    eventStatus: 'success' | 'failure';
    userId?: string;
    username?: string;
    authMethod?: 'password' | 'mfa' | 'api_key' | 'sso' | 'token';
    ipAddress?: string;
    userAgent?: string;
    organizationId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: SecurityEvent = {
      eventId: this.generateEventId(),
      eventType: params.eventType,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      timestamp: new Date(),
      eventStatus: params.eventStatus,
      eventDescription: this.getEventDescription(params.eventType, params.eventStatus),
      userId: params.userId,
      username: params.username,
      authMethod: params.authMethod,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      organizationId: params.organizationId,
      metadata: params.metadata
    };

    await this.logSecurityEvent(event);
  }

  /**
   * Log data access events
   */
  async logDataAccess(params: {
    userId: string;
    organizationId: string;
    resource: string;
    action: string;
    sensitiveDataAccessed?: boolean;
    dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: SecurityEvent = {
      eventId: this.generateEventId(),
      eventType: params.sensitiveDataAccessed 
        ? SecurityEventType.SENSITIVE_DATA_ACCESS 
        : SecurityEventType.DATA_ACCESS,
      eventCategory: SecurityEventCategory.DATA_ACCESS,
      timestamp: new Date(),
      eventStatus: 'success',
      eventDescription: `Data ${params.action} on ${params.resource}`,
      userId: params.userId,
      organizationId: params.organizationId,
      resource: params.resource,
      action: params.action,
      sensitiveDataAccessed: params.sensitiveDataAccessed,
      dataClassification: params.dataClassification,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata
    };

    await this.logSecurityEvent(event);
  }

  /**
   * Log query execution events
   */
  async logQueryExecution(params: {
    userId: string;
    organizationId: string;
    query: string;
    complexityScore: number;
    executionTime: number;
    resultCount: number;
    ipAddress?: string;
    blocked?: boolean;
    blockReason?: string;
  }): Promise<void> {
    const eventType = params.blocked 
      ? SecurityEventType.QUERY_BLOCKED
      : params.complexityScore > 50
      ? SecurityEventType.COMPLEX_QUERY_EXECUTED
      : SecurityEventType.QUERY_EXECUTED;

    const event: SecurityEvent = {
      eventId: this.generateEventId(),
      eventType,
      eventCategory: SecurityEventCategory.QUERY_EXECUTION,
      timestamp: new Date(),
      eventStatus: params.blocked ? 'failure' : 'success',
      eventDescription: params.blocked 
        ? `Query blocked: ${params.blockReason}`
        : `Query executed with complexity score ${params.complexityScore}`,
      userId: params.userId,
      organizationId: params.organizationId,
      ipAddress: params.ipAddress,
      metadata: {
        query: params.query.substring(0, 500) + (params.query.length > 500 ? '...' : ''),
        complexityScore: params.complexityScore,
        executionTime: params.executionTime,
        resultCount: params.resultCount,
        blocked: params.blocked,
        blockReason: params.blockReason
      }
    };

    await this.logSecurityEvent(event);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate risk score based on event type and context
   */
  private calculateRiskScore(event: SecurityEvent): number {
    let score = 0;

    // Base score by event type
    switch (event.eventType) {
      case SecurityEventType.LOGIN_FAILURE:
      case SecurityEventType.MFA_VERIFICATION_FAILURE:
        score += 30;
        break;
      case SecurityEventType.AUTHORIZATION_FAILURE:
      case SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT:
        score += 60;
        break;
      case SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT:
      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
        score += 80;
        break;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        score += 90;
        break;
      default:
        score += 10;
    }

    // Increase score for failure events
    if (event.eventStatus === 'failure') {
      score += 20;
    }

    // Increase score for sensitive data access
    if (event.sensitiveDataAccessed) {
      score += 30;
    }

    // Increase score based on data classification
    switch (event.dataClassification) {
      case 'confidential':
        score += 20;
        break;
      case 'restricted':
        score += 40;
        break;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get appropriate log level based on event status and risk score
   */
  private getLogLevel(eventStatus: string, riskScore: number): string {
    if (eventStatus === 'failure' || riskScore >= 70) {
      return 'error';
    } else if (eventStatus === 'warning' || riskScore >= 40) {
      return 'warn';
    }
    return 'info';
  }

  /**
   * Get event description based on type and status
   */
  private getEventDescription(eventType: SecurityEventType, eventStatus: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      [SecurityEventType.LOGIN_SUCCESS]: {
        success: 'User successfully logged in',
        failure: 'User login failed'
      },
      [SecurityEventType.LOGIN_FAILURE]: {
        failure: 'User login attempt failed'
      },
      [SecurityEventType.MFA_VERIFICATION_SUCCESS]: {
        success: 'MFA verification successful'
      },
      [SecurityEventType.MFA_VERIFICATION_FAILURE]: {
        failure: 'MFA verification failed'
      },
      [SecurityEventType.API_KEY_USED]: {
        success: 'API key authentication successful',
        failure: 'API key authentication failed'
      }
    };

    return descriptions[eventType]?.[eventStatus] || `${eventType} - ${eventStatus}`;
  }

  /**
   * Get geolocation for IP address (placeholder implementation)
   */
  private async getGeolocation(ipAddress: string): Promise<{ country?: string; region?: string; city?: string }> {
    // In production, integrate with a geolocation service like MaxMind GeoIP2
    // For now, return placeholder data
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('127.')) {
      return { country: 'Local', region: 'Private Network', city: 'Internal' };
    }
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
  }

  /**
   * Store security event in database for persistence
   */
  private async storeEventInDatabase(event: SecurityEvent): Promise<void> {
    try {
      // Use DatabaseService to store audit events
      // This would require a security_audit_log table
      const auditRecord = {
        event_id: event.eventId,
        event_type: event.eventType,
        event_category: event.eventCategory,
        timestamp: event.timestamp,
        user_id: event.userId,
        organization_id: event.organizationId,
        event_status: event.eventStatus,
        event_description: event.eventDescription,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        risk_score: event.riskScore,
        metadata: JSON.stringify(event.metadata || {}),
        created_at: new Date()
      };

      // In a real implementation, this would insert into the audit log table
      // await DatabaseService.insertAuditRecord(auditRecord);
      
    } catch (error) {
      this.logger.error('Failed to store audit event in database', { error, eventId: event.eventId });
    }
  }

  /**
   * Check if event should trigger incident creation
   */
  private async checkIncidentTriggers(event: SecurityEvent): Promise<void> {
    // High-risk events that should create incidents
    const incidentTriggers = [
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT,
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
      SecurityEventType.SUSPICIOUS_ACTIVITY
    ];

    if (incidentTriggers.includes(event.eventType) || (event.riskScore && event.riskScore >= 80)) {
      // Create security incident (would integrate with incident management system)
      this.logger.error('High-risk security event detected - incident should be created', {
        eventId: event.eventId,
        eventType: event.eventType,
        riskScore: event.riskScore
      });
    }
  }

  /**
   * Check if event should trigger real-time alerts
   */
  private async checkAlertTriggers(event: SecurityEvent): Promise<void> {
    // Events that require immediate alerting
    const alertTriggers = [
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecurityEventType.CROSS_TENANT_ACCESS_ATTEMPT,
      SecurityEventType.BRUTE_FORCE_ATTEMPT
    ];

    if (alertTriggers.includes(event.eventType)) {
      // Send real-time alert (would integrate with alerting system)
      this.logger.warn('Real-time security alert triggered', {
        eventId: event.eventId,
        eventType: event.eventType,
        riskScore: event.riskScore
      });
    }
  }
}

// Export singleton instance
export const securityAuditLogger = new SecurityAuditLogger();

// Export helper functions for common audit scenarios
export const AuditHelpers = {
  /**
   * Log successful authentication
   */
  logSuccessfulAuth: (userId: string, organizationId: string, authMethod: string, ipAddress: string, userAgent: string) =>
    securityAuditLogger.logAuthEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      eventStatus: 'success',
      userId,
      organizationId,
      authMethod: authMethod as any,
      ipAddress,
      userAgent
    }),

  /**
   * Log failed authentication
   */
  logFailedAuth: (username: string, authMethod: string, ipAddress: string, userAgent: string, reason: string) =>
    securityAuditLogger.logAuthEvent({
      eventType: SecurityEventType.LOGIN_FAILURE,
      eventStatus: 'failure',
      username,
      authMethod: authMethod as any,
      ipAddress,
      userAgent,
      metadata: { failureReason: reason }
    }),

  /**
   * Log data access
   */
  logDataAccess: (userId: string, organizationId: string, resource: string, action: string, ipAddress: string) =>
    securityAuditLogger.logDataAccess({
      userId,
      organizationId,
      resource,
      action,
      ipAddress
    })
};