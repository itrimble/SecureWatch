import { EventEmitter } from 'events';
import * as yaml from 'js-yaml';
import { SigmaRule, DetectionAlert } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface LogEvent {
  id: string;
  timestamp: Date;
  source: any;
  eventId?: string;
  channel?: string;
  provider?: string;
  level?: string;
  task?: string;
  opcode?: string;
  keywords?: string[];
  processId?: number;
  threadId?: number;
  data: Record<string, any>;
  raw?: string;
}

interface RuleMatch {
  rule: SigmaRule;
  event: LogEvent;
  matchedConditions: string[];
  confidence: number;
}

export class SigmaRuleEngine extends EventEmitter {
  private rules: Map<string, SigmaRule> = new Map();
  private compiledRules: Map<string, CompiledRule> = new Map();
  private matchCache: Map<string, RuleMatch[]> = new Map();
  private cacheSize: number = 10000;

  constructor() {
    super();
  }

  // Rule Management
  async loadRule(ruleContent: string, format: 'yaml' | 'json' = 'yaml'): Promise<string> {
    try {
      const rule: SigmaRule = format === 'yaml' 
        ? yaml.load(ruleContent) as SigmaRule
        : JSON.parse(ruleContent);

      // Validate rule
      this.validateRule(rule);

      // Compile rule for efficient matching
      const compiled = this.compileRule(rule);
      
      const ruleId = rule.id || uuidv4();
      this.rules.set(ruleId, { ...rule, id: ruleId });
      this.compiledRules.set(ruleId, compiled);

      logger.info(`Loaded SIGMA rule: ${rule.title} (${ruleId})`);
      this.emit('rule-loaded', { ruleId, rule });

      return ruleId;
    } catch (error) {
      logger.error('Failed to load SIGMA rule', error);
      throw error;
    }
  }

