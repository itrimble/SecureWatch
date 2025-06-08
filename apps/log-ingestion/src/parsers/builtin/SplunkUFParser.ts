// apps/log-ingestion/src/parsers/builtin/SplunkUFParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * Splunk Universal Forwarder (UF) Parser
 *
 * This is a meta-parser designed to handle logs that have already been processed
 * and forwarded by a Splunk UF. It expects a standard Splunk format where
 * metadata like sourcetype, host, and index are available.
 */
export class SplunkUFParser implements LogParser {
  id = 'splunk-uf';
  name = 'Splunk Universal Forwarder';
  vendor = 'Splunk';
  logSource = 'splunk:uf';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'application' as const;
  priority = 100;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 100,
    timeout: 5000,
    maxSize: 100000,
  };

  // Assumes a key-value format from Splunk HEC or syslog output
  validate(rawLog: string): boolean {
    return rawLog.includes('sourcetype=') && rawLog.includes('host=');
  }

  parse(rawLog: string): ParsedEvent | null {
    const fields = this.parseKeyValue(rawLog);
    
    return {
      timestamp: new Date(parseInt(fields._time, 10) * 1000),
      source: fields.host,
      category: 'application',
      action: fields.sourcetype,
      outcome: 'success',
      severity: 'low',
      rawData: fields._raw,
      custom: {
        splunk: fields
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.splunk;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': event.rawData,
      'event.kind': 'event',
      'event.category': [data.sourcetype.split(':')[0] || 'unknown'],
      'event.type': ['info'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': 25,
      'log.level': 'low',
      'log.original': event.rawData,
      'host.hostname': data.host,
      'observer.vendor': this.vendor,
      'observer.product': 'Universal Forwarder',
      'observer.type': 'agent',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.80,
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
    data['_raw'] = log;
    return data;
  }
}
