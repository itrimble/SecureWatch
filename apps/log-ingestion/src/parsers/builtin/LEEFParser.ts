import {
  LogParser,
  ParsedEvent,
  NormalizedEvent
} from '../types';

/**
 * Log Event Extended Format (LEEF) Parser
 * Parses LEEF messages used by IBM QRadar and other SIEM systems.
 * LEEF Format: LEEF:Version|Vendor|Product|Version|EventID|Key1=Value1<delimiter>Key2=Value2...
 */
export class LEEFParser implements LogParser {
  id = 'leef-parser';
  name = 'Log Event Extended Format (LEEF)';
  vendor = 'IBM';
  logSource = 'leef';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'network' as const; // Default, can be overridden by LEEF fields
  priority = 90; // High priority for this specific format
  enabled = true;

  // LEEF header pattern
  private readonly leefPattern = /LEEF:[12]\.0\|/;

  validate(rawLog: string): boolean {
    return this.leefPattern.test(rawLog);
  }

  parse(rawLog: string): ParsedEvent | null {
    // LEEF 1.0: LEEF:1.0|Vendor|Product|Version|EventID|Key1=Value1^Key2=Value2...
    // LEEF 2.0: LEEF:2.0|Vendor|Product|Version|EventID|Delimiter|Key1=Value1<delimiter>Key2=Value2...
    
    const leef1Match = rawLog.match(/LEEF:1\.0\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)/);
    const leef2Match = rawLog.match(/LEEF:2\.0\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(.)\|(.*)/);
    
    let vendor: string, product: string, version: string, eventId: string, extensions: string, delimiter: string;
    let leefVersion: string;

    if (leef2Match) {
      [, vendor, product, version, eventId, delimiter, extensions] = leef2Match;
      leefVersion = '2.0';
    } else if (leef1Match) {
      [, vendor, product, version, eventId, extensions] = leef1Match;
      delimiter = '^'; // Default delimiter for LEEF 1.0
      leefVersion = '1.0';
    } else {
      return null;
    }

    const extensionFields = this.parseLEEFExtension(extensions, delimiter);

    const event: ParsedEvent = {
      timestamp: new Date(), // LEEF timestamp is often in the extension
      source: extensionFields.devTime || extensionFields.src || 'unknown',
      category: this.mapCategory(extensionFields.cat),
      action: extensionFields.eventId || eventId || 'unknown',
      outcome: this.getOutcome(extensionFields),
      severity: this.mapSeverity(extensionFields.sev),
      rawData: rawLog,
      custom: {
        leef: {
          version: leefVersion,
          vendor,
          product,
          version: version,
          eventId,
          delimiter,
          ...extensionFields
        }
      }
    };
    
    // Prefer timestamp from the extension if available
    const eventTimestamp = extensionFields.devTime || extensionFields.endTime;
    if (eventTimestamp) {
      // Handle various timestamp formats (epoch, ISO, custom)
      let parsedTimestamp: Date;
      
      if (/^\d{10}$/.test(eventTimestamp)) {
        // Unix timestamp (seconds)
        parsedTimestamp = new Date(Number(eventTimestamp) * 1000);
      } else if (/^\d{13}$/.test(eventTimestamp)) {
        // Unix timestamp (milliseconds)
        parsedTimestamp = new Date(Number(eventTimestamp));
      } else {
        // Try parsing as date string
        parsedTimestamp = new Date(eventTimestamp);
      }
      
      if (!isNaN(parsedTimestamp.getTime())) {
        event.timestamp = parsedTimestamp;
      }
    }

