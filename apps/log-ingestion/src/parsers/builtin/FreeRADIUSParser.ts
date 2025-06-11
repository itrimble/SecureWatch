// FreeRADIUS Parser
// Handles FreeRADIUS detail files and radius.log with AAA event normalization

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  DeviceInfo,
  NetworkInfo,
  AuthenticationInfo,
} from '../types';

interface FreeRADIUSEvent {
  timestamp?: Date;
  packet_type?: string;
  user_name?: string;
  realm?: string;
  nas_ip_address?: string;
  nas_port?: string;
  nas_port_type?: string;
  called_station_id?: string;
  calling_station_id?: string;
  framed_ip_address?: string;
  framed_protocol?: string;
  service_type?: string;
  auth_type?: string;
  acct_status_type?: string;
  acct_session_id?: string;
  acct_session_time?: number;
  acct_input_octets?: number;
  acct_output_octets?: number;
  acct_input_packets?: number;
  acct_output_packets?: number;
  acct_delay_time?: number;
  reply_message?: string;
  class?: string;
  session_timeout?: number;
  idle_timeout?: number;
  termination_cause?: string;
  vendor_specific?: Record<string, string>;
}

export class FreeRADIUSParser implements LogParser {
  id = 'freeradius';
  name = 'FreeRADIUS Parser';
  vendor = 'FreeRADIUS Project';
  logSource = 'freeradius';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'authentication' as const;
  priority = 80; // High priority for AAA events
  enabled = true;

  // FreeRADIUS packet types to action mapping
  private readonly packetTypeMapping: Record<string, string> = {
    'Access-Request': 'authentication_request',
    'Access-Accept': 'authentication_success',
    'Access-Reject': 'authentication_failure',
    'Access-Challenge': 'authentication_challenge',
    'Accounting-Request': 'accounting_request',
    'Accounting-Response': 'accounting_response',
    'Status-Server': 'status_check',
    'Status-Client': 'status_check',
    'CoA-Request': 'change_of_authorization',
    'CoA-ACK': 'change_of_authorization_success',
    'CoA-NAK': 'change_of_authorization_failure',
    'Disconnect-Request': 'disconnect_request',
    'Disconnect-ACK': 'disconnect_success',
    'Disconnect-NAK': 'disconnect_failure',
  };

  // Service type mapping for network access context
  private readonly serviceTypeMapping: Record<string, string> = {
    'Login-User': 'login',
    'Framed-User': 'network_access',
    'Callback-Login-User': 'callback_login',
    'Callback-Framed-User': 'callback_framed',
    'Outbound-User': 'outbound',
    'Administrative-User': 'administrative',
    'NAS-Prompt-User': 'nas_prompt',
    'Authenticate-Only': 'authentication_only',
    'Callback-NAS-Prompt': 'callback_nas_prompt',
    'Call-Check': 'call_check',
    'Callback-Administrative': 'callback_administrative',
  };

