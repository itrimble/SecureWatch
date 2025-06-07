"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = void 0;
// @ts-nocheck
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
const query_complexity_analyzer_1 = require("../utils/query-complexity-analyzer");
const audit_logger_1 = require("../utils/audit-logger");
const router = (0, express_1.Router)();
exports.searchRoutes = router;
/**
 * @swagger
 * /search/complexity:
 *   post:
 *     summary: Analyze query complexity without execution
 *     description: Validate query complexity and get resource usage estimates
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *     responses:
 *       200:
 *         description: Query complexity analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 complexityScore:
 *                   type: number
 *                 violations:
 *                   type: array
 *                   items:
 *                     type: string
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *                 estimatedResourceUsage:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: string
 *                     cpu:
 *                       type: string
 *                     executionTime:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Forbidden
 */
router.post('/complexity', [
    (0, express_validator_1.body)('query')
        .isString()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Query must be a non-empty string (max 10000 characters)'),
    (0, express_validator_1.body)('timeRange.start')
        .optional()
        .isISO8601()
        .withMessage('Start time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('timeRange.end')
        .optional()
        .isISO8601()
        .withMessage('End time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('maxRows')
        .optional()
        .isInt({ min: 1, max: 5000 })
        .withMessage('Max rows must be between 1 and 5000'),
    (0, express_validator_1.body)('timeout')
        .optional()
        .isInt({ min: 1000, max: 120000 })
        .withMessage('Timeout must be between 1000ms and 120000ms')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const { query, timeRange, maxRows, timeout } = req.body;
        const userId = req.user?.sub;
        const userOrgId = req.user?.organizationId;
        const headerOrgId = req.headers['x-organization-id'];
        if (!headerOrgId) {
            return res.status(400).json({
                error: 'Missing organization ID',
                message: 'X-Organization-ID header is required'
            });
        }
        // Validate organization access
        const userRoles = req.user?.roles || [];
        if (!userRoles.includes('super_admin') && headerOrgId !== userOrgId) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to the requested organization'
            });
        }
        // Analyze query complexity
        const complexityAnalysis = query_complexity_analyzer_1.queryComplexityAnalyzer.analyzeQuery({
            kqlQuery: query,
            startTime: timeRange?.start,
            endTime: timeRange?.end,
            maxRows,
            timeout,
            organizationId: headerOrgId
        });
        // Check rate limits
        const rateLimitCheck = query_complexity_analyzer_1.queryRateLimiter.canExecuteQuery(userId, complexityAnalysis.complexityScore);
        logger_1.default.info('Query complexity analysis requested', {
            userId,
            organizationId: headerOrgId,
            complexityScore: complexityAnalysis.complexityScore,
            isValid: complexityAnalysis.isValid,
            rateLimitAllowed: rateLimitCheck.allowed
        });
        res.json({
            ...complexityAnalysis,
            rateLimit: {
                allowed: rateLimitCheck.allowed,
                reason: rateLimitCheck.reason,
                retryAfter: rateLimitCheck.retryAfter
            }
        });
    }
    catch (error) {
        logger_1.default.error('Query complexity analysis failed', { error, userId: req.user?.sub });
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to analyze query complexity'
        });
    }
});
/**
 * @swagger
 * components:
 *   schemas:
 *     SearchRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           description: KQL query to execute
 *           example: "log_events | where severity == 'critical' | limit 100"
 *         timeRange:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               format: date-time
 *               description: Start time for the query
 *             end:
 *               type: string
 *               format: date-time
 *               description: End time for the query
 *         maxRows:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           description: Maximum number of rows to return
 *           example: 1000
 *         timeout:
 *           type: integer
 *           minimum: 1000
 *           maximum: 300000
 *           description: Query timeout in milliseconds
 *           example: 30000
 *         cache:
 *           type: boolean
 *           description: Whether to use query result caching
 *           example: true
 *     SearchResponse:
 *       type: object
 *       properties:
 *         columns:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               nullable:
 *                 type: boolean
 *         rows:
 *           type: array
 *           items:
 *             type: object
 *         metadata:
 *           type: object
 *           properties:
 *             totalRows:
 *               type: integer
 *             scannedRows:
 *               type: integer
 *             executionTime:
 *               type: number
 *             fromCache:
 *               type: boolean
 */
