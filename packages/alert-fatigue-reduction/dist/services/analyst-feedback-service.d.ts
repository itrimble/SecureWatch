/**
 * Analyst Feedback Learning System
 *
 * Collects and processes analyst feedback to continuously improve
 * alert quality, reduce false positives, and optimize thresholds.
 */
import { AnalystFeedback } from './dynamic-threshold-service';
export interface FeedbackPattern {
    id: string;
    pattern: string;
    description: string;
    falsePositiveRate: number;
    confidence: number;
    sampleSize: number;
    lastUpdated: Date;
    suggestedAction: 'increase_threshold' | 'modify_rule' | 'add_whitelist' | 'improve_context';
    affectedRules: string[];
    commonIndicators: Record<string, any>;
}
export interface AnalystPerformanceMetrics {
    analystId: string;
    totalFeedback: number;
    accuracyScore: number;
    responseTime: number;
    falsePositiveDetectionRate: number;
    criticalMissDetectionRate: number;
    consistency: number;
    expertise: string[];
    trustScore: number;
}
export interface FeedbackLearningModel {
    modelId: string;
    modelType: 'rule_based' | 'ml_classifier' | 'neural_network' | 'ensemble';
    version: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    lastTrained: Date;
    trainingDataSize: number;
    features: string[];
    hyperparameters: Record<string, any>;
}
export interface LearningInsight {
    id: string;
    type: 'pattern_discovered' | 'threshold_suggestion' | 'rule_modification' | 'whitelist_candidate';
    title: string;
    description: string;
    confidence: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    evidence: AnalystFeedback[];
    suggestedActions: SuggestedAction[];
    affectedMetrics: string[];
    createdAt: Date;
    status: 'new' | 'reviewed' | 'implemented' | 'rejected';
    reviewedBy?: string;
    implementationNotes?: string;
}
export interface SuggestedAction {
    action: string;
    description: string;
    estimatedImpact: string;
    effort: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
    prerequisites: string[];
}
export interface FeedbackAnalysis {
    totalFeedback: number;
    feedbackByType: Record<string, number>;
    feedbackBySeverity: Record<string, number>;
    feedbackBySource: Record<string, number>;
    falsePositiveRate: number;
    falseNegativeRate: number;
    averageResponseTime: number;
    topAnalysts: AnalystPerformanceMetrics[];
    trendAnalysis: TrendAnalysis;
    actionableInsights: LearningInsight[];
}
export interface TrendAnalysis {
    falsePositiveTrend: TrendPoint[];
    responseTimeTrend: TrendPoint[];
    accuracyTrend: TrendPoint[];
    volumeTrend: TrendPoint[];
}
export interface TrendPoint {
    timestamp: Date;
    value: number;
    movingAverage: number;
}
export declare class AnalystFeedbackService {
    private feedbackStorage;
    private performanceStorage;
    private insightStorage;
    private mlModelService;
    private readonly FEEDBACK_AGGREGATION_WINDOW_HOURS;
    private readonly MIN_FEEDBACK_FOR_INSIGHT;
    private readonly CONSENSUS_THRESHOLD;
    private readonly TRUST_SCORE_DECAY_DAYS;
    constructor(feedbackStorage: FeedbackStorage, performanceStorage: PerformanceStorage, insightStorage: InsightStorage, mlModelService: MLModelService);
    /**
     * Records and processes new analyst feedback
     */
    processFeedback(feedback: AnalystFeedback): Promise<void>;
    /**
     * Analyzes all feedback to generate learning insights
     */
    generateLearningInsights(): Promise<LearningInsight[]>;
    /**
     * Discovers patterns in false positive feedback
     */
    private discoverFalsePositivePatterns;
    /**
     * Discovers threshold-related issues
     */
    private discoverThresholdIssues;
    /**
     * Discovers opportunities for rule improvements
     */
    private discoverRuleImprovements;
    /**
     * Discovers whitelist candidates
     */
    private discoverWhitelistCandidates;
    /**
     * Updates analyst performance metrics based on feedback
     */
    private updateAnalystPerformance;
    /**
     * Analyzes immediate feedback for critical issues
     */
    private analyzeImmediateFeedback;
    /**
     * Groups feedback by rule ID
     */
    private groupFeedbackByRule;
    /**
     * Groups feedback by metric name
     */
    private groupFeedbackByMetric;
    /**
     * Analyzes temporal patterns in feedback
     */
    private analyzeTemporalPatterns;
    /**
     * Groups feedback by hour of day
     */
    private groupFeedbackByHour;
    /**
     * Analyzes rule pattern for false positives
     */
    private analyzeRulePattern;
    /**
     * Finds common values in array
     */
    private findCommonValues;
    /**
     * Analyzes threshold performance for a metric
     */
    private analyzeThresholdPerformance;
    /**
     * Analyzes rule effectiveness
     */
    private analyzeRuleEffectiveness;
    /**
     * Finds recurring patterns in false positives
     */
    private findRecurringPatterns;
    private initializeAnalystMetrics;
    private calculateConsensusAccuracy;
    private calculateTrustScore;
    private updateExpertiseAreas;
    private getRecentFeedback;
    private handleCriticalMiss;
    private getRecentFalsePositiveCount;
    private createUrgentInsight;
    private scheduleBatchAnalysis;
}
export interface FeedbackStorage {
    store(feedback: AnalystFeedback): Promise<void>;
    getRecent(fromDate: Date): Promise<AnalystFeedback[]>;
    getByRule(ruleId: string, fromDate: Date): Promise<AnalystFeedback[]>;
    getByAnalyst(analystId: string, fromDate: Date): Promise<AnalystFeedback[]>;
}
export interface PerformanceStorage {
    getByAnalyst(analystId: string): Promise<AnalystPerformanceMetrics | null>;
    update(metrics: AnalystPerformanceMetrics): Promise<void>;
    getTopPerformers(limit: number): Promise<AnalystPerformanceMetrics[]>;
}
export interface InsightStorage {
    store(insight: LearningInsight): Promise<void>;
    getByStatus(status: string): Promise<LearningInsight[]>;
    update(insight: LearningInsight): Promise<void>;
}
export interface MLModelService {
    trainModel(feedback: AnalystFeedback[]): Promise<FeedbackLearningModel>;
    predictFeedback(alertData: any): Promise<{
        predictedType: string;
        confidence: number;
    }>;
    updateModel(newFeedback: AnalystFeedback[]): Promise<void>;
}
//# sourceMappingURL=analyst-feedback-service.d.ts.map