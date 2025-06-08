/**
 * Comprehensive Security Audit Logger for SecureWatch SIEM
 * Provides centralized audit logging for all security events
 */
export interface SecurityEvent {
    eventId: string;
    eventType: SecurityEventType;
    eventCategory: SecurityEventCategory;
    timestamp: Date;
    userId?: string;
    username?: string;
    userEmail?: string;
    sessionId?: string;
    organizationId?: string;
    authMethod?: 'password' | 'mfa' | 'api_key' | 'sso' | 'token';
    mfaMethod?: 'totp' | 'sms' | 'email' | 'backup_code';
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    endpoint?: string;
    httpMethod?: string;
    eventStatus: 'success' | 'failure' | 'warning' | 'info';
    eventDescription: string;
    resource?: string;
    action?: string;
    riskScore?: number;
    threatIndicators?: string[];
    geolocation?: {
        country?: string;
        region?: string;
        city?: string;
        coordinates?: [number, number];
    };
    metadata?: Record<string, any>;
    correlationId?: string;
    parentEventId?: string;
    sensitiveDataAccessed?: boolean;
    dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
    complianceFlags?: string[];
}
export declare enum SecurityEventType {
    LOGIN_SUCCESS = "login_success",
    LOGIN_FAILURE = "login_failure",
    LOGOUT = "logout",
    SESSION_TIMEOUT = "session_timeout",
    MFA_SETUP_INITIATED = "mfa_setup_initiated",
    MFA_SETUP_COMPLETED = "mfa_setup_completed",
    MFA_VERIFICATION_SUCCESS = "mfa_verification_success",
    MFA_VERIFICATION_FAILURE = "mfa_verification_failure",
    MFA_BACKUP_CODE_USED = "mfa_backup_code_used",
    AUTHORIZATION_SUCCESS = "authorization_success",
    AUTHORIZATION_FAILURE = "authorization_failure",
    PRIVILEGE_ESCALATION_ATTEMPT = "privilege_escalation_attempt",
    ROLE_ASSIGNMENT = "role_assignment",
    PERMISSION_GRANT = "permission_grant",
    PERMISSION_REVOKE = "permission_revoke",
    API_KEY_CREATED = "api_key_created",
    API_KEY_USED = "api_key_used",
    API_KEY_INVALID = "api_key_invalid",
    API_KEY_EXPIRED = "api_key_expired",
    API_KEY_REVOKED = "api_key_revoked",
    DATA_ACCESS = "data_access",
    DATA_EXPORT = "data_export",
    DATA_MODIFICATION = "data_modification",
    DATA_DELETION = "data_deletion",
    SENSITIVE_DATA_ACCESS = "sensitive_data_access",
    QUERY_EXECUTED = "query_executed",
    QUERY_BLOCKED = "query_blocked",
    COMPLEX_QUERY_EXECUTED = "complex_query_executed",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    ORGANIZATION_ACCESS = "organization_access",
    CROSS_TENANT_ACCESS_ATTEMPT = "cross_tenant_access_attempt",
    ORGANIZATION_SWITCH = "organization_switch",
    SUSPICIOUS_ACTIVITY = "suspicious_activity",
    ANOMALOUS_BEHAVIOR = "anomalous_behavior",
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt",
    IP_BLACKLIST_HIT = "ip_blacklist_hit",
    SECURITY_CONFIG_CHANGE = "security_config_change",
    USER_CREATED = "user_created",
    USER_MODIFIED = "user_modified",
    USER_DELETED = "user_deleted",
    SECURITY_INCIDENT_CREATED = "security_incident_created",
    SECURITY_ALERT_TRIGGERED = "security_alert_triggered",
    ALERT_ACKNOWLEDGED = "alert_acknowledged",
    INCIDENT_RESOLVED = "incident_resolved"
}
export declare enum SecurityEventCategory {
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    DATA_ACCESS = "data_access",
    SECURITY_VIOLATION = "security_violation",
    CONFIGURATION = "configuration",
    INCIDENT_RESPONSE = "incident_response",
    API_ACCESS = "api_access",
    QUERY_EXECUTION = "query_execution",
    MULTI_TENANT = "multi_tenant"
}
declare class SecurityAuditLogger {
    private logger;
    constructor();
    /**
     * Log a security event
     */
    logSecurityEvent(event: SecurityEvent): Promise<void>;
    /**
     * Log authentication events
     */
    logAuthEvent(params: {
        eventType: SecurityEventType;
        eventStatus: 'success' | 'failure';
        userId?: string;
        username?: string;
        authMethod?: 'password' | 'mfa' | 'api_key' | 'sso' | 'token';
        ipAddress?: string;
        userAgent?: string;
        organizationId?: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Log data access events
     */
    logDataAccess(params: {
        userId: string;
        organizationId: string;
        resource: string;
        action: string;
        sensitiveDataAccessed?: boolean;
        dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Log query execution events
     */
    logQueryExecution(params: {
        userId: string;
        organizationId: string;
        query: string;
        complexityScore: number;
        executionTime: number;
        resultCount: number;
        ipAddress?: string;
        blocked?: boolean;
        blockReason?: string;
    }): Promise<void>;
    /**
     * Generate unique event ID
     */
    private generateEventId;
    /**
     * Calculate risk score based on event type and context
     */
    private calculateRiskScore;
    /**
     * Get appropriate log level based on event status and risk score
     */
    private getLogLevel;
    /**
     * Get event description based on type and status
     */
    private getEventDescription;
    /**
     * Get geolocation for IP address (placeholder implementation)
     */
    private getGeolocation;
    /**
     * Store security event in database for persistence
     */
    private storeEventInDatabase;
    /**
     * Check if event should trigger incident creation
     */
    private checkIncidentTriggers;
    /**
     * Check if event should trigger real-time alerts
     */
    private checkAlertTriggers;
}
export declare const securityAuditLogger: SecurityAuditLogger;
export declare const AuditHelpers: {
    /**
     * Log successful authentication
     */
    logSuccessfulAuth: (userId: string, organizationId: string, authMethod: string, ipAddress: string, userAgent: string) => Promise<void>;
    /**
     * Log failed authentication
     */
    logFailedAuth: (username: string, authMethod: string, ipAddress: string, userAgent: string, reason: string) => Promise<void>;
    /**
     * Log data access
     */
    logDataAccess: (userId: string, organizationId: string, resource: string, action: string, ipAddress: string) => Promise<void>;
};
export {};
//# sourceMappingURL=audit-logger.d.ts.map