// apps/log-ingestion/src/parsers/builtin/ZscalerCloudSecurityParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * Zscaler Cloud Security Parser
 *
 * Parses logs from Zscaler Internet Access (ZIA), which are typically in a
 * key-value pair format and sent via Syslog.
 */
export class ZscalerCloudSecurityParser implements LogParser {
  id = 'zscaler-zia';
  name = 'Zscaler Cloud Security';
  vendor = 'Zscaler';
  logSource = 'zscaler:zia';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'network' as const;
  priority = 87;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 87,
    timeout: 5000,
    maxSize: 50000,
  };

  validate(rawLog: string): boolean {
    return rawLog.includes('dpt=') && rawLog.includes('spt=') && rawLog.includes('action=');
  }

  parse(rawLog: string): ParsedEvent | null {
    const fields = this.parseKeyValue(rawLog);
    const action = fields.action?.toLowerCase();
    
    return {
      timestamp: new Date(), // Zscaler logs require a dedicated timestamp field mapping
      source: 'zscaler-cloud',
      category: 'network',
      action: action,
      outcome: action === 'allowed' ? 'success' : 'failure',
      severity: action === 'blocked' ? 'medium' : 'low',
      rawData: rawLog,
      custom: {
        zscaler: fields
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.zscaler;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': `Zscaler: ${data.login} accessed ${data.url} - Action: ${event.action}`,
      'event.kind': 'event',
      'event.category': ['network', 'web'],
      'event.type': ['access'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'log.level': event.severity,
      'log.original': event.rawData,
      'user.name': data.login,
      'source.ip': data.cip,
      'destination.ip': data.sip,
      'url.full': data.url,
      'observer.vendor': this.vendor,
      'observer.product': 'Zscaler Internet Access',
      'observer.type': 'proxy',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.87,
      'securewatch.severity': event.severity,
    };
  }
  
  private parseKeyValue(log: string): Record<string, string> {
      const data: Record<string, string> = {};
      const regex = /(\w+)=("([^"]*)"|(\S+))/g;
      let match;
      while ((match = regex.exec(log)) !== null) {
          data[match[1]] = match[3] || match[4];
      }
      return data;
  }
  
  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[severity] || 25;
  }
}
