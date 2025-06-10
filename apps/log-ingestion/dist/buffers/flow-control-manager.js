import { EventEmitter } from 'events';
import logger from '../utils/logger';
export class FlowControlManager extends EventEmitter {
    config;
    metrics;
    backpressureMonitor;
    tokenBucket;
    slidingWindow = [];
    emergencyModeActive = false;
    throttledEventCount = 0;
    priorityQueues = new Map();
    constructor(config, metrics, backpressureMonitor) {
        super();
        this.config = config;
        this.metrics = metrics;
        this.backpressureMonitor = backpressureMonitor;
        // Initialize token bucket
        this.tokenBucket = {
            capacity: config.burstSize,
            tokens: config.burstSize,
            fillRate: config.maxEventsPerSecond,
            lastRefill: Date.now()
        };
        // Initialize priority queues
        for (let i = 1; i <= config.priorityLevels; i++) {
            this.priorityQueues.set(i, 0);
        }
        // Listen to backpressure events
        this.backpressureMonitor.on('backpressureActivated', this.onBackpressureActivated.bind(this));
        this.backpressureMonitor.on('backpressureDeactivated', this.onBackpressureDeactivated.bind(this));
        // Start periodic maintenance
        setInterval(() => this.maintenance(), 1000);
    }
    async requestPermission(eventCount = 1, priority = 3) {
        if (!this.config.throttleEnabled) {
            return true;
        }
        // Update token bucket
        this.refillTokenBucket();
        // Check emergency mode
        if (this.emergencyModeActive) {
            return this.handleEmergencyMode(eventCount, priority);
        }
        // Check token bucket
        if (this.tokenBucket.tokens >= eventCount) {
            this.tokenBucket.tokens -= eventCount;
            this.recordAllowedEvents(eventCount);
            return true;
        }
        // Check sliding window rate limit
        if (!this.checkSlidingWindowLimit(eventCount)) {
            this.recordThrottledEvents(eventCount);
            return false;
        }
        // Event allowed but bucket exhausted - update metrics
        this.recordAllowedEvents(eventCount);
        return true;
    }
    refillTokenBucket() {
        const now = Date.now();
        const timePassed = (now - this.tokenBucket.lastRefill) / 1000; // Convert to seconds
        const tokensToAdd = timePassed * this.tokenBucket.fillRate;
        this.tokenBucket.tokens = Math.min(this.tokenBucket.capacity, this.tokenBucket.tokens + tokensToAdd);
        this.tokenBucket.lastRefill = now;
    }
    checkSlidingWindowLimit(eventCount) {
        const now = Date.now();
        const windowStart = now - this.config.slidingWindowSize;
        // Remove old entries from sliding window
        this.slidingWindow = this.slidingWindow.filter(timestamp => timestamp > windowStart);
        // Add current events to window
        for (let i = 0; i < eventCount; i++) {
            this.slidingWindow.push(now);
        }
        // Check if we're within rate limit
        const currentRate = (this.slidingWindow.length / this.config.slidingWindowSize) * 1000;
        return currentRate <= this.config.maxEventsPerSecond;
    }
    handleEmergencyMode(eventCount, priority) {
        // In emergency mode, only allow high priority events with throttling
        const throttleRate = this.config.emergencyMode.throttleRate;
        if (priority <= 2) { // High priority events (1, 2)
            // Apply lighter throttling for high priority
            return Math.random() > (throttleRate * 0.5);
        }
        else if (priority === 3) { // Medium priority
            // Apply normal throttling
            return Math.random() > throttleRate;
        }
        else {
            // Low priority events (4, 5) - heavily throttled
            return Math.random() > (throttleRate * 1.5);
        }
    }
    onBackpressureActivated() {
        const backpressureMetrics = this.backpressureMonitor.getMetrics();
        if (this.config.emergencyMode.enabled &&
            backpressureMetrics.errorRate > this.config.emergencyMode.triggerThreshold) {
            this.activateEmergencyMode();
        }
    }
    onBackpressureDeactivated() {
        if (this.emergencyModeActive) {
            this.deactivateEmergencyMode();
        }
    }
    activateEmergencyMode() {
        this.emergencyModeActive = true;
        logger.warn('Flow control emergency mode activated', {
            backpressureMetrics: this.backpressureMonitor.getMetrics()
        });
        this.metrics.incrementCounter('flow_control.emergency_mode_activations');
        this.metrics.setGauge('flow_control.emergency_mode', 1);
        this.emit('emergencyModeActivated');
    }
    deactivateEmergencyMode() {
        this.emergencyModeActive = false;
        logger.info('Flow control emergency mode deactivated');
        this.metrics.incrementCounter('flow_control.emergency_mode_deactivations');
        this.metrics.setGauge('flow_control.emergency_mode', 0);
        this.emit('emergencyModeDeactivated');
    }
    recordAllowedEvents(eventCount) {
        this.metrics.incrementCounter('flow_control.events_allowed', {}, eventCount);
    }
    recordThrottledEvents(eventCount) {
        this.throttledEventCount += eventCount;
        this.metrics.incrementCounter('flow_control.events_throttled', {}, eventCount);
    }
    maintenance() {
        // Update current rate metric
        const now = Date.now();
        const windowStart = now - this.config.slidingWindowSize;
        const recentEvents = this.slidingWindow.filter(timestamp => timestamp > windowStart);
        const currentRate = (recentEvents.length / this.config.slidingWindowSize) * 1000;
        this.metrics.setGauge('flow_control.current_rate', currentRate);
        this.metrics.setGauge('flow_control.allowed_rate', this.config.maxEventsPerSecond);
        this.metrics.setGauge('flow_control.token_bucket_tokens', this.tokenBucket.tokens);
        this.metrics.setGauge('flow_control.throttled_events_total', this.throttledEventCount);
        // Update priority queue metrics
        this.priorityQueues.forEach((size, priority) => {
            this.metrics.setGauge(`flow_control.priority_queue_${priority}`, size);
        });
    }
    updatePriorityQueueSize(priority, size) {
        if (priority >= 1 && priority <= this.config.priorityLevels) {
            this.priorityQueues.set(priority, size);
        }
    }
    getMetrics() {
        const now = Date.now();
        const windowStart = now - this.config.slidingWindowSize;
        const recentEvents = this.slidingWindow.filter(timestamp => timestamp > windowStart);
        const currentRate = (recentEvents.length / this.config.slidingWindowSize) * 1000;
        const priorityQueues = {};
        this.priorityQueues.forEach((size, priority) => {
            priorityQueues[priority] = size;
        });
        return {
            currentRate,
            allowedRate: this.config.maxEventsPerSecond,
            throttledEvents: this.throttledEventCount,
            emergencyModeActive: this.emergencyModeActive,
            bucketState: { ...this.tokenBucket },
            priorityQueues
        };
    }
    adjustRateLimit(newRate) {
        const oldRate = this.config.maxEventsPerSecond;
        this.config.maxEventsPerSecond = Math.max(1, newRate);
        this.tokenBucket.fillRate = this.config.maxEventsPerSecond;
        logger.info('Rate limit adjusted', {
            oldRate,
            newRate: this.config.maxEventsPerSecond
        });
        this.metrics.incrementCounter('flow_control.rate_adjustments');
        this.emit('rateLimitChanged', {
            oldRate,
            newRate: this.config.maxEventsPerSecond
        });
    }
    adjustBurstSize(newBurstSize) {
        const oldBurstSize = this.tokenBucket.capacity;
        this.tokenBucket.capacity = Math.max(1, newBurstSize);
        this.config.burstSize = this.tokenBucket.capacity;
        // Adjust current tokens if necessary
        this.tokenBucket.tokens = Math.min(this.tokenBucket.tokens, this.tokenBucket.capacity);
        logger.info('Burst size adjusted', {
            oldBurstSize,
            newBurstSize: this.tokenBucket.capacity
        });
        this.metrics.incrementCounter('flow_control.burst_adjustments');
        this.emit('burstSizeChanged', {
            oldBurstSize,
            newBurstSize: this.tokenBucket.capacity
        });
    }
    reset() {
        this.tokenBucket.tokens = this.tokenBucket.capacity;
        this.tokenBucket.lastRefill = Date.now();
        this.slidingWindow = [];
        this.throttledEventCount = 0;
        this.emergencyModeActive = false;
        this.priorityQueues.forEach((_, priority) => {
            this.priorityQueues.set(priority, 0);
        });
        logger.info('Flow control manager reset');
    }
    destroy() {
        this.backpressureMonitor.removeAllListeners();
        this.removeAllListeners();
    }
}
//# sourceMappingURL=flow-control-manager.js.map