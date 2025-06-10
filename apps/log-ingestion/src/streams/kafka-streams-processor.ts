import { Kafka, Consumer, Producer, EachMessagePayload, EachBatchPayload } from 'kafkajs';
import { kafkaConfig, producerConfig, consumerConfig, topics, performanceConfig } from '../config/kafka.config';
import { RawLogEvent, NormalizedLogEvent, EnrichedLogEvent } from '../types/log-event.types';
import { SerializationManager } from '../serialization/serialization-manager';
import { performance } from 'perf_hooks';
import logger from '../utils/logger';

export interface StreamProcessorConfig {
  consumerGroupId: string;
  inputTopic: string;
  outputTopic: string;
  enableWindowing: boolean;
  windowSizeMs: number;
  windowGracePeriodMs: number;
  maxBatchSize: number;
  processingTimeoutMs: number;
  enableExactlyOnce: boolean;
  stateStorePath?: string;
}

export interface WindowedEvent {
  windowStart: number;
  windowEnd: number;
  events: RawLogEvent[];
  aggregations?: Map<string, any>;
}

export interface ProcessingMetrics {
  messagesProcessed: number;
  processingTimeMs: number;
  throughputPerSecond: number;
  errorCount: number;
  lagMs: number;
  windowCount?: number;
}

export abstract class KafkaStreamProcessor {
  protected kafka: Kafka;
  protected consumer: Consumer;
  protected producer: Producer;
  protected config: StreamProcessorConfig;
  protected serializer: SerializationManager;
  protected stateStore: Map<string, any> = new Map();
  protected windows: Map<string, WindowedEvent> = new Map();
  protected metrics: ProcessingMetrics = {
    messagesProcessed: 0,
    processingTimeMs: 0,
    throughputPerSecond: 0,
    errorCount: 0,
    lagMs: 0,
    windowCount: 0
  };
  protected isRunning: boolean = false;

  constructor(config: StreamProcessorConfig) {
    this.config = config;
    this.kafka = new Kafka(kafkaConfig);
    
    this.consumer = this.kafka.consumer({
      ...consumerConfig,
      groupId: config.consumerGroupId,
    });

    this.producer = this.kafka.producer({
      ...producerConfig,
      idempotent: config.enableExactlyOnce,
      transactionTimeout: config.processingTimeoutMs || 30000,
    });

    this.serializer = new SerializationManager({
      compressionEnabled: true,
      performanceMetrics: true,
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Kafka stream processor', {
      consumerGroup: this.config.consumerGroupId,
      inputTopic: this.config.inputTopic,
      outputTopic: this.config.outputTopic
    });

    await this.serializer.initialize();
    await this.consumer.connect();
    await this.producer.connect();
    
    await this.consumer.subscribe({ 
      topic: this.config.inputTopic,
      fromBeginning: false 
    });

    // Initialize exactly-once processing if enabled
    if (this.config.enableExactlyOnce) {
      await this.producer.initTransactions();
    }

    logger.info('Kafka stream processor initialized successfully');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Stream processor is already running');
    }

    this.isRunning = true;
    logger.info('Starting Kafka stream processor');

    // Start window cleanup if windowing is enabled
    if (this.config.enableWindowing) {
      this.startWindowCleanup();
    }

