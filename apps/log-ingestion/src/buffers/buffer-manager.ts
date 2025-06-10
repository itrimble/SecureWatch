import { RawLogEvent } from '../types/log-event.types';
import { CircularBuffer } from './circular-buffer';
import { DiskBuffer } from './disk-buffer';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker';
import { BackpressureMonitor, BackpressureConfig } from './backpressure-monitor';
import { AdaptiveBatchManager, AdaptiveBatchConfig } from './adaptive-batch-manager';
import { FlowControlManager, FlowControlConfig } from './flow-control-manager';
import logger from '../utils/logger';

interface BufferManagerConfig {
  memoryBufferSize: number;     // Max events in memory
  diskBufferSize: number;       // Max events on disk
  diskBufferPath: string;       // Path for disk buffer
  highWaterMark: number;        // Percentage to trigger disk spill
  lowWaterMark: number;         // Percentage to stop disk spill
  compressionEnabled: boolean;  // Enable compression for disk buffer
  circuitBreaker: CircuitBreakerConfig;
  backpressure: BackpressureConfig;
  adaptiveBatch: AdaptiveBatchConfig;
  flowControl: FlowControlConfig;
}

export class BufferManager {
  private config: BufferManagerConfig;
  private memoryBuffer: CircularBuffer<RawLogEvent>;
  private diskBuffer: DiskBuffer<RawLogEvent>;
  private metrics: MetricsCollector;
  private spillToDisk: boolean = false;
  private isRecovering: boolean = false;
  private circuitBreaker: CircuitBreaker;
  private backpressureMonitor: BackpressureMonitor;
  private adaptiveBatchManager: AdaptiveBatchManager;
  private flowControlManager: FlowControlManager;

