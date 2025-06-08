import { DiskBuffer } from './disk-buffer';
import logger from '../utils/logger';
export class BufferManager {
    config;
    memoryBuffer;
    diskBuffer;
    metrics;
    spillToDisk = false;
    isRecovering = false;
    constructor(config, metrics) {
        this.config = config;
        this.metrics = metrics;
        this.memoryBuffer = new CircularBuffer(config.memoryBufferSize);
        this.diskBuffer = new DiskBuffer(config.diskBufferPath, config.diskBufferSize, config.compressionEnabled);
    }
    async initialize() {
        await this.diskBuffer.initialize();
        // Check for any persisted events from previous runs
        const persistedCount = await this.diskBuffer.getSize();
        if (persistedCount > 0) {
            logger.info(`Found ${persistedCount} persisted events in disk buffer`);
            this.isRecovering = true;
        }
    }
    async addEvent(event) {
        await this.addEvents([event]);
    }
    async addEvents(events) {
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
                }
                catch (error) {
                    logger.error('Failed to write event to disk buffer', error);
                    this.metrics.incrementCounter('buffer.disk_write_errors');
                    // Try memory buffer as fallback
                    this.addToMemoryBuffer(event);
                }
            }
            else {
                // Normal operation - use memory buffer
                this.addToMemoryBuffer(event);
            }
        }
        // Update metrics
        this.updateMetrics();
    }
    addToMemoryBuffer(event) {
        const dropped = this.memoryBuffer.add(event);
        if (dropped) {
            this.metrics.incrementCounter('buffer.events_dropped');
            logger.warn('Event dropped due to full memory buffer');
        }
        else {
            this.metrics.incrementCounter('buffer.memory_writes');
        }
    }
    async getBatch(size) {
        const batch = [];
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
    async getBatches(batchSize) {
        const batches = [];
        let batch = await this.getBatch(batchSize);
        while (batch.length > 0) {
            batches.push(batch);
            batch = await this.getBatch(batchSize);
        }
        return batches;
    }
    async requeueEvents(events) {
        // Re-queue failed events to the front of the buffer
        for (const event of events.reverse()) {
            this.memoryBuffer.addFront(event);
        }
        this.metrics.incrementCounter('buffer.events_requeued', {}, events.length);
    }
    async flush() {
        const allEvents = [];
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
    getSize() {
        return this.memoryBuffer.getSize();
    }
    async getTotalSize() {
        const memorySize = this.memoryBuffer.getSize();
        const diskSize = await this.diskBuffer.getSize();
        return memorySize + diskSize;
    }
    updateMetrics() {
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
    async close() {
        await this.diskBuffer.close();
    }
}
// Circular buffer implementation for memory buffering
class CircularBuffer {
    buffer;
    capacity;
    head = 0;
    tail = 0;
    size = 0;
    constructor(capacity) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    add(item) {
        let dropped;
        if (this.size === this.capacity) {
            // Buffer is full, drop oldest item
            dropped = this.buffer[this.head];
            this.head = (this.head + 1) % this.capacity;
        }
        else {
            this.size++;
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        return dropped;
    }
    addFront(item) {
        // Add to front of buffer (for re-queuing)
        this.head = (this.head - 1 + this.capacity) % this.capacity;
        this.buffer[this.head] = item;
        if (this.size < this.capacity) {
            this.size++;
        }
        else {
            // Move tail back if buffer was full
            this.tail = (this.tail - 1 + this.capacity) % this.capacity;
        }
    }
    get() {
        if (this.size === 0) {
            return undefined;
        }
        const item = this.buffer[this.head];
        this.buffer[this.head] = undefined;
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        return item;
    }
    peek() {
        if (this.size === 0) {
            return undefined;
        }
        return this.buffer[this.head];
    }
    isEmpty() {
        return this.size === 0;
    }
    getSize() {
        return this.size;
    }
    getUsagePercentage() {
        return (this.size / this.capacity) * 100;
    }
    clear() {
        this.buffer = new Array(this.capacity);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
}
//# sourceMappingURL=buffer-manager.js.map