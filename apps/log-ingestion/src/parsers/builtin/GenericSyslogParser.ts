// Generic Syslog Parser
// Fallback parser for standard syslog messages with JSON payload support

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  DeviceInfo,
  NetworkInfo
} from '../types';

export class GenericSyslogParser implements LogParser {
  id = 'generic-syslog';
  name = 'Generic Syslog Parser';
  vendor = 'Generic';
  logSource = 'syslog';
  version = '1.1.0'; // Version updated
  format = 'syslog' as const;
  category = 'network' as const;
  priority = 10; // Low priority - fallback parser
  enabled = true;

  // Syslog facility mappings
  private readonly facilities: Record<number, string> = {
    0: 'kernel',
    1: 'user',
    2: 'mail',
    3: 'daemon',
    4: 'auth',
    5: 'syslog',
    6: 'lpr',
    7: 'news',
    8: 'uucp',
    9: 'cron',
    10: 'authpriv',
    11: 'ftp',
    16: 'local0',
    17: 'local1',
    18: 'local2',
    19: 'local3',
    20: 'local4',
    21: 'local5',
    22: 'local6',
    23: 'local7'
  };

  // Syslog severity mappings
  private readonly severities: Record<number, { name: string; level: 'low' | 'medium' | 'high' | 'critical' }> = {
    0: { name: 'emergency', level: 'critical' },
    1: { name: 'alert', level: 'critical' },
    2: { name: 'critical', level: 'critical' },
    3: { name: 'error', level: 'high' },
    4: { name: 'warning', level: 'medium' },
    5: { name: 'notice', level: 'medium' },
    6: { name: 'info', level: 'low' },
    7: { name: 'debug', level: 'low' }
  };

