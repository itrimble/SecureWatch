// apps/log-ingestion/src/parsers/builtin/Fail2banParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * Fail2ban Log Parser
 *
 * Parses logs from Fail2ban, an intrusion prevention software framework that
 * protects computer servers from brute-force attacks.
 */
export class Fail2banParser implements LogParser {
  id = 'fail2ban';
  name = 'Fail2ban';
  vendor = 'Fail2ban';
  logSource = 'fail2ban:log';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'host' as const;
  priority = 85;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 85,
    timeout: 5000,
    maxSize: 50000,
  };
  
  private readonly fail2banRegex = /fail2ban\.actions\s+\[(\d+)\]: (NOTICE|WARNING) \[([^\]]+)\] (Ban|Unban) ([\d\.]+)/;

  validate(rawLog: string): boolean {
    return rawLog.includes('fail2ban.actions');
  }

  parse(rawLog: string): ParsedEvent | null {
    const match = rawLog.match(this.fail2banRegex);
    if (!match) return null;

    const [, , level, jail, action, ip] = match;
    
    return {
      timestamp: new Date(), // Assumes syslog timestamp
      source: 'fail2ban-host',
      category: 'host',
      action: `${action.toLowerCase()}_ip`,
      outcome: 'success',
      severity: action === 'Ban' ? 'high' : 'low',
      rawData: rawLog,
      custom: {
        fail2ban: { level, jail, action, ip }
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.fail2ban;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': `Fail2ban [${data.jail}]: ${data.action} ${data.ip}`,
      'event.kind': 'alert',
      'event.category': ['host', 'intrusion_detection'],
      'event.type': ['info'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'log.level': event.severity,
      'log.original': event.rawData,
      'source.ip': data.ip,
      'rule.name': data.jail,
      'observer.vendor': this.vendor,
      'observer.product': 'Fail2ban',
      'observer.type': 'hids',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
    };
  }

  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[severity] || 25;
  }
}
