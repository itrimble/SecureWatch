/**
 * Dynamic Threshold Adjustment Service
 *
 * Implements ML-based learning for automatic threshold optimization
 * based on analyst feedback, false positive rates, and alert patterns.
 */
export interface ThresholdMetric {
    metricName: string;
    currentThreshold: number;
    suggestedThreshold: number;
    confidence: number;
    lastAdjustment: Date;
    adjustmentReason: string;
    historicalPerformance: ThresholdPerformanceData[];
}
export interface ThresholdPerformanceData {
    timestamp: Date;
    threshold: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
    analystFeedbackScore: number;
}
export interface AnalystFeedback {
    alertId: string;
    analystId: string;
    timestamp: Date;
    feedbackType: 'true_positive' | 'false_positive' | 'noise' | 'critical_miss';
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    notes?: string;
    timeToInvestigate: number;
    ruleId?: string;
    metricName?: string;
}
export interface ThresholdRule {
    id: string;
    name: string;
    description: string;
    metricName: string;
    currentThreshold: number;
    minThreshold: number;
    maxThreshold: number;
    adjustmentStrategy: 'conservative' | 'balanced' | 'aggressive';
    learningRate: number;
    enabled: boolean;
    lastReview: Date;
    createdBy: string;
}
export declare class DynamicThresholdService {
    private feedbackStorage;
    private metricsStorage;
    private alertStorage;
    private readonly LEARNING_WINDOW_DAYS;
    private readonly MIN_SAMPLES_FOR_ADJUSTMENT;
    private readonly ADJUSTMENT_COOLDOWN_HOURS;
    private readonly MAX_ADJUSTMENT_PERCENTAGE;
    constructor(feedbackStorage: AnalystFeedbackStorage, metricsStorage: ThresholdMetricsStorage, alertStorage: AlertStorage);
    /**
     * Analyzes feedback and suggests threshold adjustments
     */
    analyzeAndSuggestThresholds(): Promise<ThresholdMetric[]>;
    /**
     * Applies approved threshold adjustments
     */
    applyThresholdAdjustment(metricName: string, newThreshold: number, approvedBy: string): Promise<boolean>;
    /**
     * Records analyst feedback for threshold learning
     */
    recordAnalystFeedback(feedback: AnalystFeedback): Promise<void>;
    /**
     * Analyzes threshold performance for a specific rule
     */
    private analyzeRuleThreshold;
    /**
     * Calculates optimal threshold using multiple ML approaches
     */
    private calculateOptimalThreshold;
    /**
     * ROC Curve-based optimal threshold calculation
     */
    private calculateROCOptimalThreshold;
    /**
     * Precision-Recall balance optimization
     */
    private calculatePrecisionRecallOptimalThreshold;
    /**
     * Analyst workload optimization
     */
    private calculateWorkloadOptimalThreshold;
    /**
     * Temporal pattern analysis for threshold optimization
     */
    private calculateTemporalOptimalThreshold;
    /**
     * Analyzes hourly patterns in analyst feedback
     */
    private analyzeHourlyPatterns;
    /**
     * Analyzes daily patterns in analyst feedback
     */
    private analyzeDailyPatterns;
    /**
     * Gets strategy-specific weights for threshold calculation approaches
     */
    private getStrategyWeights;
    /**
     * Calculates performance metrics for given feedback
     */
    private calculatePerformanceMetrics;
    /**
     * Determines if threshold adjustment is needed
     */
    private analyzeAdjustmentNeed;
    private generateThresholdRange;
    private calculateMetricsAtThreshold;
    private isInCooldownPeriod;
    private getActiveThresholdRules;
    private getThresholdRule;
    private getRecentFeedback;
    private getLastAdjustmentTime;
    private updateThreshold;
    private recordThresholdChange;
    private scheduleThresholdReview;
    private getHistoricalPerformance;
}
export interface AnalystFeedbackStorage {
    store(feedback: AnalystFeedback): Promise<void>;
    getByMetric(metricName: string, fromDate: Date, toDate: Date): Promise<AnalystFeedback[]>;
    getByAnalyst(analystId: string, fromDate: Date, toDate: Date): Promise<AnalystFeedback[]>;
}
export interface ThresholdMetricsStorage {
    storePerformance(metricName: string, performance: ThresholdPerformanceData): Promise<void>;
    getPerformanceHistory(metricName: string, fromDate: Date, toDate: Date): Promise<ThresholdPerformanceData[]>;
}
export interface AlertStorage {
    getAlertsWithScores(metricName: string, fromDate: Date, toDate: Date): Promise<Array<{
        id: string;
        score: number;
        actualLabel: 'positive' | 'negative';
        timestamp: Date;
    }>>;
}
//# sourceMappingURL=dynamic-threshold-service.d.ts.map