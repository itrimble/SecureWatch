export class AuditService {
    db;
    constructor(database) {
        this.db = database;
    }
    async logEvent(event) {
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
        }
        catch (error) {
            // Log to console if database logging fails
            console.error('Failed to log audit event:', error);
            console.error('Event:', event);
        }
    }
    async logLogin(userId, success, ipAddress, userAgent, details) {
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
    async logLogout(userId, ipAddress, userAgent) {
        await this.logEvent({
            userId,
            action: 'LOGOUT',
            resource: 'auth',
            ipAddress,
            userAgent,
            success: true
        });
    }
    async logPasswordChange(userId, success, ipAddress, userAgent) {
        await this.logEvent({
            userId,
            action: 'PASSWORD_CHANGE',
            resource: 'user',
            ipAddress,
            userAgent,
            success
        });
    }
    async logMfaEnable(userId, success, ipAddress, userAgent) {
        await this.logEvent({
            userId,
            action: 'MFA_ENABLE',
            resource: 'user',
            ipAddress,
            userAgent,
            success
        });
    }
    async logMfaDisable(userId, success, ipAddress, userAgent) {
        await this.logEvent({
            userId,
            action: 'MFA_DISABLE',
            resource: 'user',
            ipAddress,
            userAgent,
            success
        });
    }
    async logOAuthLogin(userId, provider, success, ipAddress, userAgent) {
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
    async getRecentEvents(userId, limit = 100) {
        let query = `
      SELECT id, user_id, action, resource, details, ip_address, 
             user_agent, timestamp, success
      FROM audit_logs
    `;
        const values = [];
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
}
//# sourceMappingURL=audit.service.js.map