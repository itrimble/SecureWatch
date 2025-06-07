import { LogParser, ParsedEvent, NormalizedEvent, ParserConfig, ParserMetadata } from '../types';

/**
 * Fortinet FortiGate Firewall Parser
 * 
 * Supports multiple FortiGate log types including:
 * - Traffic logs (type=traffic)
 * - UTM logs (type=utm)
 * - Event logs (type=event)
 * - Attack logs (type=attack)
 * - VPN logs (type=ipsec/vpn)
 * - Authentication logs (type=event with authentication events)
 * - Application Control logs (type=app-ctrl)
 * - URL Filtering logs (type=webfilter)
 * - DNS Filter logs (type=dns)
 * 
 * FortiGate logs use key-value pair format with structured fields.
 * Format: field1=value1 field2=value2 field3="quoted value" ...
 */
export class FortiGateFirewallParser implements LogParser {
  id = 'fortinet-fortigate-firewall';
  name = 'Fortinet FortiGate Firewall';
  vendor = 'Fortinet';
  logSource = 'fortinet_fortigate';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'network' as const;
  priority = 85; // High priority for specific vendor
  enabled = true;

  config: ParserConfig = {
    enabled: true,
    priority: 85,
    timeout: 5000,
    maxSize: 100000,
    patterns: ['type=traffic', 'type=utm', 'type=event', 'type=attack', 'type=ipsec', 'type=vpn'],
    fieldMappings: {
      'srcip': 'source.ip',
      'dstip': 'destination.ip',
      'srcport': 'source.port',
      'dstport': 'destination.port'
    },
    normalization: {
      timestampFormats: ['YYYY-MM-DD HH:mm:ss', 'epoch'],
      severityMapping: {
        'emergency': 'critical',
        'alert': 'critical',
        'critical': 'critical',
        'error': 'high',
        'warning': 'medium',
        'notice': 'medium',
        'information': 'low',
        'debug': 'low'
      },
      categoryMapping: {
        'traffic': 'network',
        'utm': 'malware',
        'event': 'configuration',
        'attack': 'intrusion_detection',
        'ipsec': 'network',
        'vpn': 'network'
      }
    },
    validation: {
      required: ['type', 'date', 'time'],
      optional: ['srcip', 'dstip', 'srcport', 'dstport', 'action', 'policyid'],
      formats: {
        'ip_address': /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
        'timestamp': /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/
      }
    }
  };

  metadata: ParserMetadata = {
    description: 'Parser for Fortinet FortiGate firewall logs including traffic, UTM, event, attack, and VPN logs',
    author: 'SecureWatch',
    tags: ['firewall', 'network-security', 'fortinet', 'fortigate', 'utm'],
    documentation: 'https://docs.fortinet.com/document/fortigate/7.0.0/administration-guide/254843/log-message-formats',
    supportedVersions: ['6.0+', '6.2+', '6.4+', '7.0+', '7.2+', '7.4+'],
    testCases: [
      {
        name: 'FortiGate Traffic Allow',
        input: 'date=2023-06-07 time=14:30:15 devname="FGT60E" devid="FG60E3U19000001" logid="0000000013" type="traffic" subtype="forward" level="notice" vd="root" eventtime=1686144615 srcip=192.168.1.100 srcport=12345 srcintf="port1" srcintfrole="lan" dstip=203.0.113.50 dstport=443 dstintf="port2" dstintfrole="wan" policyid=1 policytype="policy" service="HTTPS" proto=6 action="accept" policyname="LAN_to_WAN" sessionid=123456 appcat="unscanned" duration=30 sentbyte=1234 rcvdbyte=5678',
        expectedOutput: {
          'event.category': ['network'],
          'event.type': ['allowed', 'connection'],
          'event.action': 'accept',
          'source.ip': '192.168.1.100',
          'destination.ip': '203.0.113.50'
        },
        shouldPass: true
      },
      {
        name: 'FortiGate UTM Virus Detection',
        input: 'date=2023-06-07 time=14:30:15 devname="FGT60E" devid="FG60E3U19000001" logid="0419016384" type="utm" subtype="virus" eventtype="infected" level="warning" vd="root" eventtime=1686144615 srcip=192.168.1.100 srcport=12345 srcintf="port1" dstip=203.0.113.50 dstport=80 dstintf="port2" policyid=1 sessionid=123456 action="blocked" virus="Eicar-Test-Signature" dtype="File" checksum="275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f" filename="test.exe"',
        expectedOutput: {
          'event.category': ['malware'],
          'event.type': ['info'],
          'event.action': 'blocked',
          'threat.indicator.name': 'Eicar-Test-Signature',
          'source.ip': '192.168.1.100'
        },
        shouldPass: true
      },
      {
        name: 'FortiGate Attack IPS Block',
        input: 'date=2023-06-07 time=14:30:15 devname="FGT60E" devid="FG60E3U19000001" logid="0419016384" type="attack" subtype="ips" eventtype="signature" level="alert" vd="root" eventtime=1686144615 srcip=203.0.113.100 srcport=80 srcintf="port2" dstip=192.168.1.100 dstport=12345 dstintf="port1" policyid=1 action="dropped" attack="HTTP.URI.SQL.Injection" attackid=12345 severity="critical" ref="https://www.fortiguard.com/ids/rule/12345"',
        expectedOutput: {
          'event.category': ['intrusion_detection'],
          'event.type': ['info'],
          'event.action': 'dropped',
          'threat.indicator.name': 'HTTP.URI.SQL.Injection',
          'source.ip': '203.0.113.100'
        },
        shouldPass: true
      }
    ]
  };

