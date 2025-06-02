import { EventEmitter } from 'events';
import { DetectionAlert, IOC, ThreatActor, ThreatIntelResponse } from '../types/threat-intel.types';
import { MISPConnector } from '../connectors/misp-connector';
import { VirusTotalConnector } from '../connectors/virustotal-connector';
import { OTXConnector } from '../connectors/otx-connector';
import { IOCDatabase } from './ioc-database';
import { logger } from '../utils/logger';
import axios from 'axios';
import NodeCache from 'node-cache';
import pLimit from 'p-limit';

interface EnrichmentSource {
  name: string;
  type: 'ioc' | 'reputation' | 'geolocation' | 'whois' | 'dns';
  enabled: boolean;
  priority: number;
}

interface EnrichmentResult {
  source: string;
  type: string;
  data: any;
  confidence: number;
  timestamp: Date;
}

interface AlertEnrichment {
  iocMatches: IOC[];
  threatActors: ThreatActor[];
  reputation: ReputationData;
  geolocation: GeolocationData;
  relatedAlerts: DetectionAlert[];
  riskScore: number;
  recommendations: string[];
  enrichmentSources: string[];
}

interface ReputationData {
  overallScore: number;
  sources: Array<{
    name: string;
    score: number;
    categories: string[];
    malicious: boolean;
  }>;
}

interface GeolocationData {
  country: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  organization?: string;
}

export class AlertEnrichmentService extends EventEmitter {
  private threatIntelConnectors: Map<string, any> = new Map();
  private iocDatabase: IOCDatabase;
  private cache: NodeCache;
  private rateLimiter: ReturnType<typeof pLimit>;
  private enrichmentSources: EnrichmentSource[] = [
    { name: 'ioc-database', type: 'ioc', enabled: true, priority: 1 },
    { name: 'virustotal', type: 'reputation', enabled: true, priority: 2 },
    { name: 'otx', type: 'ioc', enabled: true, priority: 3 },
    { name: 'misp', type: 'ioc', enabled: true, priority: 4 },
    { name: 'abuseipdb', type: 'reputation', enabled: true, priority: 5 },
    { name: 'maxmind', type: 'geolocation', enabled: true, priority: 6 }
  ];

  constructor(iocDatabase: IOCDatabase, config?: {
    cacheTimeout?: number;
    rateLimit?: number;
    connectors?: Map<string, any>;
  }) {
    super();
    this.iocDatabase = iocDatabase;
    this.cache = new NodeCache({ stdTTL: config?.cacheTimeout || 3600 });
    this.rateLimiter = pLimit(config?.rateLimit || 10);
    
    if (config?.connectors) {
      this.threatIntelConnectors = config.connectors;
    }
  }

  async enrichAlert(alert: DetectionAlert): Promise<AlertEnrichment> {
    logger.info(`Enriching alert: ${alert.id}`);
    const startTime = Date.now();

    const enrichment: AlertEnrichment = {
      iocMatches: [],
      threatActors: [],
      reputation: { overallScore: 0, sources: [] },
      geolocation: { country: 'Unknown' },
      relatedAlerts: [],
      riskScore: alert.confidence,
      recommendations: [],
      enrichmentSources: []
    };

    // Extract IOCs from alert
    const extractedIOCs = this.extractIOCs(alert);

    // Perform enrichment in parallel
    const enrichmentTasks = [
      this.enrichIOCs(extractedIOCs, enrichment),
      this.enrichReputation(extractedIOCs, enrichment),
      this.enrichGeolocation(extractedIOCs, enrichment),
      this.findRelatedAlerts(alert, enrichment),
      this.enrichWithMITRE(alert, enrichment)
    ];

    await Promise.all(enrichmentTasks);

    // Calculate final risk score
    enrichment.riskScore = this.calculateRiskScore(alert, enrichment);

    // Generate recommendations
    enrichment.recommendations = this.generateRecommendations(alert, enrichment);

    const duration = Date.now() - startTime;
    logger.info(`Alert enrichment completed in ${duration}ms`, {
      alertId: alert.id,
      sources: enrichment.enrichmentSources.length,
      iocMatches: enrichment.iocMatches.length
    });

    this.emit('alert-enriched', { alert, enrichment });
    return enrichment;
  }

