// @ts-nocheck
import { Pool } from 'pg';
import { createClient } from 'redis';
import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';
import { differenceInMinutes } from 'date-fns';
import { logger } from '../utils/logger';
import { RuleEvaluator } from './rule-evaluator';
import { PatternMatcher } from './pattern-matcher';
import { IncidentManager } from './incident-manager';
import { ActionExecutor } from './action-executor';
import { 
  CorrelationRule, 
  LogEvent, 
  CorrelationIncident,
  EvaluationResult,
  CorrelationContext
} from '../types';

export class CorrelationEngine {
  private db: Pool;
  private redis: ReturnType<typeof createClient>;
  private queue: PQueue;
  private ruleEvaluator: RuleEvaluator;
  private patternMatcher: PatternMatcher;
  private incidentManager: IncidentManager;
  private actionExecutor: ActionExecutor;
  private activeRules: Map<string, CorrelationRule> = new Map();
  private eventBuffer: Map<string, LogEvent[]> = new Map();

  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'securewatch',
      user: process.env.DB_USER || 'securewatch',
      password: process.env.DB_PASSWORD || 'securewatch',
    });

    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.queue = new PQueue({ concurrency: 10 });
    this.ruleEvaluator = new RuleEvaluator(this.db, this.redis);
    this.patternMatcher = new PatternMatcher(this.db);
    this.incidentManager = new IncidentManager(this.db);
    this.actionExecutor = new ActionExecutor(this.db);
  }

  async initialize(): Promise<void> {
    try {
      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis');

      // Load active rules (may fail if tables don't exist yet)
      try {
        await this.loadActiveRules();
        logger.info(`Loaded ${this.activeRules.size} active correlation rules`);
      } catch (error) {
        logger.warn('Could not load rules - tables may not exist yet:', error.message);
      }

      // Initialize components
      await this.ruleEvaluator.initialize();
      await this.patternMatcher.initialize();
      await this.incidentManager.initialize();
      await this.actionExecutor.initialize();

      // Start event buffer cleanup
      this.startEventBufferCleanup();

    } catch (error) {
      logger.error('Failed to initialize correlation engine:', error);
      throw error;
    }
  }

  async processEvent(event: LogEvent): Promise<void> {
    await this.queue.add(async () => {
      try {
        const startTime = Date.now();
        const context: CorrelationContext = {
          eventId: event.id,
          timestamp: new Date(event.timestamp),
          source: event.source,
          eventType: event.event_id,
          metadata: {}
        };

        // Add event to buffer for time-window based correlations
        this.addEventToBuffer(event);

        // Evaluate against all active rules
        const evaluationResults: EvaluationResult[] = [];
        
        for (const [ruleId, rule] of this.activeRules) {
          const result = await this.ruleEvaluator.evaluate(rule, event, context);
          if (result.matched) {
            evaluationResults.push(result);
          }
        }

        // Check for pattern matches
        const patternMatches = await this.patternMatcher.findMatches(event, this.eventBuffer);

        // Process matched rules and patterns
        for (const result of evaluationResults) {
          await this.handleRuleMatch(result, event);
        }

        for (const pattern of patternMatches) {
          await this.handlePatternMatch(pattern, event);
        }

        // Log processing metrics
        const processingTime = Date.now() - startTime;
        logger.debug(`Event processed in ${processingTime}ms`, {
          eventId: event.id,
          rulesEvaluated: this.activeRules.size,
          matchedRules: evaluationResults.length,
          matchedPatterns: patternMatches.length
        });

      } catch (error) {
        logger.error('Error processing event:', error, { eventId: event.id });
      }
    });
  }

  private async handleRuleMatch(result: EvaluationResult, event: LogEvent): Promise<void> {
    try {
      const rule = this.activeRules.get(result.ruleId);
      if (!rule) return;

      // Check if we need to create or update an incident
      const existingIncident = await this.incidentManager.findOpenIncident(
        result.ruleId,
        event,
        rule.time_window_minutes
      );

      let incident: CorrelationIncident;
      
      if (existingIncident) {
        // Update existing incident
        incident = await this.incidentManager.updateIncident(
          existingIncident.id,
          event,
          result
        );
      } else {
        // Create new incident
        incident = await this.incidentManager.createIncident({
          rule_id: result.ruleId,
          incident_type: rule.type,
          severity: rule.severity,
          title: this.generateIncidentTitle(rule, event),
          description: this.generateIncidentDescription(rule, event, result),
          first_seen: event.timestamp,
          last_seen: event.timestamp,
          event_count: 1,
          affected_assets: this.extractAffectedAssets(event),
          metadata: result.metadata
        });
      }

      // Execute configured actions
      await this.actionExecutor.executeActions(rule, incident, event);

      // Update rule performance metrics
      await this.updateRuleMetrics(result.ruleId, true, result.executionTime);

    } catch (error) {
      logger.error('Error handling rule match:', error);
      await this.updateRuleMetrics(result.ruleId, false, 0);
    }
  }

  private async handlePatternMatch(pattern: any, event: LogEvent): Promise<void> {
    try {
      // Create pattern-based incident
      const incident = await this.incidentManager.createIncident({
        pattern_id: pattern.id,
        incident_type: pattern.pattern_type,
        severity: pattern.severity || 'medium',
        title: `${pattern.name} Detected`,
        description: pattern.description,
        first_seen: event.timestamp,
        last_seen: event.timestamp,
        event_count: pattern.matched_events.length,
        affected_assets: this.extractAffectedAssets(event),
        metadata: { pattern_details: pattern }
      });

      // Link all matched events to the incident
      for (const matchedEvent of pattern.matched_events) {
        await this.incidentManager.addCorrelatedEvent(
          incident.id,
          matchedEvent.id,
          matchedEvent.timestamp,
          pattern.relevance_score
        );
      }

      logger.info('Pattern match detected:', {
        patternName: pattern.name,
        incidentId: incident.id,
        eventCount: pattern.matched_events.length
      });

    } catch (error) {
      logger.error('Error handling pattern match:', error);
    }
  }

  private addEventToBuffer(event: LogEvent): void {
    const bufferKey = `${event.source}-${event.event_id}`;
    
    if (!this.eventBuffer.has(bufferKey)) {
      this.eventBuffer.set(bufferKey, []);
    }
    
    const buffer = this.eventBuffer.get(bufferKey)!;
    buffer.push(event);
    
    // Keep only recent events (last 2 hours)
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const filteredBuffer = buffer.filter(e => new Date(e.timestamp) > cutoffTime);
    this.eventBuffer.set(bufferKey, filteredBuffer);
  }

  private startEventBufferCleanup(): void {
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      for (const [key, events] of this.eventBuffer) {
        const filteredEvents = events.filter(e => new Date(e.timestamp) > cutoffTime);
        
        if (filteredEvents.length === 0) {
          this.eventBuffer.delete(key);
        } else {
          this.eventBuffer.set(key, filteredEvents);
        }
      }
      
      logger.debug(`Event buffer cleanup completed. Buffer size: ${this.eventBuffer.size}`);
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  private async loadActiveRules(): Promise<void> {
    try {
      const query = `
        SELECT r.*, 
               array_agg(
                 json_build_object(
                   'id', c.id,
                   'condition_type', c.condition_type,
                   'field_name', c.field_name,
                   'operator', c.operator,
                   'value', c.value,
                   'condition_order', c.condition_order,
                   'is_required', c.is_required
                 ) ORDER BY c.condition_order
               ) as conditions
        FROM correlation_rules r
        LEFT JOIN rule_conditions c ON r.id = c.rule_id
        WHERE r.enabled = true
        GROUP BY r.id
      `;
      
      const result = await this.db.query(query);
      
      this.activeRules.clear();
      for (const row of result.rows) {
        this.activeRules.set(row.id, {
          ...row,
          conditions: row.conditions.filter((c: any) => c.id !== null)
        });
      }
    } catch (error) {
      logger.error('Error loading active rules:', error);
      throw error;
    }
  }

  async reloadRules(): Promise<void> {
    await this.loadActiveRules();
    logger.info(`Reloaded ${this.activeRules.size} active correlation rules`);
  }

  private generateIncidentTitle(rule: CorrelationRule, event: LogEvent): string {
    const templates: Record<string, string> = {
      'authentication': `Authentication Alert: ${rule.name}`,
      'network': `Network Security: ${rule.name}`,
      'malware': `Malware Detection: ${rule.name}`,
      'data_exfiltration': `Data Exfiltration: ${rule.name}`,
      'default': `Security Alert: ${rule.name}`
    };

    const category = rule.metadata?.category || 'default';
    return templates[category] || templates.default;
  }

  private generateIncidentDescription(
    rule: CorrelationRule, 
    event: LogEvent, 
    result: EvaluationResult
  ): string {
    const baseDescription = rule.description || 'Security incident detected based on correlation rule.';
    const eventDetails = `\n\nTriggering Event:\n- Event ID: ${event.event_id}\n- Source: ${event.source}\n- Time: ${event.timestamp}`;
    const additionalContext = result.metadata?.context ? `\n\nAdditional Context:\n${JSON.stringify(result.metadata.context, null, 2)}` : '';
    
    return baseDescription + eventDetails + additionalContext;
  }

  private extractAffectedAssets(event: LogEvent): string[] {
    const assets: string[] = [];
    
    // Extract from various fields
    if (event.computer_name) assets.push(event.computer_name);
    if (event.user_name) assets.push(`user:${event.user_name}`);
    if (event.ip_address) assets.push(`ip:${event.ip_address}`);
    if (event.metadata?.target_host) assets.push(event.metadata.target_host);
    
    return [...new Set(assets)]; // Remove duplicates
  }

  private async updateRuleMetrics(
    ruleId: string, 
    success: boolean, 
    executionTime: number
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO rule_performance_metrics 
          (rule_id, evaluation_date, total_evaluations, true_positives, 
           false_positives, average_execution_time_ms)
        VALUES ($1, CURRENT_DATE, 1, $2, $3, $4)
        ON CONFLICT (rule_id, evaluation_date) 
        DO UPDATE SET
          total_evaluations = rule_performance_metrics.total_evaluations + 1,
          true_positives = rule_performance_metrics.true_positives + $2,
          false_positives = rule_performance_metrics.false_positives + $3,
          average_execution_time_ms = 
            (rule_performance_metrics.average_execution_time_ms * rule_performance_metrics.total_evaluations + $4) / 
            (rule_performance_metrics.total_evaluations + 1),
          last_triggered = CASE WHEN $2 = 1 THEN CURRENT_TIMESTAMP ELSE rule_performance_metrics.last_triggered END
      `;
      
      await this.db.query(query, [
        ruleId,
        success ? 1 : 0,
        success ? 0 : 1,
        executionTime
      ]);
    } catch (error) {
      logger.error('Error updating rule metrics:', error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.queue.onIdle();
      await this.redis.quit();
      await this.db.end();
      logger.info('Correlation engine shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }

  // Public API methods
  async getActiveRuleCount(): Promise<number> {
    return this.activeRules.size;
  }

  async getEventBufferSize(): Promise<number> {
    let totalEvents = 0;
    for (const events of this.eventBuffer.values()) {
      totalEvents += events.length;
    }
    return totalEvents;
  }

  async getQueueSize(): Promise<number> {
    return this.queue.size;
  }

  async getEngineStats(): Promise<any> {
    return {
      activeRules: this.activeRules.size,
      eventBufferSize: await this.getEventBufferSize(),
      queueSize: await this.getQueueSize(),
      bufferKeys: this.eventBuffer.size
    };
  }
}

export const correlationEngine = new CorrelationEngine();