// apps/log-ingestion/src/parsers/builtin/Microsoft365EntraIDParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * Microsoft 365 & Entra ID Parser
 *
 * Parses audit logs from the Microsoft 365 and Entra ID (formerly Azure AD) ecosystems.
 * This includes a wide variety of events such as user sign-ins, administrative actions,
 * mailbox access, and SharePoint/OneDrive file activities.
 */
export class Microsoft365EntraIDParser implements LogParser {
  id = 'microsoft-365-entra-id';
  name = 'Microsoft 365 & Entra ID';
  vendor = 'Microsoft';
  logSource = 'm365:audit';
  version = '1.0.0';
  format = 'json' as const;
  category = 'cloud' as const;
  priority = 90;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 90,
    timeout: 5000,
    maxSize: 100000,
  };

  validate(rawLog: string): boolean {
    try {
      const data = JSON.parse(rawLog);
      return data.Workload && data.Operation && data.UserId;
    } catch (error) {
      return false;
    }
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      const data = JSON.parse(rawLog);
      const event: ParsedEvent = {
        timestamp: new Date(data.CreationTime),
        source: data.Workload,
        category: data.Workload.toLowerCase(),
        action: data.Operation,
        outcome: data.ResultStatus === 'Succeeded' ? 'success' : 'failure',
        severity: data.ResultStatus === 'Succeeded' ? 'low' : 'medium',
        rawData: rawLog,
        custom: {
          m365: data
        }
      };
      return event;
    } catch (error) {
      console.error('Error parsing M365/Entra ID log:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.m365;
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': [event.category, 'cloud', 'iam'],
      'event.type': ['access'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity_name': event.severity,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'cloud.provider': 'microsoft',
      'cloud.service.name': data.Workload,
      'user.id': data.UserId,
      'user.name': data.UserPrincipalName || data.UserId,
      'source.ip': data.ClientIP,
      'user_agent.original': data.UserAgent,
      'observer.vendor': this.vendor,
      'observer.product': 'Microsoft 365',
      'observer.type': 'cloud',
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.85,
      'securewatch.severity': event.severity,
      'raw_log': event.rawData,
    };
    return normalized;
  }
  
  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = {
      'low': 25,
      'medium': 50,
      'high': 75,
      'critical': 100
    };
    return mapping[severity] || 25;
  }
}
