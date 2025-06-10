// Built-in parsers index
// Exports all available built-in parsers

export { WindowsSecurityEventParser } from './WindowsSecurityEventParser';
export { SysmonEventParser } from './SysmonEventParser';
export { GenericSyslogParser } from './GenericSyslogParser';
export { ApacheAccessLogParser } from './ApacheAccessLogParser';
export { PaloAltoFirewallParser } from './PaloAltoFirewallParser';
export { CiscoASAFirewallParser } from './CiscoASAFirewallParser';
export { FortiGateFirewallParser } from './FortiGateFirewallParser';

// New Enterprise Parsers
export { CheckPointFirewallParser } from './CheckPointFirewallParser';
export { CrowdStrikeFalconEDRParser } from './CrowdStrikeFalconEDRParser';
export { F5BigIPParser } from './F5BigIPParser';
export { MicrosoftSQLServerAuditParser } from './MicrosoftSQLServerAuditParser';
export { OktaIAMParser } from './OktaIAMParser';
export { PfSenseFirewallParser } from './PfSenseFirewallParser';
export { PiholeDnsParser } from './PiholeDnsParser';
export { PostgreSQLAuditParser } from './PostgreSQLAuditParser';
export { ProofpointEmailSecurityParser } from './ProofpointEmailSecurityParser';
export { SentinelOneEDRParser } from './SentinelOneEDRParser';
export { SplunkUFParser } from './SplunkUFParser';
export { SquidProxyParser } from './SquidProxyParser';
export { VMwareESXiParser } from './VMwareESXiParser';
export { ZscalerCloudSecurityParser } from './ZscalerCloudSecurityParser';

// Security Event Format Parsers
export { LEEFParser } from './LEEFParser';

// Enhanced Multi-Format Parsers
export { EnhancedJSONParser } from './EnhancedJSONParser';

// Cloud Platform Parsers
export { AzureActivityLogsParser } from './AzureActivityParsers';
export { GoogleCloudAuditLogsParser } from './GoogleCloudAuditLogsParser';
export { Microsoft365EntraIDParser } from './Microsoft365EntraIDParser';

// Web Server Parsers  
export { NginxLogParser } from './NginxLogParser';
export { IISLogParser } from './IISLogParser';

// Additional parsers - simplified implementations for demo
export class LinuxAuthLogParser {
  id = 'linux-auth-log';
  name = 'Linux Auth Log Parser';
  vendor = 'Linux';
  logSource = 'auth.log';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'authentication' as const;
  priority = 70;
  enabled = true;

  validate(rawLog: string): boolean {
    return rawLog.includes('sshd') || rawLog.includes('sudo') || rawLog.includes('su:');
  }

  parse(rawLog: string): any {
    return {
      timestamp: new Date(),
      source: 'linux-server',
      category: 'authentication',
      action: 'login_attempt',
      outcome: rawLog.includes('Failed') ? 'failure' : 'success',
      severity: 'medium' as const,
      rawData: rawLog
    };
  }

  normalize(event: any): any {
    return {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['authentication'],
      'event.type': ['start'],
      'event.outcome': event.outcome,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.8,
      'securewatch.severity': event.severity
    };
  }
}

export class AWSCloudTrailParser {
  id = 'aws-cloudtrail';
  name = 'AWS CloudTrail Parser';
  vendor = 'Amazon Web Services';
  logSource = 'aws:cloudtrail';
  version = '1.0.0';
  format = 'json' as const;
  category = 'cloud' as const;
  priority = 75;
  enabled = true;

  validate(rawLog: string): boolean {
    try {
      const parsed = JSON.parse(rawLog);
      return parsed.awsRegion && parsed.eventSource && parsed.eventTime;
    } catch {
      return false;
    }
  }

  parse(rawLog: string): any {
    const event = JSON.parse(rawLog);
    return {
      timestamp: new Date(event.eventTime),
      source: event.sourceIPAddress || 'aws',
      category: 'cloud',
      action: event.eventName,
      outcome: event.errorCode ? 'failure' : 'success',
      severity: 'low' as const,
      rawData: rawLog,
      custom: event
    };
  }

  normalize(event: any): any {
    return {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['iam'],
      'event.type': ['access'],
      'event.outcome': event.outcome,
      'cloud.provider': 'aws',
      'cloud.service.name': event.custom.eventSource,
      'source.ip': event.custom.sourceIPAddress,
      'user.name': event.custom.userIdentity?.userName,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.9,
      'securewatch.severity': event.severity
    };
  }
}

