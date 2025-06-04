import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { KQLEngine, ExecutionContext } from '@securewatch/kql-engine';
import logger from '../utils/logger';

const router = Router();

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
router.post('/execute',
  [
    body('query')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Query must be a non-empty string (max 10000 characters)'),
    body('timeRange.start')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid ISO 8601 date'),
    body('timeRange.end')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid ISO 8601 date'),
    body('maxRows')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Max rows must be between 1 and 10000'),
    body('timeout')
      .optional()
      .isInt({ min: 1000, max: 300000 })
      .withMessage('Timeout must be between 1000ms and 300000ms'),
    body('cache')
      .optional()
      .isBoolean()
      .withMessage('Cache must be a boolean')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const kqlEngine: KQLEngine = (req as any).kqlEngine;
      const { query, timeRange, maxRows, timeout, cache } = req.body;
      
      const organizationId = req.headers['x-organization-id'] as string;
      const userId = (req as any).user?.sub;

      if (!organizationId) {
        return res.status(400).json({
          error: 'Missing organization ID',
          message: 'X-Organization-ID header is required'
        });
      }

      const context: ExecutionContext = {
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
      const result = await kqlEngine.executeQuery(query, context);
      const queryTime = Date.now() - startTime;

      // Log query execution
      logger.info('Query executed', {
        organizationId,
        userId,
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        executionTime: result.executionTime,
        totalTime: queryTime,
        rowCount: result.rows.length,
        fromCache: result.fromCache
      });

      res.json({
        ...result,
        metadata: {
          ...result.metadata,
          totalTime: queryTime
        }
      });

    } catch (error) {
      logger.error('Query execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.body.query?.substring(0, 200),
        organizationId: req.headers['x-organization-id'],
        userId: (req as any).user?.sub
      });

      res.status(500).json({
        error: 'Query execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

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
router.post('/validate',
  [
    body('query')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Query must be a non-empty string (max 10000 characters)')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const kqlEngine: KQLEngine = (req as any).kqlEngine;
      const { query } = req.body;

      const result = await kqlEngine.validateQuery(query);
      res.json(result);

    } catch (error) {
      logger.error('Query validation failed', error);
      res.status(500).json({
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

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
router.post('/explain',
  [
    body('query')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Query must be a non-empty string (max 10000 characters)'),
    body('timeRange.start')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid ISO 8601 date'),
    body('timeRange.end')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid ISO 8601 date')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const kqlEngine: KQLEngine = (req as any).kqlEngine;
      const { query, timeRange } = req.body;
      
      const organizationId = req.headers['x-organization-id'] as string;
      const userId = (req as any).user?.sub;

      if (!organizationId) {
        return res.status(400).json({
          error: 'Missing organization ID',
          message: 'X-Organization-ID header is required'
        });
      }

      const context: ExecutionContext = {
        organizationId,
        userId,
        timeRange: timeRange ? {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end)
        } : undefined
      };

      const result = await kqlEngine.explainQuery(query, context);
      res.json(result);

    } catch (error) {
      logger.error('Query explanation failed', error);
      res.status(500).json({
        error: 'Explanation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

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
router.post('/completions',
  [
    body('text')
      .isString()
      .withMessage('Text must be a string'),
    body('position.line')
      .isInt({ min: 0 })
      .withMessage('Line must be a non-negative integer'),
    body('position.character')
      .isInt({ min: 0 })
      .withMessage('Character must be a non-negative integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const kqlEngine: KQLEngine = (req as any).kqlEngine;
      const { text, position, context } = req.body;

      const completions = await kqlEngine.getCompletions(text, position, context);
      res.json(completions);

    } catch (error) {
      logger.error('Completions failed', error);
      res.status(500).json({
        error: 'Completions failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

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
    const kqlEngine: KQLEngine = (req as any).kqlEngine;
    
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

  } catch (error) {
    logger.error('Failed to get statistics', error);
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
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    
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
    
    logger.info('Logs endpoint accessed', {
      limit,
      offset,
      returned: results.length,
      total: mockLogs.length
    });

    res.json(results);
  } catch (error) {
    logger.error('Failed to get logs', error);
    res.status(500).json({
      error: 'Failed to get logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as searchRoutes };