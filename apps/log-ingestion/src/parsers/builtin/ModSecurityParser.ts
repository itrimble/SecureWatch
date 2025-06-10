// ModSecurity Parser
// Handles ModSecurity WAF logs in both JSON and audit log formats

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  NetworkInfo,
  URLInfo,
  DeviceInfo,
} from '../types';

interface ModSecurityJSONLog {
  transaction: {
    client_ip: string;
    client_port: number;
    host_ip: string;
    host_port: number;
    id: string;
    timestamp: string;
    request: {
      method: string;
      uri: string;
      http_version: string;
      headers: Record<string, string>;
      body?: string;
    };
    response: {
      status: number;
      headers: Record<string, string>;
      body?: string;
    };
    messages: Array<{
      message: string;
      details: {
        match: string;
        reference: string;
        ruleId: string;
        file: string;
        lineNumber: string;
        data: string;
        severity: string;
        ver: string;
        rev: string;
        tags: string[];
        maturity: string;
        accuracy: string;
      };
    }>;
  };
}

export class ModSecurityParser implements LogParser {
  id = 'modsecurity-waf';
  name = 'ModSecurity WAF Parser';
  vendor = 'Trustwave';
  logSource = 'modsecurity';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'web' as const;
  priority = 80; // High priority for WAF events
  enabled = true;

  // ModSecurity severity to numeric mapping
  private readonly severityMapping: Record<
    string,
    { level: 'low' | 'medium' | 'high' | 'critical'; score: number }
  > = {
    '0': { level: 'low', score: 10 },
    '1': { level: 'low', score: 20 },
    '2': { level: 'medium', score: 40 },
    '3': { level: 'medium', score: 50 },
    '4': { level: 'high', score: 70 },
    '5': { level: 'critical', score: 90 },
    EMERGENCY: { level: 'critical', score: 100 },
    ALERT: { level: 'critical', score: 95 },
    CRITICAL: { level: 'critical', score: 90 },
    ERROR: { level: 'high', score: 70 },
    WARNING: { level: 'medium', score: 50 },
    NOTICE: { level: 'medium', score: 40 },
    INFO: { level: 'low', score: 20 },
    DEBUG: { level: 'low', score: 10 },
  };