  validate(rawLog: string): boolean {
    // RFC 3164 or RFC 5424 format detection
    const rfc3164Pattern = /^<\d+>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+/;
    const rfc5424Pattern = /^<\d+>\d+\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const simplePattern = /^<\d+>/;

    return rfc3164Pattern.test(rawLog) || rfc5424Pattern.test(rawLog) || simplePattern.test(rawLog);
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      const parsed = this.parseSyslogMessage(rawLog);
      if (!parsed) return null;

      // Check for JSON payload
      let jsonPayload: Record<string, any> | null = null;
      if (parsed.message.includes('{')) { // More generic check for JSON
        jsonPayload = this.extractJSONPayload(parsed.message);
        if (jsonPayload) {
            // ** NEW: Recursively parse embedded JSON strings **
            this.recursivelyParseJSON(jsonPayload);
        }
      }

      const event: ParsedEvent = {
        timestamp: parsed.timestamp || new Date(),
        source: parsed.hostname || 'unknown',
        category: this.getCategoryFromFacility(parsed.facility),
        action: this.getActionFromMessage(parsed.message),
        outcome: this.getOutcomeFromMessage(parsed.message),
        severity: this.severities[parsed.severity]?.level || 'low',
        rawData: rawLog,
        custom: {
          priority: parsed.priority,
          facility: parsed.facility,
          facilityName: this.facilities[parsed.facility] || 'unknown',
          severity: parsed.severity,
          severityName: this.severities[parsed.severity]?.name || 'unknown',
          tag: parsed.tag,
          pid: parsed.pid,
          message: parsed.message,
          jsonPayload: jsonPayload
        }
      };

      // Add device information
      event.device = this.extractDeviceInfo(parsed.hostname);

      // Add network information if available in JSON payload
      if (jsonPayload) {
        event.network = this.extractNetworkInfoFromJSON(jsonPayload);
        
        // Merge JSON payload fields into custom
        Object.assign(event.custom, jsonPayload);
      }

      return event;

    } catch (error) {
      console.error('Generic syslog parsing error:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    // ... (rest of the normalize function remains unchanged) ...
    const facility = event.custom?.facility as number;
    const severity = event.custom?.severity as number;

    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': this.mapToECSCategory(event.category),
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.provider': 'syslog',
      'event.dataset': `syslog.${this.facilities[facility] || 'generic'}`,
      'event.module': 'syslog',
      'host.name': event.source,
      'host.hostname': event.source,
      'syslog.facility.code': facility,
      'syslog.facility.name': this.facilities[facility] || 'unknown',
      'syslog.severity.code': severity,
      'syslog.severity.name': this.severities[severity]?.name || 'unknown',
      'syslog.priority': event.custom?.priority,
      ...(event.custom?.tag && {
        'process.name': event.custom.tag,
        'process.pid': event.custom.pid
      }),
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'source.port': event.network.sourcePort,
        'destination.ip': event.network.destinationIp,
        'destination.port': event.network.destinationPort,
        'network.protocol': event.network.protocol
      }),
      'message': event.custom?.message,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(facility, event.custom?.tag),
      labels: {
        'facility': this.facilities[facility] || 'unknown',
        'severity': this.severities[severity]?.name || 'unknown',
        'log_source': 'syslog',
        'parser': this.id
      },
      related: {
        hosts: [event.source]
      }
    };
    if (event.custom?.jsonPayload) {
      Object.keys(event.custom.jsonPayload).forEach(key => {
        if (!normalized[key] && key !== 'message') {
          normalized[`syslog.${key}`] = event.custom.jsonPayload[key];
        }
      });
    }
    return normalized;
  }
  
  // ** NEW FUNCTION: Recursively parse embedded JSON strings **
  private recursivelyParseJSON(obj: Record<string, any>): void {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            const value = obj[key].trim();
            if (value.startsWith('{') && value.endsWith('}')) {
                try {
                    obj[key] = JSON.parse(value);
                    // If parsing is successful, recurse into the new object
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        this.recursivelyParseJSON(obj[key]);
                    }
                } catch (e) {
                    // Not a valid JSON string, leave it as is
                }
            }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            // If it's already an object, recurse into it
            this.recursivelyParseJSON(obj[key]);
        }
    }
  }

  private parseSyslogMessage(rawLog: string): {
    // ... (rest of the function remains unchanged) ...
    priority: number;
    facility: number;
    severity: number;
    timestamp: Date | null;
    hostname: string | null;
    tag: string | null;
    pid: number | null;
    message: string;
  } | null {
    const priorityMatch = rawLog.match(/^<(\d+)>/);
    if (!priorityMatch) return null;
    const priority = parseInt(priorityMatch[1], 10);
    const facility = Math.floor(priority / 8);
    const severity = priority % 8;
    const withoutPriority = rawLog.substring(priorityMatch[0].length);
    const rfc5424Match = withoutPriority.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(?:\[([^\]]+)\]\s+)?(.*)$/);
    if (rfc5424Match) {
      const [, version, timestamp, hostname, appName, procId, msgId, structuredData, message] = rfc5424Match;
      return {
        priority, facility, severity,
        timestamp: this.parseTimestamp(timestamp),
        hostname: hostname === '-' ? null : hostname,
        tag: appName === '-' ? null : appName,
        pid: procId === '-' ? null : parseInt(procId, 10),
        message: message || ''
      };
    }
    const rfc3164Match = withoutPriority.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:\[\s]+)(?:\[(\d+)\])?:\s*(.*)$/);
    if (rfc3164Match) {
      const [, timestamp, hostname, tag, pid, message] = rfc3164Match;
      return {
        priority, facility, severity,
        timestamp: this.parseRFC3164Timestamp(timestamp),
        hostname, tag,
        pid: pid ? parseInt(pid, 10) : null,
        message: message || ''
      };
    }
    const simpleMatch = withoutPriority.match(/^(.*)$/);
    if (simpleMatch) {
      return {
        priority, facility, severity,
        timestamp: new Date(), hostname: null, tag: null, pid: null,
        message: simpleMatch[1] || ''
      };
    }
    return null;
  }

  private parseTimestamp(timestamp: string): Date | null {
    // ... (rest of the function remains unchanged) ...
    try {
      if (timestamp.includes('T')) { return new Date(timestamp); }
      return new Date(timestamp);
    } catch { return null; }
  }

  private parseRFC3164Timestamp(timestamp: string): Date | null {
    // ... (rest of the function remains unchanged) ...
     try {
      const currentYear = new Date().getFullYear();
      const fullTimestamp = `${currentYear} ${timestamp}`;
      return new Date(fullTimestamp);
    } catch { return null; }
  }

  private extractJSONPayload(message: string): Record<string, any> | null {
    // Updated to find the first '{' to be more flexible
    try {
      const jsonStart = message.indexOf('{');
      if (jsonStart === -1) return null;

      const jsonString = message.substring(jsonStart);
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  // ... (All other private methods remain unchanged) ...
    private extractDeviceInfo(hostname: string | null): DeviceInfo | undefined { if (!hostname) return undefined; return { name: hostname, hostname: hostname, type: 'server' }; }
    private extractNetworkInfoFromJSON(jsonPayload: Record<string, any>): NetworkInfo | undefined { if (!jsonPayload) return undefined; return { sourceIp: jsonPayload.src_ip || jsonPayload.source_ip || jsonPayload.client_ip, sourcePort: jsonPayload.src_port || jsonPayload.source_port, destinationIp: jsonPayload.dst_ip || jsonPayload.dest_ip || jsonPayload.server_ip, destinationPort: jsonPayload.dst_port || jsonPayload.dest_port || jsonPayload.server_port, protocol: jsonPayload.protocol, bytes: jsonPayload.bytes, packets: jsonPayload.packets }; }
    private getCategoryFromFacility(facility: number): string { const categoryMap: Record<number, string> = { 0: 'host', 1: 'host', 2: 'email', 3: 'host', 4: 'authentication', 5: 'host', 6: 'host', 7: 'host', 8: 'host', 9: 'host', 10: 'authentication', 11: 'file', 16: 'application', 17: 'application', 18: 'application', 19: 'application', 20: 'application', 21: 'application', 22: 'application', 23: 'application' }; return categoryMap[facility] || 'host'; }
    private getActionFromMessage(message: string): string { const lowerMessage = message.toLowerCase(); if (lowerMessage.includes('login') || lowerMessage.includes('logon')) return 'login'; if (lowerMessage.includes('logout') || lowerMessage.includes('logoff')) return 'logout'; if (lowerMessage.includes('failed') && lowerMessage.includes('auth')) return 'authentication_failed'; if (lowerMessage.includes('connection')) return 'connection'; if (lowerMessage.includes('disconnect')) return 'disconnection'; if (lowerMessage.includes('created')) return 'file_created'; if (lowerMessage.includes('deleted')) return 'file_deleted'; if (lowerMessage.includes('modified')) return 'file_modified'; if (lowerMessage.includes('started')) return 'process_started'; if (lowerMessage.includes('stopped')) return 'process_stopped'; if (lowerMessage.includes('error')) return 'error'; if (lowerMessage.includes('warning')) return 'warning'; if (lowerMessage.includes('info')) return 'info'; return 'unknown'; }
    private getOutcomeFromMessage(message: string): 'success' | 'failure' | 'unknown' { const lowerMessage = message.toLowerCase(); if (lowerMessage.includes('failed') || lowerMessage.includes('error') || lowerMessage.includes('denied') || lowerMessage.includes('rejected')) { return 'failure'; } if (lowerMessage.includes('success') || lowerMessage.includes('accepted') || lowerMessage.includes('completed') || lowerMessage.includes('started')) { return 'success'; } return 'unknown'; }
    private mapToECSCategory(category: string): string[] { const mapping: Record<string, string[]> = { 'authentication': ['authentication'], 'network': ['network'], 'host': ['host'], 'file': ['file'], 'email': ['email'], 'application': ['process'] }; return mapping[category] || ['host']; }
    private mapToECSType(action: string): string[] { const mapping: Record<string, string[]> = { 'login': ['start'], 'logout': ['end'], 'authentication_failed': ['start'], 'connection': ['connection'], 'disconnection': ['end'], 'file_created': ['creation'], 'file_deleted': ['deletion'], 'file_modified': ['change'], 'process_started': ['start'], 'process_stopped': ['end'], 'error': ['error'], 'warning': ['info'], 'info': ['info'] }; return mapping[action] || ['info']; }
    private mapSeverityToNumber(severity: string): number { const mapping: Record<string, number> = { 'low': 25, 'medium': 50, 'high': 75, 'critical': 100 }; return mapping[severity] || 25; }
    private calculateConfidence(event: ParsedEvent): number { let confidence = 0.6; if (event.custom?.jsonPayload) { confidence += 0.2; } if (event.source !== 'unknown') { confidence += 0.1; } if (event.custom?.tag) { confidence += 0.05; } if (event.custom?.message && event.custom.message.length < 10) { confidence -= 0.1; } return Math.max(0.1, Math.min(1.0, confidence)); }
    private getTagsForEvent(facility: number, tag?: string): string[] { const baseTags = ['syslog', 'generic']; const facilityName = this.facilities[facility]; if (facilityName) { baseTags.push(facilityName); } if (tag) { baseTags.push(tag.toLowerCase()); } return baseTags; }
}