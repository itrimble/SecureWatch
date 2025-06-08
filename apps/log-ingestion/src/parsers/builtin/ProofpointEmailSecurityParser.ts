// apps/log-ingestion/src/parsers/builtin/ProofpointEmailSecurityParser.ts
import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig } from '../types';

/**
 * Proofpoint Email Security Parser
 *
 * Parses structured syslog messages from the Proofpoint Protection Server,
 * focusing on email delivery status, spam/phishing classification, and threat detection.
 */
export class ProofpointEmailSecurityParser implements LogParser {
  id = 'proofpoint-email-security';
  name = 'Proofpoint Email Security';
  vendor = 'Proofpoint';
  logSource = 'proofpoint:email';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'application' as const;
  priority = 86;
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 86,
    timeout: 5000,
    maxSize: 50000,
  };
  
  private readonly filterRegex = /filter\[(\d+)\]: .*, (from=<.*>), (to=<.*>), (verdict=.*), (sub=.*)/;

  validate(rawLog: string): boolean {
    return rawLog.includes('filter[');
  }

  parse(rawLog: string): ParsedEvent | null {
    const match = rawLog.match(this.filterRegex);
    if (!match) return null;

    const [, , from, to, verdict, sub] = match;
    const action = verdict.split('=')[1]?.toLowerCase();
    
    return {
      timestamp: new Date(), // Requires timestamp from syslog header
      source: 'proofpoint-pps',
      category: 'application',
      action: 'email_processed',
      outcome: action === 'deliver' ? 'success' : 'failure',
      severity: action !== 'deliver' ? 'medium' : 'low',
      rawData: rawLog,
      custom: {
        proofpoint: { from, to, verdict, sub }
      }
    };
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const data = event.custom.proofpoint;
    return {
      '@timestamp': event.timestamp.toISOString(),
      'message': `Email from ${data.from} to ${data.to} with subject "${data.sub}" was processed with verdict: ${data.verdict}`,
      'event.kind': 'event',
      'event.category': ['email'],
      'event.type': ['info'],
      'event.action': event.action,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'log.level': event.severity,
      'log.original': event.rawData,
      'email.from.address': data.from.replace('from=<','').replace('>', ''),
      'email.to.address': data.to.replace('to=<','').replace('>', ''),
      'email.subject': data.sub.replace('sub=', ''),
      'observer.vendor': this.vendor,
      'observer.product': 'Proofpoint Protection Server',
      'observer.type': 'email-gateway',
      'securewatch.parser.id': this.id,
      'securewatch.parser.name': this.name,
      'securewatch.parser.version': this.version,
      'securewatch.confidence': 0.89,
      'securewatch.severity': event.severity,
    };
  }
  
  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[severity] || 25;
  }
}
