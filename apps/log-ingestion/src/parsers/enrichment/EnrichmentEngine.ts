// Enrichment Engine
// Enriches parsed events with additional context and threat intelligence

import { NormalizedEvent } from '../types';
import { logger } from '../../utils/logger';

export interface EnrichmentRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: EnrichmentCondition[];
  actions: EnrichmentAction[];
}

export interface EnrichmentCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'in' | 'range';
  value?: any;
  values?: any[];
  caseSensitive?: boolean;
}

export interface EnrichmentAction {
  type: 'add_field' | 'set_field' | 'add_tag' | 'lookup' | 'geoip' | 'threat_intel' | 'calculate';
  field?: string;
  value?: any;
  source?: string;
  formula?: string;
}

export interface LookupTable {
  name: string;
  keyField: string;
  data: Map<string, Record<string, any>>;
  cacheTimeout?: number;
  lastUpdated: Date;
}

export interface ThreatIntelSource {
  name: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
  cacheTimeout: number;
  fields: string[];
}

export class EnrichmentEngine {
  private rules: Map<string, EnrichmentRule> = new Map();
  private lookupTables: Map<string, LookupTable> = new Map();
  private threatIntelSources: Map<string, ThreatIntelSource> = new Map();
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();
  private geoipEnabled: boolean = false;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing enrichment engine...');
      
      // Load default enrichment rules
      await this.loadDefaultRules();
      
      // Load lookup tables
      await this.loadLookupTables();
      
      // Initialize threat intelligence sources
      await this.initializeThreatIntelSources();
      
      // Initialize GeoIP if available
      await this.initializeGeoIP();
      
