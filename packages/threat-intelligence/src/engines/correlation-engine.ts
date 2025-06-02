import { EventEmitter } from 'events';
import { CorrelationRule, DetectionAlert } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import PQueue from 'p-queue';

interface Event {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

interface CorrelationWindow {
  id: string;
  ruleId: string;
  startTime: Date;
  endTime: Date;
  events: Event[];
  correlationFields: Map<string, Set<any>>;
  matched: boolean;
}

interface CorrelationMatch {
  id: string;
  ruleId: string;
  ruleName: string;
  events: Event[];
  timestamp: Date;
  severity: string;
  confidence: number;
  correlationData: Record<string, any>;
  actions: string[];
}

interface CorrelationState {
  activeWindows: Map<string, CorrelationWindow[]>;
  eventBuffer: Event[];
  matches: CorrelationMatch[];
}

export class CorrelationEngine extends EventEmitter {
  private rules: Map<string, CorrelationRule> = new Map();
  private state: CorrelationState = {
    activeWindows: new Map(),
    eventBuffer: [],
    matches: []
  };
  private processingQueue: PQueue;
  private cleanupInterval?: NodeJS.Timeout;
  private bufferSize: number = 100000;
  private cleanupIntervalMs: number = 60000; // 1 minute

  constructor() {
    super();
    this.processingQueue = new PQueue({ concurrency: 10 });
    this.startCleanupWorker();
  }

  // Rule Management
  addRule(rule: CorrelationRule): void {
    this.rules.set(rule.id, rule);
    this.state.activeWindows.set(rule.id, []);
    logger.info(`Added correlation rule: ${rule.name} (${rule.id})`);
    this.emit('rule-added', { rule });
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    this.state.activeWindows.delete(ruleId);
    
    if (removed) {
      logger.info(`Removed correlation rule: ${ruleId}`);
      this.emit('rule-removed', { ruleId });
    }
    
    return removed;
  }

  updateRule(rule: CorrelationRule): void {
    this.rules.set(rule.id, rule);
    // Clear existing windows for this rule
    this.state.activeWindows.set(rule.id, []);
    logger.info(`Updated correlation rule: ${rule.name} (${rule.id})`);
    this.emit('rule-updated', { rule });
  }

  getRule(ruleId: string): CorrelationRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): CorrelationRule[] {
    return Array.from(this.rules.values());
  }

  // Event Processing
  async processEvent(event: Event): Promise<CorrelationMatch[]> {
    // Add to buffer
    this.addToBuffer(event);

    // Queue processing
    return this.processingQueue.add(async () => {
      const matches: CorrelationMatch[] = [];

      for (const [ruleId, rule] of this.rules) {
        if (!rule.enabled) continue;

        try {
          const match = await this.evaluateRule(event, rule);
          if (match) {
            matches.push(match);
            this.handleMatch(match);
          }
        } catch (error) {
          logger.error(`Error evaluating rule ${ruleId}`, error);
        }
      }

      return matches;
    });
  }

  async processEvents(events: Event[]): Promise<CorrelationMatch[]> {
    const allMatches: CorrelationMatch[] = [];

    // Process in batches
    const batchSize = 1000;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPromises = batch.map(event => this.processEvent(event));
      const batchResults = await Promise.all(batchPromises);
      allMatches.push(...batchResults.flat());
    }

