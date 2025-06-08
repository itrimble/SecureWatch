// apps/log-ingestion/src/parsers/builtin/NginxLogParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * NGINX Access and Error Log Parser
 *
 * A dedicated parser for NGINX access and error logs. It handles the "combined"
 * format by default but can be extended for custom log formats.
 */
export class NginxLogParser implements LogParser {
  id = 'nginx-log-parser';
  name = 'NGINX Log Parser';
  vendor = 'Nginx Inc.';
  logSource = 'nginx:access';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'web' as const;
  priority = 76;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 76,
    timeout: 5000,
    maxSize: 50000,
  };

  private readonly combinedRegex = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "(\S+) (\S+)\s*(\S*)" (\d+) (\d+) "([^"]*)" "([^"]*)"/;

  validate(rawLog: string): boolean {
    return this.combinedRegex.test(rawLog);
  }

  parse(rawLog: string): ParsedEvent | null {
    const match = rawLog.match(this.combinedRegex);
    if (!match) return null;

    const [
      , client_ip, , user, timestamp, method, path, , status, size, referer, user_agent
    ] = match;
    
    const statusCode = parseInt(status, 10);
    
    const event: ParsedEvent = {
      timestamp: this.parseNginxTimestamp(timestamp),
      source: 'nginx',
      category: 'web',
      action: 'http_request',
      outcome: statusCode >= 400 ? 'failure' : 'success',
      severity: statusCode >= 500 ? 'high' : (statusCode >= 400 ? 'medium' : 'low'),
      rawData: rawLog,
      custom: {
        client_ip, user, timestamp, method, path, status: statusCode, size: parseInt(size, 10), referer, user_agent
      }
    };

    return event;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom;
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['web', 'network'],
      'event.type': ['access'],
      'event.action': data.method,
      'event.outcome': event.outcome,
      'event.severity_name': event.severity,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'http.request.method': data.method,
      'http.response.status_code': data.status,
      'url.path': data.path,
      'source.ip': data.client_ip,
      'user.name': data.user === '-' ? undefined : data.user,
      'user_agent.original': data.user_agent,
      'http.request.referrer': data.referer === '-' ? undefined : data.referer,
      'http.response.bytes': data.size,
      'observer.vendor': this.vendor,
      'observer.product': 'NGINX',
      'observer.type': 'web-server',
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.8,
      'securewatch.severity': event.severity,
      'raw_log': event.rawData,
    };
    return normalized;
  }

  private parseNginxTimestamp(ts: string): Date {
    const [day, month, year, hour, minute, second] = ts.split(/[\/:\s]/);
    const monthMap: { [key: string]: number } = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    return new Date(Date.UTC(parseInt(year), monthMap[month], parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)));
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