  // FortiGate log type patterns and their categories
  private readonly logTypes = {
    traffic: {
      category: 'network',
      subtypes: ['forward', 'local', 'multicast', 'sniffer', 'anomaly']
    },
    utm: {
      category: 'malware',
      subtypes: ['virus', 'ips', 'app-ctrl', 'webfilter', 'emailfilter', 'dlp', 'file-filter', 'antispam']
    },
    event: {
      category: 'configuration',
      subtypes: ['system', 'user', 'endpoint', 'vpn', 'wad', 'wireless']
    },
    attack: {
      category: 'intrusion_detection',
      subtypes: ['ips', 'anomaly']
    },
    ipsec: {
      category: 'network',
      subtypes: ['phase1', 'phase2', 'tunnel']
    },
    vpn: {
      category: 'network',
      subtypes: ['ssl', 'l2tp', 'pptp']
    }
  };

  // Common FortiGate actions and their outcomes
  private readonly actionMappings = {
    'accept': 'success',
    'allow': 'success',
    'permit': 'success',
    'deny': 'failure',
    'block': 'failure',
    'blocked': 'failure',
    'drop': 'failure',
    'dropped': 'failure',
    'reset': 'failure',
    'close': 'failure'
  };

  validate(rawLog: string): boolean {
    if (!rawLog || typeof rawLog !== 'string') return false;

    // Check for FortiGate key-value format
    if (!this.hasKeyValueFormat(rawLog)) return false;

    // Must contain type field
    if (!rawLog.includes('type=')) return false;

    // Should contain common FortiGate fields
    const requiredFields = ['date=', 'time=', 'devname='];
    const hasRequired = requiredFields.some(field => rawLog.includes(field));
    
    if (!hasRequired) return false;

    // Check for valid log types
    const typeMatch = rawLog.match(/type="?(\w+)"?/);
    if (!typeMatch) return false;

    const logType = typeMatch[1];
    const validTypes = Object.keys(this.logTypes);
    
    return validTypes.includes(logType);
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      if (!this.validate(rawLog)) return null;

      const fields = this.parseKeyValuePairs(rawLog);
      const logType = fields.type;
      const subtype = fields.subtype;

      // Parse timestamp
      const timestamp = this.parseTimestamp(fields.date, fields.time, fields.eventtime);

      // Determine action and outcome
      const action = this.mapAction(fields.action, fields.eventtype, logType, subtype);
      const outcome = this.mapOutcome(fields.action, fields.eventtype);

      const event: ParsedEvent = {
        timestamp: timestamp,
        source: fields.srcip || fields.devname || 'fortinet-fortigate',
        category: this.mapCategory(logType),
        action: action,
        outcome: outcome,
        severity: this.mapSeverity(fields.level) as 'low' | 'medium' | 'high' | 'critical',
        rawData: rawLog,
        custom: {
          parsedFields: fields,
          confidence: this.calculateConfidence(fields),
          metadata: {
            parser: this.id,
            vendor: this.vendor,
            logType: logType,
            subtype: subtype,
            deviceName: fields.devname,
            deviceId: fields.devid,
            logId: fields.logid,
            virtualDomain: fields.vd
          }
        }
      };

      return event;
    } catch (error) {
      console.error(`FortiGate parser error:`, error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const fields = event.custom?.parsedFields || {};
    const logType = event.custom?.metadata?.logType;
    const subtype = event.custom?.metadata?.subtype;

    // Base ECS normalization
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': this.getEventCategory(logType, subtype),
      'event.type': this.getEventType(event.action, logType),
      'event.action': event.action,
      'event.outcome': event.outcome as 'success' | 'failure' | 'unknown',
      'event.severity': this.mapSeverityToNumber(fields.level),
      'event.dataset': `${this.logSource}.${logType}`,
      'event.module': 'fortinet',
      'event.provider': this.vendor,

      // Network fields
      'source.ip': fields.srcip,
      'source.port': this.parsePort(fields.srcport),
      'source.nat.ip': fields.tranip,
      'source.nat.port': this.parsePort(fields.tranport),
      'source.user.name': fields.user || fields.srcuser,

      'destination.ip': fields.dstip,
      'destination.port': this.parsePort(fields.dstport),
      'destination.nat.ip': fields.natip,
      'destination.nat.port': this.parsePort(fields.natport),
      'destination.user.name': fields.dstuser,

      'network.protocol': this.mapProtocol(fields.proto),
      'network.bytes': this.parseNumber(fields.sentbyte) + this.parseNumber(fields.rcvdbyte),
      'network.bytes_sent': this.parseNumber(fields.sentbyte),
      'network.bytes_received': this.parseNumber(fields.rcvdbyte),
      'network.packets': this.parseNumber(fields.sentpkt) + this.parseNumber(fields.rcvdpkt),
      'network.packets_sent': this.parseNumber(fields.sentpkt),
      'network.packets_received': this.parseNumber(fields.rcvdpkt),
      'network.application': fields.app || fields.service,

      // Observer (firewall) fields
      'observer.vendor': this.vendor,
      'observer.product': 'FortiGate',
      'observer.name': fields.devname,
      'observer.serial_number': fields.devid,
      'observer.ingress.interface.name': fields.srcintf,
      'observer.egress.interface.name': fields.dstintf,
      'observer.ingress.zone': fields.srcintfrole,
      'observer.egress.zone': fields.dstintfrole,

      // Rule and policy fields
      'rule.id': fields.policyid,
      'rule.name': fields.policyname,
      'rule.category': fields.policytype,

      // Session fields
      'network.session.id': fields.sessionid,
      'event.duration': this.parseNumber(fields.duration) * 1000000000, // convert to nanoseconds

      // URL and web fields
      'url.original': fields.url,
      'url.domain': fields.hostname,
      'http.request.method': fields.method,
      'user_agent.original': fields.agent,

      // File fields
      'file.name': fields.filename,
      'file.size': this.parseNumber(fields.filesize),
      'file.hash.sha256': fields.checksum,

      // User fields
      'user.name': fields.user || fields.uname,
      'user.group.name': fields.group ? [fields.group] : undefined,

      // SecureWatch specific fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': (event.custom?.confidence || 0.8) / 100,
      'securewatch.severity': this.mapSeverity(fields.level) as 'low' | 'medium' | 'high' | 'critical'
    };

    // Add threat-specific fields for UTM and attack logs
    if (logType === 'utm' || logType === 'attack') {
      Object.assign(normalized, {
        'threat.indicator.name': fields.virus || fields.attack || fields.botname,
        'threat.indicator.type': this.mapThreatType(subtype),
        'threat.software.name': fields.engine,
        'threat.technique.name': fields.attack ? [fields.attack] : undefined
      });

      // Add MITRE ATT&CK mapping for attacks
      if (logType === 'attack' && fields.attack) {
        const attackMapping = this.mapToMitreAttack(fields.attack);
        if (attackMapping) {
          Object.assign(normalized, attackMapping);
        }
      }
    }

    // Add VPN-specific fields
    if (logType === 'ipsec' || logType === 'vpn') {
      Object.assign(normalized, {
        'network.tunnel.id': fields.tunnelid,
        'network.tunnel.type': logType === 'ipsec' ? 'ipsec' : 'ssl_vpn'
      });
    }

    // Add authentication-specific fields for event logs
    if (logType === 'event' && this.isAuthenticationEvent(fields)) {
      Object.assign(normalized, {
        'authentication.type': fields.authproto,
        'authentication.success': this.isAuthSuccess(fields.status, fields.action),
        'authentication.failure_reason': fields.reason
      });
    }

    return normalized;
  }

