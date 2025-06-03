/**
 * SecureWatch Audit Logging Service
 * Comprehensive audit trail for all system operations
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { ElasticsearchClient } from '@elastic/elasticsearch';
import { Request } from 'express';
import { performance } from 'perf_hooks';

// Audit Event Types
export enum AuditEventType {
  // Authentication Events
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_FAILED = 'auth.failed',
  AUTH_TOKEN_ISSUED = 'auth.token_issued',
  AUTH_TOKEN_REVOKED = 'auth.token_revoked',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_MFA_DISABLED = 'auth.mfa_disabled',
  AUTH_PASSWORD_CHANGED = 'auth.password_changed',
  
  // Authorization Events
  AUTHZ_PERMISSION_GRANTED = 'authz.permission_granted',
  AUTHZ_PERMISSION_DENIED = 'authz.permission_denied',
  AUTHZ_ROLE_ASSIGNED = 'authz.role_assigned',
  AUTHZ_ROLE_REMOVED = 'authz.role_removed',
  
  // Data Access Events
  DATA_READ = 'data.read',
  DATA_WRITE = 'data.write',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',
  
  // Configuration Changes
  CONFIG_CREATED = 'config.created',
  CONFIG_UPDATED = 'config.updated',
  CONFIG_DELETED = 'config.deleted',
  
  // System Events
  SYSTEM_START = 'system.start',
  SYSTEM_STOP = 'system.stop',
  SYSTEM_ERROR = 'system.error',
  SYSTEM_MAINTENANCE = 'system.maintenance',
  
  // Security Events
  SECURITY_ALERT_CREATED = 'security.alert_created',
  SECURITY_ALERT_ACKNOWLEDGED = 'security.alert_acknowledged',
  SECURITY_ALERT_RESOLVED = 'security.alert_resolved',
  SECURITY_THREAT_DETECTED = 'security.threat_detected',
  SECURITY_SCAN_COMPLETED = 'security.scan_completed',
  
  // Administrative Events
  ADMIN_USER_CREATED = 'admin.user_created',
  ADMIN_USER_UPDATED = 'admin.user_updated',
  ADMIN_USER_DELETED = 'admin.user_deleted',
  ADMIN_TENANT_CREATED = 'admin.tenant_created',
  ADMIN_TENANT_UPDATED = 'admin.tenant_updated',
  ADMIN_TENANT_DELETED = 'admin.tenant_deleted',
  
  // API Events
  API_REQUEST = 'api.request',
  API_RESPONSE = 'api.response',
  API_ERROR = 'api.error',
  API_RATE_LIMITED = 'api.rate_limited',
  
  // Agent Events
  AGENT_CONNECTED = 'agent.connected',
  AGENT_DISCONNECTED = 'agent.disconnected',
  AGENT_REGISTERED = 'agent.registered',
  AGENT_UNREGISTERED = 'agent.unregistered',
  AGENT_CONFIG_UPDATED = 'agent.config_updated',
  
  // Compliance Events
  COMPLIANCE_REPORT_GENERATED = 'compliance.report_generated',
  COMPLIANCE_VIOLATION_DETECTED = 'compliance.violation_detected',
  COMPLIANCE_POLICY_UPDATED = 'compliance.policy_updated'
}

// Audit Severity Levels
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Audit Event Interface
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  actor: {
    id: string;
    type: 'user' | 'system' | 'agent' | 'api';
    name?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
  };
  resource?: {
    type: string;
    id: string;
    name?: string;
    attributes?: Record<string, any>;
  };
  context: {
    tenantId?: string;
    sessionId?: string;
    requestId?: string;
    correlationId?: string;
    service?: string;
    environment?: string;
    region?: string;
  };
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'unknown';
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

// Audit Configuration
export interface AuditConfig {
  serviceName: string;
  environment: string;
  storage: {
    database?: Pool;
    elasticsearch?: ElasticsearchClient;
    enableDatabase?: boolean;
    enableElasticsearch?: boolean;
    enableConsole?: boolean;
    retention?: {
      days: number;
      archiveEnabled: boolean;
    };
  };
  filtering?: {
    includeTypes?: AuditEventType[];
    excludeTypes?: AuditEventType[];
    minSeverity?: AuditSeverity;
  };
  compliance?: {
    pci?: boolean;
    hipaa?: boolean;
    gdpr?: boolean;
    sox?: boolean;
  };
}

// Audit Query Options
export interface AuditQueryOptions {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  actorId?: string;
  resourceId?: string;
  tenantId?: string;
  severity?: AuditSeverity;
  outcome?: 'success' | 'failure';
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export class AuditLoggingService extends EventEmitter {
  private config: AuditConfig;
  private buffer: AuditEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private severityPriority = {
    [AuditSeverity.INFO]: 0,
    [AuditSeverity.WARNING]: 1,
    [AuditSeverity.ERROR]: 2,
    [AuditSeverity.CRITICAL]: 3,
  };

  constructor(config: AuditConfig) {
    super();
    this.config = config;
    this.startBufferFlush();
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Apply filtering
    if (!this.shouldLogEvent(auditEvent)) {
      return;
    }

    // Add to buffer
    this.buffer.push(auditEvent);

    // Emit event for real-time processing
    this.emit('auditEvent', auditEvent);

    // Log critical events immediately
    if (auditEvent.severity === AuditSeverity.CRITICAL) {
      await this.flushBuffer();
    }
  }

  /**
   * Create audit event from HTTP request
   */
  createEventFromRequest(
    req: Request,
    eventType: AuditEventType,
    details: Record<string, any> = {}
  ): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      eventType,
      severity: AuditSeverity.INFO,
      actor: {
        id: (req as any).user?.id || 'anonymous',
        type: 'user',
        name: (req as any).user?.name,
        email: (req as any).user?.email,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
      resource: details.resource,
      context: {
        tenantId: (req as any).tenantContext?.tenant?.id,
        sessionId: (req as any).session?.id,
        requestId: (req as any).id,
        service: this.config.serviceName,
        environment: this.config.environment,
      },
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
        ...details,
      },
      outcome: 'unknown',
    };
  }

  /**
   * Log authentication event
   */
  async logAuth(
    type: AuditEventType,
    actor: AuditEvent['actor'],
    outcome: AuditEvent['outcome'],
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      eventType: type,
      severity: outcome === 'failure' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      actor,
      context: {
        service: this.config.serviceName,
        environment: this.config.environment,
      },
      details,
      outcome,
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    operation: 'read' | 'write' | 'delete' | 'export' | 'import',
    actor: AuditEvent['actor'],
    resource: AuditEvent['resource'],
    details: Record<string, any> = {}
  ): Promise<void> {
    const eventTypeMap = {
      read: AuditEventType.DATA_READ,
      write: AuditEventType.DATA_WRITE,
      delete: AuditEventType.DATA_DELETE,
      export: AuditEventType.DATA_EXPORT,
      import: AuditEventType.DATA_IMPORT,
    };

    await this.log({
      eventType: eventTypeMap[operation],
      severity: AuditSeverity.INFO,
      actor,
      resource,
      context: {
        service: this.config.serviceName,
        environment: this.config.environment,
      },
      details: {
        operation,
        ...details,
      },
      outcome: 'success',
    });
  }

  /**
   * Log security event
   */
  async logSecurity(
    type: AuditEventType,
    severity: AuditSeverity,
    actor: AuditEvent['actor'],
    details: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType: type,
      severity,
      actor,
      context: {
        service: this.config.serviceName,
        environment: this.config.environment,
      },
      details,
      outcome: 'success',
    });
  }

  /**
   * Query audit events
   */
  async query(options: AuditQueryOptions): Promise<AuditEvent[]> {
    if (this.config.storage.enableElasticsearch && this.config.storage.elasticsearch) {
      return this.queryElasticsearch(options);
    } else if (this.config.storage.enableDatabase && this.config.storage.database) {
      return this.queryDatabase(options);
    } else {
      throw new Error('No storage backend configured for queries');
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    regulations: string[] = []
  ): Promise<any> {
    const events = await this.query({
      startDate,
      endDate,
      sortBy: 'timestamp',
      sortOrder: 'asc',
    });

    const report = {
      period: { start: startDate, end: endDate },
      totalEvents: events.length,
      eventsByType: this.groupEventsByType(events),
      eventsBySeverity: this.groupEventsBySeverity(events),
      securityEvents: events.filter(e => e.eventType.startsWith('security.')),
      failedAuthentications: events.filter(
        e => e.eventType === AuditEventType.AUTH_FAILED
      ),
      dataAccessEvents: events.filter(e => e.eventType.startsWith('data.')),
      administrativeChanges: events.filter(e => e.eventType.startsWith('admin.')),
      compliance: {
        pci: regulations.includes('pci') ? this.checkPCICompliance(events) : null,
        hipaa: regulations.includes('hipaa') ? this.checkHIPAACompliance(events) : null,
        gdpr: regulations.includes('gdpr') ? this.checkGDPRCompliance(events) : null,
        sox: regulations.includes('sox') ? this.checkSOXCompliance(events) : null,
      },
    };

    // Log the report generation
    await this.log({
      eventType: AuditEventType.COMPLIANCE_REPORT_GENERATED,
      severity: AuditSeverity.INFO,
      actor: {
        id: 'system',
        type: 'system',
      },
      details: {
        reportType: 'compliance',
        regulations,
        eventCount: events.length,
      },
      outcome: 'success',
    });

    return report;
  }

  /**
   * Start buffer flush interval
   */
  private startBufferFlush(): void {
    this.bufferFlushInterval = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flushBuffer();
      }
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush buffer to storage
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      // Store in multiple backends concurrently
      const promises: Promise<void>[] = [];

      if (this.config.storage.enableDatabase && this.config.storage.database) {
        promises.push(this.storeInDatabase(events));
      }

      if (this.config.storage.enableElasticsearch && this.config.storage.elasticsearch) {
        promises.push(this.storeInElasticsearch(events));
      }

      if (this.config.storage.enableConsole) {
        events.forEach(event => {
          console.log(JSON.stringify({
            ...event,
            _service: 'audit',
            _index: 'securewatch-audit',
          }));
        });
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to flush audit buffer:', error);
      // Re-add events to buffer for retry
      this.buffer.unshift(...events);
    }
  }

  /**
   * Store events in database
   */
  private async storeInDatabase(events: AuditEvent[]): Promise<void> {
    const pool = this.config.storage.database!;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const event of events) {
        await client.query(
          `INSERT INTO audit_events (
            id, timestamp, event_type, severity, actor_id, actor_type,
            actor_name, actor_ip, resource_type, resource_id, resource_name,
            tenant_id, session_id, request_id, service, environment,
            details, outcome, duration, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            event.id,
            event.timestamp,
            event.eventType,
            event.severity,
            event.actor.id,
            event.actor.type,
            event.actor.name,
            event.actor.ip,
            event.resource?.type,
            event.resource?.id,
            event.resource?.name,
            event.context.tenantId,
            event.context.sessionId,
            event.context.requestId,
            event.context.service,
            event.context.environment,
            JSON.stringify(event.details),
            event.outcome,
            event.duration,
            event.metadata ? JSON.stringify(event.metadata) : null,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store events in Elasticsearch
   */
  private async storeInElasticsearch(events: AuditEvent[]): Promise<void> {
    const client = this.config.storage.elasticsearch!;
    
    const body = events.flatMap(event => [
      { index: { _index: 'securewatch-audit', _id: event.id } },
      event,
    ]);

    await client.bulk({ body });
  }

  /**
   * Query events from database
   */
  private async queryDatabase(options: AuditQueryOptions): Promise<AuditEvent[]> {
    const pool = this.config.storage.database!;
    
    let query = 'SELECT * FROM audit_events WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options.startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      query += ` AND event_type = ANY($${paramIndex++})`;
      params.push(options.eventTypes);
    }

    if (options.actorId) {
      query += ` AND actor_id = $${paramIndex++}`;
      params.push(options.actorId);
    }

    if (options.tenantId) {
      query += ` AND tenant_id = $${paramIndex++}`;
      params.push(options.tenantId);
    }

    if (options.severity) {
      query += ` AND severity = $${paramIndex++}`;
      params.push(options.severity);
    }

    if (options.outcome) {
      query += ` AND outcome = $${paramIndex++}`;
      params.push(options.outcome);
    }

    // Sorting
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => this.rowToAuditEvent(row));
  }

  /**
   * Query events from Elasticsearch
   */
  private async queryElasticsearch(options: AuditQueryOptions): Promise<AuditEvent[]> {
    const client = this.config.storage.elasticsearch!;
    
    const must: any[] = [];

    if (options.startDate || options.endDate) {
      must.push({
        range: {
          timestamp: {
            ...(options.startDate && { gte: options.startDate }),
            ...(options.endDate && { lte: options.endDate }),
          },
        },
      });
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      must.push({ terms: { eventType: options.eventTypes } });
    }

    if (options.actorId) {
      must.push({ term: { 'actor.id': options.actorId } });
    }

    if (options.tenantId) {
      must.push({ term: { 'context.tenantId': options.tenantId } });
    }

    if (options.severity) {
      must.push({ term: { severity: options.severity } });
    }

    if (options.outcome) {
      must.push({ term: { outcome: options.outcome } });
    }

    const response = await client.search({
      index: 'securewatch-audit',
      body: {
        query: { bool: { must } },
        sort: [{ [options.sortBy || 'timestamp']: options.sortOrder || 'desc' }],
        size: options.limit || 100,
        from: options.offset || 0,
      },
    });

    return response.hits.hits.map((hit: any) => hit._source as AuditEvent);
  }

  /**
   * Convert database row to audit event
   */
  private rowToAuditEvent(row: any): AuditEvent {
    return {
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      severity: row.severity,
      actor: {
        id: row.actor_id,
        type: row.actor_type,
        name: row.actor_name,
        ip: row.actor_ip,
      },
      resource: row.resource_type ? {
        type: row.resource_type,
        id: row.resource_id,
        name: row.resource_name,
      } : undefined,
      context: {
        tenantId: row.tenant_id,
        sessionId: row.session_id,
        requestId: row.request_id,
        service: row.service,
        environment: row.environment,
      },
      details: row.details,
      outcome: row.outcome,
      duration: row.duration,
      metadata: row.metadata,
    };
  }

  /**
   * Should log event based on filtering
   */
  private shouldLogEvent(event: AuditEvent): boolean {
    const filtering = this.config.filtering;
    if (!filtering) return true;

    // Check event type filters
    if (filtering.includeTypes && !filtering.includeTypes.includes(event.eventType)) {
      return false;
    }

    if (filtering.excludeTypes && filtering.excludeTypes.includes(event.eventType)) {
      return false;
    }

    // Check severity filter
    if (filtering.minSeverity) {
      const minPriority = this.severityPriority[filtering.minSeverity];
      const eventPriority = this.severityPriority[event.severity];
      if (eventPriority < minPriority) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Group events by type
   */
  private groupEventsByType(events: AuditEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Group events by severity
   */
  private groupEventsBySeverity(events: AuditEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Check PCI compliance
   */
  private checkPCICompliance(events: AuditEvent[]): any {
    return {
      passwordChanges: events.filter(
        e => e.eventType === AuditEventType.AUTH_PASSWORD_CHANGED
      ).length,
      failedLogins: events.filter(
        e => e.eventType === AuditEventType.AUTH_FAILED
      ).length,
      privilegedAccess: events.filter(
        e => e.actor.type === 'user' && e.eventType.startsWith('admin.')
      ).length,
      dataAccess: events.filter(
        e => e.eventType.startsWith('data.')
      ).length,
    };
  }

  /**
   * Check HIPAA compliance
   */
  private checkHIPAACompliance(events: AuditEvent[]): any {
    return {
      phiAccess: events.filter(
        e => e.eventType === AuditEventType.DATA_READ && e.resource?.type === 'phi'
      ).length,
      userAuthentication: events.filter(
        e => e.eventType === AuditEventType.AUTH_LOGIN
      ).length,
      dataModification: events.filter(
        e => e.eventType === AuditEventType.DATA_WRITE || e.eventType === AuditEventType.DATA_DELETE
      ).length,
    };
  }

  /**
   * Check GDPR compliance
   */
  private checkGDPRCompliance(events: AuditEvent[]): any {
    return {
      dataExports: events.filter(
        e => e.eventType === AuditEventType.DATA_EXPORT
      ).length,
      dataDeletion: events.filter(
        e => e.eventType === AuditEventType.DATA_DELETE
      ).length,
      consentEvents: events.filter(
        e => e.details.consentRelated === true
      ).length,
    };
  }

  /**
   * Check SOX compliance
   */
  private checkSOXCompliance(events: AuditEvent[]): any {
    return {
      financialDataAccess: events.filter(
        e => e.resource?.type === 'financial'
      ).length,
      configurationChanges: events.filter(
        e => e.eventType.startsWith('config.')
      ).length,
      privilegedActions: events.filter(
        e => e.eventType.startsWith('admin.')
      ).length,
    };
  }

  /**
   * Cleanup old audit events
   */
  async cleanup(): Promise<void> {
    if (!this.config.storage.retention) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.storage.retention.days);

    if (this.config.storage.enableDatabase && this.config.storage.database) {
      await this.config.storage.database.query(
        'DELETE FROM audit_events WHERE timestamp < $1',
        [cutoffDate]
      );
    }

    if (this.config.storage.enableElasticsearch && this.config.storage.elasticsearch) {
      await this.config.storage.elasticsearch.deleteByQuery({
        index: 'securewatch-audit',
        body: {
          query: {
            range: {
              timestamp: {
                lt: cutoffDate,
              },
            },
          },
        },
      });
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    await this.flushBuffer();
  }
}

// Express middleware for audit logging
export function auditLoggingMiddleware(auditService: AuditLoggingService) {
  return async (req: Request, res: any, next: any) => {
    const startTime = performance.now();
    const originalSend = res.send;

    // Create initial audit context
    const auditContext = auditService.createEventFromRequest(
      req,
      AuditEventType.API_REQUEST,
      {
        body: req.body,
        headers: req.headers,
      }
    );

    // Override res.send to capture response
    res.send = function(data: any) {
      const duration = performance.now() - startTime;
      
      // Log the complete request/response cycle
      auditService.log({
        ...auditContext,
        eventType: res.statusCode >= 400 ? AuditEventType.API_ERROR : AuditEventType.API_RESPONSE,
        severity: res.statusCode >= 500 ? AuditSeverity.ERROR : 
                  res.statusCode >= 400 ? AuditSeverity.WARNING : 
                  AuditSeverity.INFO,
        details: {
          ...auditContext.details,
          statusCode: res.statusCode,
          responseSize: Buffer.byteLength(data),
        },
        outcome: res.statusCode < 400 ? 'success' : 'failure',
        duration,
      }).catch(err => {
        console.error('Failed to log audit event:', err);
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

// Export factory function
export function createAuditLogger(config: AuditConfig): AuditLoggingService {
  return new AuditLoggingService(config);
}