import { CircularBuffer } from './circular-buffer';
import { DiskBuffer } from './disk-buffer';
import { CircuitBreaker } from './circuit-breaker';
import { BackpressureMonitor } from './backpressure-monitor';
import { AdaptiveBatchManager } from './adaptive-batch-manager';
import { FlowControlManager } from './flow-control-manager';
import logger from '../utils/logger';
export class BufferManager {
    config;
    memoryBuffer;
    diskBuffer;
    metrics;
    spillToDisk = false;
    isRecovering = false;
    circuitBreaker;
    backpressureMonitor;
    adaptiveBatchManager;
    flowControlManager;
    constructor(config, metrics) {
        this.config = config;
        this.metrics = metrics;
        this.memoryBuffer = new CircularBuffer(config.memoryBufferSize);
        this.diskBuffer = new DiskBuffer(config.diskBufferPath, config.diskBufferSize, config.compressionEnabled);
        // Initialize advanced buffering components
        this.circuitBreaker = new CircuitBreaker(config.circuitBreaker, metrics);
        this.backpressureMonitor = new BackpressureMonitor(config.backpressure, metrics);
        this.adaptiveBatchManager = new AdaptiveBatchManager(config.adaptiveBatch, metrics, this.backpressureMonitor);
        this.flowControlManager = new FlowControlManager(config.flowControl, metrics, this.backpressureMonitor);
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
    async addEvents(events, priority = 3) {
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
                    }
                    else {
                        // Normal operation - use memory buffer
                        this.addToMemoryBuffer(event);
                    }
                });
                successCount++;
            }
            catch (error) {
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
    async getBatch(requestedSize) {
        // Use adaptive batch size if no specific size requested
        const size = requestedSize || this.adaptiveBatchManager.getBatchSize();
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
    adjustFlowControlRate(newRate) {
        this.flowControlManager.adjustRateLimit(newRate);
    }
    adjustBatchSize(newSize) {
        this.adaptiveBatchManager.setBatchSize(newSize);
    }
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }
    isBackpressureActive() {
        return this.backpressureMonitor.isActive();
    }
    isCircuitBreakerOpen() {
        return this.circuitBreaker.isOpen();
    }
    async close() {
        // Close advanced components first
        this.circuitBreaker.destroy();
        this.backpressureMonitor.destroy();
        this.adaptiveBatchManager.destroy();
        this.flowControlManager.destroy();
        // Close disk buffer
        await this.diskBuffer.close();
    }
}
//# sourceMappingURL=buffer-manager.js.map