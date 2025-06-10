// OpenVPN Parser
// Handles OpenVPN Access Server logs and status logs with VPN session tracking

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  DeviceInfo,
  NetworkInfo,
  AuthenticationInfo,
} from '../types';

export class OpenVPNParser implements LogParser {
  id = 'openvpn';
  name = 'OpenVPN Parser';
  vendor = 'OpenVPN Inc.';
  logSource = 'openvpn';
  version = '1.0.0';
  format = 'syslog' as const;
  category = 'network' as const;
  priority = 75; // High priority for VPN events
  enabled = true;

  // OpenVPN log levels to severity mapping
  private readonly severityMapping: Record<
    string,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    VERB: 'low',
    INFO: 'low',
    NOTICE: 'medium',
    WARNING: 'medium',
    ERROR: 'high',
    FATAL: 'critical',
    DEBUG: 'low',
  };

  validate(rawLog: string): boolean {
    // Check for OpenVPN log patterns
    const patterns = [
      /OpenVPN/i,
      /\b(?:TCP|UDP)\/(\d{1,3}\.){3}\d{1,3}:\d+/,
      /MANAGEMENT:/,
      /TLS.*handshake/,
      /peer info:/,
      /VERIFY OK/,
      /Data Channel Encrypt:/,
      /Data Channel Decrypt:/,
      /PLUGIN_CALL:/,
      /AUTH_FAILED/,
      /TLS_ERROR/,
      /CLIENT_CONNECT/,
      /CLIENT_DISCONNECT/,
      /MULTI:/,
    ];

    return patterns.some((pattern) => pattern.test(rawLog));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Parse timestamp and extract basic log structure
      const logData = this.parseLogStructure(rawLog);
      if (!logData) return null;

      // Determine event type and extract specific data
      const eventType = this.determineEventType(rawLog);
      const eventData = this.extractEventData(rawLog, eventType);

      const event: ParsedEvent = {
        timestamp: logData.timestamp,
        source: logData.hostname || 'openvpn-server',
        category: this.getCategoryFromEventType(eventType),
        action: this.getActionFromEventType(eventType),
        outcome: this.getOutcomeFromLog(rawLog),
        severity: this.getSeverityFromLog(rawLog),
        rawData: rawLog,
        custom: {
          event_type: eventType,
          log_level: logData.level,
          process_id: logData.pid,
          thread_id: eventData.thread_id,
          session_id: eventData.session_id,
          client_id: eventData.client_id,
          protocol: eventData.protocol,
          cipher: eventData.cipher,
          auth_method: eventData.auth_method,
          compression: eventData.compression,
          bytes_sent: eventData.bytes_sent,
          bytes_received: eventData.bytes_received,
          duration: eventData.duration,
          reason: eventData.reason,
        },
      };

      // Extract user information
      if (eventData.username) {
        event.user = this.extractUserInfo(eventData);
      }

      // Extract device information
      event.device = this.extractDeviceInfo(eventData, logData);

      // Extract network information
      if (eventData.client_ip || eventData.server_ip || eventData.virtual_ip) {
        event.network = this.extractNetworkInfo(eventData);
      }

      // Extract authentication information
      if (
        eventType.includes('AUTH') ||
        eventType.includes('LOGIN') ||
        eventType.includes('CONNECT')
      ) {
        event.authentication = this.extractAuthInfo(eventData, eventType);
      }

      return event;
    } catch (error) {
      console.error('OpenVPN parsing error:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': this.mapToECSCategory(event.category),
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.provider': 'openvpn',
      'event.dataset': 'openvpn.server',
      'event.module': 'openvpn',

      // Host information
      'host.name': event.source,
      'host.hostname': event.source,

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
        'network.transport': event.network.transport,
        'network.bytes': event.network.bytes,
        'network.direction': event.network.direction,
      }),

      // Authentication information
      ...(event.authentication && {
        'authentication.type': event.authentication.type,
        'authentication.success': event.authentication.success,
        'authentication.failure_reason': event.authentication.failureReason,
        'authentication.method': event.authentication.method,
      }),

      // OpenVPN-specific fields
      'openvpn.event_type': event.custom?.event_type,
      'openvpn.session.id': event.custom?.session_id,
      'openvpn.client.id': event.custom?.client_id,
      'openvpn.protocol': event.custom?.protocol,
      'openvpn.cipher': event.custom?.cipher,
      'openvpn.compression': event.custom?.compression,
      'openvpn.auth_method': event.custom?.auth_method,

      // Session metrics
      ...(event.custom?.bytes_sent && {
        'openvpn.session.bytes_sent': event.custom.bytes_sent,
      }),
      ...(event.custom?.bytes_received && {
        'openvpn.session.bytes_received': event.custom.bytes_received,
      }),
      ...(event.custom?.duration && {
        'openvpn.session.duration': event.custom.duration,
      }),

      // Process information
      ...(event.custom?.process_id && {
        'process.pid': event.custom.process_id,
      }),
      ...(event.custom?.thread_id && {
        'process.thread.id': event.custom.thread_id,
      }),

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message: this.getMessageFromEvent(event),
      labels: {
        event_type: event.custom?.event_type,
        protocol: event.custom?.protocol,
        log_source: 'openvpn',
        vpn_action: event.action,
      },

      // Related fields for correlation
      'related.ip': this.getRelatedIPs(event),
      'related.user': this.getRelatedUsers(event),
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private parseLogStructure(rawLog: string): {
    timestamp: Date;
    hostname?: string;
    level?: string;
    pid?: number;
    message: string;
  } | null {
    // Parse syslog format: timestamp hostname process[pid]: message
    const syslogPattern =
      /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\w+)(?:\[(\d+)\])?\s*:\s*(.*)$/;
    const match = rawLog.match(syslogPattern);

    if (match) {
      const [, timestamp, hostname, process, pid, message] = match;
      return {
        timestamp: this.parseTimestamp(timestamp),
        hostname,
        level: this.extractLogLevel(message),
        pid: pid ? parseInt(pid, 10) : undefined,
        message,
      };
    }

    // Fallback for non-syslog format
    return {
      timestamp: new Date(),
      message: rawLog,
      level: this.extractLogLevel(rawLog),
    };
  }

  private determineEventType(rawLog: string): string {
    const message = rawLog.toLowerCase();

    if (message.includes('client_connect')) return 'CLIENT_CONNECT';
    if (message.includes('client_disconnect')) return 'CLIENT_DISCONNECT';
    if (message.includes('auth_failed')) return 'AUTH_FAILED';
    if (message.includes('verify ok')) return 'AUTH_SUCCESS';
    if (message.includes('tls handshake')) return 'TLS_HANDSHAKE';
    if (message.includes('tls_error')) return 'TLS_ERROR';
    if (message.includes('management:')) return 'MANAGEMENT';
    if (message.includes('data channel')) return 'DATA_CHANNEL';
    if (message.includes('multi:')) return 'MULTI_CLIENT';
    if (message.includes('plugin_call')) return 'PLUGIN_EVENT';
    if (message.includes('peer info')) return 'PEER_INFO';

    return 'GENERAL';
  }

  private extractEventData(rawLog: string, eventType: string): any {
    const data: any = {};

    // Extract common patterns
    const ipPattern = /(\d{1,3}\.){3}\d{1,3}/g;
    const ips = rawLog.match(ipPattern) || [];

    // Extract client IP (usually first IP in log)
    if (ips.length > 0) {
      data.client_ip = ips[0];
    }

    // Extract server IP (usually second IP or destination)
    if (ips.length > 1) {
      data.server_ip = ips[1];
    }

    // Extract port numbers
    const portPattern = /:(\d+)/g;
    const ports = Array.from(rawLog.matchAll(portPattern)).map((m) =>
      parseInt(m[1], 10)
    );
    if (ports.length > 0) {
      data.client_port = ports[0];
    }

    // Extract protocol
    const protocolMatch = rawLog.match(/\b(TCP|UDP)\b/i);
    if (protocolMatch) {
      data.protocol = protocolMatch[1].toUpperCase();
    }

    // Extract username
    const usernamePatterns = [
      /user[:\s]+'([^']+)'/i,
      /username[:\s]+'([^']+)'/i,
      /peer info:\s*(\S+)/i,
      /AUTH.*user[:\s]+'([^']+)'/i,
    ];

    for (const pattern of usernamePatterns) {
      const match = rawLog.match(pattern);
      if (match) {
        data.username = match[1];
        break;
      }
    }

    // Extract session-specific data based on event type
    switch (eventType) {
      case 'CLIENT_CONNECT':
      case 'CLIENT_DISCONNECT':
        data.session_id = this.extractSessionId(rawLog);
        data.virtual_ip = this.extractVirtualIP(rawLog);
        data.bytes_sent = this.extractBytes(rawLog, 'sent');
        data.bytes_received = this.extractBytes(rawLog, 'received');
        data.duration = this.extractDuration(rawLog);
        break;

      case 'TLS_HANDSHAKE':
        data.cipher = this.extractCipher(rawLog);
        data.auth_method = this.extractAuthMethod(rawLog);
        break;

      case 'AUTH_FAILED':
        data.reason = this.extractFailureReason(rawLog);
        break;
    }

    // Extract thread/client ID
    const threadMatch = rawLog.match(/\[(\d+)\]/);
    if (threadMatch) {
      data.thread_id = parseInt(threadMatch[1], 10);
    }

    return data;
  }

  private extractUserInfo(eventData: any): UserInfo {
    return {
      name: eventData.username,
    };
  }

  private extractDeviceInfo(eventData: any, logData: any): DeviceInfo {
    return {
      name: eventData.client_ip || 'unknown',
      hostname: logData.hostname,
      ip: eventData.client_ip ? [eventData.client_ip] : undefined,
      type: 'unknown',
    };
  }

  private extractNetworkInfo(eventData: any): NetworkInfo {
    return {
      sourceIp: eventData.client_ip,
      sourcePort: eventData.client_port,
      destinationIp: eventData.server_ip,
      destinationPort: eventData.server_port || 1194, // Default OpenVPN port
      protocol: eventData.protocol?.toLowerCase() || 'udp',
      bytes:
        eventData.bytes_sent && eventData.bytes_received
          ? eventData.bytes_sent + eventData.bytes_received
          : undefined,
      direction: 'inbound',
    };
  }

  private extractAuthInfo(
    eventData: any,
    eventType: string
  ): AuthenticationInfo {
    return {
      type: 'vpn',
      method: eventData.auth_method || 'certificate',
      success: eventType.includes('SUCCESS') || eventType === 'CLIENT_CONNECT',
      failureReason: eventData.reason,
      sessionId: eventData.session_id,
    };
  }

  private getCategoryFromEventType(eventType: string): string {
    if (eventType.includes('AUTH') || eventType.includes('CONNECT'))
      return 'authentication';
    if (eventType.includes('TLS') || eventType.includes('DATA_CHANNEL'))
      return 'network';
    return 'network';
  }

  private getActionFromEventType(eventType: string): string {
    const mapping: Record<string, string> = {
      CLIENT_CONNECT: 'vpn_connect',
      CLIENT_DISCONNECT: 'vpn_disconnect',
      AUTH_FAILED: 'authentication_failed',
      AUTH_SUCCESS: 'authentication_success',
      TLS_HANDSHAKE: 'tls_handshake',
      TLS_ERROR: 'tls_error',
      DATA_CHANNEL: 'data_transmission',
      MANAGEMENT: 'management_action',
      MULTI_CLIENT: 'multi_client_event',
      PLUGIN_EVENT: 'plugin_action',
      PEER_INFO: 'peer_info',
    };

    return mapping[eventType] || 'vpn_event';
  }

  private getOutcomeFromLog(rawLog: string): 'success' | 'failure' | 'unknown' {
    const message = rawLog.toLowerCase();

    if (
      message.includes('failed') ||
      message.includes('error') ||
      message.includes('denied')
    ) {
      return 'failure';
    }

    if (
      message.includes('success') ||
      message.includes('connect') ||
      message.includes('verify ok')
    ) {
      return 'success';
    }

    return 'unknown';
  }

  private getSeverityFromLog(
    rawLog: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Extract log level
    const level = this.extractLogLevel(rawLog);
    return this.severityMapping[level] || 'low';
  }

  private extractLogLevel(message: string): string {
    const levelMatch = message.match(
      /\b(VERB|INFO|NOTICE|WARNING|ERROR|FATAL|DEBUG)\b/i
    );
    return levelMatch ? levelMatch[1].toUpperCase() : 'INFO';
  }

  private parseTimestamp(timestamp: string): Date {
    try {
      const currentYear = new Date().getFullYear();
      const fullTimestamp = `${currentYear} ${timestamp}`;
      return new Date(fullTimestamp);
    } catch {
      return new Date();
    }
  }

  private extractSessionId(rawLog: string): string | undefined {
    const sessionMatch = rawLog.match(/session[:\s]+([a-f0-9]+)/i);
    return sessionMatch ? sessionMatch[1] : undefined;
  }

  private extractVirtualIP(rawLog: string): string | undefined {
    const virtualIpMatch = rawLog.match(
      /virtual\s+ip[:\s]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i
    );
    return virtualIpMatch ? virtualIpMatch[1] : undefined;
  }

  private extractBytes(
    rawLog: string,
    direction: 'sent' | 'received'
  ): number | undefined {
    const pattern = new RegExp(`${direction}[:\\s]+(\\d+)`, 'i');
    const match = rawLog.match(pattern);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractDuration(rawLog: string): number | undefined {
    const durationMatch = rawLog.match(/duration[:\s]+(\d+)/i);
    return durationMatch ? parseInt(durationMatch[1], 10) : undefined;
  }

  private extractCipher(rawLog: string): string | undefined {
    const cipherMatch = rawLog.match(/cipher[:\s]+([A-Z0-9-]+)/i);
    return cipherMatch ? cipherMatch[1] : undefined;
  }

  private extractAuthMethod(rawLog: string): string | undefined {
    const authMatch = rawLog.match(/auth[:\s]+([a-z0-9-]+)/i);
    return authMatch ? authMatch[1] : undefined;
  }

  private extractFailureReason(rawLog: string): string | undefined {
    const reasonPatterns = [
      /reason[:\s]+([^,\n]+)/i,
      /failed[:\s]+([^,\n]+)/i,
      /error[:\s]+([^,\n]+)/i,
    ];

    for (const pattern of reasonPatterns) {
      const match = rawLog.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private mapToECSCategory(category: string): string[] {
    const mapping: Record<string, string[]> = {
      authentication: ['authentication'],
      network: ['network'],
      vpn: ['network'],
    };
    return mapping[category] || ['network'];
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      vpn_connect: ['connection', 'start'],
      vpn_disconnect: ['connection', 'end'],
      authentication_failed: ['start'],
      authentication_success: ['start'],
      tls_handshake: ['protocol'],
      tls_error: ['protocol'],
      data_transmission: ['protocol'],
      management_action: ['admin'],
      vpn_event: ['info'],
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

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.7; // Base confidence

    // Increase for structured data
    if (event.user?.name) confidence += 0.1;
    if (event.network?.sourceIp) confidence += 0.1;
    if (event.custom?.session_id) confidence += 0.05;
    if (event.custom?.protocol) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['openvpn', 'vpn', 'network'];

    if (event.custom?.event_type) {
      tags.push(event.custom.event_type.toLowerCase());
    }

    if (event.custom?.protocol) {
      tags.push(event.custom.protocol.toLowerCase());
    }

    return tags;
  }

  private getMessageFromEvent(event: ParsedEvent): string {
    const eventType = event.custom?.event_type as string;
    const username = event.user?.name;
    const clientIp = event.network?.sourceIp;

    if (eventType === 'CLIENT_CONNECT') {
      return `OpenVPN client connected: ${username || 'unknown'} from ${clientIp || 'unknown'}`;
    }

    if (eventType === 'CLIENT_DISCONNECT') {
      return `OpenVPN client disconnected: ${username || 'unknown'} from ${clientIp || 'unknown'}`;
    }

    if (eventType === 'AUTH_FAILED') {
      return `OpenVPN authentication failed: ${username || 'unknown'} from ${clientIp || 'unknown'}`;
    }

    return `OpenVPN ${event.action}: ${username || clientIp || 'unknown'}`;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.network?.sourceIp) ips.push(event.network.sourceIp);
    if (event.network?.destinationIp) ips.push(event.network.destinationIp);

    return [...new Set(ips)];
  }

  private getRelatedUsers(event: ParsedEvent): string[] {
    const users: string[] = [];

    if (event.user?.name) users.push(event.user.name);

    return [...new Set(users)];
  }
}
