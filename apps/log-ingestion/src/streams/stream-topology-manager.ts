import { Kafka } from 'kafkajs';
import { kafkaConfig, topics } from '../config/kafka.config';
import { LogEnrichmentProcessor } from './log-enrichment-processor';
import { RealTimeAlertingProcessor } from './real-time-alerting-processor';
import { StreamProcessorConfig } from './kafka-streams-processor';
import logger from '../utils/logger';

export interface TopologyConfig {
  enableEnrichment: boolean;
  enableAlerting: boolean;
  enableWindowing: boolean;
  windowSizeMs: number;
  windowGracePeriodMs: number;
  maxBatchSize: number;
  processingTimeoutMs: number;
  enableExactlyOnce: boolean;
}

export interface TopologyMetrics {
  enrichmentProcessor?: any;
  alertingProcessor?: any;
  totalEventsProcessed: number;
  totalAlertsGenerated: number;
  averageProcessingLatency: number;
  errorRate: number;
}

/**
 * Manages the complete Kafka Streams topology for real-time log processing
 * 
 * Topology Flow:
 * 1. Raw Events (log-events-raw) -> Enrichment Processor -> Enriched Events (log-events-enriched)
 * 2. Enriched Events -> Alerting Processor -> Alerts (alerts)
 * 3. Failed events go to Dead Letter Queue (log-events-dlq)
 */
export class StreamTopologyManager {
  private kafka: Kafka;
  private config: TopologyConfig;
  private enrichmentProcessor?: LogEnrichmentProcessor;
  private alertingProcessor?: RealTimeAlertingProcessor;
  private isRunning: boolean = false;
  private metrics: TopologyMetrics = {
    totalEventsProcessed: 0,
    totalAlertsGenerated: 0,
    averageProcessingLatency: 0,
    errorRate: 0
  };

  constructor(config: Partial<TopologyConfig> = {}) {
    this.config = {
      enableEnrichment: true,
      enableAlerting: true,
      enableWindowing: true,
      windowSizeMs: 60000, // 1 minute windows
      windowGracePeriodMs: 30000, // 30 second grace period
      maxBatchSize: 100,
      processingTimeoutMs: 30000,
      enableExactlyOnce: true,
      ...config
    };

    this.kafka = new Kafka(kafkaConfig);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Kafka Streams topology', this.config);

    try {
      // Initialize enrichment processor
      if (this.config.enableEnrichment) {
        await this.initializeEnrichmentProcessor();
      }

      // Initialize alerting processor
      if (this.config.enableAlerting) {
        await this.initializeAlertingProcessor();
      }

      // Verify topics exist
      await this.verifyTopics();

      logger.info('Kafka Streams topology initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Kafka Streams topology', error);
      throw error;
    }
  }

  private async initializeEnrichmentProcessor(): Promise<void> {
    const enrichmentConfig: StreamProcessorConfig = {
      consumerGroupId: 'log-enrichment-processors',
      inputTopic: topics.raw,
      outputTopic: topics.enriched,
      enableWindowing: this.config.enableWindowing,
      windowSizeMs: this.config.windowSizeMs,
      windowGracePeriodMs: this.config.windowGracePeriodMs,
      maxBatchSize: this.config.maxBatchSize,
      processingTimeoutMs: this.config.processingTimeoutMs,
      enableExactlyOnce: this.config.enableExactlyOnce,
    };

    this.enrichmentProcessor = new LogEnrichmentProcessor(enrichmentConfig);
    await this.enrichmentProcessor.initialize();

    logger.info('Log enrichment processor initialized');
  }

  private async initializeAlertingProcessor(): Promise<void> {
    const alertingConfig: StreamProcessorConfig = {
      consumerGroupId: 'real-time-alerting-processors',
      inputTopic: topics.enriched,
      outputTopic: topics.alerts,
      enableWindowing: this.config.enableWindowing,
      windowSizeMs: this.config.windowSizeMs,
      windowGracePeriodMs: this.config.windowGracePeriodMs,
      maxBatchSize: this.config.maxBatchSize,
      processingTimeoutMs: this.config.processingTimeoutMs,
      enableExactlyOnce: this.config.enableExactlyOnce,
    };

    this.alertingProcessor = new RealTimeAlertingProcessor(alertingConfig);
    await this.alertingProcessor.initialize();

    logger.info('Real-time alerting processor initialized');
  }

  private async verifyTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const topicNames = [topics.raw, topics.normalized, topics.enriched, topics.alerts, topics.dlq];
      const existingTopics = await admin.listTopics();

      const missingTopics = topicNames.filter(topic => !existingTopics.includes(topic));