    return event;
  }
  
  normalize(event: ParsedEvent): NormalizedEvent {
    const leef = event.custom?.leef || {};
    
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': this.mapToECSCategory(leef.cat),
      'event.type': this.mapToECSType(leef.type),
      'event.action': leef.eventId,
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(leef.sev),
      'event.provider': leef.vendor,
      'event.dataset': `${leef.product || 'leef'}.${leef.cat || 'generic'}`,
      'event.module': 'leef',

      // Source fields
      'source.ip': leef.src || leef.srcIP,
      'source.port': this.parsePort(leef.srcPort),
      'source.mac': leef.srcMAC,
      'source.domain': leef.srcDomain,
      'user.name': leef.usrName || leef.srcUserName,

      // Destination fields
      'destination.ip': leef.dst || leef.dstIP,
      'destination.port': this.parsePort(leef.dstPort),
      'destination.mac': leef.dstMAC,
      'destination.domain': leef.dstDomain,
      'user.target.name': leef.dstUserName,

      // Network fields
      'network.protocol': leef.proto || leef.protocol,
      'network.transport': leef.proto || leef.protocol,
      'network.bytes': this.parseNumber(leef.totalBytes),
      'network.packets': this.parseNumber(leef.totalPackets),
      'network.direction': this.mapDirection(leef.direction),

      // Host fields
      'host.name': leef.devName || leef.hostname,
      'host.ip': leef.devIP ? [leef.devIP] : undefined,

      // URL/Web fields
      'url.full': leef.url,
      'url.domain': leef.domain,
      'user_agent.original': leef.userAgent,

      // File fields
      'file.name': leef.fileName,
      'file.path': leef.filePath,
      'file.size': this.parseNumber(leef.fileSize),
      'file.hash.md5': leef.fileMD5,
      'file.hash.sha1': leef.fileSHA1,
      'file.hash.sha256': leef.fileSHA256,

      // Process fields
      'process.name': leef.processName,
      'process.pid': this.parseNumber(leef.processPID),
      'process.command_line': leef.processCmd,

      // Authentication fields
      'authentication.type': leef.authType,
      'authentication.method': leef.authMethod,

      // Rule/Signature fields
      'rule.id': leef.ruleId || leef.signatureId,
      'rule.name': leef.ruleName || leef.signatureName,
      
      'message': leef.msg || leef.reason || event.rawData,
      
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.9,
      'securewatch.severity': event.severity,

      // LEEF-specific fields
      'labels': {
        leef_version: leef.version,
        leef_vendor: leef.vendor,
        leef_product: leef.product,
        leef_event_id: leef.eventId
      }
    };
    
    // Clean up undefined fields
    Object.keys(normalized).forEach(key => (normalized[key] === undefined) && delete normalized[key]);

    return normalized;
  }

  private parseLEEFExtension(extension: string, delimiter: string): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Escape the delimiter for regex
    const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Split on unescaped delimiters
    const parts = extension.split(new RegExp(`(?<!\\\\)${escapedDelimiter}`));
    
    for (const part of parts) {
      const equalIndex = part.indexOf('=');
      if (equalIndex > 0) {
        const key = part.substring(0, equalIndex).trim();
        const value = part.substring(equalIndex + 1)
          .replace(new RegExp(`\\\\${escapedDelimiter}`, 'g'), delimiter) // Unescape delimiters
          .replace(/\\=/g, '=') // Unescape equals signs
          .trim();
        
        if (key && value) {
          fields[key] = value;
        }
      }
    }
    
    return fields;
  }

  private mapSeverity(severity?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!severity) return 'medium';
    
    const severityNum = parseInt(severity, 10);
    if (!isNaN(severityNum)) {
      // Numeric severity (0-10 scale typically)
      if (severityNum >= 8) return 'critical';
      if (severityNum >= 6) return 'high';
      if (severityNum >= 3) return 'medium';
      return 'low';
    }
    
    // String severity
    const lowerSeverity = severity.toLowerCase();
    if (lowerSeverity.includes('critical') || lowerSeverity.includes('fatal')) return 'critical';
    if (lowerSeverity.includes('high') || lowerSeverity.includes('error')) return 'high';
    if (lowerSeverity.includes('medium') || lowerSeverity.includes('warn')) return 'medium';
    if (lowerSeverity.includes('low') || lowerSeverity.includes('info')) return 'low';
    
    return 'medium';
  }

  private mapSeverityToNumber(severity?: string): number {
    switch(this.mapSeverity(severity)) {
      case 'critical': return 90;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  private mapCategory(category?: string): string {
    if (!category) return 'network';
    
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('auth')) return 'authentication';
    if (lowerCat.includes('file')) return 'file';
    if (lowerCat.includes('process')) return 'process';
    if (lowerCat.includes('network')) return 'network';
    if (lowerCat.includes('web')) return 'web';
    if (lowerCat.includes('malware')) return 'malware';
    
    return 'network';
  }

  private getOutcome(fields: Record<string, any>): 'success' | 'failure' | 'unknown' {
    // Check various outcome indicators
    const indicators = [fields.outcome, fields.result, fields.status, fields.action];
    
    for (const indicator of indicators) {
      if (indicator) {
        const lowerIndicator = indicator.toString().toLowerCase();
        if (lowerIndicator.includes('success') || lowerIndicator.includes('allow') || 
            lowerIndicator.includes('permit') || lowerIndicator.includes('accept')) {
          return 'success';
        }
        if (lowerIndicator.includes('fail') || lowerIndicator.includes('deny') || 
            lowerIndicator.includes('block') || lowerIndicator.includes('reject') ||
            lowerIndicator.includes('error')) {
          return 'failure';
        }
      }
    }
    
    return 'unknown';
  }
  
  private mapToECSCategory(category?: string): string[] {
    if (!category) return ['network'];
    
    const lowerCat = category.toLowerCase();
    const categories: string[] = [];
    
    if (lowerCat.includes('auth')) categories.push('authentication');
    if (lowerCat.includes('file')) categories.push('file');
    if (lowerCat.includes('process')) categories.push('process');
    if (lowerCat.includes('network')) categories.push('network');
    if (lowerCat.includes('web')) categories.push('web');
    if (lowerCat.includes('malware')) categories.push('malware');
    if (lowerCat.includes('iam')) categories.push('iam');
    
    return categories.length > 0 ? categories : ['network'];
  }

  private mapToECSType(type?: string): string[] {
    if (!type) return ['info'];
    
    const lowerType = type.toLowerCase();
    const types: string[] = [];
    
    if (lowerType.includes('start')) types.push('start');
    if (lowerType.includes('end') || lowerType.includes('stop')) types.push('end');
    if (lowerType.includes('access')) types.push('access');
    if (lowerType.includes('change') || lowerType.includes('modify')) types.push('change');
    if (lowerType.includes('create')) types.push('creation');
    if (lowerType.includes('delete')) types.push('deletion');
    if (lowerType.includes('error')) types.push('error');
    if (lowerType.includes('connection')) types.push('connection');
    if (lowerType.includes('admin')) types.push('admin');
    
    return types.length > 0 ? types : ['info'];
  }
  
  private mapDirection(direction?: string | number): 'inbound' | 'outbound' | undefined {
    if (!direction) return undefined;
    
    if (typeof direction === 'number') {
      if (direction === 0) return 'inbound';
      if (direction === 1) return 'outbound';
    }
    
    const lowerDirection = direction.toString().toLowerCase();
    if (lowerDirection.includes('in') || lowerDirection.includes('ingress')) return 'inbound';
    if (lowerDirection.includes('out') || lowerDirection.includes('egress')) return 'outbound';
    
    return undefined;
  }

  private parseNumber(value?: string | number): number | undefined {
    if (typeof value === 'number') return value;
    if (!value) return undefined;
    
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  private parsePort(value?: string | number): number | undefined {
    const port = this.parseNumber(value);
    return (port && port >= 1 && port <= 65535) ? port : undefined;
  }
}