  validate(rawLog: string): boolean {
    // Check for FreeRADIUS detail file format
    const detailPatterns = [
      /^\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4}$/m, // Detail timestamp
      /User-Name\s*=\s*"[^"]+"/,
      /NAS-IP-Address\s*=\s*[\d.]+/,
      /Packet-Type\s*=\s*(Access-Request|Access-Accept|Access-Reject|Accounting-Request)/,
      /Called-Station-Id\s*=\s*"[^"]+"/,
      /Calling-Station-Id\s*=\s*"[^"]+"/,
    ];

    // Check for radius.log format
    const logPatterns = [
      /\b(Access-Request|Access-Accept|Access-Reject|Accounting-Request)\b/,
      /radius\[\d+\]:/i,
      /Auth:|Login:|Info:|Error:/i,
      /from\s+client\s+[\w.-]+/i,
      /for\s+user\s+[\w@.-]+/i,
      /NAS\s+[\d.]+\s+port\s+\d+/i,
    ];

    // Check for any pattern match
    const hasDetailFormat = detailPatterns.some((pattern) =>
      pattern.test(rawLog)
    );
    const hasLogFormat = logPatterns.some((pattern) => pattern.test(rawLog));

    return hasDetailFormat || hasLogFormat;
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Detect format and parse accordingly
      if (this.isDetailFormat(rawLog)) {
        return this.parseDetailFormat(rawLog);
      } else if (this.isRadiusLogFormat(rawLog)) {
        return this.parseRadiusLogFormat(rawLog);
      }

      return null;
    } catch (error) {
      console.error('FreeRADIUS parsing error:', error);
      return null;
    }
  }

  private isDetailFormat(rawLog: string): boolean {
    return (
      /^\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4}$/m.test(rawLog) ||
      /User-Name\s*=\s*"[^"]+"/.test(rawLog)
    );
  }

  private isRadiusLogFormat(rawLog: string): boolean {
    return (
      /radius\[\d+\]:/i.test(rawLog) ||
      /(Auth:|Login:|Info:|Error:)/i.test(rawLog)
    );
  }

  private parseDetailFormat(rawLog: string): ParsedEvent | null {
    const radiusEvent: FreeRADIUSEvent = {};

    // Parse timestamp from detail format
    const timestampMatch = rawLog.match(
      /^(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})/m
    );
    if (timestampMatch) {
      radiusEvent.timestamp = new Date(timestampMatch[1]);
    } else {
      radiusEvent.timestamp = new Date();
    }

    // Parse RADIUS attributes
    const attributes = this.parseRADIUSAttributes(rawLog);
    Object.assign(radiusEvent, attributes);

    return this.createEventFromRADIUSData(radiusEvent, rawLog);
  }

  private parseRadiusLogFormat(rawLog: string): ParsedEvent | null {
    const radiusEvent: FreeRADIUSEvent = {};

    // Extract timestamp
    const timestampMatch = rawLog.match(
      /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/
    );
    if (timestampMatch) {
      const currentYear = new Date().getFullYear();
      radiusEvent.timestamp = new Date(`${timestampMatch[1]} ${currentYear}`);
    } else {
      radiusEvent.timestamp = new Date();
    }

    // Extract user information
    const userMatch = rawLog.match(/(?:user\s+|for\s+)([^\s,]+)/i);
    if (userMatch) {
      radiusEvent.user_name = userMatch[1];
    }

    // Extract NAS information
    const nasMatch = rawLog.match(/(?:from\s+client\s+|NAS\s+)([\d.]+)/i);
    if (nasMatch) {
      radiusEvent.nas_ip_address = nasMatch[1];
    }

    // Extract port information
    const portMatch = rawLog.match(/port\s+(\d+)/i);
    if (portMatch) {
      radiusEvent.nas_port = portMatch[1];
    }

    // Determine packet type from message
    if (/Access-Request/i.test(rawLog)) {
      radiusEvent.packet_type = 'Access-Request';
    } else if (/Access-Accept/i.test(rawLog)) {
      radiusEvent.packet_type = 'Access-Accept';
    } else if (/Access-Reject/i.test(rawLog)) {
      radiusEvent.packet_type = 'Access-Reject';
    } else if (/Accounting-Request/i.test(rawLog)) {
      radiusEvent.packet_type = 'Accounting-Request';
    }

    return this.createEventFromRADIUSData(radiusEvent, rawLog);
  }

  private parseRADIUSAttributes(rawLog: string): Partial<FreeRADIUSEvent> {
    const attributes: Partial<FreeRADIUSEvent> = {};

    // Parse key-value pairs
    const attributePattern = /(\w+(?:-\w+)*)\s*=\s*(?:"([^"]*)"|(\S+))/g;
    let match;

    while ((match = attributePattern.exec(rawLog)) !== null) {
      const attrName = match[1];
      const attrValue = match[2] || match[3];

      switch (attrName) {
        case 'User-Name':
          attributes.user_name = attrValue;
          break;
        case 'Realm':
          attributes.realm = attrValue;
          break;
        case 'NAS-IP-Address':
          attributes.nas_ip_address = attrValue;
          break;
        case 'NAS-Port':
          attributes.nas_port = attrValue;
          break;
        case 'NAS-Port-Type':
          attributes.nas_port_type = attrValue;
          break;
        case 'Called-Station-Id':
          attributes.called_station_id = attrValue;
          break;
        case 'Calling-Station-Id':
          attributes.calling_station_id = attrValue;
          break;
        case 'Framed-IP-Address':
          attributes.framed_ip_address = attrValue;
          break;
        case 'Framed-Protocol':
          attributes.framed_protocol = attrValue;
          break;
        case 'Service-Type':
          attributes.service_type = attrValue;
          break;
        case 'Auth-Type':
          attributes.auth_type = attrValue;
          break;
        case 'Packet-Type':
          attributes.packet_type = attrValue;
          break;
        case 'Acct-Status-Type':
          attributes.acct_status_type = attrValue;
          break;
        case 'Acct-Session-Id':
          attributes.acct_session_id = attrValue;
          break;
        case 'Acct-Session-Time':
          attributes.acct_session_time = parseInt(attrValue, 10);
          break;
        case 'Acct-Input-Octets':
          attributes.acct_input_octets = parseInt(attrValue, 10);
          break;
        case 'Acct-Output-Octets':
          attributes.acct_output_octets = parseInt(attrValue, 10);
          break;
        case 'Acct-Input-Packets':
          attributes.acct_input_packets = parseInt(attrValue, 10);
          break;
        case 'Acct-Output-Packets':
          attributes.acct_output_packets = parseInt(attrValue, 10);
          break;
        case 'Reply-Message':
          attributes.reply_message = attrValue;
          break;
        case 'Class':
          attributes.class = attrValue;
          break;
        case 'Session-Timeout':
          attributes.session_timeout = parseInt(attrValue, 10);
          break;
        case 'Idle-Timeout':
          attributes.idle_timeout = parseInt(attrValue, 10);
          break;
        case 'Acct-Terminate-Cause':
          attributes.termination_cause = attrValue;
          break;
      }
    }

    return attributes;
  }

  private createEventFromRADIUSData(
    radiusEvent: FreeRADIUSEvent,
    rawLog: string
  ): ParsedEvent {
    const action = this.getActionFromPacketType(radiusEvent.packet_type);
    const severity = this.getSeverityFromEvent(radiusEvent);
    const outcome = this.getOutcomeFromEvent(radiusEvent);

    const event: ParsedEvent = {
      timestamp: radiusEvent.timestamp || new Date(),
      source: radiusEvent.nas_ip_address || 'freeradius',
      category: 'authentication',
      action,
      outcome,
      severity,
      rawData: rawLog,
      custom: {
        packet_type: radiusEvent.packet_type,
        user_name: radiusEvent.user_name,
        realm: radiusEvent.realm,
        nas_ip_address: radiusEvent.nas_ip_address,
        nas_port: radiusEvent.nas_port,
        nas_port_type: radiusEvent.nas_port_type,
        called_station_id: radiusEvent.called_station_id,
        calling_station_id: radiusEvent.calling_station_id,
        service_type: radiusEvent.service_type,
        auth_type: radiusEvent.auth_type,
        acct_status_type: radiusEvent.acct_status_type,
        acct_session_id: radiusEvent.acct_session_id,
        acct_session_time: radiusEvent.acct_session_time,
        acct_input_octets: radiusEvent.acct_input_octets,
        acct_output_octets: radiusEvent.acct_output_octets,
        reply_message: radiusEvent.reply_message,
        termination_cause: radiusEvent.termination_cause,
      },
    };

    // Extract user information
    if (radiusEvent.user_name) {
      event.user = this.extractUserInfo(radiusEvent);
    }

    // Extract device information
    event.device = this.extractDeviceInfo(radiusEvent);

    // Extract network information
    if (radiusEvent.framed_ip_address || radiusEvent.nas_ip_address) {
      event.network = this.extractNetworkInfo(radiusEvent);
    }

    // Extract authentication information
    event.authentication = this.extractAuthenticationInfo(radiusEvent);

    return event;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['authentication', 'network'],
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.risk_score': this.calculateRiskScore(event),
      'event.provider': 'freeradius',
      'event.dataset': 'freeradius.auth',
      'event.module': 'freeradius',

      // Host/NAS information
      'host.name': event.source,
      'host.ip': event.custom?.nas_ip_address,

      // User information
      ...(event.user && {
        'user.name': event.user.name,
        'user.domain': event.user.domain,
      }),

      // Network information
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'destination.ip': event.network.destinationIp,
      }),

      // Authentication information
      ...(event.authentication && {
        'user.name': event.authentication.user,
        'authentication.method': event.authentication.method,
        'authentication.result': event.authentication.result,
      }),

      // FreeRADIUS-specific fields
      'radius.packet.type': event.custom?.packet_type,
      'radius.user.name': event.custom?.user_name,
      'radius.user.realm': event.custom?.realm,
      'radius.nas.ip_address': event.custom?.nas_ip_address,
      'radius.nas.port': event.custom?.nas_port,
      'radius.nas.port_type': event.custom?.nas_port_type,
      'radius.called_station_id': event.custom?.called_station_id,
      'radius.calling_station_id': event.custom?.calling_station_id,
      'radius.service.type': event.custom?.service_type,
      'radius.auth.type': event.custom?.auth_type,
      'radius.accounting.status_type': event.custom?.acct_status_type,
      'radius.accounting.session_id': event.custom?.acct_session_id,
      'radius.accounting.session_time': event.custom?.acct_session_time,
      'radius.accounting.input_octets': event.custom?.acct_input_octets,
      'radius.accounting.output_octets': event.custom?.acct_output_octets,
      'radius.reply.message': event.custom?.reply_message,
      'radius.termination.cause': event.custom?.termination_cause,

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message: this.buildMessage(event),
      labels: {
        packet_type: event.custom?.packet_type,
        user_name: event.custom?.user_name,
        nas_ip: event.custom?.nas_ip_address,
        service_type: event.custom?.service_type,
        log_source: 'freeradius',
      },

      // Related fields for correlation
      'related.ip': this.getRelatedIPs(event),
      'related.user': this.getRelatedUsers(event),
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private extractUserInfo(radiusEvent: FreeRADIUSEvent): UserInfo {
    const username = radiusEvent.user_name || '';
    const parts = username.split('@');

    return {
      name: parts[0],
      domain: parts.length > 1 ? parts[1] : radiusEvent.realm,
      fullName: radiusEvent.user_name,
    };
  }

  private extractDeviceInfo(radiusEvent: FreeRADIUSEvent): DeviceInfo {
    return {
      name: 'radius-nas',
      hostname: radiusEvent.nas_ip_address,
      ip: radiusEvent.nas_ip_address ? [radiusEvent.nas_ip_address] : undefined,
      type: 'server',
    };
  }

  private extractNetworkInfo(radiusEvent: FreeRADIUSEvent): NetworkInfo {
    return {
      sourceIp: radiusEvent.calling_station_id?.match(/[\d.]+/)?.[0],
      destinationIp: radiusEvent.framed_ip_address,
    };
  }

  private extractAuthenticationInfo(
    radiusEvent: FreeRADIUSEvent
  ): AuthenticationInfo {
    return {
      user: radiusEvent.user_name,
      method: radiusEvent.auth_type || 'radius',
      result: this.getAuthResultFromPacketType(radiusEvent.packet_type),
      sessionId: radiusEvent.acct_session_id,
    };
  }

  private getActionFromPacketType(packetType?: string): string {
    if (!packetType) return 'radius_event';
    return this.packetTypeMapping[packetType] || 'radius_event';
  }

  private getSeverityFromEvent(
    radiusEvent: FreeRADIUSEvent
  ): 'low' | 'medium' | 'high' | 'critical' {
    // High severity for authentication failures
    if (radiusEvent.packet_type === 'Access-Reject') {
      return 'high';
    }

    // Medium severity for challenges and CoA events
    if (
      radiusEvent.packet_type?.includes('Challenge') ||
      radiusEvent.packet_type?.includes('CoA') ||
      radiusEvent.packet_type?.includes('Disconnect')
    ) {
      return 'medium';
    }

    // Low severity for successful authentication and accounting
    return 'low';
  }

  private getOutcomeFromEvent(
    radiusEvent: FreeRADIUSEvent
  ): 'success' | 'failure' | 'unknown' {
    if (!radiusEvent.packet_type) return 'unknown';

    if (
      radiusEvent.packet_type.includes('Accept') ||
      radiusEvent.packet_type.includes('ACK')
    ) {
      return 'success';
    }

    if (
      radiusEvent.packet_type.includes('Reject') ||
      radiusEvent.packet_type.includes('NAK')
    ) {
      return 'failure';
    }

    return 'unknown';
  }

  private getAuthResultFromPacketType(packetType?: string): string {
    if (!packetType) return 'unknown';

    if (packetType.includes('Accept')) return 'success';
    if (packetType.includes('Reject')) return 'failure';
    if (packetType.includes('Challenge')) return 'challenge';

    return 'unknown';
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      authentication_request: ['start'],
      authentication_success: ['allowed'],
      authentication_failure: ['denied'],
      authentication_challenge: ['start'],
      accounting_request: ['info'],
      accounting_response: ['info'],
      change_of_authorization: ['change'],
      disconnect_request: ['end'],
      radius_event: ['info'],
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
    let riskScore = 20; // Base score for AAA events

    // Increase for authentication failures
    if (event.action === 'authentication_failure') {
      riskScore += 30;
    }

    // Increase for administrative access
    if (event.custom?.service_type === 'Administrative-User') {
      riskScore += 20;
    }

    // Increase for multiple failed attempts (if detectable)
    if (event.custom?.reply_message?.toLowerCase().includes('too many')) {
      riskScore += 25;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.75; // Base confidence for RADIUS parsing

    // Increase for structured data
    if (event.custom?.user_name) confidence += 0.1;
    if (event.custom?.nas_ip_address) confidence += 0.05;
    if (event.custom?.packet_type) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['freeradius', 'radius', 'aaa'];

    if (event.custom?.packet_type) {
      tags.push(
        `packet-${event.custom.packet_type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.custom?.service_type) {
      tags.push(
        `service-${event.custom.service_type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.action?.includes('failure')) {
      tags.push('auth-failure');
    }

    return tags;
  }

  private buildMessage(event: ParsedEvent): string {
    const user = event.custom?.user_name || 'unknown';
    const packetType = event.custom?.packet_type || 'RADIUS event';
    const nas = event.custom?.nas_ip_address || 'unknown NAS';

    return `FreeRADIUS ${packetType} for user "${user}" from NAS ${nas}`;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.custom?.nas_ip_address)
      ips.push(event.custom.nas_ip_address as string);
    if (event.custom?.framed_ip_address)
      ips.push(event.custom.framed_ip_address as string);
    if (event.network?.sourceIp) ips.push(event.network.sourceIp);
    if (event.network?.destinationIp) ips.push(event.network.destinationIp);

    return [...new Set(ips)];
  }

  private getRelatedUsers(event: ParsedEvent): string[] {
    const users: string[] = [];

    if (event.user?.name) users.push(event.user.name);
    if (event.custom?.user_name) users.push(event.custom.user_name as string);

    return [...new Set(users)];
  }
}
