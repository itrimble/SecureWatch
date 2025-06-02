import { BaseThreatIntelConnector } from './base-connector';
import { IOC, ThreatActor, ThreatIntelResponse, IOCType, ThreatIntelError } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface MISPEvent {
  id: string;
  uuid: string;
  info: string;
  threat_level_id: string;
  published: boolean;
  timestamp: string;
  Attribute?: MISPAttribute[];
  Object?: MISPObject[];
}

interface MISPAttribute {
  id: string;
  uuid: string;
  type: string;
  value: string;
  category: string;
  to_ids: boolean;
  timestamp: string;
  comment?: string;
  tags?: Array<{ name: string }>;
}

interface MISPObject {
  id: string;
  uuid: string;
  name: string;
  meta_category: string;
  Attribute?: MISPAttribute[];
}

export class MISPConnector extends BaseThreatIntelConnector {
  private readonly typeMapping: Record<string, IOCType> = {
    'ip-src': 'ip',
    'ip-dst': 'ip',
    'domain': 'domain',
    'hostname': 'domain',
    'url': 'url',
    'email-src': 'email',
    'email-dst': 'email',
    'md5': 'hash-md5',
    'sha1': 'hash-sha1',
    'sha256': 'hash-sha256',
    'sha512': 'hash-sha512',
    'vulnerability': 'cve',
    'filename': 'file-path',
    'regkey': 'registry-key',
    'mutex': 'mutex',
    'pattern-in-file': 'file-path',
    'user-agent': 'user-agent',
    'btc': 'bitcoin-address',
    'mac-address': 'mac-address',
    'AS': 'asn',
    'ip-src/ip-dst': 'cidr',
    'port': 'port'
  };

  protected getDefaultHeaders(): Record<string, string> {
    const headers = super.getDefaultHeaders();
    if (this.config.apiKey) {
      headers['Authorization'] = this.config.apiKey;
    }
    headers['Accept'] = 'application/json';
    headers['Content-Type'] = 'application/json';
    return headers;
  }

  async fetchIOCs(params?: { since?: Date; eventId?: string }): Promise<IOC[]> {
    try {
      const events = await this.fetchEvents(params);
      const iocs: IOC[] = [];

      for (const event of events) {
        // Process attributes
        if (event.Attribute) {
          for (const attr of event.Attribute) {
            const ioc = this.attributeToIOC(attr, event);
            if (ioc) {
              iocs.push(ioc);
            }
          }
        }

        // Process objects
        if (event.Object) {
          for (const obj of event.Object) {
            if (obj.Attribute) {
              for (const attr of obj.Attribute) {
                const ioc = this.attributeToIOC(attr, event, obj);
                if (ioc) {
                  iocs.push(ioc);
                }
              }
            }
          }
        }
      }

      return this.filterIOCs(iocs);
    } catch (error) {
      logger.error('Failed to fetch IOCs from MISP', error);
      throw error;
    }
  }

  async fetchThreatActors(params?: any): Promise<ThreatActor[]> {
    try {
      const galaxies = await this.makeRequest<any[]>({
        method: 'GET',
        url: '/galaxies/index',
        params: {
          type: 'threat-actor'
        }
      });

      const actors: ThreatActor[] = [];

      for (const galaxy of galaxies) {
        const details = await this.makeRequest<any>({
          method: 'GET',
          url: `/galaxies/view/${galaxy.id}`
        });

        if (details.GalaxyCluster) {
          for (const cluster of details.GalaxyCluster) {
            actors.push(this.clusterToThreatActor(cluster));
          }
        }
      }

      return actors;
    } catch (error) {
      logger.error('Failed to fetch threat actors from MISP', error);
      throw error;
    }
  }