    return allMatches;
  }

  // Rule Evaluation
  private async evaluateRule(event: Event, rule: CorrelationRule): Promise<CorrelationMatch | null> {
    // Check if event matches any condition
    const matchedCondition = this.matchesAnyCondition(event, rule.conditions);
    if (!matchedCondition) return null;

    // Get or create correlation windows for this rule
    let windows = this.state.activeWindows.get(rule.id) || [];

    // Find applicable windows based on correlation fields
    const applicableWindows = this.findApplicableWindows(event, rule, windows);

    if (applicableWindows.length === 0) {
      // Create new window
      const window = this.createWindow(rule, event);
      windows.push(window);
      this.state.activeWindows.set(rule.id, windows);
    } else {
      // Add event to applicable windows
      for (const window of applicableWindows) {
        this.addEventToWindow(event, window, rule);

        // Check if window meets threshold
        if (window.events.length >= rule.threshold && !window.matched) {
          window.matched = true;
          return this.createMatch(window, rule);
        }
      }
    }

    return null;
  }

  private matchesAnyCondition(event: Event, conditions: any[]): boolean {
    for (const condition of conditions) {
      if (this.matchesCondition(event, condition)) {
        return true;
      }
    }
    return false;
  }

  private matchesCondition(event: Event, condition: any): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      
      case 'gte':
        return Number(fieldValue) >= Number(condition.value);
      
      case 'lte':
        return Number(fieldValue) <= Number(condition.value);
      
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      
      default:
        return false;
    }
  }

  private getFieldValue(event: Event, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = event;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private findApplicableWindows(
    event: Event,
    rule: CorrelationRule,
    windows: CorrelationWindow[]
  ): CorrelationWindow[] {
    const applicable: CorrelationWindow[] = [];
    const eventTime = event.timestamp.getTime();

    for (const window of windows) {
      // Check if event is within time window
      if (eventTime < window.startTime.getTime() || eventTime > window.endTime.getTime()) {
        continue;
      }

      // Check if event matches correlation fields
      let matches = true;
      for (const field of rule.correlationFields) {
        const eventValue = this.getFieldValue(event, field);
        const windowValues = window.correlationFields.get(field);

        if (windowValues && windowValues.size > 0 && !windowValues.has(eventValue)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        applicable.push(window);
      }
    }

    return applicable;
  }

  private createWindow(rule: CorrelationRule, event: Event): CorrelationWindow {
    const window: CorrelationWindow = {
      id: uuidv4(),
      ruleId: rule.id,
      startTime: event.timestamp,
      endTime: new Date(event.timestamp.getTime() + rule.timeWindow),
      events: [event],
      correlationFields: new Map(),
      matched: false
    };

    // Initialize correlation field values
    for (const field of rule.correlationFields) {
      const value = this.getFieldValue(event, field);
      if (value !== undefined) {
        window.correlationFields.set(field, new Set([value]));
      }
    }

    return window;
  }

  private addEventToWindow(event: Event, window: CorrelationWindow, rule: CorrelationRule): void {
    window.events.push(event);

    // Update correlation field values
    for (const field of rule.correlationFields) {
      const value = this.getFieldValue(event, field);
      if (value !== undefined) {
        let fieldValues = window.correlationFields.get(field);
        if (!fieldValues) {
          fieldValues = new Set();
          window.correlationFields.set(field, fieldValues);
        }
        fieldValues.add(value);
      }
    }

    // Extend window if needed
    if (event.timestamp > window.endTime) {
      window.endTime = new Date(Math.min(
        event.timestamp.getTime(),
        window.startTime.getTime() + rule.timeWindow
      ));
    }
  }

  private createMatch(window: CorrelationWindow, rule: CorrelationRule): CorrelationMatch {
    const correlationData: Record<string, any> = {};
    
    // Collect correlation field values
    for (const [field, values] of window.correlationFields) {
      correlationData[field] = Array.from(values);
    }

    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(window, rule);

    const match: CorrelationMatch = {
      id: uuidv4(),
      ruleId: rule.id,
      ruleName: rule.name,
      events: window.events,
      timestamp: new Date(),
      severity: rule.severity,
      confidence,
      correlationData,
      actions: [rule.action]
    };

    return match;
  }

  private calculateConfidence(window: CorrelationWindow, rule: CorrelationRule): number {
    let confidence = 70; // Base confidence

    // Increase confidence based on number of events
    const eventRatio = window.events.length / rule.threshold;
    if (eventRatio > 2) confidence += 10;
    if (eventRatio > 5) confidence += 10;

    // Increase confidence based on correlation field consistency
    let consistentFields = 0;
    for (const [_, values] of window.correlationFields) {
      if (values.size === 1) consistentFields++;
    }
    const consistencyRatio = consistentFields / rule.correlationFields.length;
    confidence += consistencyRatio * 10;

    // Adjust based on time window utilization
    const timespan = window.events[window.events.length - 1].timestamp.getTime() - 
                    window.events[0].timestamp.getTime();
    const windowUtilization = timespan / rule.timeWindow;
    if (windowUtilization < 0.1) confidence += 5; // Events clustered closely

    return Math.min(100, Math.round(confidence));
  }

  private handleMatch(match: CorrelationMatch): void {
    // Store match
    this.state.matches.push(match);
    if (this.state.matches.length > 10000) {
      this.state.matches = this.state.matches.slice(-5000);
    }

    // Emit match event
    this.emit('correlation-match', match);
    logger.info(`Correlation match: ${match.ruleName}`, {
      ruleId: match.ruleId,
      eventCount: match.events.length,
      severity: match.severity,
      confidence: match.confidence
    });

    // Trigger actions
    this.triggerActions(match);
  }

  private triggerActions(match: CorrelationMatch): void {
    for (const action of match.actions) {
      switch (action) {
        case 'alert':
          this.createAlert(match);
          break;
        case 'enrich':
          this.enrichEvents(match);
          break;
        case 'block':
          this.blockEntity(match);
          break;
        case 'isolate':
          this.isolateHost(match);
          break;
        case 'custom':
          this.emit('custom-action', match);
          break;
      }
    }
  }

  private createAlert(match: CorrelationMatch): void {
    const alert: DetectionAlert = {
      id: uuidv4(),
      ruleId: match.ruleId,
      ruleName: match.ruleName,
      severity: match.severity as any,
      confidence: match.confidence,
      timestamp: match.timestamp,
      source: {
        ip: match.correlationData.sourceIp?.[0],
        hostname: match.correlationData.hostname?.[0],
        user: match.correlationData.user?.[0]
      },
      indicators: [],
      context: {
        correlationMatch: match.id,
        eventCount: match.events.length,
        correlationData: match.correlationData,
        timespan: match.events[match.events.length - 1].timestamp.getTime() - 
                  match.events[0].timestamp.getTime()
      },
      mitreAttack: [],
      enrichment: {},
      status: 'new'
    };

    this.emit('alert', alert);
  }

  private enrichEvents(match: CorrelationMatch): void {
    this.emit('enrich-request', {
      events: match.events,
      correlationData: match.correlationData
    });
  }

  private blockEntity(match: CorrelationMatch): void {
    const entities = {
      ips: match.correlationData.sourceIp || [],
      users: match.correlationData.user || [],
      domains: match.correlationData.domain || []
    };

    this.emit('block-request', entities);
  }

  private isolateHost(match: CorrelationMatch): void {
    const hosts = match.correlationData.hostname || [];
    this.emit('isolate-request', { hosts });
  }

  // Buffer Management
  private addToBuffer(event: Event): void {
    this.state.eventBuffer.push(event);
    
    // Maintain buffer size limit
    if (this.state.eventBuffer.length > this.bufferSize) {
      this.state.eventBuffer = this.state.eventBuffer.slice(-this.bufferSize / 2);
    }
  }

  // Cleanup
  private startCleanupWorker(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredWindows();
    }, this.cleanupIntervalMs);
  }

  private cleanupExpiredWindows(): void {
    const now = Date.now();
    let totalCleaned = 0;

    for (const [ruleId, windows] of this.state.activeWindows) {
      const activeWindows = windows.filter(window => {
        const expired = window.endTime.getTime() < now;
        if (expired) totalCleaned++;
        return !expired;
      });

      this.state.activeWindows.set(ruleId, activeWindows);
    }

    if (totalCleaned > 0) {
      logger.debug(`Cleaned up ${totalCleaned} expired correlation windows`);
    }
  }

  // Query Methods
  getActiveWindows(ruleId?: string): CorrelationWindow[] {
    if (ruleId) {
      return this.state.activeWindows.get(ruleId) || [];
    }

    const allWindows: CorrelationWindow[] = [];
    for (const windows of this.state.activeWindows.values()) {
      allWindows.push(...windows);
    }
    return allWindows;
  }

  getRecentMatches(limit: number = 100): CorrelationMatch[] {
    return this.state.matches.slice(-limit);
  }

  getMatchesByRule(ruleId: string, limit: number = 100): CorrelationMatch[] {
    return this.state.matches
      .filter(match => match.ruleId === ruleId)
      .slice(-limit);
  }

  // Statistics
  getStatistics(): {
    totalRules: number;
    activeRules: number;
    activeWindows: number;
    bufferedEvents: number;
    totalMatches: number;
    matchesByRule: Record<string, number>;
    matchesBySeverity: Record<string, number>;
  } {
    const stats = {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      activeWindows: 0,
      bufferedEvents: this.state.eventBuffer.length,
      totalMatches: this.state.matches.length,
      matchesByRule: {} as Record<string, number>,
      matchesBySeverity: {} as Record<string, number>
    };

    // Count active windows
    for (const windows of this.state.activeWindows.values()) {
      stats.activeWindows += windows.length;
    }

    // Count matches by rule and severity
    for (const match of this.state.matches) {
      stats.matchesByRule[match.ruleId] = (stats.matchesByRule[match.ruleId] || 0) + 1;
      stats.matchesBySeverity[match.severity] = (stats.matchesBySeverity[match.severity] || 0) + 1;
    }

    return stats;
  }

  // Shutdown
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.processingQueue.clear();
  }
}