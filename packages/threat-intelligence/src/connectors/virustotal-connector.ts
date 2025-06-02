import { BaseThreatIntelConnector } from './base-connector';
import { IOC, ThreatIntelResponse, IOCType, ThreatIntelError } from '../types/threat-intel.types';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

interface VTFileReport {
  data: {
    id: string;
    type: string;
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
      };
      last_analysis_results: Record<string, {
        category: string;
        engine_name: string;
        result: string | null;
      }>;
      names: string[];
      reputation: number;
      sha256: string;
      sha1: string;
      md5: string;
      type_description: string;
      creation_date?: number;
      first_submission_date?: number;
      last_submission_date?: number;
      tags?: string[];
    };
  };
}

interface VTDomainReport {
  data: {
    id: string;
    type: string;
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
      };
      reputation: number;
      categories?: Record<string, string>;
      whois?: string;
      creation_date?: number;
      last_update_date?: number;
    };
  };
}

interface VTIPReport {
  data: {
    id: string;
    type: string;
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
      };
      reputation: number;
      country?: string;
      as_owner?: string;
      network?: string;
      whois?: string;
    };
  };
}

export class VirusTotalConnector extends BaseThreatIntelConnector {
  protected getDefaultHeaders(): Record<string, string> {
    const headers = super.getDefaultHeaders();
    if (this.config.apiKey) {
      headers['x-apikey'] = this.config.apiKey;
    }
    return headers;
  }

  async fetchIOCs(params?: any): Promise<IOC[]> {
    // VirusTotal doesn't provide a feed of IOCs
    // This would typically be used to fetch hunting notifications or live hunt results
    logger.warn('VirusTotal connector does not support bulk IOC fetching');
    return [];
  }

  async fetchThreatActors(params?: any): Promise<any[]> {
    // VirusTotal doesn't provide threat actor information directly
    logger.warn('VirusTotal connector does not support threat actor fetching');
    return [];
  }

  async searchIOC(ioc: string, type: string): Promise<ThreatIntelResponse> {
    const cacheKey = `vt:search:${type}:${ioc}`;
    const cached = await this.getCached<ThreatIntelResponse>(cacheKey);
    if (cached) return cached;

    try {
      let result: ThreatIntelResponse;

      switch (type as IOCType) {
        case 'hash-md5':
        case 'hash-sha1':
        case 'hash-sha256':
        case 'hash-sha512':
          result = await this.searchFile(ioc);
          break;
        case 'domain':
          result = await this.searchDomain(ioc);
          break;
        case 'ip':
          result = await this.searchIP(ioc);
          break;
        case 'url':
          result = await this.searchURL(ioc);
          break;
        default:
          throw new ThreatIntelError(
            `Unsupported IOC type for VirusTotal: ${type}`,
            'UNSUPPORTED_TYPE'
          );
      }

      await this.setCached(cacheKey, result, 3600000); // Cache for 1 hour
      return result;
    } catch (error) {
      logger.error('Failed to search IOC in VirusTotal', error);
      throw error;
    }
  }

  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      // Test API key by checking quota
      const response = await this.makeRequest<any>({
        method: 'GET',
        url: '/api/v3/users/current'
      });

