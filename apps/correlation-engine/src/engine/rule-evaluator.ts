// @ts-nocheck
import { Pool } from 'pg';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { 
  CorrelationRule, 
  LogEvent, 
  EvaluationResult, 
  CorrelationContext,
  RuleLogic 
} from '../types';

export class RuleEvaluator {
  constructor(
    private db: Pool,
    private redis: ReturnType<typeof createClient>
  ) {}

  async initialize(): Promise<void> {
    logger.info('Rule evaluator initialized');
  }

  async evaluate(
    rule: CorrelationRule, 
    event: LogEvent, 
    context: CorrelationContext
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    const result: EvaluationResult = {
      ruleId: rule.id,
      matched: false,
      confidence: 0,
      executionTime: 0,
      matchedConditions: [],
      metadata: {}
    };

    try {
      switch (rule.type) {
        case 'simple':
          result.matched = await this.evaluateSimpleRule(rule, event, result);
          break;
        case 'threshold':
          result.matched = await this.evaluateThresholdRule(rule, event, context, result);
          break;
        case 'sequence':
          result.matched = await this.evaluateSequenceRule(rule, event, context, result);
          break;
        case 'complex':
          result.matched = await this.evaluateComplexRule(rule, event, context, result);
          break;
        case 'ml-based':
          result.matched = await this.evaluateMLRule(rule, event, context, result);
          break;
      }

      result.confidence = result.matched ? this.calculateConfidence(result) : 0;
    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}:`, error);
      result.metadata.error = error.message;
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  private async evaluateSimpleRule(
    rule: CorrelationRule,
    event: LogEvent,
    result: EvaluationResult
  ): Promise<boolean> {
    if (!rule.rule_logic.conditions || rule.rule_logic.conditions.length === 0) {
      return false;
    }

    const operator = rule.rule_logic.operator || 'AND';
    const conditions = rule.rule_logic.conditions;
    const results: boolean[] = [];

    for (const condition of conditions) {
      const matched = this.evaluateCondition(condition, event);
      if (matched) {
        result.matchedConditions.push(`${condition.field} ${condition.operator} ${condition.value}`);
      }
      results.push(matched);
    }

    if (operator === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  private evaluateCondition(condition: any, event: LogEvent): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return String(fieldValue) === String(conditionValue);
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      
      case 'regex_match':
        try {
          const regex = new RegExp(conditionValue, condition.case_sensitive ? '' : 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      
      default:
        return false;
    }
  }

  private async evaluateThresholdRule(
    rule: CorrelationRule,
    event: LogEvent,
    context: CorrelationContext,
    result: EvaluationResult
  ): Promise<boolean> {
    const threshold = rule.rule_logic.threshold;
    if (!threshold) return false;

    const timeWindowMinutes = threshold.time_window_minutes || rule.time_window_minutes || 5;
    const countThreshold = threshold.count || rule.event_count_threshold || 1;
    const groupBy = threshold.group_by || [];

    // Generate cache key for this threshold check
    const groupValues = groupBy.map(field => this.getFieldValue(event, field)).join(':');
    const cacheKey = `threshold:${rule.id}:${groupValues}`;

    // Check and update event count in Redis
    const currentCount = await this.redis.incr(cacheKey);
    
    // Set expiry on first event
    if (currentCount === 1) {
      await this.redis.expire(cacheKey, timeWindowMinutes * 60);
    }

    // Store event details for correlation
    const eventKey = `${cacheKey}:events`;
    await this.redis.rpush(eventKey, JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      source: event.source
    }));
    await this.redis.expire(eventKey, timeWindowMinutes * 60);

    if (currentCount >= countThreshold) {
      result.matchedConditions.push(`Event count ${currentCount} >= ${countThreshold} in ${timeWindowMinutes} minutes`);
      result.metadata.eventCount = currentCount;
      result.metadata.timeWindow = timeWindowMinutes;
      
      // Get all correlated events
      const correlatedEvents = await this.redis.lrange(eventKey, 0, -1);
      result.metadata.correlatedEvents = correlatedEvents.map(e => JSON.parse(e));
      
      return true;
    }

    return false;
  }

  private async evaluateSequenceRule(
    rule: CorrelationRule,
    event: LogEvent,
    context: CorrelationContext,
    result: EvaluationResult
  ): Promise<boolean> {
    const sequence = rule.rule_logic.sequence;
    if (!sequence || !sequence.events || sequence.events.length === 0) return false;

    const sequenceKey = `sequence:${rule.id}:${event.source}`;
    const currentSequence = await this.redis.get(sequenceKey);
    
    let sequenceState = currentSequence ? JSON.parse(currentSequence) : {
      currentIndex: 0,
      startTime: null,
      matchedEvents: []
    };

    const expectedEvent = sequence.events[sequenceState.currentIndex];
    
    // Check if current event matches expected event in sequence
    if (event.event_id === expectedEvent.event_id) {
      // Check additional conditions if specified
      let conditionsMet = true;
      if (expectedEvent.conditions) {
        for (const [field, value] of Object.entries(expectedEvent.conditions)) {
          if (this.getFieldValue(event, field) !== value) {
            conditionsMet = false;
            break;
          }
        }
      }

      if (conditionsMet) {
        // Update sequence state
        if (sequenceState.currentIndex === 0) {
          sequenceState.startTime = event.timestamp;
        }
        
        sequenceState.matchedEvents.push({
          eventId: event.id,
          timestamp: event.timestamp,
          eventType: event.event_id
        });
        
        sequenceState.currentIndex++;

        // Check if sequence is complete
        if (sequenceState.currentIndex >= sequence.events.length) {
          result.matched = true;
          result.matchedConditions.push(`Sequence completed: ${sequence.events.map(e => e.event_id).join(' -> ')}`);
          result.metadata.sequenceEvents = sequenceState.matchedEvents;
          result.metadata.sequenceDuration = new Date(event.timestamp).getTime() - new Date(sequenceState.startTime).getTime();
          
          // Reset sequence
          await this.redis.del(sequenceKey);
          return true;
        } else {
          // Save updated state
          const timeout = expectedEvent.timeout_minutes || 30;
          await this.redis.setex(sequenceKey, timeout * 60, JSON.stringify(sequenceState));
        }
      }
    } else if (!sequence.ordered) {
      // For unordered sequences, check if event matches any expected event
      for (let i = 0; i < sequence.events.length; i++) {
        if (sequence.events[i].event_id === event.event_id && 
            !sequenceState.matchedEvents.some(e => e.eventType === event.event_id)) {
          sequenceState.matchedEvents.push({
            eventId: event.id,
            timestamp: event.timestamp,
            eventType: event.event_id
          });
          
          if (sequenceState.matchedEvents.length >= sequence.events.length) {
            result.matched = true;
            result.matchedConditions.push(`Unordered sequence completed`);
            result.metadata.sequenceEvents = sequenceState.matchedEvents;
            await this.redis.del(sequenceKey);
            return true;
          } else {
            await this.redis.setex(sequenceKey, 30 * 60, JSON.stringify(sequenceState));
          }
          break;
        }
      }
    }

    return false;
  }

  private async evaluateComplexRule(
    rule: CorrelationRule,
    event: LogEvent,
    context: CorrelationContext,
    result: EvaluationResult
  ): Promise<boolean> {
    // Complex rules combine multiple evaluation types
    const subResults: boolean[] = [];

    // Evaluate basic conditions
    if (rule.rule_logic.conditions) {
      const simpleResult = await this.evaluateSimpleRule(rule, event, result);
      subResults.push(simpleResult);
    }

    // Evaluate threshold conditions
    if (rule.rule_logic.threshold) {
      const thresholdResult = await this.evaluateThresholdRule(rule, event, context, result);
      subResults.push(thresholdResult);
    }

    // Evaluate sequence conditions
    if (rule.rule_logic.sequence) {
      const sequenceResult = await this.evaluateSequenceRule(rule, event, context, result);
      subResults.push(sequenceResult);
    }

    // Complex rules require all sub-conditions to match
    return subResults.length > 0 && subResults.every(r => r === true);
  }

  private async evaluateMLRule(
    rule: CorrelationRule,
    event: LogEvent,
    context: CorrelationContext,
    result: EvaluationResult
  ): Promise<boolean> {
    // ML-based rules would integrate with ML models
    // For now, implement a simple anomaly detection based on historical baselines
    
    const entityType = rule.metadata?.entity_type || 'user';
    const entityId = this.getFieldValue(event, rule.metadata?.entity_field || 'user_name');
    const metricName = rule.metadata?.metric_name || 'event_frequency';

    // Get baseline from database
    const baselineQuery = `
      SELECT baseline_value, standard_deviation, confidence_level
      FROM behavioral_baselines
      WHERE entity_type = $1 AND entity_id = $2 AND metric_name = $3
    `;
    
    const baselineResult = await this.db.query(baselineQuery, [entityType, entityId, metricName]);
    
    if (baselineResult.rows.length === 0) {
      // No baseline established yet
      result.metadata.noBaseline = true;
      return false;
    }

    const baseline = baselineResult.rows[0];
    const currentValue = await this.getCurrentMetricValue(event, metricName);
    const deviation = Math.abs(currentValue - baseline.baseline_value) / (baseline.standard_deviation || 1);

    // Anomaly detected if deviation exceeds threshold (e.g., 3 standard deviations)
    const anomalyThreshold = rule.metadata?.anomaly_threshold || 3;
    
    if (deviation > anomalyThreshold && baseline.confidence_level > 0.7) {
      result.matched = true;
      result.matchedConditions.push(`Anomaly detected: ${deviation.toFixed(2)} standard deviations from baseline`);
      result.metadata.baseline = baseline.baseline_value;
      result.metadata.currentValue = currentValue;
      result.metadata.deviation = deviation;
      result.confidence = baseline.confidence_level;
      return true;
    }

    return false;
  }

  private getFieldValue(event: LogEvent, fieldPath: string): any {
    const paths = fieldPath.split('.');
    let value: any = event;

    for (const path of paths) {
      if (value && typeof value === 'object' && path in value) {
        value = value[path];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async getCurrentMetricValue(event: LogEvent, metricName: string): Promise<number> {
    // Calculate current metric value based on recent events
    // This is a simplified implementation
    switch (metricName) {
      case 'event_frequency':
        const recentEvents = await this.redis.get(`metric:${event.source}:count`);
        return recentEvents ? parseInt(recentEvents) : 1;
      
      case 'data_volume':
        return event.metadata?.bytes_sent || 0;
      
      default:
        return 0;
    }
  }

  private calculateConfidence(result: EvaluationResult): number {
    // Calculate confidence based on matched conditions and rule complexity
    const baseConfidence = 0.5;
    const conditionBonus = Math.min(result.matchedConditions.length * 0.1, 0.4);
    const metadataBonus = result.metadata.correlatedEvents ? 0.1 : 0;
    
    return Math.min(baseConfidence + conditionBonus + metadataBonus, 1.0);
  }
}