  async searchIOC(ioc: string, type: string): Promise<ThreatIntelResponse> {
    const cacheKey = `misp:search:${type}:${ioc}`;
    const cached = await this.getCached<ThreatIntelResponse>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest<any>({
        method: 'POST',
        url: '/attributes/restSearch',
        data: {
          value: ioc,
          type: this.reverseTypeMapping(type as IOCType),
          to_ids: true,
          published: true
        }
      });

      const result: ThreatIntelResponse = {
        data: {
          found: response.response?.Attribute?.length > 0,
          attributes: response.response?.Attribute || [],
          events: []
        },
        source: 'MISP',
        timestamp: new Date()
      };

      // Get event details for each attribute
      if (result.data.attributes.length > 0) {
        const eventIds = [...new Set(result.data.attributes.map((a: any) => a.event_id))];
        for (const eventId of eventIds) {
          try {
            const event = await this.makeRequest<any>({
              method: 'GET',
              url: `/events/view/${eventId}`
            });
            result.data.events.push(event.Event);
          } catch (error) {
            logger.warn(`Failed to fetch event ${eventId}`, error);
          }
        }
      }

      await this.setCached(cacheKey, result, 3600000); // Cache for 1 hour
      return result;
    } catch (error) {
      logger.error('Failed to search IOC in MISP', error);
      throw error;
    }
  }

  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const response = await this.makeRequest<any>({
        method: 'GET',
        url: '/servers/getVersion'
      });

      return {
        status: 'healthy',
        details: {
          version: response.version,
          api_version: response.api_version
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

  private async fetchEvents(params?: { since?: Date; eventId?: string }): Promise<MISPEvent[]> {
    const requestData: any = {
      returnFormat: 'json',
      published: true,
      to_ids: true
    };

    if (params?.since) {
      requestData.timestamp = Math.floor(params.since.getTime() / 1000).toString();
    }

    if (params?.eventId) {
      requestData.eventid = params.eventId;
    }

    const response = await this.makeRequest<{ response: MISPEvent[] }>({
      method: 'POST',
      url: '/events/restSearch',
      data: requestData
    });

    return response.response || [];
  }

  private attributeToIOC(attr: MISPAttribute, event: MISPEvent, obj?: MISPObject): IOC | null {
    const iocType = this.typeMapping[attr.type];
    if (!iocType) {
      logger.debug(`Unknown MISP attribute type: ${attr.type}`);
      return null;
    }

    const severity = this.threatLevelToSeverity(event.threat_level_id);
    const tags = attr.tags?.map(t => t.name) || [];
    if (obj) {
      tags.push(`object:${obj.name}`);
    }

    return {
      id: uuidv4(),
      type: iocType,
      value: attr.value,
      source: `MISP:${event.uuid}`,
      confidence: attr.to_ids ? 85 : 60,
      severity,
      tags,
      firstSeen: new Date(parseInt(attr.timestamp) * 1000),
      lastSeen: new Date(parseInt(event.timestamp) * 1000),
      metadata: {
        mispId: attr.id,
        mispUuid: attr.uuid,
        category: attr.category,
        eventInfo: event.info,
        comment: attr.comment
      },
      relatedIOCs: [],
      tlp: this.extractTLP(tags),
      active: true
    };
  }

  private clusterToThreatActor(cluster: any): ThreatActor {
    const meta = cluster.meta || {};
    return {
      id: cluster.uuid,
      name: cluster.value,
      aliases: meta.synonyms || [],
      description: cluster.description,
      motivation: this.extractMotivation(meta.motivation),
      sophistication: this.extractSophistication(meta),
      active: true,
      firstSeen: new Date(cluster.first_seen || Date.now()),
      lastSeen: new Date(cluster.last_seen || Date.now()),
      origin: meta.country,
      targetedCountries: meta.target || [],
      targetedSectors: meta.sectors || [],
      ttps: meta.techniques || [],
      associatedMalware: meta.malware || [],
      associatedTools: meta.tools || [],
      iocs: []
    };
  }

  private threatLevelToSeverity(threatLevel: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (threatLevel) {
      case '1': return 'critical';
      case '2': return 'high';
      case '3': return 'medium';
      case '4': return 'low';
      default: return 'medium';
    }
  }

  private extractTLP(tags: string[]): 'white' | 'green' | 'amber' | 'red' {
    for (const tag of tags) {
      if (tag.includes('tlp:white')) return 'white';
      if (tag.includes('tlp:green')) return 'green';
      if (tag.includes('tlp:amber')) return 'amber';
      if (tag.includes('tlp:red')) return 'red';
    }
    return 'amber'; // Default
  }

  private extractMotivation(motivation?: string[]): Array<'financial' | 'espionage' | 'hacktivism' | 'destruction' | 'unknown'> {
    if (!motivation) return ['unknown'];
    
    const mapping: Record<string, 'financial' | 'espionage' | 'hacktivism' | 'destruction' | 'unknown'> = {
      'financial': 'financial',
      'espionage': 'espionage',
      'hacktivism': 'hacktivism',
      'destruction': 'destruction',
      'sabotage': 'destruction'
    };

    return motivation.map(m => mapping[m.toLowerCase()] || 'unknown');
  }

  private extractSophistication(meta: any): 'none' | 'minimal' | 'intermediate' | 'advanced' | 'strategic' {
    const sophistication = meta.sophistication?.toLowerCase();
    if (!sophistication) return 'intermediate';

    if (sophistication.includes('none')) return 'none';
    if (sophistication.includes('minimal') || sophistication.includes('low')) return 'minimal';
    if (sophistication.includes('intermediate') || sophistication.includes('medium')) return 'intermediate';
    if (sophistication.includes('advanced') || sophistication.includes('high')) return 'advanced';
    if (sophistication.includes('strategic') || sophistication.includes('expert')) return 'strategic';

    return 'intermediate';
  }

  private reverseTypeMapping(iocType: IOCType): string {
    for (const [mispType, type] of Object.entries(this.typeMapping)) {
      if (type === iocType) return mispType;
    }
    return iocType; // Fallback to original
  }
}