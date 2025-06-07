/**
 * Analytics API Routes for KQL Analytics Engine
 * Comprehensive REST API for query execution, management, and scheduling
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import winston from 'winston';
import { KQLParser } from '../engine/kql-parser';
import { QueryPlanner } from '../engine/query-planner';
import { ExecutionEngine } from '../engine/execution-engine';
import { AdvancedResourceManager } from '../engine/resource-manager';
import { QueryLibrary } from '../queries/query-library';
import { CacheManager } from '../utils/cache-manager';
import { SchemaManager } from '../utils/schema-manager';
export class AnalyticsRoutes {
    router;
    kqlParser;
    queryPlanner;
    executionEngine;
    resourceManager;
    queryLibrary;
    cacheManager;
    schemaManager;
    logger;
    constructor(dbPool, redisClient, resourceConfig) {
        this.router = Router();
        this.kqlParser = new KQLParser();
        this.queryPlanner = new QueryPlanner();
        this.executionEngine = new ExecutionEngine(dbPool, resourceConfig.limits);
        this.resourceManager = new AdvancedResourceManager(resourceConfig);
        this.queryLibrary = new QueryLibrary();
        this.cacheManager = new CacheManager(redisClient);
        this.schemaManager = new SchemaManager(dbPool);
        // Initialize logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
            defaultMeta: { service: 'analytics-engine' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple())
                })
            ]
        });
        this.setupRoutes();
        this.setupEventHandlers();
    }
    getRouter() {
        return this.router;
    }
    /**
     * Setup API routes
     */
    setupRoutes() {
        // Query Execution Routes
        this.router.post('/query', this.validateQueryExecution(), this.handleValidation, this.executeQuery.bind(this));
        this.router.post('/query/validate', this.validateKQLSyntax(), this.handleValidation, this.validateQuery.bind(this));
        this.router.post('/query/plan', this.validateQueryPlanning(), this.handleValidation, this.createQueryPlan.bind(this));
        // Saved Queries Management
        this.router.get('/saved-queries', this.getSavedQueries.bind(this));
        this.router.get('/saved-queries/:id', this.getSavedQuery.bind(this));
        this.router.post('/saved-queries', this.validateSavedQuery(), this.handleValidation, this.createSavedQuery.bind(this));
        this.router.put('/saved-queries/:id', this.validateSavedQuery(), this.handleValidation, this.updateSavedQuery.bind(this));
        this.router.delete('/saved-queries/:id', this.deleteSavedQuery.bind(this));
        // Query Library Routes
        this.router.get('/library', this.getQueryLibrary.bind(this));
        this.router.get('/library/categories', this.getLibraryCategories.bind(this));
        this.router.get('/library/search', this.searchQueryLibrary.bind(this));
        this.router.get('/library/stats', this.getLibraryStats.bind(this));
        // Scheduled Queries Management
        this.router.get('/scheduled-queries', this.getScheduledQueries.bind(this));
        this.router.post('/scheduled-queries', this.validateScheduledQuery(), this.handleValidation, this.createScheduledQuery.bind(this));
        this.router.put('/scheduled-queries/:id', this.validateScheduledQuery(), this.handleValidation, this.updateScheduledQuery.bind(this));
        this.router.delete('/scheduled-queries/:id', this.deleteScheduledQuery.bind(this));
        this.router.post('/scheduled-queries/:id/run', this.runScheduledQuery.bind(this));
        // Schema and Metadata Routes
        this.router.get('/schema', this.getSchema.bind(this));
        this.router.get('/schema/tables', this.getSchemaTables.bind(this));
        this.router.get('/schema/functions', this.getSchemaFunctions.bind(this));
        // Resource Management Routes
        this.router.get('/resources/usage', this.getResourceUsage.bind(this));
        this.router.get('/resources/health', this.getResourceHealth.bind(this));
        this.router.get('/resources/queries', this.getActiveQueries.bind(this));
        this.router.delete('/resources/queries/:id', this.cancelQuery.bind(this));
        this.router.post('/resources/cleanup', this.forceCleanup.bind(this));
        // Cache Management Routes
        this.router.get('/cache/stats', this.getCacheStats.bind(this));
        this.router.delete('/cache', this.clearCache.bind(this));
        this.router.delete('/cache/:key', this.deleteCacheEntry.bind(this));
        // Analytics and Statistics Routes
        this.router.get('/analytics/statistics', this.getAnalyticsStatistics.bind(this));
        this.router.get('/analytics/performance', this.getPerformanceMetrics.bind(this));
        this.router.get('/analytics/usage', this.getUsageAnalytics.bind(this));
    }
    /**
     * Setup event handlers for resource management
     */
    setupEventHandlers() {
        this.resourceManager.on('healthAlert', (status) => {
            this.logger.warn('Resource health alert:', status);
        });
        this.resourceManager.on('queryCancelled', (event) => {
            this.logger.info('Query cancelled:', event);
        });
        this.resourceManager.on('forcedCleanup', (result) => {
            this.logger.info('Forced cleanup completed:', result);
        });
    }
    /**
     * Execute KQL query
     */
    async executeQuery(req, res, next) {
        try {
            const { kql_query, time_range, parameters, options } = req.body;
            const priority = options?.priority || 'normal';
            const timeoutMs = options?.timeout || 30000;
            const useCache = options?.cache !== false;
            // Check cache first
            if (useCache) {
                const cacheKey = this.cacheManager.generateCacheKey(kql_query, time_range, parameters);
                const cachedResult = await this.cacheManager.get(cacheKey);
                if (cachedResult) {
                    res.json({
                        ...cachedResult,
                        cached: true,
                        executionTime: 0
                    });
                    return;
                }
            }
            // Parse KQL query
            const parseResult = this.kqlParser.parse(kql_query);
            if (parseResult.errors.length > 0) {
                res.status(400).json({
                    error: 'Query syntax error',
                    details: parseResult.errors
                });
                return;
            }
            if (!parseResult.ast) {
                res.status(400).json({
                    error: 'Failed to parse query'
                });
                return;
            }
            // Create execution plan
            const executionPlan = this.queryPlanner.createExecutionPlan(parseResult.ast);
            // Request resources
            const resourceAllocation = await this.resourceManager.requestResources(executionPlan.id, priority, {
                memoryMB: this.estimateMemoryUsage(executionPlan),
                timeoutMs,
                complexity: this.calculateQueryComplexity(parseResult.ast)
            });
            try {
                // Execute query
                const result = await this.executionEngine.executeQuery(executionPlan, timeoutMs);
                // Cache result if enabled
                if (useCache && result.data.length < 10000) { // Don't cache very large results
                    const cacheKey = this.cacheManager.generateCacheKey(kql_query, time_range, parameters);
                    await this.cacheManager.set(cacheKey, result, 300); // 5 minutes TTL
                }
                res.json(result);
            }
            finally {
                // Release resources
                this.resourceManager.releaseResources(resourceAllocation.queryId);
            }
        }
        catch (error) {
            this.logger.error('Query execution error:', error);
            res.status(500).json({
                error: 'Query execution failed',
                message: error.message
            });
        }
    }
    /**
     * Validate KQL query syntax
     */
    async validateQuery(req, res) {
        try {
            const { kql_query } = req.body;
            const parseResult = this.kqlParser.parse(kql_query);
            const schema = await this.schemaManager.getSchema();
            let semanticErrors = [];
            if (parseResult.ast) {
                semanticErrors = this.kqlParser.validateSemantics(parseResult.ast, schema);
            }
            const allErrors = [...parseResult.errors, ...semanticErrors];
            res.json({
                valid: allErrors.length === 0,
                errors: allErrors,
                warnings: [], // Could add warnings for performance issues
                suggestions: this.generateQuerySuggestions(kql_query, allErrors)
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Validation failed',
                message: error.message
            });
        }
    }
    /**
     * Create query execution plan
     */
    async createQueryPlan(req, res) {
        try {
            const { kql_query } = req.body;
            const parseResult = this.kqlParser.parse(kql_query);
            if (parseResult.errors.length > 0 || !parseResult.ast) {
                res.status(400).json({
                    error: 'Cannot create plan for invalid query',
                    syntaxErrors: parseResult.errors
                });
                return;
            }
            const schema = await this.schemaManager.getSchema();
            const executionPlan = this.queryPlanner.createExecutionPlan(parseResult.ast, schema);
            res.json({
                plan: executionPlan,
                estimatedCost: executionPlan.estimatedCost,
                estimatedRows: executionPlan.estimatedRows,
                optimizations: this.suggestOptimizations(executionPlan)
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Plan creation failed',
                message: error.message
            });
        }
    }
    /**
     * Get saved queries
     */
    async getSavedQueries(req, res) {
        try {
            const { category, severity, tags, search } = req.query;
            let queries = this.queryLibrary.getAllQueries();
            // Apply filters
            if (category) {
                queries = this.queryLibrary.getQueriesByCategory(category);
            }
            if (severity) {
                queries = queries.filter(q => q.severity === severity);
            }
            if (tags) {
                const tagList = tags.split(',');
                queries = queries.filter(q => tagList.some(tag => q.tags.includes(tag.trim())));
            }
            if (search) {
                queries = this.queryLibrary.searchQueries(search);
            }
            res.json({
                queries,
                total: queries.length,
                categories: this.getUniqueCategories(queries),
                severityLevels: this.getUniqueSeverityLevels(queries)
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get saved queries',
                message: error.message
            });
        }
    }
    /**
     * Get query library statistics
     */
    async getLibraryStats(req, res) {
        try {
            const stats = this.queryLibrary.getLibraryStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get library stats',
                message: error.message
            });
        }
    }
    /**
     * Get schema information
     */
    async getSchema(req, res) {
        try {
            const schema = await this.schemaManager.getSchema();
            res.json(schema);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get schema',
                message: error.message
            });
        }
    }
    /**
     * Get resource usage
     */
    async getResourceUsage(req, res) {
        try {
            const usage = this.resourceManager.getResourceUsage();
            res.json(usage);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get resource usage',
                message: error.message
            });
        }
    }
    /**
     * Get resource health status
     */
    async getResourceHealth(req, res) {
        try {
            const health = this.resourceManager.getHealthStatus();
            res.json(health);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get resource health',
                message: error.message
            });
        }
    }
    /**
     * Get cache statistics
     */
    async getCacheStats(req, res) {
        try {
            const stats = await this.cacheManager.getStats();
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get cache stats',
                message: error.message
            });
        }
    }
    // Validation middleware
    validateQueryExecution() {
        return [
            body('kql_query').isString().isLength({ min: 1 }),
            body('time_range').optional().isObject(),
            body('parameters').optional().isObject(),
            body('options').optional().isObject()
        ];
    }
    validateKQLSyntax() {
        return [
            body('kql_query').isString().isLength({ min: 1 })
        ];
    }
    validateQueryPlanning() {
        return [
            body('kql_query').isString().isLength({ min: 1 })
        ];
    }
    validateSavedQuery() {
        return [
            body('name').isString().isLength({ min: 1 }),
            body('query').isString().isLength({ min: 1 }),
            body('category').isString(),
            body('severity').isIn(['critical', 'high', 'medium', 'low', 'info']),
            body('tags').isArray()
        ];
    }
    validateScheduledQuery() {
        return [
            body('savedQueryId').isString(),
            body('cronExpression').isString(),
            body('enabled').isBoolean()
        ];
    }
    handleValidation(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
            return;
        }
        next();
    }
    // Helper methods (stubs for now)
    async createSavedQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getSavedQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async updateSavedQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async deleteSavedQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getQueryLibrary(req, res) {
        res.json(this.queryLibrary.getAllQueries());
    }
    async getLibraryCategories(req, res) {
        const queries = this.queryLibrary.getAllQueries();
        const categories = [...new Set(queries.map(q => q.category))];
        res.json({ categories });
    }
    async searchQueryLibrary(req, res) {
        const { q } = req.query;
        if (!q) {
            res.status(400).json({ error: 'Search query required' });
            return;
        }
        const results = this.queryLibrary.searchQueries(q);
        res.json({ results, total: results.length });
    }
    async getScheduledQueries(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async createScheduledQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async updateScheduledQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async deleteScheduledQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async runScheduledQuery(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getSchemaTables(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getSchemaFunctions(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getActiveQueries(req, res) {
        const queries = this.executionEngine.getActiveQueries();
        res.json({ queries });
    }
    async cancelQuery(req, res) {
        const { id } = req.params;
        const cancelled = await this.executionEngine.cancelQuery(id);
        res.json({ cancelled });
    }
    async forceCleanup(req, res) {
        const result = this.resourceManager.forceCleanup();
        res.json(result);
    }
    async clearCache(req, res) {
        await this.cacheManager.clear();
        res.json({ success: true });
    }
    async deleteCacheEntry(req, res) {
        const { key } = req.params;
        await this.cacheManager.delete(key);
        res.json({ success: true });
    }
    async getAnalyticsStatistics(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getPerformanceMetrics(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    async getUsageAnalytics(req, res) {
        res.status(501).json({ error: 'Not implemented' });
    }
    // Utility methods
    estimateMemoryUsage(plan) {
        return Math.max(50, plan.estimatedRows / 1000); // Simple estimation
    }
    calculateQueryComplexity(ast) {
        // Simple complexity calculation based on AST depth and operations
        return 5; // Placeholder
    }
    generateQuerySuggestions(query, errors) {
        const suggestions = [];
        for (const error of errors) {
            if (error.type === 'syntax_error') {
                suggestions.push('Check for missing operators or parentheses');
            }
            else if (error.type === 'semantic_error') {
                suggestions.push('Verify that all column names exist in the schema');
            }
        }
        return suggestions;
    }
    suggestOptimizations(plan) {
        const optimizations = [];
        if (plan.estimatedCost > 1000) {
            optimizations.push('Consider adding time range filters to reduce data volume');
        }
        if (plan.steps.some((s) => s.type === 'table_scan')) {
            optimizations.push('Add WHERE clauses to utilize indexes');
        }
        return optimizations;
    }
    getUniqueCategories(queries) {
        return [...new Set(queries.map(q => q.category))];
    }
    getUniqueSeverityLevels(queries) {
        return [...new Set(queries.map(q => q.severity))];
    }
}
//# sourceMappingURL=analytics.routes.js.map