  private hasKeyValueFormat(rawLog: string): boolean {
    // Check for key=value pattern
    const kvPattern = /\w+=("[^"]*"|\S+)/;
    return kvPattern.test(rawLog);
  }

  private parseKeyValuePairs(rawLog: string): any {
    const fields: any = {};
    
    // Match key=value or key="quoted value" patterns
    const kvPattern = /(\w+)=("([^"]*)"|([^\s]+))/g;
    let match;
    
    while ((match = kvPattern.exec(rawLog)) !== null) {
      const key = match[1];
      const value = match[3] || match[4]; // quoted or unquoted value
      fields[key] = value;
    }
    
    return fields;
  }

  private parseTimestamp(date?: string, time?: string, eventtime?: string): Date {
    if (eventtime) {
      // Unix epoch timestamp
      const epoch = parseInt(eventtime, 10);
      if (!isNaN(epoch)) {
        return new Date(epoch * 1000);
      }
    }
    
    if (date && time) {
      // Format: YYYY-MM-DD HH:mm:ss
      try {
        return new Date(`${date} ${time}`);
      } catch {
        // Fall through to default
      }
    }
    
    return new Date(); // Default to current time
  }

  private calculateConfidence(fields: any): number {
    let confidence = 80; // Base confidence for FortiGate logs

    // Known log types get higher confidence
    const logType = fields.type;
    if (this.logTypes[logType as keyof typeof this.logTypes]) {
      confidence += 10;
    }

    // Presence of key fields increases confidence
    const keyFields = ['srcip', 'dstip', 'action', 'policyid'];
    const presentFields = keyFields.filter(field => fields[field]);
    confidence += (presentFields.length / keyFields.length) * 10;

    return Math.min(confidence, 95);
  }

  private mapCategory(logType?: string): string {
    if (!logType) return 'network';
    
    const typeConfig = this.logTypes[logType as keyof typeof this.logTypes];
    return typeConfig?.category || 'network';
  }

  private mapAction(action?: string, eventtype?: string, logType?: string, subtype?: string): string {
    if (action) return action.toLowerCase();
    if (eventtype) return eventtype.toLowerCase();
    
    // Default actions based on log type and subtype
    if (logType === 'traffic') return 'traffic_flow';
    if (logType === 'utm') return `utm_${subtype || 'scan'}`;
    if (logType === 'attack') return 'attack_detected';
    if (logType === 'event') return 'system_event';
    
    return 'unknown';
  }

  private mapOutcome(action?: string, eventtype?: string): 'success' | 'failure' | 'unknown' {
    const actionToCheck = (action || eventtype || '').toLowerCase();
    
    if (this.actionMappings[actionToCheck as keyof typeof this.actionMappings]) {
      return this.actionMappings[actionToCheck as keyof typeof this.actionMappings] as 'success' | 'failure';
    }
    
    // Additional outcome mapping
    if (actionToCheck.includes('success') || actionToCheck.includes('allow') || actionToCheck.includes('accept')) {
      return 'success';
    }
    
    if (actionToCheck.includes('fail') || actionToCheck.includes('deny') || actionToCheck.includes('block') || 
        actionToCheck.includes('drop') || actionToCheck.includes('error')) {
      return 'failure';
    }
    
    return 'unknown';
  }

  private mapSeverity(level?: string): string {
    if (!level) return 'low';
    
    const levelLower = level.toLowerCase();
    switch (levelLower) {
      case 'emergency':
      case 'alert':
      case 'critical': return 'critical';
      case 'error': return 'high';
      case 'warning':
      case 'notice': return 'medium';
      case 'information':
      case 'debug': return 'low';
      default: return 'low';
    }
  }

  private mapSeverityToNumber(level?: string): number {
    if (!level) return 30;
    
    const levelLower = level.toLowerCase();
    switch (levelLower) {
      case 'emergency':
      case 'alert':
      case 'critical': return 90;
      case 'error': return 70;
      case 'warning':
      case 'notice': return 50;
      case 'information':
      case 'debug': return 30;
      default: return 30;
    }
  }

  private getEventCategory(logType?: string, subtype?: string): string[] {
    switch (logType) {
      case 'traffic': return ['network'];
      case 'utm':
        switch (subtype) {
          case 'virus': return ['malware'];
          case 'ips': return ['intrusion_detection'];
          case 'webfilter': return ['web'];
          case 'app-ctrl': return ['network'];
          default: return ['malware'];
        }
      case 'event': return ['configuration'];
      case 'attack': return ['intrusion_detection'];
      case 'ipsec':
      case 'vpn': return ['network'];
      default: return ['network'];
    }
  }

  private getEventType(action?: string, logType?: string): string[] {
    if (!action) return ['info'];
    
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('accept') || actionLower.includes('allow')) {
      return ['allowed', 'connection'];
    }
    
    if (actionLower.includes('deny') || actionLower.includes('block') || actionLower.includes('drop')) {
      return ['denied'];
    }
    
    if (actionLower.includes('detected') || actionLower.includes('found')) {
      return ['info'];
    }
    
    if (logType === 'traffic') {
      return ['connection'];
    }
    
    return ['info'];
  }

  private mapProtocol(proto?: string): string | undefined {
    if (!proto) return undefined;
    
    // FortiGate uses protocol numbers
    const protoNum = parseInt(proto, 10);
    if (!isNaN(protoNum)) {
      switch (protoNum) {
        case 1: return 'icmp';
        case 6: return 'tcp';
        case 17: return 'udp';
        case 47: return 'gre';
        case 50: return 'esp';
        case 51: return 'ah';
        default: return proto;
      }
    }
    
    return proto.toLowerCase();
  }

  private mapThreatType(subtype?: string): string {
    switch (subtype) {
      case 'virus': return 'malware-sample';
      case 'ips': return 'vulnerability';
      case 'webfilter': return 'url';
      case 'app-ctrl': return 'file';
      default: return 'unknown';
    }
  }

  private mapToMitreAttack(attackName?: string): any {
    if (!attackName) return null;

    // Basic MITRE ATT&CK mapping for common FortiGate attack signatures
    const mappings: { [key: string]: { technique: string; tactic: string } } = {
      'sql.injection': { technique: 'T1190', tactic: 'TA0001' },
      'cross.site.scripting': { technique: 'T1059', tactic: 'TA0002' },
      'command.injection': { technique: 'T1059', tactic: 'TA0002' },
      'buffer.overflow': { technique: 'T1068', tactic: 'TA0004' },
      'brute.force': { technique: 'T1110', tactic: 'TA0006' },
      'malware': { technique: 'T1204', tactic: 'TA0002' },
      'trojan': { technique: 'T1204', tactic: 'TA0002' },
      'backdoor': { technique: 'T1546', tactic: 'TA0003' }
    };

    const attackLower = attackName.toLowerCase();
    const mapping = Object.keys(mappings).find(k => attackLower.includes(k.replace('.', '')));
    
    if (mapping) {
      return {
        'threat.technique.id': [mappings[mapping].technique],
        'threat.technique.name': [attackName],
        'threat.tactic.id': [mappings[mapping].tactic]
      };
    }

    return null;
  }

  private isAuthenticationEvent(fields: any): boolean {
    const authFields = ['authproto', 'user', 'uname', 'logon', 'login', 'auth'];
    return authFields.some(field => fields[field]);
  }

  private isAuthSuccess(status?: string, action?: string): boolean {
    if (!status && !action) return false;
    
    const checkValue = (status || action || '').toLowerCase();
    return checkValue.includes('success') || checkValue.includes('accept') || 
           checkValue.includes('allow') || checkValue === 'ok';
  }

  private parsePort(portStr?: string): number | undefined {
    if (!portStr || portStr === '0') return undefined;
    const port = parseInt(portStr, 10);
    return isNaN(port) ? undefined : port;
  }

  private parseNumber(numStr?: string): number {
    if (!numStr || numStr === '') return 0;
    const num = parseInt(numStr, 10);
    return isNaN(num) ? 0 : num;
  }
}