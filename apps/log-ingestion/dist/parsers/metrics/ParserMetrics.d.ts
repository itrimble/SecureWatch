export interface ParserMetric {
    parserId: string;
    timestamp: Date;
    parseTime: number;
    success: boolean;
    error?: string;
    inputSize: number;
    outputSize: number;
    confidence: number;
}
export interface AggregatedMetrics {
    totalEventsProcessed: number;
    averageParseTime: number;
    successRate: number;
    errorRate: number;
    averageConfidence: number;
    throughputPerSecond: number;
    memoryUsage: number;
}
export interface ParserPerformance {
    parserId: string;
    eventsProcessed: number;
    successRate: number;
    averageParseTime: number;
    averageConfidence: number;
    lastProcessed: Date;
    errorCount: number;
    totalProcessingTime: number;
}
export declare class ParserMetrics {
    private metrics;
    private aggregatedCache;
    private readonly maxMetricsPerParser;
    private readonly cacheTimeout;
    recordParseSuccess(parserId: string, parseTime: number, inputSize?: number, outputSize?: number, confidence?: number): void;
    recordParseError(parserId: string, parseTime: number, error: Error, inputSize?: number): void;
    recordParseFailure(reason: string, parseTime: number): void;
    getMetrics(parserId?: string): ParserMetric[];
    getAggregatedMetrics(parserId?: string): AggregatedMetrics;
    getTopPerformers(limit?: number): Array<{
        parserId: string;
        eventsProcessed: number;
        successRate: number;
    }>;
    getPerformanceSummary(): ParserPerformance[];
    getRecentMetrics(minutes?: number, parserId?: string): ParserMetric[];
    getMetricsByTimeRange(startTime: Date, endTime: Date, parserId?: string): ParserMetric[];
    calculateThroughput(timeWindowMinutes?: number, parserId?: string): number;
    getErrorRate(timeWindowMinutes?: number, parserId?: string): number;
    getAverageParseTime(timeWindowMinutes?: number, parserId?: string): number;
    getConfidenceDistribution(parserId?: string): Record<string, number>;
    exportMetrics(parserId?: string): string;
    reset(parserId?: string): void;
    cleanup(maxAgeHours?: number): void;
    getMemoryUsage(): {
        totalMetrics: number;
        estimatedSizeBytes: number;
    };
    private addMetric;
    private calculateAggregatedMetrics;
    private calculateAverage;
}
//# sourceMappingURL=ParserMetrics.d.ts.map