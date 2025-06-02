import { RawLogEvent } from '../types/log-event.types';
import { CircularBuffer } from './circular-buffer';
import { DiskBuffer } from './disk-buffer';
import { MetricsCollector } from '../monitoring/metrics-collector';
import logger from '../utils/logger';

interface BufferManagerConfig {
  memoryBufferSize: number;     // Max events in memory
  diskBufferSize: number;       // Max events on disk
  diskBufferPath: string;       // Path for disk buffer
  highWaterMark: number;        // Percentage to trigger disk spill
  lowWaterMark: number;         // Percentage to stop disk spill
  compressionEnabled: boolean;  // Enable compression for disk buffer
}

export class BufferManager {
  private config: BufferManagerConfig;
  private memoryBuffer: CircularBuffer<RawLogEvent>;
  private diskBuffer: DiskBuffer<RawLogEvent>;
  private metrics: MetricsCollector;
  private spillToDisk: boolean = false;
  private isRecovering: boolean = false;

  constructor(config: BufferManagerConfig, metrics: MetricsCollector) {
    this.config = config;
    this.metrics = metrics;
    
    this.memoryBuffer = new CircularBuffer<RawLogEvent>(config.memoryBufferSize);
    this.diskBuffer = new DiskBuffer<RawLogEvent>(
      config.diskBufferPath,
      config.diskBufferSize,
      config.compressionEnabled
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

  async addEvents(events: RawLogEvent[]): Promise<void> {
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

    // Process events
    for (const event of events) {
      if (this.spillToDisk || this.isRecovering) {
        // Write to disk when memory is full or recovering
        try {
          await this.diskBuffer.write(event);
          this.metrics.incrementCounter('buffer.disk_writes');
        } catch (error) {
          logger.error('Failed to write event to disk buffer', error);
          this.metrics.incrementCounter('buffer.disk_write_errors');
          // Try memory buffer as fallback
          this.addToMemoryBuffer(event);
        }
      } else {
        // Normal operation - use memory buffer
        this.addToMemoryBuffer(event);
      }
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

  async getBatch(size: number): Promise<RawLogEvent[]> {
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

  async close(): Promise<void> {
    await this.diskBuffer.close();
  }
}

// Circular buffer implementation for memory buffering
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private capacity: number;
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  add(item: T): T | undefined {
    let dropped: T | undefined;
    
    if (this.size === this.capacity) {
      // Buffer is full, drop oldest item
      dropped = this.buffer[this.head];
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.size++;
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    return dropped;
  }

  addFront(item: T): void {
    // Add to front of buffer (for re-queuing)
    this.head = (this.head - 1 + this.capacity) % this.capacity;
    this.buffer[this.head] = item;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      // Move tail back if buffer was full
      this.tail = (this.tail - 1 + this.capacity) % this.capacity;
    }
  }

  get(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    
    return item;
  }

  peek(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }
    return this.buffer[this.head];
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  getSize(): number {
    return this.size;
  }

  getUsagePercentage(): number {
    return (this.size / this.capacity) * 100;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
}