    await this.consumer.run({
      autoCommit: !this.config.enableExactlyOnce,
      autoCommitInterval: 1000,
      eachBatchAutoResolve: false,
      eachBatch: async (payload: EachBatchPayload) => {
        await this.processBatch(payload);
      },
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Kafka stream processor');
    this.isRunning = false;

    await this.consumer.stop();
    await this.consumer.disconnect();
    await this.producer.disconnect();
    await this.serializer.close();

    logger.info('Kafka stream processor stopped');
  }

  private async processBatch(payload: EachBatchPayload): Promise<void> {
    const { batch, resolveOffset, heartbeat, commitOffsetsIfNecessary } = payload;
    const startTime = performance.now();

    try {
      // Begin transaction for exactly-once processing
      if (this.config.enableExactlyOnce) {
        await this.producer.transaction(async (producer) => {
          await this.processBatchWithTransaction(batch.messages, producer, resolveOffset);
        });
      } else {
        await this.processBatchMessages(batch.messages, resolveOffset);
      }

      // Commit offsets
      if (!this.config.enableExactlyOnce) {
        await commitOffsetsIfNecessary();
      }

      // Send heartbeat to maintain group membership
      await heartbeat();

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(batch.messages.length, processingTime);

    } catch (error) {
      logger.error('Batch processing failed', error);
      this.metrics.errorCount++;
      throw error;
    }
  }

  private async processBatchWithTransaction(
    messages: any[],
    producer: Producer,
    resolveOffset: (offset: string) => void
  ): Promise<void> {
    for (const message of messages) {
      try {
        const result = await this.processMessage(message);
        
        if (result) {
          await producer.send({
            topic: this.config.outputTopic,
            messages: [{
              key: message.key,
              value: Buffer.from(JSON.stringify(result)),
              timestamp: new Date().getTime().toString(),
            }],
          });
        }

        resolveOffset(message.offset);
      } catch (error) {
        logger.error('Message processing failed in transaction', error);
        throw error;
      }
    }
  }

  private async processBatchMessages(
    messages: any[],
    resolveOffset: (offset: string) => void
  ): Promise<void> {
    const outputMessages: any[] = [];

    // Process messages in parallel for better throughput
    const processingPromises = messages.map(async (message) => {
      try {
        const result = await this.processMessage(message);
        
        if (result) {
          outputMessages.push({
            key: message.key,
            value: Buffer.from(JSON.stringify(result)),
            timestamp: new Date().getTime().toString(),
          });
        }

        resolveOffset(message.offset);
        return true;
      } catch (error) {
        logger.error('Message processing failed', error);
        this.metrics.errorCount++;
        return false;
      }
    });

    await Promise.allSettled(processingPromises);

    // Send all processed messages in a single batch
    if (outputMessages.length > 0) {
      await this.producer.send({
        topic: this.config.outputTopic,
        messages: outputMessages,
      });
    }
  }

  private async processMessage(message: any): Promise<any> {
    try {
      // Calculate lag
      const messageTimestamp = parseInt(message.timestamp || '0');
      const currentTime = Date.now();
      this.metrics.lagMs = Math.max(0, currentTime - messageTimestamp);

      // Parse input message
      const rawEvent: RawLogEvent = JSON.parse(message.value?.toString() || '{}');

      // Apply windowing if enabled
      if (this.config.enableWindowing) {
        return await this.processWithWindowing(rawEvent, messageTimestamp);
      } else {
        return await this.processEvent(rawEvent);
      }

    } catch (error) {
      logger.error('Message processing error', error);
      throw error;
    }
  }

  private async processWithWindowing(event: RawLogEvent, timestamp: number): Promise<any> {
    const windowKey = this.getWindowKey(timestamp);
    const windowStart = this.getWindowStart(timestamp);
    const windowEnd = windowStart + this.config.windowSizeMs;

    // Get or create window
    let window = this.windows.get(windowKey);
    if (!window) {
      window = {
        windowStart,
        windowEnd,
        events: [],
        aggregations: new Map(),
      };
      this.windows.set(windowKey, window);
      this.metrics.windowCount = this.windows.size;
    }

    // Add event to window
    window.events.push(event);

    // Process window if it's ready
    if (this.isWindowReady(window, timestamp)) {
      const result = await this.processWindow(window);
      this.windows.delete(windowKey);
      this.metrics.windowCount = this.windows.size;
      return result;
    }

    return null; // Window not ready yet
  }

  private getWindowKey(timestamp: number): string {
    const windowStart = this.getWindowStart(timestamp);
    return `window-${windowStart}`;
  }

  private getWindowStart(timestamp: number): number {
    return Math.floor(timestamp / this.config.windowSizeMs) * this.config.windowSizeMs;
  }

  private isWindowReady(window: WindowedEvent, currentTimestamp: number): boolean {
    const gracePeriodEnd = window.windowEnd + this.config.windowGracePeriodMs;
    return currentTimestamp >= gracePeriodEnd;
  }

  private startWindowCleanup(): void {
    setInterval(() => {
      const currentTime = Date.now();
      const expiredWindows: string[] = [];

      for (const [key, window] of this.windows) {
        const expireTime = window.windowEnd + this.config.windowGracePeriodMs + 60000; // Extra 1 minute buffer
        if (currentTime > expireTime) {
          expiredWindows.push(key);
        }
      }

      // Clean up expired windows
      for (const key of expiredWindows) {
        this.windows.delete(key);
      }

      if (expiredWindows.length > 0) {
        logger.debug(`Cleaned up ${expiredWindows.length} expired windows`);
        this.metrics.windowCount = this.windows.size;
      }
    }, 30000); // Clean up every 30 seconds
  }

  protected updateMetrics(messageCount: number, processingTimeMs: number): void {
    this.metrics.messagesProcessed += messageCount;
    this.metrics.processingTimeMs += processingTimeMs;
    
    const totalSeconds = this.metrics.processingTimeMs / 1000;
    this.metrics.throughputPerSecond = totalSeconds > 0 ? this.metrics.messagesProcessed / totalSeconds : 0;
  }

  // Abstract methods to be implemented by concrete processors
  protected abstract processEvent(event: RawLogEvent): Promise<any>;
  protected abstract processWindow(window: WindowedEvent): Promise<any>;

  // State store operations
  protected setState(key: string, value: any): void {
    this.stateStore.set(key, value);
  }

  protected getState(key: string): any {
    return this.stateStore.get(key);
  }

  protected deleteState(key: string): boolean {
    return this.stateStore.delete(key);
  }

  // Metrics access
  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  getStateStoreSize(): number {
    return this.stateStore.size;
  }

  getWindowCount(): number {
    return this.windows.size;
  }
}