      if (missingTopics.length > 0) {
        logger.warn('Missing topics detected, creating them', { missingTopics });

        await admin.createTopics({
          topics: missingTopics.map(topic => ({
            topic,
            numPartitions: 10, // Optimized for parallel processing
            replicationFactor: 3, // High availability
            configEntries: [
              { name: 'compression.type', value: 'zstd' },
              { name: 'cleanup.policy', value: 'delete' },
              { name: 'retention.ms', value: '604800000' }, // 7 days
              { name: 'max.message.bytes', value: '10485760' }, // 10MB
            ]
          }))
        });

        logger.info('Missing topics created successfully');
      }

    } finally {
      await admin.disconnect();
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Stream topology is already running');
    }

    logger.info('Starting Kafka Streams topology');

    try {
      // Start processors in order
      if (this.enrichmentProcessor) {
        await this.enrichmentProcessor.start();
        logger.info('Enrichment processor started');
      }

      if (this.alertingProcessor) {
        await this.alertingProcessor.start();
        logger.info('Alerting processor started');
      }

      this.isRunning = true;

      // Start metrics collection
      this.startMetricsCollection();

      logger.info('Kafka Streams topology started successfully');

    } catch (error) {
      logger.error('Failed to start Kafka Streams topology', error);
      await this.stop(); // Cleanup on failure
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Kafka Streams topology');

    try {
      // Stop processors in reverse order
      if (this.alertingProcessor) {
        await this.alertingProcessor.stop();
        logger.info('Alerting processor stopped');
      }

      if (this.enrichmentProcessor) {
        await this.enrichmentProcessor.stop();
        logger.info('Enrichment processor stopped');
      }

      this.isRunning = false;

      logger.info('Kafka Streams topology stopped successfully');

    } catch (error) {
      logger.error('Error while stopping Kafka Streams topology', error);
      throw error;
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update metrics every 30 seconds
  }

  private updateMetrics(): void {
    if (!this.isRunning) return;

    try {
      let totalEventsProcessed = 0;
      let totalAlertsGenerated = 0;
      let totalLatency = 0;
      let totalErrors = 0;

      // Collect enrichment processor metrics
      if (this.enrichmentProcessor) {
        const enrichmentMetrics = this.enrichmentProcessor.getMetrics();
        this.metrics.enrichmentProcessor = enrichmentMetrics;
        totalEventsProcessed += enrichmentMetrics.messagesProcessed;
        totalLatency += enrichmentMetrics.processingTimeMs;
        totalErrors += enrichmentMetrics.errorCount;
      }

      // Collect alerting processor metrics
      if (this.alertingProcessor) {
        const alertingMetrics = this.alertingProcessor.getMetrics();
        const alertingStats = this.alertingProcessor.getAlertingMetrics();
        this.metrics.alertingProcessor = { ...alertingMetrics, ...alertingStats };
        totalEventsProcessed += alertingMetrics.messagesProcessed;
        totalLatency += alertingMetrics.processingTimeMs;
        totalErrors += alertingMetrics.errorCount;
        totalAlertsGenerated += alertingStats.totalAlertsGenerated;
      }

      // Update aggregate metrics
      this.metrics.totalEventsProcessed = totalEventsProcessed;
      this.metrics.totalAlertsGenerated = totalAlertsGenerated;
      this.metrics.averageProcessingLatency = totalEventsProcessed > 0 ? totalLatency / totalEventsProcessed : 0;
      this.metrics.errorRate = totalEventsProcessed > 0 ? (totalErrors / totalEventsProcessed) * 100 : 0;

      logger.debug('Topology metrics updated', {
        eventsProcessed: totalEventsProcessed,
        alertsGenerated: totalAlertsGenerated,
        avgLatency: this.metrics.averageProcessingLatency.toFixed(2),
        errorRate: this.metrics.errorRate.toFixed(2)
      });

    } catch (error) {
      logger.error('Failed to update topology metrics', error);
    }
  }

  // Public API for managing the topology
  getMetrics(): TopologyMetrics {
    return { ...this.metrics };
  }

  isTopologyRunning(): boolean {
    return this.isRunning;
  }

  async restartTopology(): Promise<void> {
    logger.info('Restarting Kafka Streams topology');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    await this.start();
  }

  // Enrichment processor management
  getEnrichmentProcessor(): LogEnrichmentProcessor | undefined {
    return this.enrichmentProcessor;
  }

  // Alerting processor management
  getAlertingProcessor(): RealTimeAlertingProcessor | undefined {
    return this.alertingProcessor;
  }

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean;
    processors: {
      enrichment?: boolean;
      alerting?: boolean;
    };
    metrics: TopologyMetrics;
  }> {
    const processors: any = {};

    if (this.enrichmentProcessor) {
      try {
        const metrics = this.enrichmentProcessor.getMetrics();
        processors.enrichment = metrics.errorCount < 100; // Healthy if less than 100 errors
      } catch {
        processors.enrichment = false;
      }
    }

    if (this.alertingProcessor) {
      try {
        const metrics = this.alertingProcessor.getMetrics();
        processors.alerting = metrics.errorCount < 100; // Healthy if less than 100 errors
      } catch {
        processors.alerting = false;
      }
    }

    const healthy = this.isRunning && 
                   Object.values(processors).every(status => status !== false);

    return {
      healthy,
      processors,
      metrics: this.getMetrics()
    };
  }

  // Configuration updates
  async updateConfig(newConfig: Partial<TopologyConfig>): Promise<void> {
    logger.info('Updating topology configuration', newConfig);
    
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning) {
      await this.initialize();
      await this.start();
    }

    logger.info('Topology configuration updated successfully');
  }

  // Monitoring and debugging
  async dumpTopologyState(): Promise<any> {
    const state: any = {
      config: this.config,
      isRunning: this.isRunning,
      metrics: this.metrics,
    };

    if (this.enrichmentProcessor) {
      state.enrichmentProcessor = {
        metrics: this.enrichmentProcessor.getMetrics(),
        stateStoreSize: this.enrichmentProcessor.getStateStoreSize(),
        windowCount: this.enrichmentProcessor.getWindowCount(),
      };
    }

    if (this.alertingProcessor) {
      state.alertingProcessor = {
        metrics: this.alertingProcessor.getMetrics(),
        alertingMetrics: this.alertingProcessor.getAlertingMetrics(),
        stateStoreSize: this.alertingProcessor.getStateStoreSize(),
        windowCount: this.alertingProcessor.getWindowCount(),
      };
    }

    return state;
  }
}