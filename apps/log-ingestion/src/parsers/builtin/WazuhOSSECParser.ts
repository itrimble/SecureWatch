// Wazuh/OSSEC Parser
// Handles Wazuh alerts.json format with MITRE ATT&CK mapping preservation

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  DeviceInfo,
  NetworkInfo,
  ProcessInfo,
  FileInfo,
  ThreatInfo,
  MitreTechnique,
  MitreTactic,
} from '../types';

interface WazuhAlert {
  timestamp: string;
  rule: {
    id: number;
    level: number;
    description: string;
    groups?: string[];
    mitre?: {
      id: string[];
      tactic: string[];
      technique: string[];
    };
  };
  agent: {
    id: string;
    name: string;
    ip?: string;
  };
  manager: {
    name: string;
  };
  decoder?: {
    name: string;
    parent?: string;
  };
  data?: {
    srcip?: string;
    dstip?: string;
    srcport?: number;
    dstport?: number;
    protocol?: string;
    srcuser?: string;
    dstuser?: string;
    command?: string;
    filename?: string;
    md5?: string;
    sha1?: string;
    sha256?: string;
    url?: string;
    process_name?: string;
    pid?: number;
    ppid?: number;
    uid?: number;
    gid?: number;
    registry_key?: string;
    registry_value?: string;
  };
  location?: string;
  input?: {
    type: string;
  };
  predecoder?: {
    program_name?: string;
    timestamp?: string;
    hostname?: string;
  };
  full_log?: string;
  syscheck?: {
    path: string;
    event: string;
    audit?: {
      login?: string;
      effective_user?: {
        name: string;
        id: string;
      };
    };
  };
  compliance?: {
    pci_dss?: string[];
    gdpr?: string[];
    nist_800_53?: string[];
    tsc?: string[];
    mitre?: string[];
  };
}

export class WazuhOSSECParser implements LogParser {
  id = 'wazuh-ossec';
  name = 'Wazuh/OSSEC Parser';
  vendor = 'Wazuh';
  logSource = 'wazuh';
  version = '1.0.0';
  format = 'json' as const;
  category = 'endpoint' as const;
  priority = 85; // High priority for security events
  enabled = true;

