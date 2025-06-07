/**
 * Shared Security Audit Logger for Search API
 * Simple audit logger implementation
 */
export declare const securityAuditLogger: {
    log: (event: any, details?: any) => void;
    logAccess: (userId: string, resource: string, action: string) => void;
    logQuery: (userId: string, query: string, metadata?: any) => void;
};
//# sourceMappingURL=audit-logger.d.ts.map