  private extractIOCs(alert: DetectionAlert): Array<{ type: string; value: string }> {
    const iocs: Array<{ type: string; value: string }> = [];

    // Extract from source
    if (alert.source.ip) {
      iocs.push({ type: 'ip', value: alert.source.ip });
    }
    if (alert.source.hostname) {
      iocs.push({ type: 'domain', value: alert.source.hostname });
    }

    // Extract from destination
    if (alert.destination?.ip) {
      iocs.push({ type: 'ip', value: alert.destination.ip });
    }
    if (alert.destination?.hostname) {
      iocs.push({ type: 'domain', value: alert.destination.hostname });
    }

    // Extract from context
    if (alert.context) {
      this.extractIOCsFromObject(alert.context, iocs);
    }

    // Extract from existing indicators
    for (const indicator of alert.indicators) {
      iocs.push({ type: indicator.type, value: indicator.value });
    }

    // Deduplicate
    const unique = new Map<string, { type: string; value: string }>();
    for (const ioc of iocs) {
      unique.set(`${ioc.type}:${ioc.value}`, ioc);
    }

    return Array.from(unique.values());
  }

  private extractIOCsFromObject(obj: any, iocs: Array<{ type: string; value: string }>): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Check for IPs
        if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value)) {
          iocs.push({ type: 'ip', value });
        }
        // Check for domains
        else if (/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(value) && !value.includes(' ')) {
          iocs.push({ type: 'domain', value });
        }
        // Check for hashes
        else if (/^[a-fA-F0-9]{32}$/.test(value)) {
          iocs.push({ type: 'hash-md5', value });
        } else if (/^[a-fA-F0-9]{40}$/.test(value)) {
          iocs.push({ type: 'hash-sha1', value });
        } else if (/^[a-fA-F0-9]{64}$/.test(value)) {
          iocs.push({ type: 'hash-sha256', value });
        }
        // Check for URLs
        else if (value.startsWith('http://') || value.startsWith('https://')) {
          iocs.push({ type: 'url', value });
        }
      } else if (typeof value === 'object' && value !== null) {
        this.extractIOCsFromObject(value, iocs);
      }
    }
  }

  private async enrichIOCs(
    extractedIOCs: Array<{ type: string; value: string }>,
    enrichment: AlertEnrichment
  ): Promise<void> {
    const tasks = extractedIOCs.map(ioc => 
      this.rateLimiter(async () => {
        // Check local IOC database first
        const dbResults = await this.iocDatabase.searchIOCs({
          type: ioc.type as any,
          value: ioc.value,
          active: true
        });

        if (dbResults.iocs.length > 0) {
          enrichment.iocMatches.push(...dbResults.iocs);
          enrichment.enrichmentSources.push('ioc-database');
        }

        // Check threat intel feeds
        for (const [name, connector] of this.threatIntelConnectors) {
          if (this.isSourceEnabled(name, 'ioc')) {
            try {
              const result = await connector.searchIOC(ioc.value, ioc.type);
              if (result.data.found) {
                enrichment.enrichmentSources.push(name);
                // Process results based on connector type
                this.processConnectorResult(name, result, enrichment);
              }
            } catch (error) {
              logger.error(`Error enriching IOC with ${name}`, error);
            }
          }
        }
      })
    );

    await Promise.all(tasks);
  }

  private async enrichReputation(
    extractedIOCs: Array<{ type: string; value: string }>,
    enrichment: AlertEnrichment
  ): Promise<void> {
    const ipIOCs = extractedIOCs.filter(ioc => ioc.type === 'ip');
    const domainIOCs = extractedIOCs.filter(ioc => ioc.type === 'domain');

    const reputationScores: Array<{
      name: string;
      score: number;
      categories: string[];
      malicious: boolean;
    }> = [];

    // Check VirusTotal
    if (this.isSourceEnabled('virustotal', 'reputation')) {
      const vtConnector = this.threatIntelConnectors.get('virustotal');
      if (vtConnector) {
        for (const ioc of [...ipIOCs, ...domainIOCs]) {
          try {
            const result = await vtConnector.searchIOC(ioc.value, ioc.type);
            if (result.data.found) {
              reputationScores.push({
                name: 'VirusTotal',
                score: result.data.reputation || 0,
                categories: result.data.categories ? Object.values(result.data.categories) : [],
                malicious: result.data.malicious || false
              });
            }
          } catch (error) {
            logger.error('VirusTotal reputation check failed', error);
          }
        }
      }
    }

    // Check AbuseIPDB for IPs
    if (this.isSourceEnabled('abuseipdb', 'reputation') && ipIOCs.length > 0) {
      for (const ioc of ipIOCs) {
        const cached = this.cache.get(`abuseipdb:${ioc.value}`);
        if (cached) {
          reputationScores.push(cached as any);
        } else {
          try {
            const result = await this.checkAbuseIPDB(ioc.value);
            if (result) {
              reputationScores.push(result);
              this.cache.set(`abuseipdb:${ioc.value}`, result);
            }
          } catch (error) {
            logger.error('AbuseIPDB check failed', error);
          }
        }
      }
    }

    // Calculate overall reputation
    if (reputationScores.length > 0) {
      enrichment.reputation.sources = reputationScores;
      enrichment.reputation.overallScore = this.calculateOverallReputation(reputationScores);
      enrichment.enrichmentSources.push('reputation-services');
    }
  }

  private async enrichGeolocation(
    extractedIOCs: Array<{ type: string; value: string }>,
    enrichment: AlertEnrichment
  ): Promise<void> {
    const ipIOCs = extractedIOCs.filter(ioc => ioc.type === 'ip');
    if (ipIOCs.length === 0) return;

    // Use the first IP for geolocation
    const primaryIP = ipIOCs[0].value;

    // Check cache
    const cached = this.cache.get(`geo:${primaryIP}`);
    if (cached) {
      enrichment.geolocation = cached as GeolocationData;
      enrichment.enrichmentSources.push('geolocation-cache');
      return;
    }

    try {
      // MaxMind GeoIP lookup (mock implementation)
      const geoData = await this.lookupGeolocation(primaryIP);
      if (geoData) {
        enrichment.geolocation = geoData;
        enrichment.enrichmentSources.push('maxmind');
        this.cache.set(`geo:${primaryIP}`, geoData);
      }
    } catch (error) {
      logger.error('Geolocation lookup failed', error);
    }
  }

  private async findRelatedAlerts(
    alert: DetectionAlert,
    enrichment: AlertEnrichment
  ): Promise<void> {
    // This would query the alert database for related alerts
    // For now, returning empty array
    enrichment.relatedAlerts = [];
  }

  private async enrichWithMITRE(
    alert: DetectionAlert,
    enrichment: AlertEnrichment
  ): Promise<void> {
    // Enrich with MITRE ATT&CK context
    if (alert.mitreAttack && alert.mitreAttack.length > 0) {
      for (const technique of alert.mitreAttack) {
        // Add threat actors known to use this technique
        const actors = await this.getActorsForTechnique(technique.technique);
        enrichment.threatActors.push(...actors);
      }
      enrichment.enrichmentSources.push('mitre-attack');
    }
  }

  private async checkAbuseIPDB(ip: string): Promise<{
    name: string;
    score: number;
    categories: string[];
    malicious: boolean;
  } | null> {
    // Mock implementation - would use real AbuseIPDB API
    return {
      name: 'AbuseIPDB',
      score: Math.random() * 100,
      categories: ['scanner', 'brute-force'],
      malicious: Math.random() > 0.7
    };
  }

  private async lookupGeolocation(ip: string): Promise<GeolocationData | null> {
    // Mock implementation - would use real GeoIP service
    return {
      country: 'United States',
      city: 'San Francisco',
      region: 'California',
      latitude: 37.7749,
      longitude: -122.4194,
      asn: 'AS13335',
      organization: 'Cloudflare, Inc.'
    };
  }

  private async getActorsForTechnique(techniqueId: string): Promise<ThreatActor[]> {
    // Mock implementation - would query threat actor database
    return [];
  }

  private processConnectorResult(
    connectorName: string,
    result: ThreatIntelResponse,
    enrichment: AlertEnrichment
  ): void {
    // Process results based on connector type
    switch (connectorName) {
      case 'misp':
        if (result.data.events) {
          for (const event of result.data.events) {
            // Extract threat actor information from MISP event
            if (event.info && event.info.includes('APT')) {
              // Mock threat actor extraction
              const actor: ThreatActor = {
                id: event.uuid,
                name: event.info,
                aliases: [],
                motivation: ['espionage'],
                sophistication: 'advanced',
                active: true,
                firstSeen: new Date(event.timestamp * 1000),
                lastSeen: new Date(),
                targetedCountries: [],
                targetedSectors: [],
                ttps: [],
                associatedMalware: [],
                associatedTools: [],
                iocs: []
              };
              enrichment.threatActors.push(actor);
            }
          }
        }
        break;

      case 'otx':
        if (result.data.pulses) {
          // Extract additional context from OTX pulses
          for (const pulse of result.data.pulses) {
            if (pulse.adversary) {
              // Add adversary as threat actor
              const actor: ThreatActor = {
                id: pulse.id,
                name: pulse.adversary,
                aliases: [],
                motivation: ['unknown'],
                sophistication: 'intermediate',
                active: true,
                firstSeen: new Date(pulse.created),
                lastSeen: new Date(pulse.modified),
                targetedCountries: pulse.targeted_countries || [],
                targetedSectors: [],
                ttps: pulse.attack_ids?.map((a: any) => a.id) || [],
                associatedMalware: pulse.malware_families || [],
                associatedTools: [],
                iocs: []
              };
              enrichment.threatActors.push(actor);
            }
          }
        }
        break;
    }
  }

  private calculateOverallReputation(scores: Array<{
    score: number;
    malicious: boolean;
  }>): number {
    if (scores.length === 0) return 50;

    let totalScore = 0;
    let maliciousCount = 0;

    for (const source of scores) {
      totalScore += source.score;
      if (source.malicious) maliciousCount++;
    }

    // Weight malicious detections heavily
    const avgScore = totalScore / scores.length;
    const maliciousRatio = maliciousCount / scores.length;
    
    return Math.min(100, avgScore + (maliciousRatio * 50));
  }

  private calculateRiskScore(alert: DetectionAlert, enrichment: AlertEnrichment): number {
    let riskScore = alert.confidence;

    // Adjust based on IOC matches
    if (enrichment.iocMatches.length > 0) {
      const maxIOCSeverity = Math.max(...enrichment.iocMatches.map(ioc => 
        ioc.severity === 'critical' ? 100 :
        ioc.severity === 'high' ? 75 :
        ioc.severity === 'medium' ? 50 : 25
      ));
      riskScore = Math.max(riskScore, maxIOCSeverity);
    }

    // Adjust based on reputation
    if (enrichment.reputation.overallScore > 70) {
      riskScore = Math.min(100, riskScore + 20);
    }

    // Adjust based on threat actors
    if (enrichment.threatActors.length > 0) {
      const hasAdvancedActor = enrichment.threatActors.some(a => 
        a.sophistication === 'advanced' || a.sophistication === 'strategic'
      );
      if (hasAdvancedActor) {
        riskScore = Math.min(100, riskScore + 25);
      }
    }

    // Adjust based on related alerts
    if (enrichment.relatedAlerts.length > 5) {
      riskScore = Math.min(100, riskScore + 15);
    }

    return Math.round(riskScore);
  }

  private generateRecommendations(alert: DetectionAlert, enrichment: AlertEnrichment): string[] {
    const recommendations: string[] = [];

    // High risk recommendations
    if (enrichment.riskScore > 80) {
      recommendations.push('Immediately isolate affected systems');
      recommendations.push('Initiate incident response procedures');
      recommendations.push('Collect forensic evidence');
    }

    // IOC-based recommendations
    if (enrichment.iocMatches.length > 0) {
      recommendations.push('Block identified malicious indicators at perimeter');
      recommendations.push('Search for additional instances of these IOCs');
    }

    // Reputation-based recommendations
    if (enrichment.reputation.overallScore > 70) {
      recommendations.push('Review all traffic to/from identified malicious IPs');
      recommendations.push('Check for data exfiltration attempts');
    }

    // Threat actor recommendations
    if (enrichment.threatActors.length > 0) {
      recommendations.push('Review TTPs associated with identified threat actors');
      recommendations.push('Implement specific mitigations for known actor techniques');
    }

    // MITRE-based recommendations
    if (alert.mitreAttack && alert.mitreAttack.length > 0) {
      recommendations.push('Apply MITRE ATT&CK mitigations for identified techniques');
    }

    // Generic recommendations based on severity
    if (alert.severity === 'critical' || alert.severity === 'high') {
      recommendations.push('Escalate to security team lead');
      recommendations.push('Document all findings and actions taken');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private isSourceEnabled(name: string, type: string): boolean {
    const source = this.enrichmentSources.find(s => s.name === name && s.type === type);
    return source?.enabled || false;
  }

  // Configuration methods
  enableSource(name: string): void {
    const source = this.enrichmentSources.find(s => s.name === name);
    if (source) {
      source.enabled = true;
    }
  }

  disableSource(name: string): void {
    const source = this.enrichmentSources.find(s => s.name === name);
    if (source) {
      source.enabled = false;
    }
  }

  getEnabledSources(): string[] {
    return this.enrichmentSources
      .filter(s => s.enabled)
      .map(s => s.name);
  }
}