import { EventEmitter } from 'events';
import logger from '../utils/logger';
export class BackpressureMonitor extends EventEmitter {
    config;
    metrics;
    isBackpressureActive = false;
    queueDepth = 0;
    latencyHistory = [];
    errorCount = 0;
    requestCount = 0;
    throughputHistory = [];
    lastThroughputCheck = Date.now();
    monitoringTimer;
    // Adaptive thresholds
    adaptiveQueueThreshold;
    adaptiveLatencyThreshold;
    adaptiveErrorThreshold;
    constructor(config, metrics) {
        super();
        this.config = config;
        this.metrics = metrics;
        // Initialize adaptive thresholds
        this.adaptiveQueueThreshold = config.queueDepthThreshold;
        this.adaptiveLatencyThreshold = config.latencyThreshold;
        this.adaptiveErrorThreshold = config.errorRateThreshold;
        this.startMonitoring();
    }
    recordRequest(latency, success) {
        this.requestCount++;
        // Record latency
        this.latencyHistory.push(latency);
        if (this.latencyHistory.length > 1000) {
            this.latencyHistory.shift(); // Keep only last 1000 measurements
        }
        // Record error
        if (!success) {
            this.errorCount++;
        }
        // Update metrics
        this.metrics.recordHistogram('backpressure.request_latency', latency);
        this.metrics.incrementCounter(success ? 'backpressure.requests_success' : 'backpressure.requests_error');
    }
    updateQueueDepth(depth) {
        this.queueDepth = depth;
        this.metrics.setGauge('backpressure.queue_depth', depth);
    }
    updateThroughput(eventsProcessed) {
        const now = Date.now();
        const timeDiff = now - this.lastThroughputCheck;
        if (timeDiff >= 1000) { // Update every second
            const throughput = (eventsProcessed / timeDiff) * 1000; // events per second
            this.throughputHistory.push(throughput);
            if (this.throughputHistory.length > 60) {
                this.throughputHistory.shift(); // Keep last 60 seconds
            }
            this.lastThroughputCheck = now;
            this.metrics.setGauge('backpressure.throughput', throughput);
        }
    }
    calculateMetrics() {
        const averageLatency = this.latencyHistory.length > 0
            ? this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length
            : 0;
        const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
        const throughput = this.throughputHistory.length > 0
            ? this.throughputHistory.reduce((sum, tp) => sum + tp, 0) / this.throughputHistory.length
            : 0;
        return {
            queueDepth: this.queueDepth,
            averageLatency,
            errorRate,
            throughput,
            backpressureActive: this.isBackpressureActive,
            adaptiveThresholds: this.config.adaptiveThresholds ? {
                queueDepth: this.adaptiveQueueThreshold,
                latency: this.adaptiveLatencyThreshold,
                errorRate: this.adaptiveErrorThreshold
            } : undefined
        };
    }
    checkBackpressure() {
        const metrics = this.calculateMetrics();
        // Use adaptive thresholds if enabled
        const queueThreshold = this.config.adaptiveThresholds
            ? this.adaptiveQueueThreshold
            : this.config.queueDepthThreshold;
        const latencyThreshold = this.config.adaptiveThresholds
            ? this.adaptiveLatencyThreshold
            : this.config.latencyThreshold;
        const errorThreshold = this.config.adaptiveThresholds
            ? this.adaptiveErrorThreshold
            : this.config.errorRateThreshold;
        // Check if backpressure should be activated
        const shouldActivate = metrics.queueDepth > queueThreshold ||
            metrics.averageLatency > latencyThreshold ||
            metrics.errorRate > errorThreshold;
        if (shouldActivate && !this.isBackpressureActive) {
            this.activateBackpressure(metrics);
        }
        else if (!shouldActivate && this.isBackpressureActive) {
            this.deactivateBackpressure(metrics);
        }
        // Update adaptive thresholds if enabled
        if (this.config.adaptiveThresholds) {
            this.updateAdaptiveThresholds(metrics);
        }
        // Update metrics
        this.updateMonitoringMetrics(metrics);
    }
    activateBackpressure(metrics) {
        this.isBackpressureActive = true;
        logger.warn('Backpressure activated', {
            queueDepth: metrics.queueDepth,
            averageLatency: metrics.averageLatency,
            errorRate: metrics.errorRate,
            throughput: metrics.throughput
        });
        this.metrics.incrementCounter('backpressure.activations');
        this.metrics.setGauge('backpressure.active', 1);
        this.emit('backpressureActivated', metrics);
    }
    deactivateBackpressure(metrics) {
        this.isBackpressureActive = false;
        logger.info('Backpressure deactivated', {
            queueDepth: metrics.queueDepth,
            averageLatency: metrics.averageLatency,
            errorRate: metrics.errorRate,
            throughput: metrics.throughput
        });
        this.metrics.incrementCounter('backpressure.deactivations');
        this.metrics.setGauge('backpressure.active', 0);
        this.emit('backpressureDeactivated', metrics);
    }
    updateAdaptiveThresholds(metrics) {
        // Adaptive threshold adjustment based on recent performance
        const recoveryFactor = this.config.recoveryFactor;
        if (!this.isBackpressureActive && metrics.errorRate < this.config.errorRateThreshold * 0.5) {
            // System is performing well, can increase thresholds slightly
            this.adaptiveQueueThreshold = Math.min(this.config.queueDepthThreshold * 1.5, this.adaptiveQueueThreshold * (1 + recoveryFactor * 0.1));
            this.adaptiveLatencyThreshold = Math.min(this.config.latencyThreshold * 1.5, this.adaptiveLatencyThreshold * (1 + recoveryFactor * 0.1));
        }
        else if (this.isBackpressureActive) {
            // System is under pressure, decrease thresholds for faster response
            this.adaptiveQueueThreshold = Math.max(this.config.queueDepthThreshold * 0.5, this.adaptiveQueueThreshold * (1 - recoveryFactor * 0.1));
            this.adaptiveLatencyThreshold = Math.max(this.config.latencyThreshold * 0.5, this.adaptiveLatencyThreshold * (1 - recoveryFactor * 0.1));
        }
    }
    updateMonitoringMetrics(metrics) {
        this.metrics.setGauge('backpressure.queue_depth', metrics.queueDepth);
        this.metrics.setGauge('backpressure.average_latency', metrics.averageLatency);
        this.metrics.setGauge('backpressure.error_rate', metrics.errorRate);
        this.metrics.setGauge('backpressure.throughput', metrics.throughput);
        if (metrics.adaptiveThresholds) {
            this.metrics.setGauge('backpressure.adaptive_queue_threshold', metrics.adaptiveThresholds.queueDepth);
            this.metrics.setGauge('backpressure.adaptive_latency_threshold', metrics.adaptiveThresholds.latency);
            this.metrics.setGauge('backpressure.adaptive_error_threshold', metrics.adaptiveThresholds.errorRate);
        }
    }
    startMonitoring() {
        this.monitoringTimer = setInterval(() => {
            this.checkBackpressure();
        }, this.config.monitoringInterval);
    }
    getMetrics() {
        return this.calculateMetrics();
    }
    isActive() {
        return this.isBackpressureActive;
    }
    reset() {
        this.isBackpressureActive = false;
        this.queueDepth = 0;
        this.latencyHistory = [];
        this.errorCount = 0;
        this.requestCount = 0;
        this.throughputHistory = [];
        // Reset adaptive thresholds
        this.adaptiveQueueThreshold = this.config.queueDepthThreshold;
        this.adaptiveLatencyThreshold = this.config.latencyThreshold;
        this.adaptiveErrorThreshold = this.config.errorRateThreshold;
        logger.info('Backpressure monitor reset');
    }
    destroy() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
        }
        this.removeAllListeners();
    }
}
//# sourceMappingURL=backpressure-monitor.js.map