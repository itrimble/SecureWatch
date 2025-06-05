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
  confidence: number; // 0.0-1.0
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
  analystFeedbackScore: number; // Average analyst feedback
}

export interface AnalystFeedback {
  alertId: string;
  analystId: string;
  timestamp: Date;
  feedbackType: 'true_positive' | 'false_positive' | 'noise' | 'critical_miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // Analyst confidence in their assessment
  notes?: string;
  timeToInvestigate: number; // seconds
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
  learningRate: number; // 0.0-1.0
  enabled: boolean;
  lastReview: Date;
  createdBy: string;
}

export class DynamicThresholdService {
  private readonly LEARNING_WINDOW_DAYS = 30;
  private readonly MIN_SAMPLES_FOR_ADJUSTMENT = 50;
  private readonly ADJUSTMENT_COOLDOWN_HOURS = 24;
  private readonly MAX_ADJUSTMENT_PERCENTAGE = 0.3; // 30% max change per adjustment

  constructor(
    private feedbackStorage: AnalystFeedbackStorage,
    private metricsStorage: ThresholdMetricsStorage,
    private alertStorage: AlertStorage
  ) {}

  /**
   * Analyzes feedback and suggests threshold adjustments
   */
  async analyzeAndSuggestThresholds(): Promise<ThresholdMetric[]> {
    const activeRules = await this.getActiveThresholdRules();
    const suggestions: ThresholdMetric[] = [];

    for (const rule of activeRules) {
      const suggestion = await this.analyzeRuleThreshold(rule);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Applies approved threshold adjustments
   */
  async applyThresholdAdjustment(
    metricName: string, 
    newThreshold: number, 
    approvedBy: string
  ): Promise<boolean> {
    try {
      const rule = await this.getThresholdRule(metricName);
      if (!rule) {
        throw new Error(`Threshold rule not found: ${metricName}`);
      }

      // Validate adjustment bounds
      if (newThreshold < rule.minThreshold || newThreshold > rule.maxThreshold) {
        throw new Error(`Threshold ${newThreshold} outside bounds [${rule.minThreshold}, ${rule.maxThreshold}]`);
      }

      // Check cooldown period
      const lastAdjustment = await this.getLastAdjustmentTime(metricName);
      if (this.isInCooldownPeriod(lastAdjustment)) {
        throw new Error(`Threshold adjustment in cooldown period`);
      }

      // Apply the threshold
      await this.updateThreshold(rule, newThreshold, approvedBy);
      
      // Log performance baseline for future comparison
      await this.recordThresholdChange(metricName, rule.currentThreshold, newThreshold, approvedBy);

      return true;
    } catch (error) {
      console.error('Error applying threshold adjustment:', error);
      return false;
    }
  }

  /**
   * Records analyst feedback for threshold learning
   */
  async recordAnalystFeedback(feedback: AnalystFeedback): Promise<void> {
    await this.feedbackStorage.store(feedback);
    
    // Trigger immediate re-evaluation if critical feedback
    if (feedback.feedbackType === 'critical_miss' || 
        (feedback.feedbackType === 'false_positive' && feedback.severity === 'low')) {
      await this.scheduleThresholdReview(feedback.metricName || 'unknown');
    }
  }

  /**
   * Analyzes threshold performance for a specific rule
   */
  private async analyzeRuleThreshold(rule: ThresholdRule): Promise<ThresholdMetric | null> {
    // Get recent feedback for this rule
    const recentFeedback = await this.getRecentFeedback(rule.metricName);
    
    if (recentFeedback.length < this.MIN_SAMPLES_FOR_ADJUSTMENT) {
      return null; // Not enough data for reliable adjustment
    }

    // Calculate current performance metrics
    const performance = this.calculatePerformanceMetrics(recentFeedback);
    
    // Determine if adjustment is needed
    const adjustmentAnalysis = this.analyzeAdjustmentNeed(rule, performance, recentFeedback);
    
    if (!adjustmentAnalysis.needsAdjustment) {
      return null;
    }

    // Calculate suggested threshold using multiple algorithms
    const suggestedThreshold = await this.calculateOptimalThreshold(rule, recentFeedback, performance);

    return {
      metricName: rule.metricName,
      currentThreshold: rule.currentThreshold,
      suggestedThreshold,
      confidence: adjustmentAnalysis.confidence,
      lastAdjustment: new Date(),
      adjustmentReason: adjustmentAnalysis.reason,
      historicalPerformance: await this.getHistoricalPerformance(rule.metricName)
    };
  }

  /**
   * Calculates optimal threshold using multiple ML approaches
   */
  private async calculateOptimalThreshold(
    rule: ThresholdRule,
    feedback: AnalystFeedback[],
    performance: ThresholdPerformanceData
  ): Promise<number> {
    // Approach 1: ROC Curve Analysis
    const rocOptimal = this.calculateROCOptimalThreshold(feedback, rule.currentThreshold);
    
    // Approach 2: Precision-Recall Balance
    const prOptimal = this.calculatePrecisionRecallOptimalThreshold(feedback, performance);
    
    // Approach 3: Analyst Workload Optimization
    const workloadOptimal = this.calculateWorkloadOptimalThreshold(feedback, rule.currentThreshold);
    
    // Approach 4: Temporal Pattern Analysis
    const temporalOptimal = await this.calculateTemporalOptimalThreshold(rule.metricName, feedback);

    // Weighted combination based on rule strategy
    const weights = this.getStrategyWeights(rule.adjustmentStrategy);
    
    const weightedThreshold = 
      (rocOptimal * weights.roc) +
      (prOptimal * weights.precisionRecall) +
      (workloadOptimal * weights.workload) +
      (temporalOptimal * weights.temporal);

    // Apply learning rate and bounds checking
    const adjustmentMagnitude = Math.abs(weightedThreshold - rule.currentThreshold);
    const maxAdjustment = rule.currentThreshold * this.MAX_ADJUSTMENT_PERCENTAGE;
    
    if (adjustmentMagnitude > maxAdjustment) {
      // Limit adjustment to maximum percentage
      const direction = weightedThreshold > rule.currentThreshold ? 1 : -1;
      return rule.currentThreshold + (direction * maxAdjustment);
    }

    // Apply learning rate for gradual adjustment
    const learningAdjustment = rule.currentThreshold + 
      ((weightedThreshold - rule.currentThreshold) * rule.learningRate);

    // Ensure within bounds
    return Math.max(rule.minThreshold, 
      Math.min(rule.maxThreshold, learningAdjustment));
  }

  /**
   * ROC Curve-based optimal threshold calculation
   */
  private calculateROCOptimalThreshold(
    feedback: AnalystFeedback[],
    currentThreshold: number
  ): number {
    // Generate ROC curve points by varying threshold
    const thresholdRange = this.generateThresholdRange(currentThreshold);
    let bestThreshold = currentThreshold;
    let bestYoudenIndex = 0;

    for (const threshold of thresholdRange) {
      const metrics = this.calculateMetricsAtThreshold(feedback, threshold);
      
      // Youden's J statistic: TPR + TNR - 1
      const youdenIndex = metrics.sensitivity + metrics.specificity - 1;
      
      if (youdenIndex > bestYoudenIndex) {
        bestYoudenIndex = youdenIndex;
        bestThreshold = threshold;
      }
    }

    return bestThreshold;
  }

  /**
   * Precision-Recall balance optimization
   */
  private calculatePrecisionRecallOptimalThreshold(
    feedback: AnalystFeedback[],
    performance: ThresholdPerformanceData
  ): number {
    // Target F1 score optimization
    const targetF1 = 0.8; // Configurable target
    
    // If current F1 is already good, make conservative adjustments
    if (performance.f1Score >= targetF1) {
      return performance.threshold * 1.05; // Small increase to reduce false positives
    }

    // If precision is low (too many false positives), increase threshold
    if (performance.precision < 0.7) {
      return performance.threshold * 1.2;
    }

    // If recall is low (missing true positives), decrease threshold
    if (performance.recall < 0.7) {
      return performance.threshold * 0.8;
    }

    return performance.threshold;
  }

  /**
   * Analyst workload optimization
   */
  private calculateWorkloadOptimalThreshold(
    feedback: AnalystFeedback[],
    currentThreshold: number
  ): number {
    // Calculate average investigation time for different alert types
    const avgInvestigationTime = feedback.reduce((sum, f) => sum + f.timeToInvestigate, 0) / feedback.length;
    
    // Calculate false positive rate
    const falsePositives = feedback.filter(f => f.feedbackType === 'false_positive').length;
    const fpRate = falsePositives / feedback.length;

    // If investigation time is high and FP rate is high, increase threshold
    if (avgInvestigationTime > 300 && fpRate > 0.3) { // 5 minutes average, 30% FP rate
      return currentThreshold * 1.3;
    }

    // If investigation time is reasonable and FP rate is low, slightly decrease for better coverage
    if (avgInvestigationTime < 180 && fpRate < 0.15) { // 3 minutes average, 15% FP rate
      return currentThreshold * 0.95;
    }

    return currentThreshold;
  }

  /**
   * Temporal pattern analysis for threshold optimization
   */
  private async calculateTemporalOptimalThreshold(
    metricName: string,
    feedback: AnalystFeedback[]
  ): Promise<number> {
    // Analyze time-based patterns in feedback
    const hourlyPatterns = this.analyzeHourlyPatterns(feedback);
    const dailyPatterns = this.analyzeDailyPatterns(feedback);
    
    // Get current time context
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Adjust threshold based on temporal patterns
    const hourlyMultiplier = hourlyPatterns[currentHour] || 1.0;
    const dailyMultiplier = dailyPatterns[currentDay] || 1.0;

    // Get base threshold
    const rule = await this.getThresholdRule(metricName);
    const baseThreshold = rule?.currentThreshold || 1.0;

    return baseThreshold * hourlyMultiplier * dailyMultiplier;
  }

  /**
   * Analyzes hourly patterns in analyst feedback
   */
  private analyzeHourlyPatterns(feedback: AnalystFeedback[]): Record<number, number> {
    const hourlyStats: Record<number, { total: number; falsePositives: number }> = {};
    
    // Initialize hours
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { total: 0, falsePositives: 0 };
    }

    // Collect hourly statistics
    feedback.forEach(f => {
      const hour = f.timestamp.getHours();
      hourlyStats[hour].total++;
      if (f.feedbackType === 'false_positive') {
        hourlyStats[hour].falsePositives++;
      }
    });

    // Calculate adjustment multipliers
    const hourlyMultipliers: Record<number, number> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      const stats = hourlyStats[hour];
      if (stats.total === 0) {
        hourlyMultipliers[hour] = 1.0;
        continue;
      }

      const fpRate = stats.falsePositives / stats.total;
      
      // Higher FP rate during certain hours = increase threshold
      if (fpRate > 0.4) {
        hourlyMultipliers[hour] = 1.2;
      } else if (fpRate < 0.2) {
        hourlyMultipliers[hour] = 0.9;
      } else {
        hourlyMultipliers[hour] = 1.0;
      }
    }

    return hourlyMultipliers;
  }