  // Wazuh rule level to severity mapping
  private readonly severityMapping: Record<
    number,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    0: 'low',
    1: 'low',
    2: 'low',
    3: 'low',
    4: 'low',
    5: 'medium',
    6: 'medium',
    7: 'medium',
    8: 'medium',
    9: 'high',
    10: 'high',
    11: 'high',
    12: 'high',
    13: 'critical',
    14: 'critical',
    15: 'critical',
  };

  validate(rawLog: string): boolean {
    try {
      const data = JSON.parse(rawLog);

      // Must have timestamp, rule, and agent fields
      return !!(
        data.timestamp &&
        data.rule &&
        data.rule.id &&
        data.rule.level !== undefined &&
        data.agent &&
        data.agent.name
      );
    } catch {
      return false;
    }
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      const alert: WazuhAlert = JSON.parse(rawLog);

      // Extract basic event information
      const event: ParsedEvent = {
        timestamp: new Date(alert.timestamp),
        source: alert.agent.name,
        category: this.categorizeFromGroups(alert.rule.groups),
        action: this.getActionFromRule(alert.rule),
        outcome: this.getOutcomeFromLevel(alert.rule.level),
        severity: this.severityMapping[alert.rule.level] || 'low',
        rawData: rawLog,
        custom: {
          rule_id: alert.rule.id,
          rule_level: alert.rule.level,
          rule_description: alert.rule.description,
          rule_groups: alert.rule.groups,
          agent_id: alert.agent.id,
          manager_name: alert.manager.name,
          location: alert.location,
          full_log: alert.full_log,
          decoder: alert.decoder?.name,
          compliance: alert.compliance,
        },
      };

      // Extract user information
      if (
        alert.data?.srcuser ||
        alert.data?.dstuser ||
        alert.syscheck?.audit?.login
      ) {
        event.user = this.extractUserInfo(alert);
      }

      // Extract device information
      event.device = this.extractDeviceInfo(alert);

      // Extract network information
      if (alert.data?.srcip || alert.data?.dstip) {
        event.network = this.extractNetworkInfo(alert);
      }

      // Extract process information
      if (alert.data?.process_name || alert.data?.pid || alert.data?.command) {
        event.process = this.extractProcessInfo(alert);
      }

      // Extract file information
      if (alert.data?.filename || alert.syscheck?.path) {
        event.file = this.extractFileInfo(alert);
      }

      // Extract threat information (MITRE ATT&CK)
      if (alert.rule.mitre) {
        event.threat = this.extractThreatInfo(alert);
      }

      return event;
    } catch (error) {
      console.error('Wazuh parsing error:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'alert',
      'event.category': this.mapToECSCategory(event.category),
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.risk_score': this.calculateRiskScore(event),
      'event.provider': 'wazuh',
      'event.dataset': 'wazuh.alerts',
      'event.module': 'wazuh',

      // Host/Agent information
      'host.name': event.source,
      'host.hostname': event.source,
      ...(event.device?.ip && { 'host.ip': event.device.ip }),
      ...(event.device?.os && {
        'host.os.family': event.device.os.family,
        'host.os.name': event.device.os.name,
        'host.os.version': event.device.os.version,
      }),

      // User information
      ...(event.user && {
        'user.name': event.user.name,
        'user.domain': event.user.domain,
        'user.id': event.user.id,
      }),

      // Network information
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'source.port': event.network.sourcePort,
        'destination.ip': event.network.destinationIp,
        'destination.port': event.network.destinationPort,
        'network.protocol': event.network.protocol,
      }),

      // Process information
      ...(event.process && {
        'process.name': event.process.name,
        'process.pid': event.process.pid,
        'process.ppid': event.process.ppid,
        'process.command_line': event.process.commandLine,
        'process.hash.md5': event.process.hashes?.md5,
        'process.hash.sha1': event.process.hashes?.sha1,
        'process.hash.sha256': event.process.hashes?.sha256,
      }),

      // File information
      ...(event.file && {
        'file.name': event.file.name,
        'file.path': event.file.path,
        'file.hash.md5': event.file.hashes?.md5,
        'file.hash.sha1': event.file.hashes?.sha1,
        'file.hash.sha256': event.file.hashes?.sha256,
      }),

      // MITRE ATT&CK information
      ...(event.threat && {
        'threat.technique.id': event.threat.techniques?.map((t) => t.id),
        'threat.technique.name': event.threat.techniques?.map((t) => t.name),
        'threat.tactic.id': event.threat.tactics?.map((t) => t.id),
        'threat.tactic.name': event.threat.tactics?.map((t) => t.name),
      }),

      // Wazuh-specific fields
      'wazuh.rule.id': event.custom?.rule_id,
      'wazuh.rule.level': event.custom?.rule_level,
      'wazuh.rule.description': event.custom?.rule_description,
      'wazuh.rule.groups': event.custom?.rule_groups,
      'wazuh.agent.id': event.custom?.agent_id,
      'wazuh.manager.name': event.custom?.manager_name,
      'wazuh.location': event.custom?.location,
      'wazuh.decoder.name': event.custom?.decoder,

      // Compliance mappings
      ...(event.custom?.compliance && {
        'wazuh.compliance.pci_dss': event.custom.compliance.pci_dss,
        'wazuh.compliance.gdpr': event.custom.compliance.gdpr,
        'wazuh.compliance.nist_800_53': event.custom.compliance.nist_800_53,
        'wazuh.compliance.tsc': event.custom.compliance.tsc,
      }),

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message: event.custom?.rule_description || event.custom?.full_log,
      labels: {
        rule_id: event.custom?.rule_id?.toString(),
        rule_level: event.custom?.rule_level?.toString(),
        agent_name: event.source,
        log_source: 'wazuh',
      },

      // Related fields for correlation
      'related.ip': this.getRelatedIPs(event),
      'related.user': this.getRelatedUsers(event),
      'related.hash': this.getRelatedHashes(event),
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private extractUserInfo(alert: WazuhAlert): UserInfo {
    return {
      name:
        alert.data?.srcuser ||
        alert.data?.dstuser ||
        alert.syscheck?.audit?.login,
      id: alert.syscheck?.audit?.effective_user?.id,
      fullName: alert.syscheck?.audit?.effective_user?.name,
    };
  }

  private extractDeviceInfo(alert: WazuhAlert): DeviceInfo {
    return {
      name: alert.agent.name,
      hostname: alert.predecoder?.hostname || alert.agent.name,
      ip: alert.agent.ip ? [alert.agent.ip] : undefined,
      type: 'server', // Default, could be enhanced with agent metadata
    };
  }

  private extractNetworkInfo(alert: WazuhAlert): NetworkInfo {
    return {
      sourceIp: alert.data?.srcip,
      sourcePort: alert.data?.srcport,
      destinationIp: alert.data?.dstip,
      destinationPort: alert.data?.dstport,
      protocol: alert.data?.protocol,
    };
  }

  private extractProcessInfo(alert: WazuhAlert): ProcessInfo {
    return {
      name: alert.data?.process_name,
      pid: alert.data?.pid,
      ppid: alert.data?.ppid,
      commandLine: alert.data?.command,
      user: alert.data?.srcuser,
      hashes: {
        md5: alert.data?.md5,
        sha1: alert.data?.sha1,
        sha256: alert.data?.sha256,
      },
    };
  }

  private extractFileInfo(alert: WazuhAlert): FileInfo {
    const path = alert.data?.filename || alert.syscheck?.path;
    const fileName = path
      ? path.split('/').pop() || path.split('\\').pop()
      : undefined;

    return {
      name: fileName,
      path: path,
      hashes: {
        md5: alert.data?.md5,
        sha1: alert.data?.sha1,
        sha256: alert.data?.sha256,
      },
    };
  }

  private extractThreatInfo(alert: WazuhAlert): ThreatInfo {
    const techniques: MitreTechnique[] = [];
    const tactics: MitreTactic[] = [];

    if (alert.rule.mitre) {
      // Map MITRE technique IDs to techniques
      if (alert.rule.mitre.id && alert.rule.mitre.technique) {
        alert.rule.mitre.id.forEach((id, index) => {
          techniques.push({
            id: id,
            name: alert.rule.mitre?.technique[index] || '',
            confidence: 0.8, // High confidence from Wazuh rules
          });
        });
      }

      // Map MITRE tactic names to tactics
      if (alert.rule.mitre.tactic) {
        alert.rule.mitre.tactic.forEach((tactic) => {
          tactics.push({
            id: this.mapTacticNameToId(tactic),
            name: tactic,
          });
        });
      }
    }

    return {
      techniques: techniques.length > 0 ? techniques : undefined,
      tactics: tactics.length > 0 ? tactics : undefined,
      severity: this.severityMapping[alert.rule.level] || 'low',
      confidence: 0.8,
      description: alert.rule.description,
    };
  }

  private categorizeFromGroups(groups?: string[]): string {
    if (!groups) return 'host';

    const groupStr = groups.join(',').toLowerCase();

    if (groupStr.includes('authentication') || groupStr.includes('auth'))
      return 'authentication';
    if (groupStr.includes('network') || groupStr.includes('firewall'))
      return 'network';
    if (
      groupStr.includes('web') ||
      groupStr.includes('apache') ||
      groupStr.includes('nginx')
    )
      return 'web';
    if (groupStr.includes('file') || groupStr.includes('syscheck'))
      return 'file';
    if (groupStr.includes('process') || groupStr.includes('execution'))
      return 'process';
    if (groupStr.includes('registry')) return 'registry';
    if (groupStr.includes('malware') || groupStr.includes('rootkit'))
      return 'malware';

    return 'host';
  }

  private getActionFromRule(rule: any): string {
    const description = rule.description.toLowerCase();

    if (description.includes('login') || description.includes('logon'))
      return 'login';
    if (description.includes('logout') || description.includes('logoff'))
      return 'logout';
    if (description.includes('authentication')) return 'authentication';
    if (description.includes('connection')) return 'connection';
    if (description.includes('created')) return 'creation';
    if (description.includes('deleted')) return 'deletion';
    if (description.includes('modified')) return 'modification';
    if (description.includes('executed') || description.includes('execution'))
      return 'execution';
    if (description.includes('attack') || description.includes('intrusion'))
      return 'attack';
    if (description.includes('denied') || description.includes('blocked'))
      return 'denied';

    return 'detection';
  }

  private getOutcomeFromLevel(
    level: number
  ): 'success' | 'failure' | 'unknown' {
    if (level >= 10) return 'failure'; // High/critical level indicates security issue
    if (level >= 5) return 'unknown'; // Medium level is uncertain
    return 'success'; // Low level is generally informational
  }

  private mapToECSCategory(category: string): string[] {
    const mapping: Record<string, string[]> = {
      authentication: ['authentication'],
      network: ['network'],
      web: ['web'],
      file: ['file'],
      process: ['process'],
      registry: ['registry'],
      malware: ['malware'],
      host: ['host'],
    };
    return mapping[category] || ['host'];
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      login: ['start'],
      logout: ['end'],
      authentication: ['start'],
      connection: ['connection'],
      creation: ['creation'],
      deletion: ['deletion'],
      modification: ['change'],
      execution: ['start'],
      attack: ['start'],
      denied: ['denied'],
      detection: ['info'],
    };
    return mapping[action] || ['info'];
  }

  private mapSeverityToNumber(severity: string): number {
    const mapping: Record<string, number> = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100,
    };
    return mapping[severity] || 25;
  }

  private calculateRiskScore(event: ParsedEvent): number {
    let riskScore = (event.custom?.rule_level as number) * 6.67; // Scale 0-15 to 0-100

    // Adjust based on category
    if (event.category === 'authentication' || event.category === 'malware') {
      riskScore += 10;
    }

    // Adjust for MITRE ATT&CK presence
    if (event.threat?.techniques?.length) {
      riskScore += 15;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.8; // Base confidence for Wazuh rules

    // Increase for structured data
    if (event.user || event.network || event.process) {
      confidence += 0.1;
    }

    // Increase for MITRE ATT&CK mapping
    if (event.threat?.techniques?.length) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  private mapTacticNameToId(tacticName: string): string {
    const mapping: Record<string, string> = {
      'Initial Access': 'TA0001',
      Execution: 'TA0002',
      Persistence: 'TA0003',
      'Privilege Escalation': 'TA0004',
      'Defense Evasion': 'TA0005',
      'Credential Access': 'TA0006',
      Discovery: 'TA0007',
      'Lateral Movement': 'TA0008',
      Collection: 'TA0009',
      'Command and Control': 'TA0011',
      Exfiltration: 'TA0010',
      Impact: 'TA0040',
    };
    return mapping[tacticName] || 'TA0000';
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['wazuh', 'ossec', 'siem'];

    if (event.custom?.rule_groups) {
      tags.push(...(event.custom.rule_groups as string[]));
    }

    if (event.threat?.techniques?.length) {
      tags.push('mitre-attack');
    }

    return tags;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.network?.sourceIp) ips.push(event.network.sourceIp);
    if (event.network?.destinationIp) ips.push(event.network.destinationIp);
    if (event.device?.ip) ips.push(...event.device.ip);

    return [...new Set(ips)]; // Remove duplicates
  }

  private getRelatedUsers(event: ParsedEvent): string[] {
    const users: string[] = [];

    if (event.user?.name) users.push(event.user.name);
    if (event.process?.user) users.push(event.process.user);

    return [...new Set(users)]; // Remove duplicates
  }

  private getRelatedHashes(event: ParsedEvent): string[] {
    const hashes: string[] = [];

    if (event.process?.hashes?.md5) hashes.push(event.process.hashes.md5);
    if (event.process?.hashes?.sha1) hashes.push(event.process.hashes.sha1);
    if (event.process?.hashes?.sha256) hashes.push(event.process.hashes.sha256);
    if (event.file?.hashes?.md5) hashes.push(event.file.hashes.md5);
    if (event.file?.hashes?.sha1) hashes.push(event.file.hashes.sha1);
    if (event.file?.hashes?.sha256) hashes.push(event.file.hashes.sha256);

    return [...new Set(hashes)]; // Remove duplicates
  }
}
