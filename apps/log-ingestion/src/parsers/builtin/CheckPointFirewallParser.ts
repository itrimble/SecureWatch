// apps/log-ingestion/src/parsers/builtin/CheckPointFirewallParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * Check Point Firewall Parser
 *
 * Parses logs from Check Point firewalls, which typically use a semi-structured,
 * delimited format (often using semicolons).
 */
export class CheckPointFirewallParser implements LogParser {
  id = 'checkpoint-firewall';
  name = 'Check Point Firewall';
  vendor = 'Check Point';
  logSource = 'checkpoint:firewall';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'network' as const;
  priority = 85;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 85,
    timeout: 5000,
    maxSize: 50000,
  };

  validate(rawLog: string): boolean {
    return rawLog.includes(';action:') && rawLog.includes(';src:');
  }

  parse(rawLog: string): ParsedEvent | null {
    const fields = this.parseKeyValue(rawLog);
    const action = fields.action?.toLowerCase() || 'unknown';

    return {
      timestamp: new Date(fields.time_stamp),
      source: 'checkpoint-firewall',
      category: 'network',
      action: action,
      outcome: action === 'accept' ? 'success' : (action === 'drop' || action === 'reject' ? 'failure' : 'unknown'),
      severity: action === 'drop' ? 'medium' : 'low',
      rawData: rawLog,
      custom: {
        checkpoint: fields
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.checkpoint;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': `Check Point Firewall: ${data.action} traffic from ${data.src} to ${data.dst}`,
      'event.kind': 'event',
      'event.category': ['network'],
      'event.type': ['connection'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'log.level': event.severity,
      'log.original': event.rawData,
      'source.ip': data.src,
      'source.port': parseInt(data.s_port, 10),
      'destination.ip': data.dst,
      'destination.port': parseInt(data.service, 10),
      'network.transport': data.proto,
      'observer.vendor': this.vendor,
      'observer.product': 'Check Point Security Gateway',
      'observer.type': 'firewall',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.85,
      'securewatch.severity': event.severity,
    };
  }

  private parseKeyValue(log: string): Record<string, string> {
    const data: Record<string, string> = {};
    log.split(';').forEach(part => {
      const kv = part.split(':');
      if (kv.length >= 2) {
        const key = kv[0].trim();
        const value = kv.slice(1).join(':').trim();
        data[key] = value;
      }
    });
    return data;
  }

  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[severity] || 25;
  }
}