  constructor(config: BufferManagerConfig, metrics: MetricsCollector) {
    this.config = config;
    this.metrics = metrics;
    
    this.memoryBuffer = new CircularBuffer<RawLogEvent>(config.memoryBufferSize);
    this.diskBuffer = new DiskBuffer<RawLogEvent>(
      config.diskBufferPath,
      config.diskBufferSize,
      config.compressionEnabled
    );
    
    // Initialize advanced buffering components
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker, metrics);
    this.backpressureMonitor = new BackpressureMonitor(config.backpressure, metrics);
    this.adaptiveBatchManager = new AdaptiveBatchManager(
      config.adaptiveBatch, 
      metrics, 
      this.backpressureMonitor
    );
    this.flowControlManager = new FlowControlManager(
      config.flowControl,
      metrics,
      this.backpressureMonitor
    );
  }

  async initialize(): Promise<void> {
    await this.diskBuffer.initialize();
    
    // Check for any persisted events from previous runs
    const persistedCount = await this.diskBuffer.getSize();
    if (persistedCount > 0) {
      logger.info(`Found ${persistedCount} persisted events in disk buffer`);
      this.isRecovering = true;
    }
  }

  async addEvent(event: RawLogEvent): Promise<void> {
    await this.addEvents([event]);
  }

  async addEvents(events: RawLogEvent[], priority: number = 3): Promise<void> {
    // Check flow control first
    const flowPermission = await this.flowControlManager.requestPermission(events.length, priority);
    if (!flowPermission) {
      logger.debug(`Flow control rejected ${events.length} events`, { priority });
      this.metrics.incrementCounter('buffer.flow_control_rejected', {}, events.length);
      return;
    }

    // Update backpressure monitor with current queue depth
    const currentDepth = await this.getTotalSize();
    this.backpressureMonitor.updateQueueDepth(currentDepth);

    const memoryUsage = this.memoryBuffer.getUsagePercentage();
    
    // Check if we need to spill to disk
    if (memoryUsage >= this.config.highWaterMark && !this.spillToDisk) {
      this.spillToDisk = true;
      logger.warn('Memory buffer high water mark reached, spilling to disk');
      this.metrics.incrementCounter('buffer.spill_to_disk_started');
    }

    // Check if we can stop spilling to disk
    if (memoryUsage <= this.config.lowWaterMark && this.spillToDisk) {
      this.spillToDisk = false;
      logger.info('Memory buffer low water mark reached, stopped spilling to disk');
      this.metrics.incrementCounter('buffer.spill_to_disk_stopped');
    }

    // Process events with circuit breaker protection
    const startTime = Date.now();
    let successCount = 0;
    
    for (const event of events) {
      try {
        await this.circuitBreaker.execute(async () => {
          if (this.spillToDisk || this.isRecovering) {
            // Write to disk when memory is full or recovering
            await this.diskBuffer.write(event);
            this.metrics.incrementCounter('buffer.disk_writes');
          } else {
            // Normal operation - use memory buffer
            this.addToMemoryBuffer(event);
          }
        });
        successCount++;
      } catch (error) {
        logger.error('Failed to add event to buffer', error);
        this.metrics.incrementCounter('buffer.add_event_errors');
        
        // Try fallback to memory buffer if disk failed
        if (this.spillToDisk || this.isRecovering) {
          this.addToMemoryBuffer(event);
        }
      }
    }

    // Record processing metrics for backpressure monitoring
    const processingTime = Date.now() - startTime;
    this.backpressureMonitor.recordRequest(processingTime, successCount === events.length);

    // Update adaptive batch manager
    if (events.length > 0) {
      const throughput = (successCount / processingTime) * 1000; // events per second
      this.adaptiveBatchManager.recordBatchProcessing(events.length, processingTime, throughput);
    }

    // Update metrics
    this.updateMetrics();
  }

  private addToMemoryBuffer(event: RawLogEvent): void {
    const dropped = this.memoryBuffer.add(event);
    if (dropped) {
      this.metrics.incrementCounter('buffer.events_dropped');
      logger.warn('Event dropped due to full memory buffer');
    } else {
      this.metrics.incrementCounter('buffer.memory_writes');
    }
  }

  async getBatch(requestedSize?: number): Promise<RawLogEvent[]> {
    // Use adaptive batch size if no specific size requested
    const size = requestedSize || this.adaptiveBatchManager.getBatchSize();
    const batch: RawLogEvent[] = [];
    
    // First, try to get events from memory buffer
    while (batch.length < size && !this.memoryBuffer.isEmpty()) {
      const event = this.memoryBuffer.get();
      if (event) {
        batch.push(event);
      }
    }

    // If we need more events and have disk buffer, read from disk
    if (batch.length < size && (this.spillToDisk || this.isRecovering)) {
      const diskEvents = await this.diskBuffer.read(size - batch.length);
      batch.push(...diskEvents);
      
      if (diskEvents.length > 0) {
        this.metrics.incrementCounter('buffer.disk_reads', {}, diskEvents.length);
      }

      // Check if we've recovered all disk events
      const diskSize = await this.diskBuffer.getSize();
      if (diskSize === 0 && this.isRecovering) {
        this.isRecovering = false;
        logger.info('Completed recovery of persisted events');
      }
    }

    return batch;
  }

  async getBatches(batchSize: number): Promise<RawLogEvent[][]> {
    const batches: RawLogEvent[][] = [];
    let batch = await this.getBatch(batchSize);
    
    while (batch.length > 0) {
      batches.push(batch);
      batch = await this.getBatch(batchSize);
    }
    
    return batches;
  }

  async requeueEvents(events: RawLogEvent[]): Promise<void> {
    // Re-queue failed events to the front of the buffer
    for (const event of events.reverse()) {
      this.memoryBuffer.addFront(event);
    }
    this.metrics.incrementCounter('buffer.events_requeued', {}, events.length);
  }

  async flush(): Promise<RawLogEvent[]> {
    const allEvents: RawLogEvent[] = [];
    
    // Get all events from memory buffer
    while (!this.memoryBuffer.isEmpty()) {
      const event = this.memoryBuffer.get();
      if (event) {
        allEvents.push(event);
      }
    }

    // Get all events from disk buffer
    if (this.spillToDisk || this.isRecovering) {
      let diskEvents = await this.diskBuffer.read(1000);
      while (diskEvents.length > 0) {
        allEvents.push(...diskEvents);
        diskEvents = await this.diskBuffer.read(1000);
      }
    }

    logger.info(`Flushed ${allEvents.length} events from buffers`);
    return allEvents;
  }

  getSize(): number {
    return this.memoryBuffer.getSize();
  }

  async getTotalSize(): Promise<number> {
    const memorySize = this.memoryBuffer.getSize();
    const diskSize = await this.diskBuffer.getSize();
    return memorySize + diskSize;
  }

  private updateMetrics(): void {
    this.metrics.setGauge('buffer.memory_size', this.memoryBuffer.getSize());
    this.metrics.setGauge('buffer.memory_usage_percent', this.memoryBuffer.getUsagePercentage());
    this.metrics.setGauge('buffer.spilling_to_disk', this.spillToDisk ? 1 : 0);
    
    // Update disk metrics asynchronously
    this.diskBuffer.getSize().then(size => {
      this.metrics.setGauge('buffer.disk_size', size);
    }).catch(error => {
      logger.error('Failed to get disk buffer size', error);
    });
  }

  // Enhanced methods for backpressure and flow control management
  getBackpressureMetrics() {
    return this.backpressureMonitor.getMetrics();
  }

  getFlowControlMetrics() {
    return this.flowControlManager.getMetrics();
  }

  getAdaptiveBatchMetrics() {
    return this.adaptiveBatchManager.getMetrics();
  }

  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  adjustFlowControlRate(newRate: number): void {
    this.flowControlManager.adjustRateLimit(newRate);
  }

  adjustBatchSize(newSize: number): void {
    this.adaptiveBatchManager.setBatchSize(newSize);
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  isBackpressureActive(): boolean {
    return this.backpressureMonitor.isActive();
  }

  isCircuitBreakerOpen(): boolean {
    return this.circuitBreaker.isOpen();
  }

  async close(): Promise<void> {
    // Close advanced components first
    this.circuitBreaker.destroy();
    this.backpressureMonitor.destroy();
    this.adaptiveBatchManager.destroy();
    this.flowControlManager.destroy();
    
    // Close disk buffer
    await this.diskBuffer.close();
  }
}