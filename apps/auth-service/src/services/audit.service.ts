import { Pool } from 'pg';

export interface AuditEvent {
  id?: string;
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  success: boolean;
}

export class AuditService {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async logEvent(event: AuditEvent): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, resource, details, ip_address, 
        user_agent, timestamp, success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      event.userId || null,
      event.action,
      event.resource,
      event.details ? JSON.stringify(event.details) : null,
      event.ipAddress || null,
      event.userAgent || null,
      event.timestamp || new Date(),
      event.success
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      // Log to console if database logging fails
      console.error('Failed to log audit event:', error);
      console.error('Event:', event);
    }
  }

  async logLogin(userId: string, success: boolean, ipAddress?: string, userAgent?: string, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      userId,
      action: 'LOGIN',
      resource: 'auth',
      details,
      ipAddress,
      userAgent,
      success
    });
  }

  async logLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress,
      userAgent,
      success: true
    });
  }

  async logPasswordChange(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'PASSWORD_CHANGE',
      resource: 'user',
      ipAddress,
      userAgent,
      success
    });
  }

  async logMfaEnable(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'MFA_ENABLE',
      resource: 'user',
      ipAddress,
      userAgent,
      success
    });
  }

  async logMfaDisable(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'MFA_DISABLE',
      resource: 'user',
      ipAddress,
      userAgent,
      success
    });
  }

  async logOAuthLogin(userId: string, provider: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      action: 'OAUTH_LOGIN',
      resource: 'auth',
      details: { provider },
      ipAddress,
      userAgent,
      success
    });
  }

  async getRecentEvents(userId?: string, limit: number = 100): Promise<AuditEvent[]> {
    let query = `
      SELECT id, user_id, action, resource, details, ip_address, 
             user_agent, timestamp, success
      FROM audit_logs
    `;
    const values: any[] = [];

    if (userId) {
      query += ' WHERE user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY timestamp DESC LIMIT $' + (values.length + 1);
    values.push(limit);

    const result = await this.db.query(query, values);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      details: row.details ? JSON.parse(row.details) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
      success: row.success
    }));
  }

  // Static methods for compatibility with existing middleware
  static async logAuthEvent(eventData: {
    userId?: string;
    organizationId?: string;
    eventType: string;
    eventStatus: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
    resourceType?: string;
    resourceId?: string;
  }): Promise<void> {
    try {
      // For now, just log to console - in production this would use DatabaseService
      console.log('Auth Event:', {
        timestamp: new Date().toISOString(),
        ...eventData
      });
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  static async logEvent(eventData: {
    userId?: string;
    organizationId?: string;
    eventType: string;
    eventStatus: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
    resourceType?: string;
    resourceId?: string;
  }): Promise<void> {
    await this.logAuthEvent(eventData);
  }
}