  /**
   * Analyzes daily patterns in analyst feedback
   */
  private analyzeDailyPatterns(feedback: AnalystFeedback[]): Record<number, number> {
    const dailyStats: Record<number, { total: number; falsePositives: number }> = {};
    
    // Initialize days (0 = Sunday, 6 = Saturday)
    for (let i = 0; i < 7; i++) {
      dailyStats[i] = { total: 0, falsePositives: 0 };
    }

    // Collect daily statistics
    feedback.forEach(f => {
      const day = f.timestamp.getDay();
      dailyStats[day].total++;
      if (f.feedbackType === 'false_positive') {
        dailyStats[day].falsePositives++;
      }
    });

    // Calculate adjustment multipliers
    const dailyMultipliers: Record<number, number> = {};
    
    for (let day = 0; day < 7; day++) {
      const stats = dailyStats[day];
      if (stats.total === 0) {
        dailyMultipliers[day] = 1.0;
        continue;
      }

      const fpRate = stats.falsePositives / stats.total;
      
      // Weekend vs weekday patterns
      const isWeekend = day === 0 || day === 6;
      
      if (isWeekend && fpRate > 0.3) {
        dailyMultipliers[day] = 1.15; // Slightly higher threshold on weekends
      } else if (!isWeekend && fpRate < 0.25) {
        dailyMultipliers[day] = 0.95; // Slightly lower threshold on weekdays
      } else {
        dailyMultipliers[day] = 1.0;
      }
    }

    return dailyMultipliers;
  }

