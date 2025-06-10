// Export all stream processing components
export { KafkaStreamProcessor, StreamProcessorConfig, WindowedEvent, ProcessingMetrics } from './kafka-streams-processor';
export { LogEnrichmentProcessor, EnrichmentRule, GeoIPData, ThreatIntelData } from './log-enrichment-processor';
export { RealTimeAlertingProcessor, AlertRule, Alert } from './real-time-alerting-processor';
export { StreamTopologyManager, TopologyConfig, TopologyMetrics } from './stream-topology-manager';

// Re-export Kafka configuration for convenience
export { kafkaConfig, producerConfig, consumerConfig, topics, performanceConfig } from '../config/kafka.config';

// Example usage and configuration
export const defaultTopologyConfig = {
  enableEnrichment: true,
  enableAlerting: true,
  enableWindowing: true,
  windowSizeMs: 60000, // 1 minute
  windowGracePeriodMs: 30000, // 30 seconds
  maxBatchSize: 100,
  processingTimeoutMs: 30000,
  enableExactlyOnce: true,
};

export const defaultEnrichmentConfig = {
  consumerGroupId: 'log-enrichment-processors',
  inputTopic: 'log-events-raw',
  outputTopic: 'log-events-enriched',
  enableWindowing: true,
  windowSizeMs: 60000,
  windowGracePeriodMs: 30000,
  maxBatchSize: 100,
  processingTimeoutMs: 30000,
  enableExactlyOnce: true,
};

export const defaultAlertingConfig = {
  consumerGroupId: 'real-time-alerting-processors',
  inputTopic: 'log-events-enriched',
  outputTopic: 'alerts',
  enableWindowing: true,
  windowSizeMs: 60000,
  windowGracePeriodMs: 30000,
  maxBatchSize: 100,
  processingTimeoutMs: 30000,
  enableExactlyOnce: true,
};