  async loadRulesFromDirectory(directory: string): Promise<number> {
    // This would be implemented to scan a directory for .yml files
    // For now, returning a placeholder
    logger.info(`Loading rules from directory: ${directory}`);
    return 0;
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId) && this.compiledRules.delete(ruleId);
    if (removed) {
      logger.info(`Removed SIGMA rule: ${ruleId}`);
      this.emit('rule-removed', { ruleId });
    }
    return removed;
  }

  getRule(ruleId: string): SigmaRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): SigmaRule[] {
    return Array.from(this.rules.values());
  }

  // Detection Methods
  async evaluateEvent(event: LogEvent): Promise<DetectionAlert[]> {
    const alerts: DetectionAlert[] = [];
    const eventKey = this.generateEventKey(event);

    // Check cache
    if (this.matchCache.has(eventKey)) {
      const cachedMatches = this.matchCache.get(eventKey)!;
      return cachedMatches.map(match => this.createAlert(match));
    }

    const matches: RuleMatch[] = [];

    // Evaluate against all rules
    for (const [ruleId, compiledRule] of this.compiledRules) {
      const rule = this.rules.get(ruleId)!;
      
      // Check if rule applies to this log source
      if (!this.matchesLogSource(event, rule.logsource)) {
        continue;
      }

      // Evaluate detection logic
      const matchResult = this.evaluateDetection(event, compiledRule, rule);
      if (matchResult.matched) {
        const match: RuleMatch = {
          rule,
          event,
          matchedConditions: matchResult.matchedConditions,
          confidence: this.calculateConfidence(matchResult, rule)
        };
        matches.push(match);
        alerts.push(this.createAlert(match));
      }
    }

    // Cache results
    this.cacheMatch(eventKey, matches);

    return alerts;
  }

  async evaluateEvents(events: LogEvent[]): Promise<Map<string, DetectionAlert[]>> {
    const results = new Map<string, DetectionAlert[]>();

    for (const event of events) {
      const alerts = await this.evaluateEvent(event);
      if (alerts.length > 0) {
        results.set(event.id, alerts);
      }
    }

    return results;
  }

  // Rule Translation
  translateToKQL(rule: SigmaRule): string {
    const conditions: string[] = [];

    // Translate log source filters
    if (rule.logsource.product) {
      conditions.push(`Product == "${rule.logsource.product}"`);
    }
    if (rule.logsource.service) {
      conditions.push(`Service == "${rule.logsource.service}"`);
    }
    if (rule.logsource.category) {
      conditions.push(`Category == "${rule.logsource.category}"`);
    }

    // Translate detection logic
    const detection = this.translateDetection(rule.detection);
    if (detection) {
      conditions.push(`(${detection})`);
    }

    return conditions.join(' and ');
  }

  private translateDetection(detection: any): string {
    const conditions: string[] = [];

    // Handle selection
    if (detection.selection) {
      const selectionConditions = this.translateSelection(detection.selection);
      conditions.push(selectionConditions);
    }

    // Handle filter (exclusions)
    if (detection.filter) {
      const filterConditions = this.translateSelection(detection.filter);
      conditions.push(`not (${filterConditions})`);
    }

    // Apply condition logic
    if (detection.condition) {
      return this.applyConditionLogic(detection.condition, conditions);
    }

    return conditions.join(' and ');
  }

  private translateSelection(selection: Record<string, any>): string {
    const conditions: string[] = [];

    for (const [field, value] of Object.entries(selection)) {
      if (Array.isArray(value)) {
        // Multiple values - OR condition
        const valueConditions = value.map(v => this.translateFieldValue(field, v));
        conditions.push(`(${valueConditions.join(' or ')})`);
      } else if (typeof value === 'object' && value !== null) {
        // Nested conditions
        conditions.push(this.translateSelection(value));
      } else {
        conditions.push(this.translateFieldValue(field, value));
      }
    }

    return conditions.join(' and ');
  }

  private translateFieldValue(field: string, value: any): string {
    // Handle special field names
    const kqlField = this.translateFieldName(field);

    if (typeof value === 'string') {
      // Handle wildcards
      if (value.includes('*')) {
        return `${kqlField} matches regex "${value.replace(/\*/g, '.*')}"`;
      }
      // Handle contains
      if (value.startsWith('*') && value.endsWith('*')) {
        return `${kqlField} contains "${value.slice(1, -1)}"`;
      }
      return `${kqlField} == "${value}"`;
    } else if (typeof value === 'number') {
      return `${kqlField} == ${value}`;
    } else if (typeof value === 'boolean') {
      return `${kqlField} == ${value}`;
    }

    return `${kqlField} == "${value}"`;
  }

  private translateFieldName(field: string): string {
    // Map common SIGMA field names to KQL equivalents
    const fieldMap: Record<string, string> = {
      'EventID': 'EventId',
      'CommandLine': 'ProcessCommandLine',
      'Image': 'ProcessName',
      'ParentImage': 'ParentProcessName',
      'TargetFilename': 'FileName',
      'SourceIp': 'SourceAddress',
      'DestinationIp': 'DestinationAddress',
      'User': 'UserName'
    };

    return fieldMap[field] || field;
  }

  private applyConditionLogic(condition: string, selections: string[]): string {
    // Simple condition parsing - would need enhancement for complex conditions
    if (condition === 'selection') {
      return selections[0] || 'true';
    }
    
    if (condition.includes(' and ')) {
      return selections.join(' and ');
    }
    
    if (condition.includes(' or ')) {
      return selections.join(' or ');
    }
    
    if (condition.includes(' not ')) {
      return `not (${selections[0]})`;
    }

    return selections[0] || 'true';
  }

  // Private Methods
  private validateRule(rule: SigmaRule): void {
    if (!rule.title) {
      throw new Error('Rule must have a title');
    }
    if (!rule.logsource) {
      throw new Error('Rule must have a logsource');
    }
    if (!rule.detection) {
      throw new Error('Rule must have detection logic');
    }
    if (!rule.level) {
      throw new Error('Rule must have a level');
    }
  }

  private compileRule(rule: SigmaRule): CompiledRule {
    const compiled: CompiledRule = {
      id: rule.id!,
      matchers: [],
      condition: rule.detection.condition
    };

    // Compile selection matchers
    if (rule.detection.selection) {
      compiled.matchers.push({
        name: 'selection',
        type: 'include',
        fields: this.compileSelection(rule.detection.selection)
      });
    }

    // Compile filter matchers
    if (rule.detection.filter) {
      compiled.matchers.push({
        name: 'filter',
        type: 'exclude',
        fields: this.compileSelection(rule.detection.filter)
      });
    }

    return compiled;
  }

  private compileSelection(selection: Record<string, any>): CompiledField[] {
    const fields: CompiledField[] = [];

    for (const [field, value] of Object.entries(selection)) {
      if (Array.isArray(value)) {
        fields.push({
          name: field,
          values: value,
          operator: 'in'
        });
      } else if (typeof value === 'string' && value.includes('*')) {
        fields.push({
          name: field,
          pattern: this.wildcardToRegex(value),
          operator: 'regex'
        });
      } else {
        fields.push({
          name: field,
          values: [value],
          operator: 'equals'
        });
      }
    }

    return fields;
  }

  private wildcardToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`, 'i');
  }

  private matchesLogSource(event: LogEvent, logsource: any): boolean {
    if (logsource.product && event.data.Product !== logsource.product) {
      return false;
    }
    if (logsource.service && event.data.Service !== logsource.service) {
      return false;
    }
    if (logsource.category && event.data.Category !== logsource.category) {
      return false;
    }
    return true;
  }

  private evaluateDetection(event: LogEvent, compiled: CompiledRule, rule: SigmaRule): {
    matched: boolean;
    matchedConditions: string[];
  } {
    const matchResults: Record<string, boolean> = {};
    const matchedConditions: string[] = [];

    // Evaluate each matcher
    for (const matcher of compiled.matchers) {
      const matched = this.evaluateMatcher(event, matcher);
      matchResults[matcher.name] = matched;
      if (matched && matcher.type === 'include') {
        matchedConditions.push(matcher.name);
      }
    }

    // Evaluate condition
    const matched = this.evaluateCondition(compiled.condition, matchResults);

    return { matched, matchedConditions };
  }

  private evaluateMatcher(event: LogEvent, matcher: CompiledMatcher): boolean {
    for (const field of matcher.fields) {
      const eventValue = this.getFieldValue(event, field.name);
      
      if (!this.matchField(eventValue, field)) {
        return false;
      }
    }
    return true;
  }

  private getFieldValue(event: LogEvent, fieldName: string): any {
    // Handle nested fields
    const parts = fieldName.split('.');
    let value: any = event.data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private matchField(eventValue: any, field: CompiledField): boolean {
    if (eventValue === undefined || eventValue === null) {
      return false;
    }

    switch (field.operator) {
      case 'equals':
        return field.values!.includes(eventValue);
      
      case 'in':
        return field.values!.includes(eventValue);
      
      case 'regex':
        return field.pattern!.test(String(eventValue));
      
      default:
        return false;
    }
  }

  private evaluateCondition(condition: string, matchResults: Record<string, boolean>): boolean {
    // Simple condition evaluation - would need enhancement for complex conditions
    if (condition === 'selection') {
      return matchResults['selection'] || false;
    }

    if (condition === 'selection and not filter') {
      return matchResults['selection'] && !matchResults['filter'];
    }

    // Default to AND logic for multiple conditions
    return Object.values(matchResults).every(result => result);
  }

  private calculateConfidence(matchResult: any, rule: SigmaRule): number {
    let confidence = 75; // Base confidence

    // Adjust based on rule status
    switch (rule.status) {
      case 'stable':
        confidence += 20;
        break;
      case 'test':
        confidence += 10;
        break;
      case 'experimental':
        confidence -= 10;
        break;
    }

    // Adjust based on false positive likelihood
    if (rule.falsepositives && rule.falsepositives.length > 0) {
      confidence -= rule.falsepositives.length * 5;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private createAlert(match: RuleMatch): DetectionAlert {
    const rule = match.rule;
    const event = match.event;

    return {
      id: uuidv4(),
      ruleId: rule.id!,
      ruleName: rule.title,
      severity: rule.level,
      confidence: match.confidence,
      timestamp: event.timestamp,
      source: {
        ip: event.data.SourceIp,
        hostname: event.data.ComputerName || event.data.Hostname,
        user: event.data.User || event.data.UserName,
        process: event.data.ProcessName || event.data.Image
      },
      destination: event.data.DestinationIp ? {
        ip: event.data.DestinationIp,
        hostname: event.data.DestinationHostname,
        port: event.data.DestinationPort
      } : undefined,
      indicators: [], // Would be populated by IOC matching
      context: {
        eventId: event.id,
        eventData: event.data,
        matchedConditions: match.matchedConditions,
        ruleDescription: rule.description,
        references: rule.references
      },
      mitreAttack: this.extractMitreMapping(rule),
      enrichment: {},
      status: 'new'
    };
  }

  private extractMitreMapping(rule: SigmaRule): Array<{ technique: string; tactic: string }> {
    const mapping: Array<{ technique: string; tactic: string }> = [];

    // Extract from tags
    if (rule.tags) {
      for (const tag of rule.tags) {
        if (tag.startsWith('attack.t')) {
          const technique = tag.replace('attack.', '').toUpperCase();
          mapping.push({
            technique,
            tactic: this.getTacticForTechnique(technique)
          });
        }
      }
    }

    return mapping;
  }

  private getTacticForTechnique(technique: string): string {
    // This would map techniques to tactics based on MITRE ATT&CK
    // Simplified mapping for example
    const prefix = technique.substring(0, 2);
    const tacticsMap: Record<string, string> = {
      'T1': 'Initial Access',
      'T2': 'Execution',
      'T3': 'Persistence',
      'T4': 'Privilege Escalation',
      'T5': 'Defense Evasion',
      'T6': 'Credential Access',
      'T7': 'Discovery',
      'T8': 'Lateral Movement',
      'T9': 'Collection'
    };
    return tacticsMap[prefix] || 'Unknown';
  }

  private generateEventKey(event: LogEvent): string {
    // Generate a cache key for the event
    const significant = {
      eventId: event.eventId,
      source: event.data.ComputerName,
      provider: event.provider,
      level: event.level
    };
    return JSON.stringify(significant);
  }

  private cacheMatch(key: string, matches: RuleMatch[]): void {
    this.matchCache.set(key, matches);

    // Implement simple LRU cache
    if (this.matchCache.size > this.cacheSize) {
      const firstKey = this.matchCache.keys().next().value;
      this.matchCache.delete(firstKey);
    }
  }

  // Statistics
  getStatistics(): {
    totalRules: number;
    rulesByLevel: Record<string, number>;
    rulesByStatus: Record<string, number>;
    cacheHitRate: number;
  } {
    const rulesByLevel: Record<string, number> = {};
    const rulesByStatus: Record<string, number> = {};

    for (const rule of this.rules.values()) {
      rulesByLevel[rule.level] = (rulesByLevel[rule.level] || 0) + 1;
      rulesByStatus[rule.status] = (rulesByStatus[rule.status] || 0) + 1;
    }

    return {
      totalRules: this.rules.size,
      rulesByLevel,
      rulesByStatus,
      cacheHitRate: 0 // Would need to track hits/misses
    };
  }
}

// Supporting interfaces
interface CompiledRule {
  id: string;
  matchers: CompiledMatcher[];
  condition: string;
}

interface CompiledMatcher {
  name: string;
  type: 'include' | 'exclude';
  fields: CompiledField[];
}

interface CompiledField {
  name: string;
  operator: 'equals' | 'in' | 'regex';
  values?: any[];
  pattern?: RegExp;
}