/**
 * @swagger
 * /api/v1/search/execute:
 *   post:
 *     summary: Execute a KQL query
 *     description: Execute a KQL query against the log data
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *     responses:
 *       200:
 *         description: Query executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: Invalid query or parameters
 *       500:
 *         description: Query execution failed
 */
router.post('/execute', [
    (0, express_validator_1.body)('query')
        .isString()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Query must be a non-empty string (max 10000 characters)'),
    (0, express_validator_1.body)('timeRange.start')
        .optional()
        .isISO8601()
        .withMessage('Start time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('timeRange.end')
        .optional()
        .isISO8601()
        .withMessage('End time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('maxRows')
        .optional()
        .isInt({ min: 1, max: 5000 })
        .withMessage('Max rows must be between 1 and 5000 (DoS prevention)'),
    (0, express_validator_1.body)('timeout')
        .optional()
        .isInt({ min: 1000, max: 120000 })
        .withMessage('Timeout must be between 1000ms and 120000ms (DoS prevention)'),
    (0, express_validator_1.body)('cache')
        .optional()
        .isBoolean()
        .withMessage('Cache must be a boolean')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const kqlEngine = req.kqlEngine;
        const { query, timeRange, maxRows, timeout, cache } = req.body;
        const headerOrgId = req.headers['x-organization-id'];
        const userId = req.user?.sub;
        const userOrgId = req.user?.organizationId;
        if (!headerOrgId) {
            return res.status(400).json({
                error: 'Missing organization ID',
                message: 'X-Organization-ID header is required'
            });
        }
        // Validate that the organization ID matches the authenticated user's organization
        // Unless the user is a super admin
        const userRoles = req.user?.roles || [];
        if (!userRoles.includes('super_admin') && headerOrgId !== userOrgId) {
            logger_1.default.warn('Organization ID mismatch attempted', {
                userId,
                userOrgId,
                requestedOrgId: headerOrgId,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to the requested organization'
            });
        }
        const organizationId = headerOrgId;
        // 1. Analyze query complexity to prevent DoS attacks
        const complexityAnalysis = query_complexity_analyzer_1.queryComplexityAnalyzer.analyzeQuery({
            kqlQuery: query,
            startTime: timeRange?.start,
            endTime: timeRange?.end,
            maxRows,
            timeout,
            organizationId
        });
        // 2. Reject queries that exceed complexity limits
        if (!complexityAnalysis.isValid) {
            logger_1.default.warn('Query rejected due to complexity limits', {
                userId,
                organizationId,
                complexityScore: complexityAnalysis.complexityScore,
                violations: complexityAnalysis.violations,
                query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
                ip: req.ip
            });
            // Log to comprehensive security audit system
            audit_logger_1.securityAuditLogger.logQueryExecution(query, Date.now() - startTime, results?.length || 0, {
                userId,
                organizationId,
                complexityScore: complexityAnalysis.complexityScore,
                executionTime: 0,
                resultCount: 0,
                ipAddress: req.ip,
                blocked: true,
                blockReason: complexityAnalysis.violations.join(', ')
            });
            return res.status(429).json({
                error: 'Query complexity limit exceeded',
                message: 'Query is too complex and may impact system performance',
                details: {
                    complexityScore: complexityAnalysis.complexityScore,
                    violations: complexityAnalysis.violations,
                    recommendations: complexityAnalysis.recommendations,
                    estimatedResourceUsage: complexityAnalysis.estimatedResourceUsage
                }
            });
        }
        // 3. Check rate limits for complex queries
        const rateLimitCheck = query_complexity_analyzer_1.queryRateLimiter.canExecuteQuery(userId, complexityAnalysis.complexityScore);
        if (!rateLimitCheck.allowed) {
            logger_1.default.warn('Query rejected due to rate limiting', {
                userId,
                organizationId,
                reason: rateLimitCheck.reason,
                complexityScore: complexityAnalysis.complexityScore,
                ip: req.ip
            });
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: rateLimitCheck.reason,
                retryAfter: rateLimitCheck.retryAfter
            });
        }
        // 4. Log complex query execution for monitoring
        if (complexityAnalysis.complexityScore > 25) {
            logger_1.default.info('Complex query executed', {
                userId,
                organizationId,
                complexityScore: complexityAnalysis.complexityScore,
                estimatedResourceUsage: complexityAnalysis.estimatedResourceUsage,
                query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
                ip: req.ip
            });
        }
        const context = {
            organizationId,
            userId,
            timeRange: timeRange ? {
                start: new Date(timeRange.start),
                end: new Date(timeRange.end)
            } : undefined,
            maxRows,
            timeout,
            cache
        };
        const startTime = Date.now();
        // Execute query with circuit breaker protection
        const result = await withSearchCircuitBreaker(async () => {
            return await kqlEngine.executeQuery(query, context);
        });
        const queryTime = Date.now() - startTime;
        // Log query execution
        logger_1.default.info('Query executed', {
            organizationId,
            userId,
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            executionTime: result.executionTime,
            totalTime: queryTime,
            rowCount: result.rows.length,
            fromCache: result.fromCache
        });
        // Log to comprehensive security audit system
        audit_logger_1.securityAuditLogger.logQueryExecution(query, result.executionTime || queryTime, result.rows.length, {
            userId,
            organizationId,
            complexityScore: complexityAnalysis.complexityScore,
            ipAddress: req.ip,
            blocked: false
        });
        res.json({
            ...result,
            metadata: {
                ...result.metadata,
                totalTime: queryTime,
                complexityScore: complexityAnalysis.complexityScore
            }
        });
    }
    catch (error) {
        logger_1.default.error('Query execution failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            query: req.body.query?.substring(0, 200),
            organizationId: req.headers['x-organization-id'],
            userId: req.user?.sub
        });
        res.status(500).json({
            error: 'Query execution failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * @swagger
 * /api/v1/search/validate:
 *   post:
 *     summary: Validate a KQL query
 *     description: Validate KQL query syntax without executing it
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: KQL query to validate
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/validate', [
    (0, express_validator_1.body)('query')
        .isString()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Query must be a non-empty string (max 10000 characters)')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const kqlEngine = req.kqlEngine;
        const { query } = req.body;
        const result = await kqlEngine.validateQuery(query);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Query validation failed', error);
        res.status(500).json({
            error: 'Validation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/search/explain:
 *   post:
 *     summary: Explain query execution plan
 *     description: Get the execution plan for a KQL query without running it
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: KQL query to explain
 *               timeRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Query execution plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 executionPlan:
 *                   type: object
 *                 estimatedCost:
 *                   type: number
 *                 estimatedRows:
 *                   type: integer
 */
router.post('/explain', [
    (0, express_validator_1.body)('query')
        .isString()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Query must be a non-empty string (max 10000 characters)'),
    (0, express_validator_1.body)('timeRange.start')
        .optional()
        .isISO8601()
        .withMessage('Start time must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('timeRange.end')
        .optional()
        .isISO8601()
        .withMessage('End time must be a valid ISO 8601 date')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const kqlEngine = req.kqlEngine;
        const { query, timeRange } = req.body;
        const headerOrgId = req.headers['x-organization-id'];
        const userId = req.user?.sub;
        const userOrgId = req.user?.organizationId;
        if (!headerOrgId) {
            return res.status(400).json({
                error: 'Missing organization ID',
                message: 'X-Organization-ID header is required'
            });
        }
        // Validate that the organization ID matches the authenticated user's organization
        const userRoles = req.user?.roles || [];
        if (!userRoles.includes('super_admin') && headerOrgId !== userOrgId) {
            logger_1.default.warn('Organization ID mismatch attempted in explain endpoint', {
                userId,
                userOrgId,
                requestedOrgId: headerOrgId,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to the requested organization'
            });
        }
        const organizationId = headerOrgId;
        const context = {
            organizationId,
            userId,
            timeRange: timeRange ? {
                start: new Date(timeRange.start),
                end: new Date(timeRange.end)
            } : undefined
        };
        const result = await kqlEngine.explainQuery(query, context);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Query explanation failed', error);
        res.status(500).json({
            error: 'Explanation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/search/completions:
 *   post:
 *     summary: Get query completions
 *     description: Get IntelliSense completions for KQL query
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - position
 *             properties:
 *               text:
 *                 type: string
 *                 description: Current query text
 *               position:
 *                 type: object
 *                 required:
 *                   - line
 *                   - character
 *                 properties:
 *                   line:
 *                     type: integer
 *                     description: Line number (0-based)
 *                   character:
 *                     type: integer
 *                     description: Character position (0-based)
 *               context:
 *                 type: object
 *                 properties:
 *                   triggerKind:
 *                     type: integer
 *                     description: Completion trigger kind
 *                   triggerCharacter:
 *                     type: string
 *                     description: Character that triggered completion
 *     responses:
 *       200:
 *         description: Completion suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   label:
 *                     type: string
 *                   kind:
 *                     type: integer
 *                   detail:
 *                     type: string
 *                   documentation:
 *                     type: string
 *                   insertText:
 *                     type: string
 */
router.post('/completions', [
    (0, express_validator_1.body)('text')
        .isString()
        .withMessage('Text must be a string'),
    (0, express_validator_1.body)('position.line')
        .isInt({ min: 0 })
        .withMessage('Line must be a non-negative integer'),
    (0, express_validator_1.body)('position.character')
        .isInt({ min: 0 })
        .withMessage('Character must be a non-negative integer')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const kqlEngine = req.kqlEngine;
        const { text, position, context } = req.body;
        const completions = await kqlEngine.getCompletions(text, position, context);
        res.json(completions);
    }
    catch (error) {
        logger_1.default.error('Completions failed', error);
        res.status(500).json({
            error: 'Completions failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/search/statistics:
 *   get:
 *     summary: Get search statistics
 *     description: Get performance and usage statistics for the search engine
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Search statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cache:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: integer
 *                     hits:
 *                       type: integer
 *                     misses:
 *                       type: integer
 *                 uptime:
 *                   type: number
 *                 memoryUsage:
 *                   type: object
 */
router.get('/statistics', async (req, res) => {
    try {
        const kqlEngine = req.kqlEngine;
        const cacheStats = kqlEngine.getCacheStats();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        res.json({
            cache: cacheStats,
            uptime,
            memoryUsage: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            nodeVersion: process.version,
            platform: process.platform
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get statistics', error);
        res.status(500).json({
            error: 'Failed to get statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/search/logs:
 *   get:
 *     summary: Get log entries
 *     description: Get log entries for development testing (simplified endpoint)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Log entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/logs', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const offset = parseInt(req.query.offset) || 0;
        // For now, return mock data to test the connection
        // TODO: Connect to actual database when available
        const mockLogs = [
            {
                id: 'live-1',
                timestamp: new Date().toISOString(),
                source_identifier: 'search_api_backend',
                log_file: 'live_data.log',
                message: 'Live backend connection successful - Search API responding',
                enriched_data: {
                    event_id: 'CONN_SUCCESS',
                    severity: 'Information',
                    hostname: 'search-api-server',
                    ip_address: '127.0.0.1',
                    user_id: 'system',
                    process_name: 'search-api',
                    process_id: process.pid,
                    tags: ['backend', 'live-data', 'api-connection'],
                    event_type_id: 'BACKEND_LIVE'
                }
            },
            {
                id: 'live-2',
                timestamp: new Date(Date.now() - 60000).toISOString(),
                source_identifier: 'search_api_backend',
                log_file: 'live_data.log',
                message: 'Search API service started and ready to receive queries',
                enriched_data: {
                    event_id: 'SERVICE_START',
                    severity: 'Information',
                    hostname: 'search-api-server',
                    ip_address: '127.0.0.1',
                    user_id: 'system',
                    process_name: 'search-api',
                    process_id: process.pid,
                    tags: ['backend', 'service-startup', 'live-data'],
                    event_type_id: 'SERVICE_START'
                }
            }
        ];
        const results = mockLogs.slice(offset, offset + limit);
        logger_1.default.info('Logs endpoint accessed', {
            limit,
            offset,
            returned: results.length,
            total: mockLogs.length
        });
        res.json(results);
    }
    catch (error) {
        logger_1.default.error('Failed to get logs', error);
        res.status(500).json({
            error: 'Failed to get logs',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /search/circuit-breakers:
 *   get:
 *     summary: Get circuit breaker status
 *     description: Monitor the health and status of all circuit breakers
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Circuit breaker health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 circuitBreakers:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       state:
 *                         type: string
 *                         enum: [CLOSED, OPEN, HALF_OPEN]
 *                       healthy:
 *                         type: boolean
 *                       metrics:
 *                         type: object
 *       500:
 *         description: Internal server error
 */
router.get('/circuit-breakers', async (req, res) => {
    try {
        const healthStatus = circuitBreakerManager.getHealthStatus();
        res.json({
            timestamp: new Date().toISOString(),
            circuitBreakers: healthStatus
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get circuit breaker status', { error });
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve circuit breaker status'
        });
    }
});
