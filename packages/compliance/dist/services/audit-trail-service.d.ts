import { EventEmitter } from 'events';
import { AuditEvent, DatabaseConfig } from '../types/compliance.types';
interface AuditSearchFilters {
    userIds?: string[];
    actions?: string[];
    resourceTypes?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    results?: ('success' | 'failure' | 'partial')[];
    ipAddresses?: string[];
    frameworkIds?: string[];
    query?: string;
}
interface AuditStatistics {
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Record<string, number>;
    eventsByResult: Record<string, number>;
    eventsByHour: Record<string, number>;
    topResources: Array<{
        type: string;
        id: string;
        count: number;
    }>;
    suspiciousActivities: Array<{
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        timestamp: Date;
    }>;
}
interface AuditAlertRule {
    id: string;
    name: string;
    description: string;
    conditions: {
        actions?: string[];
        results?: ('success' | 'failure' | 'partial')[];
        userPatterns?: string[];
        ipPatterns?: string[];
        frequency?: {
            count: number;
            windowMinutes: number;
        };
    };
    notifications: {
        email?: string[];
        webhook?: string;
        syslog?: boolean;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    active: boolean;
}
export declare class AuditTrailService extends EventEmitter {
    private db;
    private alertRules;
    private sessionCache;
    private readonly BATCH_SIZE;
    private pendingEvents;
    private batchTimer;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private createIndexes;
    private loadAlertRules;
    logEvent(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent>;
    private processBatch;
    private updateStatistics;
    createSession(sessionId: string, userId: string, ipAddress: string, userAgent?: string): Promise<void>;
    updateSessionActivity(sessionId: string, timestamp: Date): Promise<void>;
    endSession(sessionId: string): Promise<void>;
    searchEvents(filters: AuditSearchFilters, pagination: {
        page: number;
        limit: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        events: AuditEvent[];
        total: number;
    }>;
    getEvent(eventId: string): Promise<AuditEvent | null>;
    getUserActivity(userId: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<AuditEvent[]>;
    getSessionActivity(sessionId: string): Promise<AuditEvent[]>;
    getAuditStatistics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<AuditStatistics>;
    private detectSuspiciousActivities;
    createAlertRule(rule: Omit<AuditAlertRule, 'id'>): Promise<AuditAlertRule>;
    private checkAlertRules;
    private matchesAlertConditions;
    private triggerAlert;
    applyRetentionPolicies(): Promise<number>;
    exportAuditLog(filters: AuditSearchFilters, format: 'json' | 'csv'): Promise<string>;
    private parseEventRow;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=audit-trail-service.d.ts.map