  validate(rawLog: string): boolean {
    // Check for JSON format
    if (rawLog.trim().startsWith('{')) {
      try {
        const data = JSON.parse(rawLog);
        return !!(
          data.transaction &&
          data.transaction.id &&
          data.transaction.client_ip
        );
      } catch {
        return false;
      }
    }

    // Check for audit log format
    const auditLogPatterns = [
      /--[a-f0-9]{8}-A--/, // Transaction start
      /--[a-f0-9]{8}-[B-Z]--/, // Other audit log sections
      /ModSecurity:/,
      /\[id "(\d+)"\]/,
    ];

    return auditLogPatterns.some((pattern) => pattern.test(rawLog));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Try JSON format first
      if (rawLog.trim().startsWith('{')) {
        return this.parseJSONFormat(rawLog);
      }

      // Fall back to audit log format
      return this.parseAuditLogFormat(rawLog);
    } catch (error) {
      console.error('ModSecurity parsing error:', error);
      return null;
    }
  }

  private parseJSONFormat(rawLog: string): ParsedEvent | null {
    try {
      const data: ModSecurityJSONLog = JSON.parse(rawLog);
      const transaction = data.transaction;

      // Get the highest severity message
      const primaryMessage = this.getPrimaryMessage(transaction.messages);
      const severity = this.getSeverityFromMessage(primaryMessage);

      const event: ParsedEvent = {
        timestamp: new Date(transaction.timestamp),
        source: transaction.host_ip,
        category: 'web',
        action: this.getActionFromMessages(transaction.messages),
        outcome: this.getOutcomeFromStatus(transaction.response.status),
        severity: severity.level,
        rawData: rawLog,
        custom: {
          transaction_id: transaction.id,
          method: transaction.request.method,
          uri: transaction.request.uri,
          http_version: transaction.request.http_version,
          status_code: transaction.response.status,
          messages: transaction.messages,
          rule_ids: transaction.messages.map((m) => m.details.ruleId),
          tags: this.extractAllTags(transaction.messages),
          user_agent:
            transaction.request.headers['User-Agent'] ||
            transaction.request.headers['user-agent'],
          host:
            transaction.request.headers['Host'] ||
            transaction.request.headers['host'],
          content_type:
            transaction.request.headers['Content-Type'] ||
            transaction.request.headers['content-type'],
        },
      };

      // Extract network information
      event.network = this.extractNetworkInfo(transaction);

      // Extract URL information
      event.url = this.extractURLInfo(transaction);

      // Extract device information
      event.device = this.extractDeviceInfo(transaction);

      return event;
    } catch (error) {
      console.error('ModSecurity JSON parsing error:', error);
      return null;
    }
  }

  private parseAuditLogFormat(rawLog: string): ParsedEvent | null {
    try {
      const lines = rawLog.split('\n');
      const auditData: any = {};

      // Extract transaction ID
      const transactionMatch = rawLog.match(/--([a-f0-9]{8})-[A-Z]--/);
      if (transactionMatch) {
        auditData.transaction_id = transactionMatch[1];
      }

      // Extract timestamp
      const timestampMatch = rawLog.match(
        /\[(\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})\]/
      );
      const timestamp = timestampMatch
        ? this.parseModSecurityTimestamp(timestampMatch[1])
        : new Date();

      // Extract client IP
      const clientIpMatch = rawLog.match(
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) \d+/
      );
      const clientIp = clientIpMatch ? clientIpMatch[1] : undefined;

      // Extract HTTP request details
      const requestMatch = rawLog.match(/([A-Z]+) ([^\s]+) HTTP\/([0-9.]+)/);
      const method = requestMatch ? requestMatch[1] : undefined;
      const uri = requestMatch ? requestMatch[2] : undefined;
      const httpVersion = requestMatch ? requestMatch[3] : undefined;

      // Extract rule information
      const ruleMatches = rawLog.matchAll(
        /\[id "(\d+)"\].*?\[msg "([^"]+)"\].*?\[severity "([^"]+)"\]/g
      );
      const messages = Array.from(ruleMatches).map((match) => ({
        ruleId: match[1],
        message: match[2],
        severity: match[3],
      }));

      // Extract status code
      const statusMatch = rawLog.match(/HTTP\/[0-9.]+ (\d{3})/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

      const primaryMessage = messages[0];
      const severity = primaryMessage
        ? this.severityMapping[primaryMessage.severity] ||
          this.severityMapping['INFO']
        : this.severityMapping['INFO'];

      const event: ParsedEvent = {
        timestamp,
        source: clientIp || 'unknown',
        category: 'web',
        action: this.getActionFromRuleMessages(messages),
        outcome: this.getOutcomeFromStatus(statusCode || 200),
        severity: severity.level,
        rawData: rawLog,
        custom: {
          transaction_id: auditData.transaction_id,
          method,
          uri,
          http_version: httpVersion,
          status_code: statusCode,
          messages: messages,
          rule_ids: messages.map((m) => m.ruleId),
          client_ip: clientIp,
        },
      };

      // Extract network information from audit log
      if (clientIp) {
        event.network = {
          sourceIp: clientIp,
          protocol: 'http',
        };
      }

      // Extract URL information from audit log
      if (uri) {
        event.url = {
          full: uri,
          path: uri.split('?')[0],
          query: uri.includes('?') ? uri.split('?')[1] : undefined,
        };
      }

      return event;
    } catch (error) {
      console.error('ModSecurity audit log parsing error:', error);
      return null;
    }
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'alert',
      'event.category': ['web', 'network'],
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.risk_score': this.calculateRiskScore(event),
      'event.provider': 'modsecurity',
      'event.dataset': 'modsecurity.waf',
      'event.module': 'modsecurity',

      // Network information
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'source.port': event.network.sourcePort,
        'destination.ip': event.network.destinationIp,
        'destination.port': event.network.destinationPort,
        'network.protocol': event.network.protocol || 'http',
      }),

      // HTTP/Web information
      ...(event.custom?.method && {
        'http.request.method': event.custom.method,
      }),
      ...(event.custom?.status_code && {
        'http.response.status_code': event.custom.status_code,
      }),
      ...(event.custom?.user_agent && {
        'user_agent.original': event.custom.user_agent,
      }),

      // URL information
      ...(event.url && {
        'url.full': event.url.full,
        'url.path': event.url.path,
        'url.query': event.url.query,
        'url.domain': event.url.domain,
        'url.scheme': event.url.scheme || 'http',
      }),

      // Host information
      'host.name': event.source,
      ...(event.custom?.host && { 'destination.domain': event.custom.host }),

      // ModSecurity-specific fields
      'modsecurity.transaction.id': event.custom?.transaction_id,
      'modsecurity.rule.ids': event.custom?.rule_ids,
      'modsecurity.messages': event.custom?.messages,
      'modsecurity.tags': event.custom?.tags,

      // HTTP request details
      ...(event.custom?.http_version && {
        'http.version': event.custom.http_version,
      }),
      ...(event.custom?.content_type && {
        'http.request.mime_type': event.custom.content_type,
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
        transaction_id: event.custom?.transaction_id,
        rule_count: event.custom?.rule_ids?.length?.toString() || '0',
        log_source: 'modsecurity',
        waf_action: event.action,
      },

      // Related fields for correlation
      'related.ip': this.getRelatedIPs(event),
      'related.hosts': this.getRelatedHosts(event),
    };

    return normalized;
  }

  private extractNetworkInfo(transaction: any): NetworkInfo {
    return {
      sourceIp: transaction.client_ip,
      sourcePort: transaction.client_port,
      destinationIp: transaction.host_ip,
      destinationPort: transaction.host_port,
      protocol: 'http',
    };
  }

  private extractURLInfo(transaction: any): URLInfo {
    const uri = transaction.request.uri;
    const host =
      transaction.request.headers['Host'] ||
      transaction.request.headers['host'];

    return {
      full: host ? `http://${host}${uri}` : uri,
      path: uri.split('?')[0],
      query: uri.includes('?') ? uri.split('?')[1] : undefined,
      domain: host,
      scheme: 'http', // Assume HTTP, could be enhanced to detect HTTPS
    };
  }

  private extractDeviceInfo(transaction: any): DeviceInfo {
    return {
      name: transaction.host_ip,
      hostname:
        transaction.request.headers['Host'] ||
        transaction.request.headers['host'],
      ip: [transaction.host_ip],
      type: 'server',
    };
  }

  private getPrimaryMessage(messages: any[]): any {
    if (!messages || messages.length === 0) return null;

    // Sort by severity (higher severity first)
    return messages.sort((a, b) => {
      const severityA =
        this.severityMapping[a.details.severity] ||
        this.severityMapping['INFO'];
      const severityB =
        this.severityMapping[b.details.severity] ||
        this.severityMapping['INFO'];
      return severityB.score - severityA.score;
    })[0];
  }

  private getSeverityFromMessage(message: any): {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
  } {
    if (!message) return this.severityMapping['INFO'];

    const severity = message.details?.severity || 'INFO';
    return this.severityMapping[severity] || this.severityMapping['INFO'];
  }

  private getActionFromMessages(messages: any[]): string {
    if (!messages || messages.length === 0) return 'unknown';

    const hasBlock = messages.some(
      (m) =>
        m.message.toLowerCase().includes('block') ||
        m.message.toLowerCase().includes('deny')
    );
    const hasAlert = messages.some(
      (m) =>
        m.message.toLowerCase().includes('alert') ||
        m.message.toLowerCase().includes('detect')
    );

    if (hasBlock) return 'blocked';
    if (hasAlert) return 'detected';

    return 'monitored';
  }

  private getActionFromRuleMessages(messages: any[]): string {
    if (!messages || messages.length === 0) return 'unknown';

    const hasBlock = messages.some(
      (m) =>
        m.message.toLowerCase().includes('block') ||
        m.message.toLowerCase().includes('deny')
    );
    const hasAlert = messages.some(
      (m) =>
        m.message.toLowerCase().includes('alert') ||
        m.message.toLowerCase().includes('detect')
    );

    if (hasBlock) return 'blocked';
    if (hasAlert) return 'detected';

    return 'monitored';
  }

  private getOutcomeFromStatus(
    statusCode: number
  ): 'success' | 'failure' | 'unknown' {
    if (statusCode >= 400) return 'failure';
    if (statusCode >= 200 && statusCode < 400) return 'success';
    return 'unknown';
  }

  private extractAllTags(messages: any[]): string[] {
    const tags: string[] = [];

    messages.forEach((message) => {
      if (message.details.tags) {
        tags.push(...message.details.tags);
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }

  private parseModSecurityTimestamp(timestamp: string): Date {
    // Parse ModSecurity timestamp format: 02/Jan/2024:10:30:45 +0000
    try {
      return new Date(
        timestamp.replace(/(\d{2})\/(\w{3})\/(\d{4}):/, '$3-$2-$1T')
      );
    } catch {
      return new Date();
    }
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      blocked: ['denied'],
      detected: ['info'],
      monitored: ['info'],
      unknown: ['info'],
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
    let riskScore = this.mapSeverityToNumber(event.severity);

    // Increase risk for blocked actions
    if (event.action === 'blocked') {
      riskScore += 20;
    }

    // Increase risk for multiple rule triggers
    const ruleCount = (event.custom?.rule_ids as string[])?.length || 0;
    if (ruleCount > 1) {
      riskScore += Math.min(20, ruleCount * 5);
    }

    // Increase risk for high-value targets
    const uri = event.custom?.uri as string;
    if (
      uri &&
      (uri.includes('admin') || uri.includes('login') || uri.includes('api'))
    ) {
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.8; // Base confidence for WAF events

    // Increase for structured JSON data
    if (event.custom?.transaction_id) {
      confidence += 0.1;
    }

    // Increase for multiple rule matches
    const ruleCount = (event.custom?.rule_ids as string[])?.length || 0;
    if (ruleCount > 1) {
      confidence += 0.05;
    }

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['modsecurity', 'waf', 'web-application-firewall'];

    if (event.custom?.tags) {
      tags.push(...(event.custom.tags as string[]));
    }

    if (event.action === 'blocked') {
      tags.push('blocked');
    }

    return tags;
  }

  private getMessageFromEvent(event: ParsedEvent): string {
    const messages = event.custom?.messages as any[];
    if (messages && messages.length > 0) {
      return (
        messages[0].message ||
        messages[0].details?.message ||
        'ModSecurity alert'
      );
    }

    return `ModSecurity ${event.action} - ${event.custom?.method} ${event.custom?.uri}`;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.network?.sourceIp) ips.push(event.network.sourceIp);
    if (event.network?.destinationIp) ips.push(event.network.destinationIp);

    return [...new Set(ips)];
  }

  private getRelatedHosts(event: ParsedEvent): string[] {
    const hosts: string[] = [];

    if (event.source) hosts.push(event.source);
    if (event.custom?.host) hosts.push(event.custom.host as string);
    if (event.url?.domain) hosts.push(event.url.domain);

    return [...new Set(hosts)];
  }
}
