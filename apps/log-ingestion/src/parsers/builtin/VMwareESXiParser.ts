// apps/log-ingestion/src/parsers/builtin/VMwareESXiParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * VMware vSphere/ESXi Parser
 *
 * Parses syslog-formatted logs from VMware ESXi hosts and vCenter servers.
 * It identifies key event types like hostd, vpxa, and vmkernel messages.
 */
export class VMwareESXiParser implements LogParser {
  id = 'vmware-esxi';
  name = 'VMware vSphere/ESXi';
  vendor = 'VMware';
  logSource = 'vmware:esxi';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'endpoint' as const;
  priority = 80;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 80,
    timeout: 5000,
    maxSize: 50000,
  };
  
  private readonly syslogRegex = /^<(\d+)>(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(\S+)\s(\S+):/;

  validate(rawLog: string): boolean {
    return this.syslogRegex.test(rawLog) && (rawLog.includes('Hostd') || rawLog.includes('vpxa') || rawLog.includes('vmkernel'));
  }

  parse(rawLog: string): ParsedEvent | null {
    const match = rawLog.match(this.syslogRegex);
    if (!match) return null;

    const [, , timestamp, hostname, process] = match;
    const message = rawLog.substring(match[0].length).trim();

    return {
      timestamp: new Date(timestamp),
      source: hostname,
      category: 'endpoint',
      action: process,
      outcome: 'success',
      severity: 'low',
      rawData: rawLog,
      custom: {
        vmware: { process, message }
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.vmware;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': data.message,
      'event.kind': 'event',
      'event.category': ['endpoint', 'infrastructure'],
      'event.type': ['info'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': 25,
      'log.level': 'low',
      'log.original': event.rawData,
      'host.hostname': event.source,
      'process.name': data.process,
      'observer.vendor': this.vendor,
      'observer.product': 'ESXi',
      'observer.type': 'hypervisor',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.82,
      'securewatch.severity': event.severity,
    };
  }
}