  /**
   * Gets strategy-specific weights for threshold calculation approaches
   */
  private getStrategyWeights(strategy: string): {
    roc: number;
    precisionRecall: number;
    workload: number;
    temporal: number;
  } {
    switch (strategy) {
      case 'conservative':
        return { roc: 0.3, precisionRecall: 0.4, workload: 0.2, temporal: 0.1 };
      case 'balanced':
        return { roc: 0.25, precisionRecall: 0.25, workload: 0.25, temporal: 0.25 };
      case 'aggressive':
        return { roc: 0.2, precisionRecall: 0.3, workload: 0.4, temporal: 0.1 };
      default:
        return { roc: 0.25, precisionRecall: 0.25, workload: 0.25, temporal: 0.25 };
    }
  }

  /**
   * Calculates performance metrics for given feedback
   */
  private calculatePerformanceMetrics(feedback: AnalystFeedback[]): ThresholdPerformanceData {
    const truePositives = feedback.filter(f => 
      f.feedbackType === 'true_positive').length;
    const falsePositives = feedback.filter(f => 
      f.feedbackType === 'false_positive' || f.feedbackType === 'noise').length;
    const falseNegatives = feedback.filter(f => 
      f.feedbackType === 'critical_miss').length;

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    const analystFeedbackScore = feedback.reduce((sum, f) => sum + f.confidence, 0) / feedback.length;

    return {
      timestamp: new Date(),
      threshold: 0, // Will be set by caller
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      analystFeedbackScore
    };
  }

