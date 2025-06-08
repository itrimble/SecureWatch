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
export declare class AuditService {
    private db;
    constructor(database: Pool);
    logEvent(event: AuditEvent): Promise<void>;
    logLogin(userId: string, success: boolean, ipAddress?: string, userAgent?: string, details?: Record<string, any>): Promise<void>;
    logLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
    logPasswordChange(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
    logMfaEnable(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
    logMfaDisable(userId: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
    logOAuthLogin(userId: string, provider: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
    getRecentEvents(userId?: string, limit?: number): Promise<AuditEvent[]>;
}
//# sourceMappingURL=audit.service.d.ts.map