import { KafkaStreamProcessor, StreamProcessorConfig, WindowedEvent } from './kafka-streams-processor';
import { RawLogEvent, NormalizedLogEvent, EnrichedLogEvent } from '../types/log-event.types';
import { performance } from 'perf_hooks';
import logger from '../utils/logger';

export interface EnrichmentRule {
  id: string;
  name: string;
  condition: (event: RawLogEvent) => boolean;
  enrichments: {
    [field: string]: any;
  };
  priority: number;
}

export interface GeoIPData {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  organization: string;
}

export interface ThreatIntelData {
  isMalicious: boolean;
  reputation: number; // 0-100 score
  categories: string[];
  sources: string[];
  lastSeen: string;
}

export class LogEnrichmentProcessor extends KafkaStreamProcessor {
  private enrichmentRules: Map<string, EnrichmentRule> = new Map();
  private geoipCache: Map<string, GeoIPData> = new Map();
  private threatIntelCache: Map<string, ThreatIntelData> = new Map();
  private userActivityCache: Map<string, any> = new Map();

  constructor(config: StreamProcessorConfig) {
    super(config);
    this.initializeDefaultRules();
  }

  async initialize(): Promise<void> {
    await super.initialize();
    logger.info('Log enrichment processor initialized with rules', {
      ruleCount: this.enrichmentRules.size
    });
  }

  protected async processEvent(event: RawLogEvent): Promise<EnrichedLogEvent | null> {
    const startTime = performance.now();

    try {
      // Normalize the event first
      const normalizedEvent = await this.normalizeEvent(event);
      
      // Apply enrichments
      const enrichedEvent: EnrichedLogEvent = {
        ...normalizedEvent,
        enrichments: {
          processingTimestamp: new Date().toISOString(),
          enrichmentRules: [],
          geoIP: {},
          threatIntel: {},
          userActivity: {},
          riskScore: 0,
          tags: [],
        }
      };

      // Apply enrichment rules
      await this.applyEnrichmentRules(enrichedEvent);
      
      // Perform GeoIP enrichment
      await this.enrichWithGeoIP(enrichedEvent);
      
      // Perform threat intelligence enrichment
      await this.enrichWithThreatIntel(enrichedEvent);
      
      // Perform user activity enrichment
      await this.enrichWithUserActivity(enrichedEvent);
      
      // Calculate risk score
      await this.calculateRiskScore(enrichedEvent);

      const processingTime = performance.now() - startTime;
      logger.debug('Event enriched successfully', {
        eventId: enrichedEvent.id,
        processingTimeMs: processingTime,
        rulesApplied: enrichedEvent.enrichments.enrichmentRules.length,
        riskScore: enrichedEvent.enrichments.riskScore
      });

      return enrichedEvent;

    } catch (error) {
      logger.error('Event enrichment failed', error);
      throw error;
    }
  }

  protected async processWindow(window: WindowedEvent): Promise<any> {
    // For windowed processing, we can perform aggregations
    const windowResult = {
      windowStart: new Date(window.windowStart).toISOString(),
      windowEnd: new Date(window.windowEnd).toISOString(),
      eventCount: window.events.length,
      aggregations: {
        uniqueUsers: new Set(),
        uniqueIPs: new Set(),
        severityCounts: new Map<string, number>(),
        sourceCounts: new Map<string, number>(),
        highRiskEvents: 0,
        avgRiskScore: 0,
      },
      alerts: []
    };

    let totalRiskScore = 0;

    for (const event of window.events) {
      const enrichedEvent = await this.processEvent(event);
      if (!enrichedEvent) continue;

      // Track unique users and IPs
      if (enrichedEvent.fields.user) {
        windowResult.aggregations.uniqueUsers.add(enrichedEvent.fields.user);
      }
      if (enrichedEvent.fields.sourceIP) {
        windowResult.aggregations.uniqueIPs.add(enrichedEvent.fields.sourceIP);
      }

      // Count severities
      const severity = enrichedEvent.severity || 'unknown';
      const currentCount = windowResult.aggregations.severityCounts.get(severity) || 0;
      windowResult.aggregations.severityCounts.set(severity, currentCount + 1);

      // Count sources
      const source = enrichedEvent.source || 'unknown';
      const sourceCount = windowResult.aggregations.sourceCounts.get(source) || 0;
      windowResult.aggregations.sourceCounts.set(source, sourceCount + 1);

      // Track high-risk events
      const riskScore = enrichedEvent.enrichments.riskScore || 0;
      totalRiskScore += riskScore;
      
      if (riskScore >= 80) {
        windowResult.aggregations.highRiskEvents++;
        
        // Generate alert for high-risk events
        windowResult.alerts.push({
          type: 'high_risk_event',
          eventId: enrichedEvent.id,
          riskScore,
          description: `High-risk event detected: ${enrichedEvent.message}`,
          timestamp: enrichedEvent.timestamp
        });
      }
    }

    // Calculate averages
    windowResult.aggregations.avgRiskScore = window.events.length > 0 ? totalRiskScore / window.events.length : 0;

    // Convert Sets to arrays for serialization
    const finalResult = {
      ...windowResult,
      aggregations: {
        ...windowResult.aggregations,
        uniqueUsers: Array.from(windowResult.aggregations.uniqueUsers),
        uniqueIPs: Array.from(windowResult.aggregations.uniqueIPs),
        severityCounts: Object.fromEntries(windowResult.aggregations.severityCounts),
        sourceCounts: Object.fromEntries(windowResult.aggregations.sourceCounts),
      }
    };

    logger.info('Window processed successfully', {
      windowStart: finalResult.windowStart,
      eventCount: finalResult.eventCount,
      highRiskEvents: finalResult.aggregations.highRiskEvents,
      avgRiskScore: finalResult.aggregations.avgRiskScore.toFixed(2)
    });

    return finalResult;
  }

