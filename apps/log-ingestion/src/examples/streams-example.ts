import { StreamTopologyManager, LogEnrichmentProcessor, RealTimeAlertingProcessor } from '../streams';
import logger from '../utils/logger';

/**
 * Example demonstrating how to set up and run Kafka Streams topology
 * for real-time log processing with enrichment and alerting
 */
async function runStreamsExample() {
  logger.info('Starting Kafka Streams example');

  // Create and configure the topology manager
  const topologyManager = new StreamTopologyManager({
    enableEnrichment: true,
    enableAlerting: true,
    enableWindowing: true,
    windowSizeMs: 60000, // 1 minute windows
    windowGracePeriodMs: 30000, // 30 second grace period
    maxBatchSize: 100,
    processingTimeoutMs: 30000,
    enableExactlyOnce: true,
  });

  try {
    // Initialize the topology
    await topologyManager.initialize();
    logger.info('Topology initialized successfully');

    // Add custom enrichment rules
    const enrichmentProcessor = topologyManager.getEnrichmentProcessor();
    if (enrichmentProcessor) {
      enrichmentProcessor.addEnrichmentRule({
        id: 'custom-rule-1',
        name: 'Database Activity Detection',
        condition: (event) => event.message.toLowerCase().includes('database'),
        enrichments: {
          category: 'database',
          subcategory: 'activity',
          tags: ['database', 'data_access']
        },
        priority: 80
      });

      logger.info('Custom enrichment rule added');
    }

    // Add custom alert rules
    const alertingProcessor = topologyManager.getAlertingProcessor();
    if (alertingProcessor) {
      alertingProcessor.addAlertRule({
        id: 'custom-alert-1',
        name: 'Database Error Alert',
        description: 'Database error detected in logs',
        severity: 'high',
        condition: (event) => 
          event.message.toLowerCase().includes('database') &&
          event.message.toLowerCase().includes('error'),
        throttleMs: 300000, // 5 minutes
        enabled: true,
        tags: ['database', 'error'],
        metadata: { category: 'database_monitoring' }
      });

      logger.info('Custom alert rule added');
    }

    // Start the topology
    await topologyManager.start();
    logger.info('Topology started successfully');

    // Monitor the topology
    const monitoringInterval = setInterval(async () => {
      try {
        const health = await topologyManager.healthCheck();
        const metrics = topologyManager.getMetrics();

        logger.info('Topology health check', {
          healthy: health.healthy,
          totalEventsProcessed: metrics.totalEventsProcessed,
          totalAlertsGenerated: metrics.totalAlertsGenerated,
          averageLatency: metrics.averageProcessingLatency.toFixed(2),
          errorRate: metrics.errorRate.toFixed(2)
        });

        // Log detailed processor metrics
        if (metrics.enrichmentProcessor) {
          logger.debug('Enrichment processor metrics', metrics.enrichmentProcessor);
        }

        if (metrics.alertingProcessor) {
          logger.debug('Alerting processor metrics', metrics.alertingProcessor);
        }

      } catch (error) {
        logger.error('Health check failed', error);
      }
    }, 60000); // Every minute

    // Graceful shutdown handling
    const shutdown = async () => {
      logger.info('Shutting down Kafka Streams topology');
      clearInterval(monitoringInterval);
      
      try {
        await topologyManager.stop();
        logger.info('Topology stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    logger.info('Kafka Streams topology is running. Press Ctrl+C to stop.');

  } catch (error) {
    logger.error('Failed to run Kafka Streams example', error);
    process.exit(1);
  }
}

/**
 * Example of standalone enrichment processor
 */
async function runEnrichmentProcessorExample() {
  logger.info('Starting standalone enrichment processor example');

  const enrichmentProcessor = new LogEnrichmentProcessor({
    consumerGroupId: 'standalone-enrichment',
    inputTopic: 'log-events-raw',
    outputTopic: 'log-events-enriched',
    enableWindowing: false,
    windowSizeMs: 0,
    windowGracePeriodMs: 0,
    maxBatchSize: 50,
    processingTimeoutMs: 30000,
    enableExactlyOnce: true,
  });

  try {
    await enrichmentProcessor.initialize();
    await enrichmentProcessor.start();

    logger.info('Standalone enrichment processor started');

    // Monitor metrics
    setInterval(() => {
      const metrics = enrichmentProcessor.getMetrics();
      logger.info('Enrichment metrics', {
        messagesProcessed: metrics.messagesProcessed,
        throughput: metrics.throughputPerSecond.toFixed(2),
        errors: metrics.errorCount,
        lag: metrics.lagMs
      });
    }, 30000);

  } catch (error) {
    logger.error('Failed to run enrichment processor', error);
    process.exit(1);
  }
}

/**
 * Example of standalone alerting processor
 */
async function runAlertingProcessorExample() {
  logger.info('Starting standalone alerting processor example');

  const alertingProcessor = new RealTimeAlertingProcessor({
    consumerGroupId: 'standalone-alerting',
    inputTopic: 'log-events-enriched',
    outputTopic: 'alerts',
    enableWindowing: true,
    windowSizeMs: 300000, // 5 minutes
    windowGracePeriodMs: 60000, // 1 minute
    maxBatchSize: 50,
    processingTimeoutMs: 30000,
    enableExactlyOnce: true,
  });

  try {
    await alertingProcessor.initialize();
    await alertingProcessor.start();

    logger.info('Standalone alerting processor started');

    // Monitor metrics
    setInterval(() => {
      const metrics = alertingProcessor.getMetrics();
      const alertMetrics = alertingProcessor.getAlertingMetrics();
      
      logger.info('Alerting metrics', {
        messagesProcessed: metrics.messagesProcessed,
        alertsGenerated: alertMetrics.totalAlertsGenerated,
        activeRules: alertMetrics.activeRules,
        throughput: metrics.throughputPerSecond.toFixed(2)
      });
    }, 30000);

  } catch (error) {
    logger.error('Failed to run alerting processor', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const example = process.argv[2] || 'topology';

  switch (example) {
    case 'topology':
      runStreamsExample();
      break;
    case 'enrichment':
      runEnrichmentProcessorExample();
      break;
    case 'alerting':
      runAlertingProcessorExample();
      break;
    default:
      console.log('Usage: tsx streams-example.ts [topology|enrichment|alerting]');
      console.log('  topology  - Run complete topology (default)');
      console.log('  enrichment - Run standalone enrichment processor');
      console.log('  alerting  - Run standalone alerting processor');
      process.exit(1);
  }
}