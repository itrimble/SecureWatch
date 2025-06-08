// apps/log-ingestion/src/parsers/builtin/F5BigIPParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * F5 BIG-IP Parser
 *
 * Parses logs from F5 BIG-IP devices, including Local Traffic Manager (LTM)
 * and Application Security Manager (ASM) events. Logs are typically sent
 * via syslog.
 */
export class F5BigIPParser implements LogParser {
  id = 'f5-big-ip';
  name = 'F5 BIG-IP';
  vendor = 'F5 Networks';
  logSource = 'f5:bigip';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'network' as const;
  priority = 85;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 85,
    timeout: 5000,
    maxSize: 50000,
  };
  
  private readonly ltmRegex = /BIG-IP ltm: (\S+): \S+ (\S+) -> (\S+)/;
  private readonly asmRegex = /ASM:(\S+),.*(attack_type=\S+)/;

  validate(rawLog: string): boolean {
    return rawLog.includes('BIG-IP') || rawLog.includes('ASM:');
  }

  parse(rawLog: string): ParsedEvent | null {
    let match = rawLog.match(this.ltmRegex);
    if (match) {
      const [ , action, source, dest] = match;
      return {
        timestamp: new Date(),
        source: 'f5-big-ip',
        category: 'network',
        action: action,
        outcome: 'success',
        severity: 'low',
        rawData: rawLog,
        custom: { f5: { module: 'ltm', source, dest, action } }
      };
    }
    
    match = rawLog.match(this.asmRegex);
    if (match) {
      const [, action, attack_type] = match;
      return {
        timestamp: new Date(),
        source: 'f5-big-ip',
        category: 'network',
        action: action,
        outcome: 'failure',
        severity: 'high',
        rawData: rawLog,
        custom: { f5: { module: 'asm', attack_type, action } }
      };
    }
    
    return null;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.f5;
    const isAsm = data.module === 'asm';
    
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': `F5 BIG-IP (${data.module}) Event: ${event.action}`,
      'event.kind': isAsm ? 'alert' : 'event',
      'event.category': ['network'],
      'event.type': isAsm ? ['intrusion_detection'] : ['connection'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'log.level': event.severity,
      'log.original': event.rawData,
      'source.ip': data.source?.split(':')[0],
      'destination.ip': data.dest?.split(':')[0],
      'threat.technique.name': data.attack_type ? [data.attack_type.replace('attack_type=', '')] : undefined,
      'observer.vendor': this.vendor,
      'observer.product': 'BIG-IP',
      'observer.type': 'load-balancer',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.88,
      'securewatch.severity': event.severity,
    };
  }
  
  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[severity] || 25;
  }
}