      return {
        status: 'healthy',
        details: {
          quotas: response.data.attributes.quotas,
          api_type: response.data.attributes.api_type
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

  private async searchFile(hash: string): Promise<ThreatIntelResponse> {
    try {
      const report = await this.makeRequest<VTFileReport>({
        method: 'GET',
        url: `/api/v3/files/${hash}`
      });

      const ioc = this.fileReportToIOC(report);
      
      return {
        data: {
          found: true,
          report: report.data,
          ioc,
          malicious: report.data.attributes.last_analysis_stats.malicious > 0,
          reputation: report.data.attributes.reputation,
          detection_ratio: `${report.data.attributes.last_analysis_stats.malicious}/${
            Object.keys(report.data.attributes.last_analysis_results).length
          }`
        },
        source: 'VirusTotal',
        timestamp: new Date()
      };
    } catch (error: any) {
      if (error.code === 'REQUEST_FAILED' && error.details?.status === 404) {
        return {
          data: { found: false },
          source: 'VirusTotal',
          timestamp: new Date()
        };
      }
      throw error;
    }
  }

  private async searchDomain(domain: string): Promise<ThreatIntelResponse> {
    try {
      const report = await this.makeRequest<VTDomainReport>({
        method: 'GET',
        url: `/api/v3/domains/${domain}`
      });

      const ioc = this.domainReportToIOC(report);
      
      return {
        data: {
          found: true,
          report: report.data,
          ioc,
          malicious: report.data.attributes.last_analysis_stats.malicious > 0,
          reputation: report.data.attributes.reputation,
          categories: report.data.attributes.categories
        },
        source: 'VirusTotal',
        timestamp: new Date()
      };
    } catch (error: any) {
      if (error.code === 'REQUEST_FAILED' && error.details?.status === 404) {
        return {
          data: { found: false },
          source: 'VirusTotal',
          timestamp: new Date()
        };
      }
      throw error;
    }
  }

  private async searchIP(ip: string): Promise<ThreatIntelResponse> {
    try {
      const report = await this.makeRequest<VTIPReport>({
        method: 'GET',
        url: `/api/v3/ip_addresses/${ip}`
      });

      const ioc = this.ipReportToIOC(report);
      
      return {
        data: {
          found: true,
          report: report.data,
          ioc,
          malicious: report.data.attributes.last_analysis_stats.malicious > 0,
          reputation: report.data.attributes.reputation,
          country: report.data.attributes.country,
          as_owner: report.data.attributes.as_owner
        },
        source: 'VirusTotal',
        timestamp: new Date()
      };
    } catch (error: any) {
      if (error.code === 'REQUEST_FAILED' && error.details?.status === 404) {
        return {
          data: { found: false },
          source: 'VirusTotal',
          timestamp: new Date()
        };
      }
      throw error;
    }
  }

  private async searchURL(url: string): Promise<ThreatIntelResponse> {
    // URL needs to be base64 encoded for VT API
    const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
    
    try {
      const report = await this.makeRequest<any>({
        method: 'GET',
        url: `/api/v3/urls/${urlId}`
      });

      const ioc: IOC = {
        id: uuidv4(),
        type: 'url',
        value: url,
        source: 'VirusTotal',
        confidence: this.calculateConfidence(report.data.attributes.last_analysis_stats),
        severity: this.calculateSeverity(report.data.attributes.last_analysis_stats),
        tags: report.data.attributes.tags || [],
        firstSeen: new Date(report.data.attributes.first_submission_date * 1000),
        lastSeen: new Date(report.data.attributes.last_analysis_date * 1000),
        metadata: {
          vtId: report.data.id,
          reputation: report.data.attributes.reputation,
          categories: report.data.attributes.categories
        },
        relatedIOCs: [],
        tlp: 'amber',
        active: true
      };
      
      return {
        data: {
          found: true,
          report: report.data,
          ioc,
          malicious: report.data.attributes.last_analysis_stats.malicious > 0,
          reputation: report.data.attributes.reputation
        },
        source: 'VirusTotal',
        timestamp: new Date()
      };
    } catch (error: any) {
      if (error.code === 'REQUEST_FAILED' && error.details?.status === 404) {
        return {
          data: { found: false },
          source: 'VirusTotal',
          timestamp: new Date()
        };
      }
      throw error;
    }
  }

  private fileReportToIOC(report: VTFileReport): IOC {
    const attrs = report.data.attributes;
    return {
      id: uuidv4(),
      type: 'hash-sha256',
      value: attrs.sha256,
      source: 'VirusTotal',
      confidence: this.calculateConfidence(attrs.last_analysis_stats),
      severity: this.calculateSeverity(attrs.last_analysis_stats),
      tags: attrs.tags || [],
      firstSeen: attrs.first_submission_date ? new Date(attrs.first_submission_date * 1000) : new Date(),
      lastSeen: attrs.last_submission_date ? new Date(attrs.last_submission_date * 1000) : new Date(),
      metadata: {
        vtId: report.data.id,
        md5: attrs.md5,
        sha1: attrs.sha1,
        sha256: attrs.sha256,
        names: attrs.names,
        type_description: attrs.type_description,
        reputation: attrs.reputation,
        detection_stats: attrs.last_analysis_stats
      },
      relatedIOCs: [attrs.md5, attrs.sha1].map(hash => uuidv4()),
      tlp: 'amber',
      active: true
    };
  }

  private domainReportToIOC(report: VTDomainReport): IOC {
    const attrs = report.data.attributes;
    return {
      id: uuidv4(),
      type: 'domain',
      value: report.data.id,
      source: 'VirusTotal',
      confidence: this.calculateConfidence(attrs.last_analysis_stats),
      severity: this.calculateSeverity(attrs.last_analysis_stats),
      tags: [],
      firstSeen: attrs.creation_date ? new Date(attrs.creation_date * 1000) : new Date(),
      lastSeen: attrs.last_update_date ? new Date(attrs.last_update_date * 1000) : new Date(),
      metadata: {
        vtId: report.data.id,
        reputation: attrs.reputation,
        categories: attrs.categories,
        detection_stats: attrs.last_analysis_stats
      },
      relatedIOCs: [],
      tlp: 'amber',
      active: true
    };
  }

  private ipReportToIOC(report: VTIPReport): IOC {
    const attrs = report.data.attributes;
    return {
      id: uuidv4(),
      type: 'ip',
      value: report.data.id,
      source: 'VirusTotal',
      confidence: this.calculateConfidence(attrs.last_analysis_stats),
      severity: this.calculateSeverity(attrs.last_analysis_stats),
      tags: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      metadata: {
        vtId: report.data.id,
        reputation: attrs.reputation,
        country: attrs.country,
        as_owner: attrs.as_owner,
        network: attrs.network,
        detection_stats: attrs.last_analysis_stats
      },
      relatedIOCs: [],
      tlp: 'amber',
      active: true
    };
  }

  private calculateConfidence(stats: any): number {
    const total = stats.malicious + stats.suspicious + stats.undetected + stats.harmless;
    if (total === 0) return 0;
    
    const maliciousRatio = (stats.malicious + stats.suspicious) / total;
    return Math.round(maliciousRatio * 100);
  }

  private calculateSeverity(stats: any): 'low' | 'medium' | 'high' | 'critical' {
    const maliciousCount = stats.malicious + stats.suspicious;
    
    if (maliciousCount === 0) return 'low';
    if (maliciousCount < 5) return 'medium';
    if (maliciousCount < 15) return 'high';
    return 'critical';
  }
}