export class Office365AuditParser {
  id = 'office365-audit';
  name = 'Office 365 Audit Parser';
  vendor = 'Microsoft';
  logSource = 'office365:audit';
  version = '1.0.0';
  format = 'json' as const;
  category = 'cloud' as const;
  priority = 75;
  enabled = true;

  validate(rawLog: string): boolean {
    try {
      const parsed = JSON.parse(rawLog);
      return parsed.Workload && parsed.CreationTime && parsed.Operation;
    } catch {
      return false;
    }
  }

  parse(rawLog: string): any {
    const event = JSON.parse(rawLog);
    return {
      timestamp: new Date(event.CreationTime),
      source: event.ClientIP || 'office365',
      category: 'cloud',
      action: event.Operation,
      outcome: 'success',
      severity: 'low' as const,
      rawData: rawLog,
      custom: event
    };
  }

  normalize(event: any): any {
    return {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['iam'],
      'event.type': ['access'],
      'event.outcome': event.outcome,
      'cloud.provider': 'microsoft',
      'cloud.service.name': 'office365',
      'source.ip': event.custom.ClientIP,
      'user.name': event.custom.UserId,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.85,
      'securewatch.severity': event.severity
    };
  }
}

// Legacy simplified PAN-OS parser - replaced by comprehensive implementation
export class PaloAltoFirewallParserLegacy {
  id = 'paloalto-pan-os-legacy';
  name = 'Palo Alto PAN-OS Firewall Parser (Legacy)';
  vendor = 'Palo Alto Networks';
  logSource = 'pan:traffic';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'network' as const;
  priority = 70; // Lower priority than comprehensive parser
  enabled = false; // Disabled in favor of comprehensive parser

  validate(rawLog: string): boolean {
    return rawLog.includes(',TRAFFIC,') || rawLog.includes('PAN-OS');
  }

  parse(rawLog: string): any {
    return {
      timestamp: new Date(),
      source: 'firewall',
      category: 'network',
      action: 'network_connection',
      outcome: rawLog.includes('deny') ? 'failure' : 'success',
      severity: 'low' as const,
      rawData: rawLog
    };
  }

  normalize(event: any): any {
    return {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['network'],
      'event.type': ['connection'],
      'event.outcome': event.outcome,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.85,
      'securewatch.severity': event.severity
    };
  }
}

export class CiscoASAParser {
  id = 'cisco-asa';
  name = 'Cisco ASA Parser';
  vendor = 'Cisco Systems';
  logSource = 'cisco:asa';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'network' as const;
  priority = 80;
  enabled = true;

  validate(rawLog: string): boolean {
    return rawLog.includes('%ASA-') || rawLog.includes('Cisco');
  }

  parse(rawLog: string): any {
    return {
      timestamp: new Date(),
      source: 'cisco-asa',
      category: 'network',
      action: 'firewall_action',
      outcome: rawLog.includes('Deny') ? 'failure' : 'success',
      severity: 'medium' as const,
      rawData: rawLog
    };
  }

  normalize(event: any): any {
    return {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['network'],
      'event.type': ['connection'],
      'event.outcome': event.outcome,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.8,
      'securewatch.severity': event.severity
    };
  }
}

export class NginxAccessLogParser {
  id = 'nginx-access-log';
  name = 'Nginx Access Log Parser';
  vendor = 'Nginx Inc';
  logSource = 'nginx:access';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'web' as const;
  priority = 75;
  enabled = true;

  validate(rawLog: string): boolean {
    // Nginx combined log format pattern
    return /^\S+ \S+ \S+ \[.+\] ".+" \d+ \d+ ".+" ".+"/.test(rawLog);
  }

  parse(rawLog: string): any {
    return {
      timestamp: new Date(),
      source: 'nginx-server',
      category: 'web',
      action: 'http_request',
      outcome: rawLog.includes(' 4') || rawLog.includes(' 5') ? 'failure' : 'success',
      severity: 'low' as const,
      rawData: rawLog
    };
  }

  normalize(event: any): any {
    return {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['web'],
      'event.type': ['access'],
      'event.outcome': event.outcome,
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': 0.8,
      'securewatch.severity': event.severity
    };
  }
}