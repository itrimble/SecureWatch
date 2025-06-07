/**
 * Analytics API Routes for KQL Analytics Engine
 * Comprehensive REST API for query execution, management, and scheduling
 */
import { Router } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { ResourceConfig } from '../engine/resource-manager';
export declare class AnalyticsRoutes {
    private router;
    private kqlParser;
    private queryPlanner;
    private executionEngine;
    private resourceManager;
    private queryLibrary;
    private cacheManager;
    private schemaManager;
    private logger;
    constructor(dbPool: Pool, redisClient: Redis, resourceConfig: ResourceConfig);
    getRouter(): Router;
    /**
     * Setup API routes
     */
    private setupRoutes;
    /**
     * Setup event handlers for resource management
     */
    private setupEventHandlers;
    /**
     * Execute KQL query
     */
    private executeQuery;
    /**
     * Validate KQL query syntax
     */
    private validateQuery;
    /**
     * Create query execution plan
     */
    private createQueryPlan;
    /**
     * Get saved queries
     */
    private getSavedQueries;
    /**
     * Get query library statistics
     */
    private getLibraryStats;
    /**
     * Get schema information
     */
    private getSchema;
    /**
     * Get resource usage
     */
    private getResourceUsage;
    /**
     * Get resource health status
     */
    private getResourceHealth;
    /**
     * Get cache statistics
     */
    private getCacheStats;
    private validateQueryExecution;
    private validateKQLSyntax;
    private validateQueryPlanning;
    private validateSavedQuery;
    private validateScheduledQuery;
    private handleValidation;
    private createSavedQuery;
    private getSavedQuery;
    private updateSavedQuery;
    private deleteSavedQuery;
    private getQueryLibrary;
    private getLibraryCategories;
    private searchQueryLibrary;
    private getScheduledQueries;
    private createScheduledQuery;
    private updateScheduledQuery;
    private deleteScheduledQuery;
    private runScheduledQuery;
    private getSchemaTables;
    private getSchemaFunctions;
    private getActiveQueries;
    private cancelQuery;
    private forceCleanup;
    private clearCache;
    private deleteCacheEntry;
    private getAnalyticsStatistics;
    private getPerformanceMetrics;
    private getUsageAnalytics;
    private estimateMemoryUsage;
    private calculateQueryComplexity;
    private generateQuerySuggestions;
    private suggestOptimizations;
    private getUniqueCategories;
    private getUniqueSeverityLevels;
}
export { AnalyticsRoutes };
//# sourceMappingURL=analytics.routes.d.ts.map