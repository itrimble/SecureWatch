/**
 * Shared Security Audit Logger for Search API
 * Simple audit logger implementation
 */

export const securityAuditLogger = {
  log: (event: any, details: any = {}) => {
    console.log('[AUDIT]', event, details);
  },
  
  logAccess: (userId: string, resource: string, action: string) => {
    console.log('[AUDIT ACCESS]', { userId, resource, action });
  },
  
  logQuery: (userId: string, query: string, metadata: any = {}) => {
    console.log('[AUDIT QUERY]', { userId, query, metadata });
  },

  logQueryExecution: (query: string, executionTime: number, resultCount: number, metadata: any = {}) => {
    console.log('[AUDIT QUERY EXECUTION]', { query, executionTime, resultCount, metadata });
  }
};