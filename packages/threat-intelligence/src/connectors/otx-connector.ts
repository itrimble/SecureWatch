import { BaseThreatIntelConnector } from './base-connector';
import { IOC, ThreatActor, ThreatIntelResponse, IOCType, ThreatIntelError } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface OTXPulse {
  id: string;
  name: string;
  description: string;
  author_name: string;
  created: string;
  modified: string;
  indicators: OTXIndicator[];
  tags: string[];
  references: string[];
  adversary?: string;
  targeted_countries?: string[];
  malware_families?: string[];
  attack_ids?: OTXAttackID[];
  TLP?: string;
}

interface OTXIndicator {
  id: number;
  indicator: string;
  type: string;
  created: string;
  title?: string;
  description?: string;
  content?: string;
  is_active: boolean;
}

interface OTXAttackID {
  id: string;
  name: string;
  display_name: string;
}

export class OTXConnector extends BaseThreatIntelConnector {
  private readonly typeMapping: Record<string, IOCType> = {
    'IPv4': 'ip',
    'IPv6': 'ip',
    'domain': 'domain',
    'hostname': 'domain',
    'URL': 'url',
    'URI': 'url',
    'email': 'email',
    'MD5': 'hash-md5',
    'SHA1': 'hash-sha1',
    'SHA256': 'hash-sha256',
    'SHA512': 'hash-sha512',
    'CVE': 'cve',
    'FilePath': 'file-path',
    'FileHash-MD5': 'hash-md5',
    'FileHash-SHA1': 'hash-sha1',
    'FileHash-SHA256': 'hash-sha256',
    'Mutex': 'mutex',
    'CIDR': 'cidr',
    'BitcoinAddress': 'bitcoin-address'
  };

  protected getDefaultHeaders(): Record<string, string> {
    const headers = super.getDefaultHeaders();
    if (this.config.apiKey) {
      headers['X-OTX-API-KEY'] = this.config.apiKey;
    }
    return headers;
  }

  async fetchIOCs(params?: { since?: Date; page?: number; limit?: number }): Promise<IOC[]> {
    try {
      const pulses = await this.fetchPulses(params);
      const iocs: IOC[] = [];

      for (const pulse of pulses) {
        for (const indicator of pulse.indicators) {
          const ioc = this.indicatorToIOC(indicator, pulse);
          if (ioc) {
            iocs.push(ioc);
          }
        }
      }

      return this.filterIOCs(iocs);
    } catch (error) {
      logger.error('Failed to fetch IOCs from OTX', error);
      throw error;
    }
  }

  async fetchThreatActors(params?: any): Promise<ThreatActor[]> {
    try {
      // Fetch pulses that mention adversaries
      const pulses = await this.fetchPulses({ ...params, hasAdversary: true });
      const actorsMap = new Map<string, ThreatActor>();

      for (const pulse of pulses) {
        if (pulse.adversary) {
          const actorId = this.normalizeActorName(pulse.adversary);
          let actor = actorsMap.get(actorId);

          if (!actor) {
            actor = {
              id: uuidv4(),
              name: pulse.adversary,
              aliases: [],
              description: `Threat actor mentioned in OTX pulses`,
              motivation: ['unknown'],
              sophistication: 'intermediate',
              active: true,
              firstSeen: new Date(pulse.created),
              lastSeen: new Date(pulse.modified),
              origin: undefined,
              targetedCountries: [],
              targetedSectors: [],
              ttps: [],
              associatedMalware: [],
              associatedTools: [],
              iocs: []
            };
            actorsMap.set(actorId, actor);
          }

          // Update actor information
          if (new Date(pulse.created) < actor.firstSeen) {
            actor.firstSeen = new Date(pulse.created);
          }
          if (new Date(pulse.modified) > actor.lastSeen) {
            actor.lastSeen = new Date(pulse.modified);
          }

          // Add targeted countries
          if (pulse.targeted_countries) {
            actor.targetedCountries = [...new Set([...actor.targetedCountries, ...pulse.targeted_countries])];
          }

          // Add malware families
          if (pulse.malware_families) {
            actor.associatedMalware = [...new Set([...actor.associatedMalware, ...pulse.malware_families])];
          }

          // Add TTPs from attack IDs
          if (pulse.attack_ids) {
            const ttps = pulse.attack_ids.map(attack => attack.id);
            actor.ttps = [...new Set([...actor.ttps, ...ttps])];
          }
        }
      }

      return Array.from(actorsMap.values());
    } catch (error) {
      logger.error('Failed to fetch threat actors from OTX', error);
      throw error;
    }
  }

