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

// Sub-second real-time performance enhancements for correlation engine
interface PerformanceMetrics {
  totalEventsProcessed: number;
  averageProcessingTime: number;
  ruleEvaluationCache: Map<string, { result: boolean; timestamp: number; confidence: number }>;
  eventBatchMetrics: {
    batchSize: number;
    batchProcessingTime: number;
    throughput: number;
    avgLatency: number;
  };
  fastPathHits: number;
  cacheHitRate: number;
  parallelProcessingEfficiency: number;
}

interface RealTimeConfig {
  maxProcessingTimeMs: number;        // Target: 100ms for sub-second response
  batchProcessingEnabled: boolean;
  batchSize: number;                  // Optimal: 10-50 events
  cacheExpirationMs: number;          // 5 minutes for hot cache
  parallelRuleEvaluation: boolean;    // Enable parallel rule processing
  fastPathEnabled: boolean;           // Skip complex rules for simple events
  streamProcessingMode: boolean;      // Real-time stream processing
  priorityRuleThreshold: number;      // Critical rule processing priority
  memoryBufferSizeLimit: number;      // Memory optimization limit
  adaptiveThrottling: boolean;        // Dynamic performance adjustment
}

interface EventPriority {
  critical: string[];    // Event IDs requiring immediate processing
  high: string[];        // High-priority security events
  normal: string[];      // Standard events
  low: string[];         // Low-priority events for batch processing
}

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
  
  // Sub-second performance optimization components
  private performanceMetrics: PerformanceMetrics;
  private config: RealTimeConfig;
  private eventPriority: EventPriority;
  private ruleCache: Map<string, { hash: string; compiledRule: any }> = new Map();
  private batchProcessor: Map<string, LogEvent[]> = new Map();
  private criticalRules: Map<string, CorrelationRule> = new Map();
  private processingStartTime: number = 0;

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

    // Optimized queue for sub-second processing
    this.queue = new PQueue({ 
      concurrency: parseInt(process.env.CORRELATION_CONCURRENCY || '20'),
      intervalCap: 1000,  // Rate limiting for burst protection
      interval: 1000      // Per second
    });
    
    this.ruleEvaluator = new RuleEvaluator(this.db, this.redis);
    this.patternMatcher = new PatternMatcher(this.db);
    this.incidentManager = new IncidentManager(this.db);
    this.actionExecutor = new ActionExecutor(this.db);

    // Initialize sub-second performance optimization
    this.initializePerformanceConfig();
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

  private initializePerformanceConfig(): void {
    // Sub-second performance configuration for real-time threat detection
    this.config = {
      maxProcessingTimeMs: parseInt(process.env.CORRELATION_MAX_PROCESSING_MS || '100'), // Sub-second target
      batchProcessingEnabled: process.env.CORRELATION_BATCH_ENABLED !== 'false',
      batchSize: parseInt(process.env.CORRELATION_BATCH_SIZE || '25'),
      cacheExpirationMs: parseInt(process.env.CORRELATION_CACHE_EXPIRY_MS || '300000'), // 5 minutes
      parallelRuleEvaluation: process.env.CORRELATION_PARALLEL_RULES !== 'false',
      fastPathEnabled: process.env.CORRELATION_FAST_PATH !== 'false',
      streamProcessingMode: process.env.CORRELATION_STREAM_MODE !== 'false',
      priorityRuleThreshold: parseInt(process.env.CORRELATION_PRIORITY_THRESHOLD || '3'),
      memoryBufferSizeLimit: parseInt(process.env.CORRELATION_BUFFER_LIMIT || '10000'),
      adaptiveThrottling: process.env.CORRELATION_ADAPTIVE_THROTTLING !== 'false'
    };

    this.eventPriority = {
      critical: ['4625', '4648', '4672', '4673', '4776', '4778', '4779'], // Auth failures, privilege events
      high: ['4624', '4634', '4647', '4656', '4658', '4663', '4688'],     // Successful logins, process creation
      normal: ['4768', '4769', '4770', '4771', '4800', '4801'],           // Kerberos events
      low: ['1', '2', '3', '6', '7', '8']                                 // System events
    };

    this.performanceMetrics = {
      totalEventsProcessed: 0,
      averageProcessingTime: 0,
      ruleEvaluationCache: new Map(),
      eventBatchMetrics: {
        batchSize: 0,
        batchProcessingTime: 0,
        throughput: 0,
        avgLatency: 0
      },
      fastPathHits: 0,
      cacheHitRate: 0,
      parallelProcessingEfficiency: 0
    };

    logger.info('Sub-second correlation engine performance optimization initialized', {
      maxProcessingTimeMs: this.config.maxProcessingTimeMs,
      batchSize: this.config.batchSize,
      parallelRuleEvaluation: this.config.parallelRuleEvaluation,
      fastPathEnabled: this.config.fastPathEnabled
    });
  }

  async processEvent(event: LogEvent): Promise<void> {
    const processingPromise = this.config.streamProcessingMode ? 
      this.processEventStream(event) : 
      this.queue.add(() => this.processEventStream(event));
    
    await processingPromise;
  }

  private async processEventStream(event: LogEvent): Promise<void> {
    const startTime = Date.now();
    this.processingStartTime = startTime;
    
    try {
      // Performance optimization: Early priority classification
      const priority = this.classifyEventPriority(event);
      
      // Fast path for low-priority events in batch mode
      if (priority === 'low' && this.config.batchProcessingEnabled) {
        this.addToBatchProcessor(event);
        return;
      }

      const context: CorrelationContext = {
        eventId: event.id,
        timestamp: new Date(event.timestamp),
        source: event.source,
        eventType: event.event_id,
        metadata: { priority }
      };

      // Add event to buffer for time-window based correlations
      this.addEventToBuffer(event);

      // Sub-second optimization: Parallel rule evaluation and pattern matching
      const [evaluationResults, patternMatches] = await Promise.all([
        this.evaluateRulesOptimized(event, context, priority),
        this.config.fastPathEnabled && priority !== 'critical' ? 
          Promise.resolve([]) : // Skip pattern matching for non-critical in fast path
          this.patternMatcher.findMatches(event, this.eventBuffer)
      ]);

      // Process results with priority-based handling
      await this.processResultsOptimized(evaluationResults, patternMatches, event, priority);

      // Update performance metrics
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime, evaluationResults.length, patternMatches.length);

      // Performance threshold monitoring
      if (processingTime > this.config.maxProcessingTimeMs) {
        logger.warn(`Event processing exceeded target time: ${processingTime}ms > ${this.config.maxProcessingTimeMs}ms`, {
          eventId: event.id,
          priority,
          rulesEvaluated: this.activeRules.size,
          matchedRules: evaluationResults.length
        });
        
        // Adaptive throttling for performance optimization
        if (this.config.adaptiveThrottling) {
          await this.adjustProcessingThreshold(processingTime);
        }
      }

    } catch (error) {
      logger.error('Error in optimized event processing:', error, { 
        eventId: event.id,
        processingTime: Date.now() - startTime
      });
    }
  }

  private classifyEventPriority(event: LogEvent): 'critical' | 'high' | 'normal' | 'low' {
    const eventId = event.event_id || '';
    
    if (this.eventPriority.critical.includes(eventId)) return 'critical';
    if (this.eventPriority.high.includes(eventId)) return 'high';
    if (this.eventPriority.normal.includes(eventId)) return 'normal';
    return 'low';
  }

  private async evaluateRulesOptimized(
    event: LogEvent, 
    context: CorrelationContext, 
    priority: string
  ): Promise<EvaluationResult[]> {
    const startTime = Date.now();
    const evaluationResults: EvaluationResult[] = [];
    
    // Select rules based on priority
    const rulesToEvaluate = priority === 'critical' ? 
      [...this.criticalRules.values(), ...this.activeRules.values()] :
      [...this.activeRules.values()];

    if (this.config.parallelRuleEvaluation && rulesToEvaluate.length > this.config.priorityRuleThreshold) {
      // Parallel evaluation for better performance
      const rulePromises = rulesToEvaluate.map(async (rule) => {
        const cacheKey = `${rule.id}:${event.event_id}:${event.source}`;
        
        // Check cache first for sub-second response
        const cached = this.performanceMetrics.ruleEvaluationCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheExpirationMs) {
          this.performanceMetrics.fastPathHits++;
          return cached.result ? { ruleId: rule.id, matched: true, confidence: cached.confidence } : null;
        }

        const result = await this.ruleEvaluator.evaluate(rule, event, context);
        
        // Cache the result for future lookups
        this.performanceMetrics.ruleEvaluationCache.set(cacheKey, {
          result: result.matched,
          timestamp: Date.now(),
          confidence: result.confidence
        });

        return result.matched ? result : null;
      });

      const results = await Promise.all(rulePromises);
      evaluationResults.push(...results.filter(r => r !== null) as EvaluationResult[]);
    } else {
      // Sequential evaluation for smaller rule sets
      for (const rule of rulesToEvaluate) {
        const result = await this.ruleEvaluator.evaluate(rule, event, context);
        if (result.matched) {
          evaluationResults.push(result);
        }
      }
    }

    // Track parallel processing efficiency
    const parallelTime = Date.now() - startTime;
    this.performanceMetrics.parallelProcessingEfficiency = 
      Math.min(rulesToEvaluate.length / Math.max(parallelTime, 1), 1000); // Rules per second

    return evaluationResults;
  }

  private async processResultsOptimized(
    evaluationResults: EvaluationResult[],
    patternMatches: any[],
    event: LogEvent,
    priority: string
  ): Promise<void> {
    // Priority-based result processing
    if (priority === 'critical') {
      // Immediate processing for critical events
      await Promise.all([
        ...evaluationResults.map(result => this.handleRuleMatch(result, event)),
        ...patternMatches.map(pattern => this.handlePatternMatch(pattern, event))
      ]);
    } else {
      // Batched processing for non-critical events
      const resultPromises = evaluationResults.map(result => this.handleRuleMatch(result, event));
      const patternPromises = patternMatches.map(pattern => this.handlePatternMatch(pattern, event));
      
      // Process in batches to maintain performance
      await Promise.all([...resultPromises, ...patternPromises]);
    }
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

  private addToBatchProcessor(event: LogEvent): void {
    const batchKey = `batch:${event.source}`;
    if (!this.batchProcessor.has(batchKey)) {
      this.batchProcessor.set(batchKey, []);
    }
    
    const batch = this.batchProcessor.get(batchKey)!;
    batch.push(event);
    
    // Process batch when it reaches configured size
    if (batch.length >= this.config.batchSize) {
      this.processBatch(batchKey, batch);
      this.batchProcessor.set(batchKey, []); // Reset batch
    }
  }

  private async processBatch(batchKey: string, events: LogEvent[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Process batch of low-priority events together
      const promises = events.map(event => this.processEventStream(event));
      await Promise.all(promises);
      
      const batchTime = Date.now() - startTime;
      this.performanceMetrics.eventBatchMetrics = {
        batchSize: events.length,
        batchProcessingTime: batchTime,
        throughput: events.length / (batchTime / 1000),
        avgLatency: batchTime / events.length
      };
      
      logger.debug(`Processed batch of ${events.length} events in ${batchTime}ms`, {
        batchKey,
        throughput: this.performanceMetrics.eventBatchMetrics.throughput
      });
    } catch (error) {
      logger.error('Error processing event batch:', error, { batchKey, eventCount: events.length });
    }
  }

  private updatePerformanceMetrics(processingTime: number, matchedRules: number, matchedPatterns: number): void {
    this.performanceMetrics.totalEventsProcessed++;
    
    // Update rolling average processing time
    const totalEvents = this.performanceMetrics.totalEventsProcessed;
    this.performanceMetrics.averageProcessingTime = 
      ((this.performanceMetrics.averageProcessingTime * (totalEvents - 1)) + processingTime) / totalEvents;
    
    // Calculate cache hit rate
    const totalCacheChecks = this.performanceMetrics.fastPathHits + matchedRules;
    this.performanceMetrics.cacheHitRate = totalCacheChecks > 0 ? 
      this.performanceMetrics.fastPathHits / totalCacheChecks : 0;
    
    // Clean up old cache entries every 1000 events
    if (totalEvents % 1000 === 0) {
      this.cleanupPerformanceCache();
    }
  }

  private cleanupPerformanceCache(): void {
    const now = Date.now();
    const expiredEntries = [];
    
    for (const [key, value] of this.performanceMetrics.ruleEvaluationCache) {
      if (now - value.timestamp > this.config.cacheExpirationMs) {
        expiredEntries.push(key);
      }
    }
    
    expiredEntries.forEach(key => this.performanceMetrics.ruleEvaluationCache.delete(key));
    
    logger.debug(`Cleaned up ${expiredEntries.length} expired cache entries`);
  }

  private async adjustProcessingThreshold(currentTime: number): Promise<void> {
    // Adaptive throttling: Increase batch size or reduce parallel processing
    if (currentTime > this.config.maxProcessingTimeMs * 2) {
      // Significantly over threshold - reduce parallelization
      this.config.parallelRuleEvaluation = false;
      logger.warn('Disabled parallel rule evaluation due to performance degradation');
    } else if (currentTime > this.config.maxProcessingTimeMs * 1.5) {
      // Moderately over threshold - increase batch size
      this.config.batchSize = Math.min(this.config.batchSize * 1.2, 100);
      logger.info(`Increased batch size to ${this.config.batchSize} for better performance`);
    }
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
      this.criticalRules.clear();
      
      for (const row of result.rows) {
        const rule = {
          ...row,
          conditions: row.conditions.filter((c: any) => c.id !== null)
        };
        
        this.activeRules.set(row.id, rule);
        
        // Separate critical rules for priority processing
        if (rule.severity === 'critical' || rule.priority === 'high' || 
            rule.type === 'authentication' || rule.type === 'malware') {
          this.criticalRules.set(row.id, rule);
        }
      }
      
      logger.info(`Loaded rules for sub-second processing`, {
        totalRules: this.activeRules.size,
        criticalRules: this.criticalRules.size,
        optimizationEnabled: this.config.fastPathEnabled
      });
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
      criticalRules: this.criticalRules.size,
      eventBufferSize: await this.getEventBufferSize(),
      queueSize: await this.getQueueSize(),
      bufferKeys: this.eventBuffer.size,
      performance: {
        totalEventsProcessed: this.performanceMetrics.totalEventsProcessed,
        averageProcessingTime: this.performanceMetrics.averageProcessingTime,
        fastPathHits: this.performanceMetrics.fastPathHits,
        cacheHitRate: this.performanceMetrics.cacheHitRate,
        parallelProcessingEfficiency: this.performanceMetrics.parallelProcessingEfficiency,
        currentThroughput: this.performanceMetrics.eventBatchMetrics.throughput,
        avgLatency: this.performanceMetrics.eventBatchMetrics.avgLatency,
        cacheSize: this.performanceMetrics.ruleEvaluationCache.size
      },
      configuration: {
        maxProcessingTimeMs: this.config.maxProcessingTimeMs,
        batchSize: this.config.batchSize,
        parallelRuleEvaluation: this.config.parallelRuleEvaluation,
        fastPathEnabled: this.config.fastPathEnabled,
        streamProcessingMode: this.config.streamProcessingMode
      }
    };
  }
}

export const correlationEngine = new CorrelationEngine();