// Rule Ingestor Service - Community Rule Ingestion for SecureWatch SIEM
// Fetches, converts, and stores detection rules from major community repositories

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RuleIngestorService } from './services/RuleIngestorService';
import { DatabaseService } from './services/DatabaseService';
import { GitRepositoryManager } from './services/GitRepositoryManager';
import { RuleConverterService } from './services/RuleConverterService';
import { logger } from './utils/logger';
import { config } from './config/config';
import { CronJob } from 'cron';

const app = express();
const PORT = process.env.PORT || 4007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Services
let dbService: DatabaseService;
let gitManager: GitRepositoryManager;
let converterService: RuleConverterService;
let ingestorService: RuleIngestorService;

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing Rule Ingestor services...');

    // Database service
    dbService = new DatabaseService({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'securewatch',
      username: process.env.DB_USER || 'securewatch',
      password: process.env.DB_PASSWORD || 'securewatch',
      ssl: process.env.DB_SSL === 'true',
    });
    await dbService.initialize();

    // Git repository manager
    gitManager = new GitRepositoryManager(config.repositories.basePath);

    // Rule converter service
    converterService = new RuleConverterService();

    // Main ingestor service
    ingestorService = new RuleIngestorService(
      dbService,
      gitManager,
      converterService
    );

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rule-ingestor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Get supported rule sources
app.get('/api/sources', (req, res) => {
  res.json({
    status: 'success',
    sources: config.repositories.sources.map((source) => ({
      name: source.name,
      type: source.type,
      description: source.description,
      url: source.url,
      enabled: source.enabled,
    })),
  });
});

// Trigger manual rule import from specific source
app.post('/api/import/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const { forceUpdate = false } = req.body;

    logger.info(`Manual import triggered for source: ${source}`);

    const sourceConfig = config.repositories.sources.find(
      (s) => s.name === source
    );
    if (!sourceConfig) {
      return res.status(404).json({
        status: 'error',
        message: `Source '${source}' not found`,
      });
    }

    if (!sourceConfig.enabled) {
      return res.status(400).json({
        status: 'error',
        message: `Source '${source}' is disabled`,
      });
    }

    const result = await ingestorService.importFromSource(
      sourceConfig,
      forceUpdate
    );

    res.json({
      status: 'success',
      source: source,
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Import failed:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Import failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Import from all enabled sources
app.post('/api/import/all', async (req, res) => {
  try {
    const { forceUpdate = false } = req.body;

    logger.info('Full import triggered for all enabled sources');

    const results = await ingestorService.importFromAllSources(forceUpdate);

    res.json({
      status: 'success',
      results: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Full import failed:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Full import failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Get import history
app.get('/api/imports/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, source } = req.query;

    const history = await dbService.getImportHistory({
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      source: source as string,
    });

    res.json({
      status: 'success',
      history: history,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get import history:', error);
    res.status(500).json({
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Failed to get import history',
    });
  }
});

// Get rule statistics
app.get('/api/rules/stats', async (req, res) => {
  try {
    const stats = await dbService.getRuleStatistics();

    res.json({
      status: 'success',
      stats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get rule statistics:', error);
    res.status(500).json({
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to get rule statistics',
    });
  }
});

// Search rules
app.get('/api/rules/search', async (req, res) => {
  try {
    const {
      query,
      source_type,
      level,
      category,
      enabled,
      limit = 100,
      offset = 0,
    } = req.query;

    const searchParams = {
      query: query as string,
      source_type: source_type as string,
      level: level as string,
      category: category as string,
      enabled:
        enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const rules = await dbService.searchRules(searchParams);

    res.json({
      status: 'success',
      rules: rules.rules,
      total: rules.total,
      pagination: {
        limit: searchParams.limit,
        offset: searchParams.offset,
        hasMore: rules.total > searchParams.offset + searchParams.limit,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Rule search failed:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Rule search failed',
    });
  }
});

// Enable/disable specific rule
app.put('/api/rules/:ruleId/toggle', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'enabled field must be a boolean',
      });
    }

    const success = await dbService.updateRuleStatus(ruleId, enabled);

    if (success) {
      res.json({
        status: 'success',
        message: `Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`,
        rule_id: ruleId,
        enabled: enabled,
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: `Rule ${ruleId} not found`,
      });
    }
  } catch (error) {
    logger.error('Failed to toggle rule:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to toggle rule',
    });
  }
});

// Bulk enable/disable rules
app.put('/api/rules/bulk/toggle', async (req, res) => {
  try {
    const { rule_ids, enabled } = req.body;

    if (!Array.isArray(rule_ids) || typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'rule_ids must be an array and enabled must be a boolean',
      });
    }

    const results = await dbService.bulkUpdateRuleStatus(rule_ids, enabled);

    res.json({
      status: 'success',
      message: `${results.updated} rules ${enabled ? 'enabled' : 'disabled'}`,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    logger.error('Bulk rule toggle failed:', error);
    res.status(500).json({
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Bulk rule toggle failed',
    });
  }
});

// Delete rule
app.delete('/api/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;

    const success = await dbService.deleteRule(ruleId);

    if (success) {
      res.json({
        status: 'success',
        message: `Rule ${ruleId} deleted`,
        rule_id: ruleId,
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: `Rule ${ruleId} not found`,
      });
    }
  } catch (error) {
    logger.error('Failed to delete rule:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete rule',
    });
  }
});

// Test rule conversion
app.post('/api/convert/test', async (req, res) => {
  try {
    const { rule_type, rule_content } = req.body;

    if (!rule_type || !rule_content) {
      return res.status(400).json({
        status: 'error',
        message: 'rule_type and rule_content are required',
      });
    }

    const result = await converterService.testConversion(
      rule_type,
      rule_content
    );

    return res.json({
      status: 'success',
      conversion_result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Rule conversion test failed:', error);
    return res.status(500).json({
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Rule conversion test failed',
    });
  }
});

// Get service metrics
app.get('/api/metrics', async (_req, res) => {
  try {
    const metrics = await ingestorService.getMetrics();

    return res.json({
      status: 'success',
      metrics: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get metrics',
    });
  }
});

// Setup scheduled imports
function setupScheduledImports() {
  if (!config.scheduler.enabled) {
    logger.info('Scheduled imports disabled');
    return;
  }

  new CronJob(
    config.scheduler.cronExpression,
    async () => {
      try {
        logger.info('Starting scheduled import...');
        const results = await ingestorService.importFromAllSources(false);
        logger.info('Scheduled import completed:', {
          totalSources: results.length,
          successfulSources: results.filter((r) => r.success).length,
        });
      } catch (error) {
        logger.error('Scheduled import failed:', error);
      }
    },
    null,
    true,
    config.scheduler.timezone
  );

  logger.info(
    `Scheduled imports configured: ${config.scheduler.cronExpression}`
  );
}

// Start the service
async function start() {
  try {
    await initializeServices();

    // Setup scheduled imports
    setupScheduledImports();

    app.listen(PORT, () => {
      logger.info(`Rule Ingestor service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(
        'Features: Sigma, Elastic, OSSEC, Suricata, Splunk, Chronicle rule ingestion'
      );
    });
  } catch (error) {
    logger.error('Failed to start Rule Ingestor service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down Rule Ingestor service...');

  try {
    if (dbService) {
      await dbService.close();
    }

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the service
start();