  async searchIOC(ioc: string, type: string): Promise<ThreatIntelResponse> {
    const cacheKey = `otx:search:${type}:${ioc}`;
    const cached = await this.getCached<ThreatIntelResponse>(cacheKey);
    if (cached) return cached;

    try {
      let endpoint: string;
      const iocType = type as IOCType;

      switch (iocType) {
        case 'ip':
          endpoint = `/api/v1/indicators/IPv4/${ioc}/general`;
          break;
        case 'domain':
          endpoint = `/api/v1/indicators/domain/${ioc}/general`;
          break;
        case 'url':
          endpoint = `/api/v1/indicators/url/${encodeURIComponent(ioc)}/general`;
          break;
        case 'hash-md5':
        case 'hash-sha1':
        case 'hash-sha256':
          endpoint = `/api/v1/indicators/file/${ioc}/general`;
          break;
        case 'cve':
          endpoint = `/api/v1/indicators/cve/${ioc}/general`;
          break;
        default:
          throw new ThreatIntelError(
            `Unsupported IOC type for OTX: ${type}`,
            'UNSUPPORTED_TYPE'
          );
      }

      const response = await this.makeRequest<any>({
        method: 'GET',
        url: endpoint
      });

      // Get associated pulses
      const pulsesResponse = await this.makeRequest<any>({
        method: 'GET',
        url: endpoint.replace('/general', '/pulses')
      });

      const result: ThreatIntelResponse = {
        data: {
          found: true,
          general: response,
          pulses: pulsesResponse.results || [],
          pulse_count: pulsesResponse.count || 0,
          indicator: {
            value: ioc,
            type: iocType,
            pulse_count: pulsesResponse.count || 0,
            first_seen: pulsesResponse.results?.[0]?.created,
            last_seen: pulsesResponse.results?.[0]?.modified
          }
        },
        source: 'OTX',
        timestamp: new Date()
      };

      await this.setCached(cacheKey, result, 3600000); // Cache for 1 hour
      return result;
    } catch (error: any) {
      if (error.code === 'REQUEST_FAILED' && error.details?.status === 404) {
        return {
          data: { found: false },
          source: 'OTX',
          timestamp: new Date()
        };
      }
      logger.error('Failed to search IOC in OTX', error);
      throw error;
    }
  }

  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const response = await this.makeRequest<any>({
        method: 'GET',
        url: '/api/v1/user/me'
      });

      return {
        status: 'healthy',
        details: {
          username: response.username,
          member_since: response.member_since,
          pulse_count: response.pulse_count,
          subscriber_count: response.subscriber_count
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async fetchPulses(params?: { 
    since?: Date; 
    page?: number; 
    limit?: number;
    hasAdversary?: boolean;
  }): Promise<OTXPulse[]> {
    const queryParams: any = {
      limit: params?.limit || 50,
      page: params?.page || 1
    };

    if (params?.since) {
      queryParams.modified_since = params.since.toISOString();
    }

    const endpoint = '/api/v1/pulses/subscribed';
    
    // If we want pulses with adversaries, we might need to use a different endpoint
    // or filter the results
    const response = await this.makeRequest<{ results: OTXPulse[] }>({
      method: 'GET',
      url: endpoint,
      params: queryParams
    });

    let pulses = response.results || [];

    // Filter for pulses with adversaries if requested
    if (params?.hasAdversary) {
      pulses = pulses.filter(pulse => pulse.adversary);
    }

    return pulses;
  }

  private indicatorToIOC(indicator: OTXIndicator, pulse: OTXPulse): IOC | null {
    const iocType = this.typeMapping[indicator.type];
    if (!iocType) {
      logger.debug(`Unknown OTX indicator type: ${indicator.type}`);
      return null;
    }

    return {
      id: uuidv4(),
      type: iocType,
      value: indicator.indicator,
      source: `OTX:${pulse.id}`,
      confidence: 75, // OTX is community-driven, so moderate confidence
      severity: this.calculateSeverity(pulse),
      tags: pulse.tags || [],
      firstSeen: new Date(indicator.created),
      lastSeen: new Date(pulse.modified),
      metadata: {
        otxId: indicator.id,
        pulseId: pulse.id,
        pulseName: pulse.name,
        author: pulse.author_name,
        title: indicator.title,
        description: indicator.description
      },
      relatedIOCs: [],
      tlp: this.parseTLP(pulse.TLP),
      active: indicator.is_active
    };
  }

  private calculateSeverity(pulse: OTXPulse): 'low' | 'medium' | 'high' | 'critical' {
    // Determine severity based on various factors
    const indicatorCount = pulse.indicators.length;
    const hasAdversary = !!pulse.adversary;
    const hasMalware = pulse.malware_families && pulse.malware_families.length > 0;
    const hasAttackIDs = pulse.attack_ids && pulse.attack_ids.length > 0;

    if (hasAdversary && hasMalware && hasAttackIDs) {
      return 'critical';
    } else if ((hasAdversary && hasMalware) || (hasMalware && hasAttackIDs)) {
      return 'high';
    } else if (hasAdversary || hasMalware || hasAttackIDs || indicatorCount > 50) {
      return 'medium';
    }
    return 'low';
  }

  private parseTLP(tlp?: string): 'white' | 'green' | 'amber' | 'red' {
    if (!tlp) return 'amber';
    
    const tlpLower = tlp.toLowerCase();
    if (tlpLower.includes('white')) return 'white';
    if (tlpLower.includes('green')) return 'green';
    if (tlpLower.includes('amber')) return 'amber';
    if (tlpLower.includes('red')) return 'red';
    
    return 'amber';
  }

  private normalizeActorName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}