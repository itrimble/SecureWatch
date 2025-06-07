"use strict";
/**
 * Shared Security Audit Logger for Search API
 * Simple audit logger implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityAuditLogger = void 0;
exports.securityAuditLogger = {
    log: (event, details = {}) => {
        console.log('[AUDIT]', event, details);
    },
    logAccess: (userId, resource, action) => {
        console.log('[AUDIT ACCESS]', { userId, resource, action });
    },
    logQuery: (userId, query, metadata = {}) => {
        console.log('[AUDIT QUERY]', { userId, query, metadata });
    },
    logQueryExecution: (query, executionTime, resultCount, metadata = {}) => {
        console.log('[AUDIT QUERY EXECUTION]', { query, executionTime, resultCount, metadata });
    }
};
