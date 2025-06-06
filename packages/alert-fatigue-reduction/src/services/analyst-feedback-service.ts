// @ts-nocheck
/**
 * Analyst Feedback Learning System
 * 
 * Collects and processes analyst feedback to continuously improve
 * alert quality, reduce false positives, and optimize thresholds.
 */

import { AnalystFeedback, ThresholdRule } from './dynamic-threshold-service';
import { Alert, AlertCluster } from './alert-clustering-service';

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
  accuracyScore: number; // Based on consensus with other analysts
  responseTime: number; // Average time to provide feedback
  falsePositiveDetectionRate: number;
  criticalMissDetectionRate: number;
  consistency: number; // Consistency in similar scenarios
  expertise: string[]; // Areas of expertise based on feedback patterns
  trustScore: number; // Overall trust score for weighting feedback
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

export class AnalystFeedbackService {
  private readonly FEEDBACK_AGGREGATION_WINDOW_HOURS = 24;
  private readonly MIN_FEEDBACK_FOR_INSIGHT = 10;
  private readonly CONSENSUS_THRESHOLD = 0.7; // 70% agreement for consensus
  private readonly TRUST_SCORE_DECAY_DAYS = 30;

  constructor(
    private feedbackStorage: FeedbackStorage,
    private performanceStorage: PerformanceStorage,
    private insightStorage: InsightStorage,
    private mlModelService: MLModelService
  ) {}

  /**
   * Records and processes new analyst feedback
   */
  async processFeedback(feedback: AnalystFeedback): Promise<void> {
    // Store the feedback
    await this.feedbackStorage.store(feedback);

    // Update analyst performance metrics
    await this.updateAnalystPerformance(feedback);

    // Check for immediate patterns or critical issues
    await this.analyzeImmediateFeedback(feedback);

    // Schedule batch analysis if needed
    await this.scheduleBatchAnalysis();
  }

  /**
   * Analyzes all feedback to generate learning insights
   */
  async generateLearningInsights(): Promise<LearningInsight[]> {
    const recentFeedback = await this.getRecentFeedback();
    
    if (recentFeedback.length < this.MIN_FEEDBACK_FOR_INSIGHT) {
      return [];
    }

    const insights: LearningInsight[] = [];

    // Pattern discovery
    insights.push(...await this.discoverFalsePositivePatterns(recentFeedback));
    insights.push(...await this.discoverThresholdIssues(recentFeedback));
    insights.push(...await this.discoverRuleImprovements(recentFeedback));
    insights.push(...await this.discoverWhitelistCandidates(recentFeedback));

    // Store insights
    for (const insight of insights) {
      await this.insightStorage.store(insight);
    }

    return insights;
  }

  /**
   * Discovers patterns in false positive feedback
   */
  private async discoverFalsePositivePatterns(feedback: AnalystFeedback[]): Promise<LearningInsight[]> {
    const falsePositives = feedback.filter(f => f.feedbackType === 'false_positive');
    
    if (falsePositives.length < 5) return [];

    const insights: LearningInsight[] = [];

    // Group by rule
    const ruleGroups = this.groupFeedbackByRule(falsePositives);
    
    for (const [ruleId, ruleFeedback] of Object.entries(ruleGroups)) {
      if (ruleFeedback.length < 3) continue;

      const fpRate = ruleFeedback.length / feedback.filter(f => f.ruleId === ruleId).length;
      
      if (fpRate > 0.4) { // High false positive rate
        const pattern = await this.analyzeRulePattern(ruleId, ruleFeedback);
        
        insights.push({
          id: `fp-pattern-${ruleId}-${Date.now()}`,
          type: 'pattern_discovered',
          title: `High False Positive Rate in Rule ${ruleId}`,
          description: `Rule generating ${(fpRate * 100).toFixed(1)}% false positives. ${pattern.description}`,
          confidence: Math.min(0.9, fpRate + 0.2),
          impact: fpRate > 0.6 ? 'high' : 'medium',
          evidence: ruleFeedback,
          suggestedActions: [
            {
              action: 'increase_threshold',
              description: `Increase threshold by ${(fpRate * 0.5 * 100).toFixed(0)}%`,
              estimatedImpact: `Reduce false positives by ~${(fpRate * 0.7 * 100).toFixed(0)}%`,
              effort: 'low',
              riskLevel: 'low',
              prerequisites: ['threshold_analysis', 'impact_assessment']
            },
            {
              action: 'refine_rule_logic',
              description: 'Add additional context conditions to rule',
              estimatedImpact: 'Reduce false positives while maintaining detection',
              effort: 'medium',
              riskLevel: 'medium',
              prerequisites: ['rule_analysis', 'testing_environment']
            }
          ],
          affectedMetrics: [ruleId],
          createdAt: new Date(),
          status: 'new'
        });
      }
    }

    // Temporal patterns
    const temporalInsights = await this.analyzeTemporalPatterns(falsePositives);
    insights.push(...temporalInsights);

    return insights;
  }