      logger.info(`Enrichment engine initialized with ${this.rules.size} rules`);
      
    } catch (error) {
      logger.error('Failed to initialize enrichment engine:', error);
      throw error;
    }
  }

  // Enrich a normalized event
  async enrichEvent(event: NormalizedEvent): Promise<NormalizedEvent> {
    const enrichedEvent = { ...event };
    
    try {
      // Apply enrichment rules in priority order
      const sortedRules = Array.from(this.rules.values())
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        if (this.evaluateConditions(enrichedEvent, rule.conditions)) {
          await this.applyActions(enrichedEvent, rule.actions);
        }
      }

      // Add enrichment metadata
      if (!enrichedEvent['securewatch.enrichment']) {
        enrichedEvent['securewatch.enrichment'] = {};
      }
      
      (enrichedEvent['securewatch.enrichment'] as any).timestamp = new Date().toISOString();
      (enrichedEvent['securewatch.enrichment'] as any).rules_applied = sortedRules
        .filter(rule => this.evaluateConditions(enrichedEvent, rule.conditions))
        .map(rule => rule.id);

    } catch (error) {
      logger.warn('Event enrichment failed:', error);
      // Don't fail the entire pipeline for enrichment errors
    }

    return enrichedEvent;
  }

  // Register a new enrichment rule
  registerRule(rule: EnrichmentRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Registered enrichment rule: ${rule.name}`);
  }

  // Add a lookup table
  addLookupTable(table: LookupTable): void {
    this.lookupTables.set(table.name, table);
    logger.info(`Added lookup table: ${table.name} with ${table.data.size} entries`);
  }

  // Add threat intelligence source
  addThreatIntelSource(source: ThreatIntelSource): void {
    this.threatIntelSources.set(source.name, source);
    logger.info(`Added threat intelligence source: ${source.name}`);
  }

  // Get enrichment statistics
  getStats(): {
    rulesCount: number;
    lookupTablesCount: number;
    threatIntelSourcesCount: number;
    cacheSize: number;
  } {
    return {
      rulesCount: this.rules.size,
      lookupTablesCount: this.lookupTables.size,
      threatIntelSourcesCount: this.threatIntelSources.size,
      cacheSize: this.cache.size
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    logger.info('Enrichment cache cleared');
  }

  // Shutdown the enrichment engine
  async shutdown(): Promise<void> {
    this.rules.clear();
    this.lookupTables.clear();
    this.threatIntelSources.clear();
    this.cache.clear();
    logger.info('Enrichment engine shutdown complete');
  }

  // Private methods

  private async loadDefaultRules(): Promise<void> {
    // Default enrichment rules

    // IP address geolocation
    const geoipRule: EnrichmentRule = {
      id: 'geoip-enrichment',
      name: 'GeoIP Enrichment',
      description: 'Enrich IP addresses with geolocation data',
      enabled: true,
      priority: 80,
      conditions: [
        { field: 'source.ip', operator: 'exists' }
      ],
      actions: [
        { type: 'geoip', field: 'source.ip' }
      ]
    };

    // Threat intelligence lookup
    const threatIntelRule: EnrichmentRule = {
      id: 'threat-intel-lookup',
      name: 'Threat Intelligence Lookup',
      description: 'Check IPs and domains against threat intelligence',
      enabled: true,
      priority: 90,
      conditions: [
        { field: 'source.ip', operator: 'exists' }
      ],
      actions: [
        { type: 'threat_intel', field: 'source.ip' }
      ]
    };

    // User context enrichment
    const userContextRule: EnrichmentRule = {
      id: 'user-context',
      name: 'User Context Enrichment',
      description: 'Add user context from directory services',
      enabled: true,
      priority: 70,
      conditions: [
        { field: 'user.name', operator: 'exists' }
      ],
      actions: [
        { type: 'lookup', field: 'user.name', source: 'user_directory' }
      ]
    };

    // Risk scoring
    const riskScoringRule: EnrichmentRule = {
      id: 'risk-scoring',
      name: 'Risk Score Calculation',
      description: 'Calculate risk score based on various factors',
      enabled: true,
      priority: 60,
      conditions: [
        { field: 'event.category', operator: 'exists' }
      ],
      actions: [
        { type: 'calculate', field: 'event.risk_score', formula: 'calculateRiskScore' }
      ]
    };

    // Time zone enrichment
    const timezoneRule: EnrichmentRule = {
      id: 'timezone-enrichment',
      name: 'Timezone Enrichment',
      description: 'Add timezone information based on GeoIP',
      enabled: true,
      priority: 50,
      conditions: [
        { field: 'source.geo.country_iso_code', operator: 'exists' }
      ],
      actions: [
        { type: 'lookup', field: 'source.geo.country_iso_code', source: 'timezone_mapping' }
      ]
    };

    // Register default rules
    this.registerRule(geoipRule);
    this.registerRule(threatIntelRule);
    this.registerRule(userContextRule);
    this.registerRule(riskScoringRule);
    this.registerRule(timezoneRule);
  }

  private async loadLookupTables(): Promise<void> {
    // Sample user directory lookup table
    const userDirectory = new Map<string, Record<string, any>>();
    userDirectory.set('john.doe', {
      'user.full_name': 'John Doe',
      'user.department': 'Engineering',
      'user.title': 'Senior Developer',
      'user.manager': 'jane.smith',
      'user.risk_level': 'low'
    });
    userDirectory.set('jane.smith', {
      'user.full_name': 'Jane Smith',
      'user.department': 'Engineering',
      'user.title': 'Engineering Manager',
      'user.manager': 'bob.wilson',
      'user.risk_level': 'low'
    });

    this.addLookupTable({
      name: 'user_directory',
      keyField: 'user.name',
      data: userDirectory,
      cacheTimeout: 3600000, // 1 hour
      lastUpdated: new Date()
    });

    // Sample timezone mapping
    const timezoneMapping = new Map<string, Record<string, any>>();
    timezoneMapping.set('US', { 'event.timezone': 'America/New_York' });
    timezoneMapping.set('GB', { 'event.timezone': 'Europe/London' });
    timezoneMapping.set('DE', { 'event.timezone': 'Europe/Berlin' });
    timezoneMapping.set('JP', { 'event.timezone': 'Asia/Tokyo' });

    this.addLookupTable({
      name: 'timezone_mapping',
      keyField: 'source.geo.country_iso_code',
      data: timezoneMapping,
      lastUpdated: new Date()
    });
  }

  private async initializeThreatIntelSources(): Promise<void> {
    // Sample threat intelligence sources
    const virusTotalSource: ThreatIntelSource = {
      name: 'virustotal',
      endpoint: 'https://www.virustotal.com/vtapi/v2',
      enabled: false, // Disabled by default - requires API key
      cacheTimeout: 3600000, // 1 hour
      fields: ['source.ip', 'destination.ip', 'url.full', 'file.hash.sha256']
    };

    const abuseIPDBSource: ThreatIntelSource = {
      name: 'abuseipdb',
      endpoint: 'https://api.abuseipdb.com/api/v2',
      enabled: false, // Disabled by default - requires API key
      cacheTimeout: 3600000, // 1 hour
      fields: ['source.ip', 'destination.ip']
    };

    this.addThreatIntelSource(virusTotalSource);
    this.addThreatIntelSource(abuseIPDBSource);
  }

  private async initializeGeoIP(): Promise<void> {
    // In a real implementation, you would initialize MaxMind GeoIP database
    this.geoipEnabled = false;
    logger.info('GeoIP initialization skipped (requires GeoIP database)');
  }

  private evaluateConditions(event: NormalizedEvent, conditions: EnrichmentCondition[]): boolean {
    return conditions.every(condition => this.evaluateCondition(event, condition));
  }

  private evaluateCondition(event: NormalizedEvent, condition: EnrichmentCondition): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      
      case 'equals':
        if (!condition.caseSensitive && typeof fieldValue === 'string' && typeof condition.value === 'string') {
          return fieldValue.toLowerCase() === condition.value.toLowerCase();
        }
        return fieldValue === condition.value;
      
      case 'contains':
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          const searchValue = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
          const searchIn = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase();
          return searchIn.includes(searchValue);
        }
        return false;
      
      case 'matches':
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          const regex = new RegExp(condition.value, condition.caseSensitive ? 'g' : 'gi');
          return regex.test(fieldValue);
        }
        return false;
      
      case 'in':
        return Array.isArray(condition.values) && condition.values.includes(fieldValue);
      
      case 'range':
        if (Array.isArray(condition.values) && condition.values.length === 2) {
          const [min, max] = condition.values;
          return fieldValue >= min && fieldValue <= max;
        }
        return false;
      
      default:
        return false;
    }
  }

  private async applyActions(event: NormalizedEvent, actions: EnrichmentAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.applyAction(event, action);
      } catch (error) {
        logger.warn(`Failed to apply enrichment action ${action.type}:`, error);
      }
    }
  }

  private async applyAction(event: NormalizedEvent, action: EnrichmentAction): Promise<void> {
    switch (action.type) {
      case 'add_field':
      case 'set_field':
        if (action.field && action.value !== undefined) {
          this.setFieldValue(event, action.field, action.value);
        }
        break;

      case 'add_tag':
        if (action.value) {
          this.addTag(event, action.value);
        }
        break;

      case 'lookup':
        if (action.field && action.source) {
          await this.performLookup(event, action.field, action.source);
        }
        break;

      case 'geoip':
        if (action.field) {
          await this.performGeoIPLookup(event, action.field);
        }
        break;

      case 'threat_intel':
        if (action.field) {
          await this.performThreatIntelLookup(event, action.field);
        }
        break;

      case 'calculate':
        if (action.field && action.formula) {
          this.performCalculation(event, action.field, action.formula);
        }
        break;
    }
  }

  private getFieldValue(event: NormalizedEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private setFieldValue(event: NormalizedEvent, field: string, value: any): void {
    const parts = field.split('.');
    let current: any = event;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private addTag(event: NormalizedEvent, tag: string): void {
    if (!event.tags) {
      event.tags = [];
    }
    
    if (Array.isArray(event.tags) && !event.tags.includes(tag)) {
      event.tags.push(tag);
    }
  }

  private async performLookup(event: NormalizedEvent, field: string, source: string): Promise<void> {
    const table = this.lookupTables.get(source);
    if (!table) return;

    const keyValue = this.getFieldValue(event, field);
    if (!keyValue) return;

    const lookupData = table.data.get(String(keyValue));
    if (lookupData) {
      Object.entries(lookupData).forEach(([key, value]) => {
        this.setFieldValue(event, key, value);
      });
    }
  }

  private async performGeoIPLookup(event: NormalizedEvent, field: string): Promise<void> {
    if (!this.geoipEnabled) return;

    const ip = this.getFieldValue(event, field);
    if (!ip || !this.isValidIP(ip)) return;

    // Mock GeoIP data for demonstration
    const mockGeoData = {
      'source.geo.country_name': 'United States',
      'source.geo.country_iso_code': 'US',
      'source.geo.region_name': 'California',
      'source.geo.city_name': 'San Francisco',
      'source.geo.location': { lat: 37.7749, lon: -122.4194 }
    };

    Object.entries(mockGeoData).forEach(([key, value]) => {
      this.setFieldValue(event, key, value);
    });
  }

  private async performThreatIntelLookup(event: NormalizedEvent, field: string): Promise<void> {
    const value = this.getFieldValue(event, field);
    if (!value) return;

    // Mock threat intelligence data
    const mockThreatData = {
      'threat.indicator.confidence': 'low',
      'threat.indicator.type': 'ipv4-addr',
      'threat.indicator.source': 'mock-intel'
    };

    Object.entries(mockThreatData).forEach(([key, value]) => {
      this.setFieldValue(event, key, value);
    });
  }

  private performCalculation(event: NormalizedEvent, field: string, formula: string): void {
    let result: any;

    switch (formula) {
      case 'calculateRiskScore':
        result = this.calculateRiskScore(event);
        break;
      default:
        return;
    }

    if (result !== undefined) {
      this.setFieldValue(event, field, result);
    }
  }

  private calculateRiskScore(event: NormalizedEvent): number {
    let score = 0;

    // Base score from event severity
    const severity = event['event.severity'] as number;
    if (severity) {
      score += severity * 0.4;
    }

    // Add points for authentication failures
    if (event['event.category']?.includes('authentication') && event['event.outcome'] === 'failure') {
      score += 30;
    }

    // Add points for privileged operations
    if (event['event.category']?.includes('iam') || event['user.roles']?.includes('admin')) {
      score += 20;
    }

    // Add points for external IPs
    const sourceIP = event['source.ip'] as string;
    if (sourceIP && !this.isPrivateIP(sourceIP)) {
      score += 15;
    }

    // Cap at 100
    return Math.min(100, Math.round(score));
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^127\./,
      /^169\.254\./
    ];
    return privateRanges.some(range => range.test(ip));
  }
}