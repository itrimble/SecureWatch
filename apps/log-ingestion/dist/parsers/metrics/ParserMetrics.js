// Parser Metrics
// Collects and manages performance metrics for parsers
import { logger } from '../../utils/logger';
export class ParserMetrics {
    metrics = new Map();
    aggregatedCache = new Map();
    maxMetricsPerParser = 10000;
    cacheTimeout = 60000; // 1 minute
    // Record a successful parse
    recordParseSuccess(parserId, parseTime, inputSize = 0, outputSize = 0, confidence = 1.0) {
        const metric = {
            parserId,
            timestamp: new Date(),
            parseTime,
            success: true,
            inputSize,
            outputSize,
            confidence
        };
        this.addMetric(parserId, metric);
    }
    // Record a parse error
    recordParseError(parserId, parseTime, error, inputSize = 0) {
        const metric = {
            parserId,
            timestamp: new Date(),
            parseTime,
            success: false,
            error: error.message,
            inputSize,
            outputSize: 0,
            confidence: 0
        };
        this.addMetric(parserId, metric);
    }
    // Record a parse failure (no parser matched)
    recordParseFailure(reason, parseTime) {
        const metric = {
            parserId: 'system',
            timestamp: new Date(),
            parseTime,
            success: false,
            error: reason,
            inputSize: 0,
            outputSize: 0,
            confidence: 0
        };
        this.addMetric('system', metric);
    }
    // Get metrics for a specific parser
    getMetrics(parserId) {
        if (parserId) {
            return this.metrics.get(parserId) || [];
        }
        // Return all metrics
        const allMetrics = [];
        for (const metrics of this.metrics.values()) {
            allMetrics.push(...metrics);
        }
        return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    // Get aggregated metrics
    getAggregatedMetrics(parserId) {
        const cacheKey = parserId || 'all';
        const cached = this.aggregatedCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
            return cached.metrics;
        }
        const metrics = this.getMetrics(parserId);
        const aggregated = this.calculateAggregatedMetrics(metrics);
        this.aggregatedCache.set(cacheKey, {
            metrics: aggregated,
            timestamp: new Date()
        });
        return aggregated;
    }
    // Get top performing parsers
    getTopPerformers(limit = 10) {
        const parserStats = new Map();
        for (const [parserId, metrics] of this.metrics.entries()) {
            if (parserId === 'system')
                continue;
            const total = metrics.length;
            const successful = metrics.filter(m => m.success).length;
            parserStats.set(parserId, { total, successful });
        }
        return Array.from(parserStats.entries())
            .map(([parserId, stats]) => ({
            parserId,
            eventsProcessed: stats.total,
            successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
        }))
            .sort((a, b) => b.eventsProcessed - a.eventsProcessed)
            .slice(0, limit);
    }
    // Get performance summary for all parsers
    getPerformanceSummary() {
        const summary = [];
        for (const [parserId, metrics] of this.metrics.entries()) {
            if (metrics.length === 0)
                continue;
            const successful = metrics.filter(m => m.success);
            const failed = metrics.filter(m => !m.success);
            const performance = {
                parserId,
                eventsProcessed: metrics.length,
                successRate: metrics.length > 0 ? (successful.length / metrics.length) * 100 : 0,
                averageParseTime: this.calculateAverage(metrics.map(m => m.parseTime)),
                averageConfidence: this.calculateAverage(successful.map(m => m.confidence)),
                lastProcessed: metrics[metrics.length - 1].timestamp,
                errorCount: failed.length,
                totalProcessingTime: metrics.reduce((sum, m) => sum + m.parseTime, 0)
            };
            summary.push(performance);
        }
        return summary.sort((a, b) => b.eventsProcessed - a.eventsProcessed);
    }
    // Get recent metrics (last N minutes)
    getRecentMetrics(minutes = 60, parserId) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const metrics = this.getMetrics(parserId);
        return metrics.filter(m => m.timestamp >= cutoff);
    }
    // Get metrics by time range
    getMetricsByTimeRange(startTime, endTime, parserId) {
        const metrics = this.getMetrics(parserId);
        return metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
    }
    // Calculate throughput (events per second)
    calculateThroughput(timeWindowMinutes = 1, parserId) {
        const recent = this.getRecentMetrics(timeWindowMinutes, parserId);
        const timeWindowSeconds = timeWindowMinutes * 60;
        return recent.length / timeWindowSeconds;
    }
    // Get error rate percentage
    getErrorRate(timeWindowMinutes = 60, parserId) {
        const recent = this.getRecentMetrics(timeWindowMinutes, parserId);
        if (recent.length === 0)
            return 0;
        const errors = recent.filter(m => !m.success).length;
        return (errors / recent.length) * 100;
    }
    // Get average parse time
    getAverageParseTime(timeWindowMinutes = 60, parserId) {
        const recent = this.getRecentMetrics(timeWindowMinutes, parserId);
        if (recent.length === 0)
            return 0;
        return this.calculateAverage(recent.map(m => m.parseTime));
    }
    // Get confidence distribution
    getConfidenceDistribution(parserId) {
        const metrics = this.getMetrics(parserId).filter(m => m.success);
        const distribution = {
            'high (0.8-1.0)': 0,
            'medium (0.6-0.8)': 0,
            'low (0.4-0.6)': 0,
            'very_low (0.0-0.4)': 0
        };
        for (const metric of metrics) {
            if (metric.confidence >= 0.8) {
                distribution['high (0.8-1.0)']++;
            }
            else if (metric.confidence >= 0.6) {
                distribution['medium (0.6-0.8)']++;
            }
            else if (metric.confidence >= 0.4) {
                distribution['low (0.4-0.6)']++;
            }
            else {
                distribution['very_low (0.0-0.4)']++;
            }
        }
        return distribution;
    }
    // Export metrics to JSON
    exportMetrics(parserId) {
        const data = {
            timestamp: new Date().toISOString(),
            parserId: parserId || 'all',
            metrics: this.getMetrics(parserId),
            aggregated: this.getAggregatedMetrics(parserId),
            performance: this.getPerformanceSummary().filter(p => !parserId || p.parserId === parserId)
        };
        return JSON.stringify(data, null, 2);
    }
    // Reset metrics for a parser or all parsers
    reset(parserId) {
        if (parserId) {
            this.metrics.delete(parserId);
            this.aggregatedCache.delete(parserId);
        }
        else {
            this.metrics.clear();
            this.aggregatedCache.clear();
        }
        logger.info(`Parser metrics reset${parserId ? ` for ${parserId}` : ' for all parsers'}`);
    }
    // Clean up old metrics
    cleanup(maxAgeHours = 24) {
        const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        let totalCleaned = 0;
        for (const [parserId, metrics] of this.metrics.entries()) {
            const originalLength = metrics.length;
            const filtered = metrics.filter(m => m.timestamp >= cutoff);
            if (filtered.length < originalLength) {
                this.metrics.set(parserId, filtered);
                totalCleaned += originalLength - filtered.length;
            }
        }
        // Clear aggregated cache to force recalculation
        this.aggregatedCache.clear();
        if (totalCleaned > 0) {
            logger.info(`Cleaned up ${totalCleaned} old metrics (older than ${maxAgeHours} hours)`);
        }
    }
    // Get memory usage estimate
    getMemoryUsage() {
        let totalMetrics = 0;
        for (const metrics of this.metrics.values()) {
            totalMetrics += metrics.length;
        }
        // Rough estimate: each metric is about 200 bytes
        const estimatedSizeBytes = totalMetrics * 200;
        return { totalMetrics, estimatedSizeBytes };
    }
    // Private helper methods
    addMetric(parserId, metric) {
        if (!this.metrics.has(parserId)) {
            this.metrics.set(parserId, []);
        }
        const metrics = this.metrics.get(parserId);
        metrics.push(metric);
        // Limit metrics per parser to prevent memory issues
        if (metrics.length > this.maxMetricsPerParser) {
            metrics.splice(0, metrics.length - this.maxMetricsPerParser);
        }
        // Clear cached aggregated metrics for this parser
        this.aggregatedCache.delete(parserId);
        this.aggregatedCache.delete('all');
    }
    calculateAggregatedMetrics(metrics) {
        if (metrics.length === 0) {
            return {
                totalEventsProcessed: 0,
                averageParseTime: 0,
                successRate: 0,
                errorRate: 0,
                averageConfidence: 0,
                throughputPerSecond: 0,
                memoryUsage: 0
            };
        }
        const successful = metrics.filter(m => m.success);
        const failed = metrics.filter(m => !m.success);
        // Calculate time range for throughput
        const sortedByTime = [...metrics].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const timeRangeSeconds = sortedByTime.length > 1
            ? (sortedByTime[sortedByTime.length - 1].timestamp.getTime() - sortedByTime[0].timestamp.getTime()) / 1000
            : 1;
        return {
            totalEventsProcessed: metrics.length,
            averageParseTime: this.calculateAverage(metrics.map(m => m.parseTime)),
            successRate: (successful.length / metrics.length) * 100,
            errorRate: (failed.length / metrics.length) * 100,
            averageConfidence: this.calculateAverage(successful.map(m => m.confidence)),
            throughputPerSecond: metrics.length / Math.max(timeRangeSeconds, 1),
            memoryUsage: this.getMemoryUsage().estimatedSizeBytes
        };
    }
    calculateAverage(numbers) {
        if (numbers.length === 0)
            return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }
}
//# sourceMappingURL=ParserMetrics.js.map