  /**
   * Determines if threshold adjustment is needed
   */
  private analyzeAdjustmentNeed(
    rule: ThresholdRule,
    performance: ThresholdPerformanceData,
    feedback: AnalystFeedback[]
  ): { needsAdjustment: boolean; confidence: number; reason: string } {
    // Check if in cooldown period
    if (this.isInCooldownPeriod(rule.lastReview)) {
      return { needsAdjustment: false, confidence: 0, reason: 'In cooldown period' };
    }

    // High false positive rate
    if (performance.precision < 0.6) {
      return { 
        needsAdjustment: true, 
        confidence: 0.8, 
        reason: `Low precision (${(performance.precision * 100).toFixed(1)}%)` 
      };
    }

    // High false negative rate
    if (performance.recall < 0.7) {
      return { 
        needsAdjustment: true, 
        confidence: 0.75, 
        reason: `Low recall (${(performance.recall * 100).toFixed(1)}%)` 
      };
    }

    // Low F1 score
    if (performance.f1Score < 0.65) {
      return { 
        needsAdjustment: true, 
        confidence: 0.7, 
        reason: `Low F1 score (${(performance.f1Score * 100).toFixed(1)}%)` 
      };
    }

    // Recent critical misses
    const recentCriticalMisses = feedback.filter(f => 
      f.feedbackType === 'critical_miss' && 
      Date.now() - f.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length;

    if (recentCriticalMisses > 0) {
      return { 
        needsAdjustment: true, 
        confidence: 0.9, 
        reason: `${recentCriticalMisses} recent critical misses` 
      };
    }

    return { needsAdjustment: false, confidence: 0, reason: 'Performance within acceptable range' };
  }

  // Helper methods
  private generateThresholdRange(currentThreshold: number): number[] {
    const range: number[] = [];
    const step = currentThreshold * 0.05; // 5% steps
    
    for (let i = 0.5; i <= 2.0; i += 0.1) {
      range.push(currentThreshold * i);
    }
    
    return range;
  }

  private calculateMetricsAtThreshold(
    feedback: AnalystFeedback[],
    threshold: number
  ): { sensitivity: number; specificity: number } {
    // This would need actual alert score data to implement properly
    // For now, return mock calculations based on feedback patterns
    const fpRate = feedback.filter(f => f.feedbackType === 'false_positive').length / feedback.length;
    const tpRate = feedback.filter(f => f.feedbackType === 'true_positive').length / feedback.length;
    
    return {
      sensitivity: tpRate,
      specificity: 1 - fpRate
    };
  }

  private isInCooldownPeriod(lastAdjustment: Date): boolean {
    const cooldownMs = this.ADJUSTMENT_COOLDOWN_HOURS * 60 * 60 * 1000;
    return Date.now() - lastAdjustment.getTime() < cooldownMs;
  }

  // Storage interface methods (to be implemented with actual storage)
  private async getActiveThresholdRules(): Promise<ThresholdRule[]> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async getThresholdRule(metricName: string): Promise<ThresholdRule | null> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async getRecentFeedback(metricName: string): Promise<AnalystFeedback[]> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async getLastAdjustmentTime(metricName: string): Promise<Date> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async updateThreshold(rule: ThresholdRule, newThreshold: number, approvedBy: string): Promise<void> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async recordThresholdChange(
    metricName: string, 
    oldThreshold: number, 
    newThreshold: number, 
    approvedBy: string
  ): Promise<void> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async scheduleThresholdReview(metricName: string): Promise<void> {
    // Implementation depends on job scheduling backend
    throw new Error('Not implemented');
  }

  private async getHistoricalPerformance(metricName: string): Promise<ThresholdPerformanceData[]> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }
}

// Storage interfaces
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