  private async normalizeEvent(event: RawLogEvent): Promise<NormalizedLogEvent> {
    // Basic normalization - extract common fields
    const normalizedEvent: NormalizedLogEvent = {
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || new Date().toISOString(),
      message: event.message || '',
      source: event.source || 'unknown',
      severity: this.normalizeSeverity(event.severity),
      category: event.category || 'general',
      fields: { ...event.fields },
      tags: event.tags || [],
      metadata: event.metadata || {}
    };

    // Extract common fields from message if not already present
    if (!normalizedEvent.fields.sourceIP) {
      const ipMatch = normalizedEvent.message.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
      if (ipMatch) {
        normalizedEvent.fields.sourceIP = ipMatch[0];
      }
    }

    if (!normalizedEvent.fields.user) {
      const userMatch = normalizedEvent.message.match(/user[:\s](\w+)/i);
      if (userMatch) {
        normalizedEvent.fields.user = userMatch[1];
      }
    }

    return normalizedEvent;
  }

  private async applyEnrichmentRules(event: EnrichedLogEvent): Promise<void> {
    const appliedRules: string[] = [];

    // Sort rules by priority
    const sortedRules = Array.from(this.enrichmentRules.values())
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        if (rule.condition(event)) {
          // Apply enrichments
          for (const [field, value] of Object.entries(rule.enrichments)) {
            if (typeof value === 'function') {
              event.enrichments[field] = await value(event);
            } else {
              event.enrichments[field] = value;
            }
          }
          
          appliedRules.push(rule.id);
          logger.debug('Enrichment rule applied', { 
            ruleId: rule.id, 
            eventId: event.id 
          });
        }
      } catch (error) {
        logger.error('Enrichment rule failed', {
          ruleId: rule.id,
          error: error.message
        });
      }
    }

    event.enrichments.enrichmentRules = appliedRules;
  }

  private async enrichWithGeoIP(event: EnrichedLogEvent): Promise<void> {
    const sourceIP = event.fields.sourceIP;
    if (!sourceIP || this.isPrivateIP(sourceIP)) {
      return;
    }

    // Check cache first
    let geoData = this.geoipCache.get(sourceIP);
    if (!geoData) {
      // In production, this would call a real GeoIP service
      geoData = await this.mockGeoIPLookup(sourceIP);
      this.geoipCache.set(sourceIP, geoData);
      
      // Limit cache size
      if (this.geoipCache.size > 10000) {
        const firstKey = this.geoipCache.keys().next().value;
        this.geoipCache.delete(firstKey);
      }
    }

    event.enrichments.geoIP = geoData;
  }

  private async enrichWithThreatIntel(event: EnrichedLogEvent): Promise<void> {
    const sourceIP = event.fields.sourceIP;
    if (!sourceIP) return;

    // Check cache first
    let threatData = this.threatIntelCache.get(sourceIP);
    if (!threatData) {
      // In production, this would call real threat intelligence APIs
      threatData = await this.mockThreatIntelLookup(sourceIP);
      this.threatIntelCache.set(sourceIP, threatData);
      
      // Limit cache size
      if (this.threatIntelCache.size > 5000) {
        const firstKey = this.threatIntelCache.keys().next().value;
        this.threatIntelCache.delete(firstKey);
      }
    }

    event.enrichments.threatIntel = threatData;

    // Add threat tags
    if (threatData.isMalicious) {
      event.enrichments.tags = [...(event.enrichments.tags || []), 'malicious_ip'];
    }
  }

  private async enrichWithUserActivity(event: EnrichedLogEvent): Promise<void> {
    const user = event.fields.user;
    if (!user) return;

    // Get or create user activity tracking
    let userActivity = this.userActivityCache.get(user);
    if (!userActivity) {
      userActivity = {
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        eventCount: 0,
        uniqueIPs: new Set(),
        recentLocations: []
      };
    }

    // Update user activity
    userActivity.lastSeen = event.timestamp;
    userActivity.eventCount++;
    
    if (event.fields.sourceIP) {
      userActivity.uniqueIPs.add(event.fields.sourceIP);
    }

    // Add location if available
    if (event.enrichments.geoIP?.city) {
      const location = `${event.enrichments.geoIP.city}, ${event.enrichments.geoIP.country}`;
      if (!userActivity.recentLocations.includes(location)) {
        userActivity.recentLocations.unshift(location);
        userActivity.recentLocations = userActivity.recentLocations.slice(0, 5); // Keep last 5 locations
      }
    }

    this.userActivityCache.set(user, userActivity);

    // Convert Set to array for serialization
    event.enrichments.userActivity = {
      ...userActivity,
      uniqueIPs: Array.from(userActivity.uniqueIPs)
    };
  }

  private async calculateRiskScore(event: EnrichedLogEvent): Promise<void> {
    let riskScore = 0;

    // Base score by severity
    switch (event.severity) {
      case 'critical': riskScore += 40; break;
      case 'high': riskScore += 30; break;
      case 'medium': riskScore += 20; break;
      case 'low': riskScore += 10; break;
      default: riskScore += 5;
    }

    // Threat intelligence risk
    if (event.enrichments.threatIntel?.isMalicious) {
      riskScore += 50;
    }
    riskScore += (event.enrichments.threatIntel?.reputation || 0) * 0.3;

    // Geographic risk (example: certain countries higher risk)
    const country = event.enrichments.geoIP?.country;
    if (country && ['CN', 'RU', 'KP'].includes(country)) {
      riskScore += 15;
    }

    // User activity risk
    const userActivity = event.enrichments.userActivity;
    if (userActivity) {
      // Multiple IPs for same user
      if (userActivity.uniqueIPs.length > 5) {
        riskScore += 10;
      }
      
      // Multiple locations
      if (userActivity.recentLocations.length > 3) {
        riskScore += 10;
      }
    }

    // Ensure score is within bounds
    event.enrichments.riskScore = Math.min(100, Math.max(0, riskScore));
  }

  private initializeDefaultRules(): void {
    // Example enrichment rules
    this.enrichmentRules.set('failed-login', {
      id: 'failed-login',
      name: 'Failed Login Detection',
      condition: (event) => event.message.includes('failed') && event.message.includes('login'),
      enrichments: {
        category: 'authentication',
        subcategory: 'failed_login',
        tags: ['security', 'authentication']
      },
      priority: 100
    });

    this.enrichmentRules.set('admin-access', {
      id: 'admin-access',
      name: 'Admin Access Detection',
      condition: (event) => event.fields.user?.includes('admin') || event.message.includes('administrator'),
      enrichments: {
        category: 'privileged_access',
        tags: ['privileged', 'admin']
      },
      priority: 90
    });

    this.enrichmentRules.set('network-connection', {
      id: 'network-connection',
      name: 'Network Connection Enrichment',
      condition: (event) => !!event.fields.sourceIP,
      enrichments: {
        category: 'network',
        tags: ['network']
      },
      priority: 50
    });
  }

  private normalizeSeverity(severity: any): string {
    if (!severity) return 'info';
    
    const sev = severity.toString().toLowerCase();
    if (['critical', 'fatal', 'emergency'].includes(sev)) return 'critical';
    if (['high', 'error', 'alert'].includes(sev)) return 'high';
    if (['medium', 'warn', 'warning'].includes(sev)) return 'medium';
    if (['low', 'notice'].includes(sev)) return 'low';
    return 'info';
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  private async mockGeoIPLookup(ip: string): Promise<GeoIPData> {
    // Mock GeoIP data - in production, use real service
    const cities = ['New York', 'London', 'Tokyo', 'Sydney', 'Berlin'];
    const countries = ['US', 'GB', 'JP', 'AU', 'DE'];
    const random = Math.floor(Math.random() * cities.length);
    
    return {
      country: countries[random],
      region: 'Unknown',
      city: cities[random],
      latitude: Math.random() * 180 - 90,
      longitude: Math.random() * 360 - 180,
      isp: 'Mock ISP',
      organization: 'Mock Organization'
    };
  }

  private async mockThreatIntelLookup(ip: string): Promise<ThreatIntelData> {
    // Mock threat intelligence - in production, use real service
    const isMalicious = Math.random() < 0.1; // 10% chance of being malicious
    
    return {
      isMalicious,
      reputation: isMalicious ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 40) + 60,
      categories: isMalicious ? ['malware', 'botnet'] : [],
      sources: isMalicious ? ['mock-threat-feed'] : [],
      lastSeen: new Date().toISOString()
    };
  }

  // Public methods for rule management
  addEnrichmentRule(rule: EnrichmentRule): void {
    this.enrichmentRules.set(rule.id, rule);
    logger.info('Enrichment rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  removeEnrichmentRule(ruleId: string): boolean {
    const removed = this.enrichmentRules.delete(ruleId);
    if (removed) {
      logger.info('Enrichment rule removed', { ruleId });
    }
    return removed;
  }

  getEnrichmentRules(): EnrichmentRule[] {
    return Array.from(this.enrichmentRules.values());
  }

  clearCaches(): void {
    this.geoipCache.clear();
    this.threatIntelCache.clear();
    this.userActivityCache.clear();
    logger.info('All caches cleared');
  }
}