  /**
   * Discovers threshold-related issues
   */
  private async discoverThresholdIssues(feedback: AnalystFeedback[]): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Group feedback by metric
    const metricGroups = this.groupFeedbackByMetric(feedback);

    for (const [metricName, metricFeedback] of Object.entries(metricGroups)) {
      if (metricFeedback.length < 5) continue;

      const analysis = this.analyzeThresholdPerformance(metricFeedback);
      
      if (analysis.needsAdjustment) {
        insights.push({
          id: `threshold-${metricName}-${Date.now()}`,
          type: 'threshold_suggestion',
          title: `Threshold Adjustment Needed: ${metricName}`,
          description: analysis.reason,
          confidence: analysis.confidence,
          impact: analysis.impact,
          evidence: metricFeedback,
          suggestedActions: [
            {
              action: 'adjust_threshold',
              description: `${analysis.direction} threshold by ${analysis.suggestedChange}%`,
              estimatedImpact: analysis.estimatedImpact,
              effort: 'low',
              riskLevel: analysis.riskLevel,
              prerequisites: ['performance_review', 'stakeholder_approval']
            }
          ],
          affectedMetrics: [metricName],
          createdAt: new Date(),
          status: 'new'
        });
      }
    }

    return insights;
  }

  /**
   * Discovers opportunities for rule improvements
   */
  private async discoverRuleImprovements(feedback: AnalystFeedback[]): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Look for rules with mixed feedback patterns
    const ruleGroups = this.groupFeedbackByRule(feedback);

    for (const [ruleId, ruleFeedback] of Object.entries(ruleGroups)) {
      if (ruleFeedback.length < 5) continue;

      const analysis = this.analyzeRuleEffectiveness(ruleId, ruleFeedback);
      
      if (analysis.improvementOpportunity) {
        insights.push({
          id: `rule-improvement-${ruleId}-${Date.now()}`,
          type: 'rule_modification',
          title: `Rule Improvement Opportunity: ${ruleId}`,
          description: analysis.description,
          confidence: analysis.confidence,
          impact: analysis.impact,
          evidence: ruleFeedback,
          suggestedActions: analysis.suggestedActions,
          affectedMetrics: [ruleId],
          createdAt: new Date(),
          status: 'new'
        });
      }
    }

    return insights;
  }

  /**
   * Discovers whitelist candidates
   */
  private async discoverWhitelistCandidates(feedback: AnalystFeedback[]): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    const falsePositives = feedback.filter(f => f.feedbackType === 'false_positive');

    // Look for recurring false positive patterns
    const patterns = await this.findRecurringPatterns(falsePositives);

    for (const pattern of patterns) {
      if (pattern.frequency > 5 && pattern.confidence > 0.8) {
        insights.push({
          id: `whitelist-${pattern.id}-${Date.now()}`,
          type: 'whitelist_candidate',
          title: `Whitelist Candidate: ${pattern.description}`,
          description: `Recurring false positive pattern detected ${pattern.frequency} times`,
          confidence: pattern.confidence,
          impact: 'medium',
          evidence: pattern.evidence,
          suggestedActions: [
            {
              action: 'create_whitelist_rule',
              description: `Add whitelist rule for pattern: ${pattern.pattern}`,
              estimatedImpact: `Reduce false positives by ~${pattern.frequency} per day`,
              effort: 'low',
              riskLevel: 'low',
              prerequisites: ['pattern_validation', 'security_review']
            }
          ],
          affectedMetrics: pattern.affectedRules,
          createdAt: new Date(),
          status: 'new'
        });
      }
    }

    return insights;
  }

  /**
   * Updates analyst performance metrics based on feedback
   */
  private async updateAnalystPerformance(feedback: AnalystFeedback): Promise<void> {
    let metrics = await this.performanceStorage.getByAnalyst(feedback.analystId);
    
    if (!metrics) {
      metrics = this.initializeAnalystMetrics(feedback.analystId);
    }

    // Update basic metrics
    metrics.totalFeedback++;
    
    // Update response time (weighted average)
    const weight = 0.1; // Learning rate
    metrics.responseTime = metrics.responseTime * (1 - weight) + feedback.timeToInvestigate * weight;

    // Update accuracy based on consensus with other analysts
    const consensus = await this.calculateConsensusAccuracy(feedback);
    if (consensus !== null) {
      metrics.accuracyScore = metrics.accuracyScore * (1 - weight) + consensus * weight;
    }

    // Update false positive detection rate
    if (feedback.feedbackType === 'false_positive') {
      metrics.falsePositiveDetectionRate = metrics.falsePositiveDetectionRate * 0.95 + 0.05;
    }

    // Update critical miss detection rate
    if (feedback.feedbackType === 'critical_miss') {
      metrics.criticalMissDetectionRate = metrics.criticalMissDetectionRate * 0.95 + 0.05;
    }

    // Update trust score based on consistency and accuracy
    metrics.trustScore = this.calculateTrustScore(metrics);

    // Update expertise areas
    metrics.expertise = await this.updateExpertiseAreas(feedback.analystId, feedback);

    await this.performanceStorage.update(metrics);
  }

  /**
   * Analyzes immediate feedback for critical issues
   */
  private async analyzeImmediateFeedback(feedback: AnalystFeedback): Promise<void> {
    // Check for critical misses
    if (feedback.feedbackType === 'critical_miss') {
      await this.handleCriticalMiss(feedback);
    }

    // Check for consistent false positives from same rule
    if (feedback.feedbackType === 'false_positive' && feedback.ruleId) {
      const recentFpCount = await this.getRecentFalsePositiveCount(feedback.ruleId, 1); // Last hour
      
      if (recentFpCount > 5) {
        await this.createUrgentInsight(feedback.ruleId, recentFpCount);
      }
    }
  }

  /**
   * Groups feedback by rule ID
   */
  private groupFeedbackByRule(feedback: AnalystFeedback[]): Record<string, AnalystFeedback[]> {
    return feedback.reduce((groups, f) => {
      if (f.ruleId) {
        if (!groups[f.ruleId]) groups[f.ruleId] = [];
        groups[f.ruleId].push(f);
      }
      return groups;
    }, {} as Record<string, AnalystFeedback[]>);
  }

  /**
   * Groups feedback by metric name
   */
  private groupFeedbackByMetric(feedback: AnalystFeedback[]): Record<string, AnalystFeedback[]> {
    return feedback.reduce((groups, f) => {
      if (f.metricName) {
        if (!groups[f.metricName]) groups[f.metricName] = [];
        groups[f.metricName].push(f);
      }
      return groups;
    }, {} as Record<string, AnalystFeedback[]>);
  }

  /**
   * Analyzes temporal patterns in feedback
   */
  private async analyzeTemporalPatterns(feedback: AnalystFeedback[]): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Group by hour of day
    const hourlyGroups = this.groupFeedbackByHour(feedback);
    
    // Look for hours with high false positive rates
    for (const [hour, hourFeedback] of Object.entries(hourlyGroups)) {
      if (hourFeedback.length < 3) continue;

      const fpRate = hourFeedback.filter(f => f.feedbackType === 'false_positive').length / hourFeedback.length;
      
      if (fpRate > 0.5) {
        insights.push({
          id: `temporal-pattern-${hour}-${Date.now()}`,
          type: 'pattern_discovered',
          title: `High False Positive Rate During Hour ${hour}`,
          description: `${(fpRate * 100).toFixed(1)}% false positive rate between ${hour}:00-${hour}:59`,
          confidence: Math.min(0.8, fpRate),
          impact: 'medium',
          evidence: hourFeedback,
          suggestedActions: [
            {
              action: 'temporal_threshold_adjustment',
              description: `Increase thresholds during hour ${hour}`,
              estimatedImpact: 'Reduce false positives during peak FP hours',
              effort: 'low',
              riskLevel: 'low',
              prerequisites: ['temporal_analysis_validation']
            }
          ],
          affectedMetrics: [...new Set(hourFeedback.map(f => f.ruleId).filter(Boolean) as string[])],
          createdAt: new Date(),
          status: 'new'
        });
      }
    }

    return insights;
  }

  /**
   * Groups feedback by hour of day
   */
  private groupFeedbackByHour(feedback: AnalystFeedback[]): Record<string, AnalystFeedback[]> {
    return feedback.reduce((groups, f) => {
      const hour = f.timestamp.getHours().toString();
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(f);
      return groups;
    }, {} as Record<string, AnalystFeedback[]>);
  }

  /**
   * Analyzes rule pattern for false positives
   */
  private async analyzeRulePattern(ruleId: string, feedback: AnalystFeedback[]): Promise<{ description: string }> {
    // Look for common patterns in the false positive feedback
    const commonSources = this.findCommonValues(feedback.map(f => f.notes || ''));
    const avgInvestigationTime = feedback.reduce((sum, f) => sum + f.timeToInvestigate, 0) / feedback.length;
    
    let description = `Common characteristics: `;
    
    if (avgInvestigationTime < 60) {
      description += 'Quick dismissal suggests obvious false positives. ';
    }
    
    if (commonSources.length > 0) {
      description += `Recurring patterns: ${commonSources.slice(0, 3).join(', ')}. `;
    }

    return { description };
  }

  /**
   * Finds common values in array
   */
  private findCommonValues(values: string[]): string[] {
    const counts = values.reduce((counts, value) => {
      if (value.length > 5) { // Ignore very short strings
        counts[value] = (counts[value] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([value]) => value);
  }

  /**
   * Analyzes threshold performance for a metric
   */
  private analyzeThresholdPerformance(feedback: AnalystFeedback[]): {
    needsAdjustment: boolean;
    confidence: number;
    impact: 'low' | 'medium' | 'high';
    reason: string;
    direction: 'increase' | 'decrease';
    suggestedChange: number;
    estimatedImpact: string;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const fpCount = feedback.filter(f => f.feedbackType === 'false_positive').length;
    const tpCount = feedback.filter(f => f.feedbackType === 'true_positive').length;
    const fnCount = feedback.filter(f => f.feedbackType === 'critical_miss').length;
    
    const fpRate = fpCount / feedback.length;
    const precision = tpCount / (tpCount + fpCount) || 0;
    const recall = tpCount / (tpCount + fnCount) || 0;

    // High false positive rate
    if (fpRate > 0.4) {
      return {
        needsAdjustment: true,
        confidence: 0.8,
        impact: 'high',
        reason: `High false positive rate: ${(fpRate * 100).toFixed(1)}%`,
        direction: 'increase',
        suggestedChange: Math.round(fpRate * 30),
        estimatedImpact: `Reduce false positives by ~${Math.round(fpRate * 60)}%`,
        riskLevel: 'low'
      };
    }

    // Low precision
    if (precision < 0.6) {
      return {
        needsAdjustment: true,
        confidence: 0.7,
        impact: 'medium',
        reason: `Low precision: ${(precision * 100).toFixed(1)}%`,
        direction: 'increase',
        suggestedChange: Math.round((0.8 - precision) * 40),
        estimatedImpact: `Improve precision to ~${Math.round((precision + 0.2) * 100)}%`,
        riskLevel: 'medium'
      };
    }

    // Low recall (critical misses)
    if (recall < 0.7 && fnCount > 0) {
      return {
        needsAdjustment: true,
        confidence: 0.9,
        impact: 'critical',
        reason: `Low recall: ${(recall * 100).toFixed(1)}% (${fnCount} critical misses)`,
        direction: 'decrease',
        suggestedChange: Math.round((0.8 - recall) * 20),
        estimatedImpact: `Improve recall to ~${Math.round((recall + 0.15) * 100)}%`,
        riskLevel: 'high'
      };
    }

    return {
      needsAdjustment: false,
      confidence: 0,
      impact: 'low',
      reason: 'Performance within acceptable range',
      direction: 'increase',
      suggestedChange: 0,
      estimatedImpact: 'No change needed',
      riskLevel: 'low'
    };
  }

  /**
   * Analyzes rule effectiveness
   */
  private analyzeRuleEffectiveness(ruleId: string, feedback: AnalystFeedback[]): {
    improvementOpportunity: boolean;
    description: string;
    confidence: number;
    impact: 'low' | 'medium' | 'high';
    suggestedActions: SuggestedAction[];
  } {
    const fpCount = feedback.filter(f => f.feedbackType === 'false_positive').length;
    const tpCount = feedback.filter(f => f.feedbackType === 'true_positive').length;
    const noiseCount = feedback.filter(f => f.feedbackType === 'noise').length;
    
    const totalAlerts = feedback.length;
    const fpRate = fpCount / totalAlerts;
    const noiseRate = noiseCount / totalAlerts;
    const effectiveness = tpCount / totalAlerts;

    const suggestedActions: SuggestedAction[] = [];

    // High noise rate suggests rule needs refinement
    if (noiseRate > 0.3) {
      suggestedActions.push({
        action: 'add_context_filters',
        description: 'Add additional context conditions to reduce noise',
        estimatedImpact: `Reduce noise by ~${Math.round(noiseRate * 70)}%`,
        effort: 'medium',
        riskLevel: 'low',
        prerequisites: ['context_analysis', 'filter_design']
      });
    }

    // Low effectiveness suggests rule overhaul
    if (effectiveness < 0.4) {
      suggestedActions.push({
        action: 'rule_redesign',
        description: 'Redesign rule logic for better signal-to-noise ratio',
        estimatedImpact: 'Improve effectiveness by 2-3x',
        effort: 'high',
        riskLevel: 'medium',
        prerequisites: ['threat_research', 'rule_development', 'testing']
      });
    }

    return {
      improvementOpportunity: suggestedActions.length > 0,
      description: `Rule effectiveness: ${(effectiveness * 100).toFixed(1)}%, FP rate: ${(fpRate * 100).toFixed(1)}%, Noise rate: ${(noiseRate * 100).toFixed(1)}%`,
      confidence: 0.7,
      impact: effectiveness < 0.3 ? 'high' : effectiveness < 0.6 ? 'medium' : 'low',
      suggestedActions
    };
  }

  /**
   * Finds recurring patterns in false positives
   */
  private async findRecurringPatterns(falsePositives: AnalystFeedback[]): Promise<Array<{
    id: string;
    pattern: string;
    description: string;
    frequency: number;
    confidence: number;
    evidence: AnalystFeedback[];
    affectedRules: string[];
  }>> {
    // Group by notes/patterns
    const patternGroups = falsePositives.reduce((groups, fp) => {
      const key = fp.notes || 'no-notes';
      if (!groups[key]) groups[key] = [];
      groups[key].push(fp);
      return groups;
    }, {} as Record<string, AnalystFeedback[]>);

    const patterns = [];
    
    for (const [pattern, evidence] of Object.entries(patternGroups)) {
      if (evidence.length >= 3 && pattern !== 'no-notes') {
        patterns.push({
          id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern,
          description: `Recurring false positive: ${pattern}`,
          frequency: evidence.length,
          confidence: Math.min(0.9, evidence.length / 10),
          evidence,
          affectedRules: [...new Set(evidence.map(e => e.ruleId).filter(Boolean) as string[])]
        });
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  // Helper methods for analyst performance
  private initializeAnalystMetrics(analystId: string): AnalystPerformanceMetrics {
    return {
      analystId,
      totalFeedback: 0,
      accuracyScore: 0.8, // Start with neutral score
      responseTime: 300, // 5 minutes default
      falsePositiveDetectionRate: 0.0,
      criticalMissDetectionRate: 0.0,
      consistency: 0.8,
      expertise: [],
      trustScore: 0.8
    };
  }

  private async calculateConsensusAccuracy(feedback: AnalystFeedback): Promise<number | null> {
    // Compare with other analysts' feedback on similar alerts
    // Implementation would require similarity matching and consensus calculation
    return null; // Placeholder
  }

  private calculateTrustScore(metrics: AnalystPerformanceMetrics): number {
    const accuracyWeight = 0.4;
    const consistencyWeight = 0.3;
    const responseTimeWeight = 0.2;
    const experienceWeight = 0.1;

    const normalizedResponseTime = Math.max(0, 1 - (metrics.responseTime - 60) / 600); // Normalize to 1-10 minutes
    const experienceScore = Math.min(1, metrics.totalFeedback / 100); // Experience based on feedback volume

    return (
      metrics.accuracyScore * accuracyWeight +
      metrics.consistency * consistencyWeight +
      normalizedResponseTime * responseTimeWeight +
      experienceScore * experienceWeight
    );
  }

  private async updateExpertiseAreas(analystId: string, feedback: AnalystFeedback): Promise<string[]> {
    // Analyze feedback patterns to determine expertise areas
    // Implementation would track rule types, attack techniques, etc.
    return []; // Placeholder
  }

  // Storage interface methods
  private async getRecentFeedback(): Promise<AnalystFeedback[]> {
    const fromDate = new Date(Date.now() - this.FEEDBACK_AGGREGATION_WINDOW_HOURS * 60 * 60 * 1000);
    return await this.feedbackStorage.getRecent(fromDate);
  }

  private async handleCriticalMiss(feedback: AnalystFeedback): Promise<void> {
    // Create high-priority insight for critical miss
    await this.createUrgentInsight(feedback.ruleId || 'unknown', 1, 'critical_miss');
  }

  private async getRecentFalsePositiveCount(ruleId: string, hours: number): Promise<number> {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentFeedback = await this.feedbackStorage.getByRule(ruleId, fromDate);
    return recentFeedback.filter(f => f.feedbackType === 'false_positive').length;
  }

  private async createUrgentInsight(ruleId: string, count: number, type: string = 'false_positive'): Promise<void> {
    const insight: LearningInsight = {
      id: `urgent-${ruleId}-${Date.now()}`,
      type: 'pattern_discovered',
      title: `Urgent: High ${type} Rate`,
      description: `${count} ${type} alerts from rule ${ruleId} in short timeframe`,
      confidence: 0.9,
      impact: 'critical',
      evidence: [], // Would populate with actual feedback
      suggestedActions: [
        {
          action: 'immediate_review',
          description: 'Immediately review rule configuration',
          estimatedImpact: 'Stop ongoing false positive generation',
          effort: 'low',
          riskLevel: 'low',
          prerequisites: []
        }
      ],
      affectedMetrics: [ruleId],
      createdAt: new Date(),
      status: 'new'
    };

    await this.insightStorage.store(insight);
  }

  private async scheduleBatchAnalysis(): Promise<void> {
    // Implementation would schedule periodic batch analysis
    // Could use job queue or cron-like scheduling
  }
}

// Storage interfaces
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
  predictFeedback(alertData: any): Promise<{ predictedType: string; confidence: number }>;
  updateModel(newFeedback: AnalystFeedback[]): Promise<void>;
}