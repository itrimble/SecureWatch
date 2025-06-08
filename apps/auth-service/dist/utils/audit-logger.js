/**
 * Comprehensive Security Audit Logger for SecureWatch SIEM
 * Provides centralized audit logging for all security events
 */
import winston from 'winston';
export var SecurityEventType;
(function (SecurityEventType) {
    // Authentication events
    SecurityEventType["LOGIN_SUCCESS"] = "login_success";
    SecurityEventType["LOGIN_FAILURE"] = "login_failure";
    SecurityEventType["LOGOUT"] = "logout";
    SecurityEventType["SESSION_TIMEOUT"] = "session_timeout";
    // MFA events
    SecurityEventType["MFA_SETUP_INITIATED"] = "mfa_setup_initiated";
    SecurityEventType["MFA_SETUP_COMPLETED"] = "mfa_setup_completed";
    SecurityEventType["MFA_VERIFICATION_SUCCESS"] = "mfa_verification_success";
    SecurityEventType["MFA_VERIFICATION_FAILURE"] = "mfa_verification_failure";
    SecurityEventType["MFA_BACKUP_CODE_USED"] = "mfa_backup_code_used";
    // Authorization events
    SecurityEventType["AUTHORIZATION_SUCCESS"] = "authorization_success";
    SecurityEventType["AUTHORIZATION_FAILURE"] = "authorization_failure";
    SecurityEventType["PRIVILEGE_ESCALATION_ATTEMPT"] = "privilege_escalation_attempt";
    SecurityEventType["ROLE_ASSIGNMENT"] = "role_assignment";
    SecurityEventType["PERMISSION_GRANT"] = "permission_grant";
    SecurityEventType["PERMISSION_REVOKE"] = "permission_revoke";
    // API access events
    SecurityEventType["API_KEY_CREATED"] = "api_key_created";
    SecurityEventType["API_KEY_USED"] = "api_key_used";
    SecurityEventType["API_KEY_INVALID"] = "api_key_invalid";
    SecurityEventType["API_KEY_EXPIRED"] = "api_key_expired";
    SecurityEventType["API_KEY_REVOKED"] = "api_key_revoked";
    // Data access events
    SecurityEventType["DATA_ACCESS"] = "data_access";
    SecurityEventType["DATA_EXPORT"] = "data_export";
    SecurityEventType["DATA_MODIFICATION"] = "data_modification";
    SecurityEventType["DATA_DELETION"] = "data_deletion";
    SecurityEventType["SENSITIVE_DATA_ACCESS"] = "sensitive_data_access";
    // Query events
    SecurityEventType["QUERY_EXECUTED"] = "query_executed";
    SecurityEventType["QUERY_BLOCKED"] = "query_blocked";
    SecurityEventType["COMPLEX_QUERY_EXECUTED"] = "complex_query_executed";
    SecurityEventType["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
    // Multi-tenant events
    SecurityEventType["ORGANIZATION_ACCESS"] = "organization_access";
    SecurityEventType["CROSS_TENANT_ACCESS_ATTEMPT"] = "cross_tenant_access_attempt";
    SecurityEventType["ORGANIZATION_SWITCH"] = "organization_switch";
    // Security violations
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
    SecurityEventType["ANOMALOUS_BEHAVIOR"] = "anomalous_behavior";
    SecurityEventType["BRUTE_FORCE_ATTEMPT"] = "brute_force_attempt";
    SecurityEventType["IP_BLACKLIST_HIT"] = "ip_blacklist_hit";
    // Configuration changes
    SecurityEventType["SECURITY_CONFIG_CHANGE"] = "security_config_change";
    SecurityEventType["USER_CREATED"] = "user_created";
    SecurityEventType["USER_MODIFIED"] = "user_modified";
    SecurityEventType["USER_DELETED"] = "user_deleted";
    // Incident response
    SecurityEventType["SECURITY_INCIDENT_CREATED"] = "security_incident_created";
    SecurityEventType["SECURITY_ALERT_TRIGGERED"] = "security_alert_triggered";
    SecurityEventType["ALERT_ACKNOWLEDGED"] = "alert_acknowledged";
    SecurityEventType["INCIDENT_RESOLVED"] = "incident_resolved";
})(SecurityEventType || (SecurityEventType = {}));
export var SecurityEventCategory;
(function (SecurityEventCategory) {
    SecurityEventCategory["AUTHENTICATION"] = "authentication";
    SecurityEventCategory["AUTHORIZATION"] = "authorization";
    SecurityEventCategory["DATA_ACCESS"] = "data_access";
    SecurityEventCategory["SECURITY_VIOLATION"] = "security_violation";
    SecurityEventCategory["CONFIGURATION"] = "configuration";
    SecurityEventCategory["INCIDENT_RESPONSE"] = "incident_response";
    SecurityEventCategory["API_ACCESS"] = "api_access";
    SecurityEventCategory["QUERY_EXECUTION"] = "query_execution";
    SecurityEventCategory["MULTI_TENANT"] = "multi_tenant";
})(SecurityEventCategory || (SecurityEventCategory = {}));
class SecurityAuditLogger {
    logger;
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
            defaultMeta: { service: 'security-audit' },
            transports: [
                // Console output for development
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple())
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
    async logSecurityEvent(event) {
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
        }
        catch (error) {
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
    async logAuthEvent(params) {
        const event = {
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
    async logDataAccess(params) {
        const event = {
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
    async logQueryExecution(params) {
        const eventType = params.blocked
            ? SecurityEventType.QUERY_BLOCKED
            : params.complexityScore > 50
                ? SecurityEventType.COMPLEX_QUERY_EXECUTED
                : SecurityEventType.QUERY_EXECUTED;
        const event = {
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
    generateEventId() {
        return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Calculate risk score based on event type and context
     */
    calculateRiskScore(event) {
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
    getLogLevel(eventStatus, riskScore) {
        if (eventStatus === 'failure' || riskScore >= 70) {
            return 'error';
        }
        else if (eventStatus === 'warning' || riskScore >= 40) {
            return 'warn';
        }
        return 'info';
    }
    /**
     * Get event description based on type and status
     */
    getEventDescription(eventType, eventStatus) {
        const descriptions = {
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
    async getGeolocation(ipAddress) {
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
    async storeEventInDatabase(event) {
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
        }
        catch (error) {
            this.logger.error('Failed to store audit event in database', { error, eventId: event.eventId });
        }
    }
    /**
     * Check if event should trigger incident creation
     */
    async checkIncidentTriggers(event) {
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
    async checkAlertTriggers(event) {
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
    logSuccessfulAuth: (userId, organizationId, authMethod, ipAddress, userAgent) => securityAuditLogger.logAuthEvent({
        eventType: SecurityEventType.LOGIN_SUCCESS,
        eventStatus: 'success',
        userId,
        organizationId,
        authMethod: authMethod,
        ipAddress,
        userAgent
    }),
    /**
     * Log failed authentication
     */
    logFailedAuth: (username, authMethod, ipAddress, userAgent, reason) => securityAuditLogger.logAuthEvent({
        eventType: SecurityEventType.LOGIN_FAILURE,
        eventStatus: 'failure',
        username,
        authMethod: authMethod,
        ipAddress,
        userAgent,
        metadata: { failureReason: reason }
    }),
    /**
     * Log data access
     */
    logDataAccess: (userId, organizationId, resource, action, ipAddress) => securityAuditLogger.logDataAccess({
        userId,
        organizationId,
        resource,
        action,
        ipAddress
    })
};
//# sourceMappingURL=audit-logger.js.map