// MySQL/MariaDB Parser
// Handles MySQL and MariaDB audit and error logs with database security events

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  UserInfo,
  NetworkInfo,
  AuthenticationInfo,
} from '../types';

export class MySQLMariaDBParser implements LogParser {
  id = 'mysql-mariadb';
  name = 'MySQL/MariaDB Parser';
  vendor = 'Oracle/MariaDB Foundation';
  logSource = 'mysql';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'database' as const;
  priority = 75;
  enabled = true;

  private readonly severityMapping: Record<
    string,
    'low' | 'medium' | 'high' | 'critical'
  > = {
    note: 'low',
    warning: 'medium',
    error: 'high',
    system: 'medium',
  };

  validate(rawLog: string): boolean {
    const patterns = [
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+\d+\s+(Connect|Query|Quit|Init)/, // Audit log
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\.\d+.*\[(Note|Warning|Error|System)\]/, // Error log
      /\[mysqld\]/i,
      /Access denied for user/i,
      /Connect\s+\w+@\w+/,
      /Query\s+.*SELECT|INSERT|UPDATE|DELETE/i,
      /mysql\.user/i,
      /InnoDB:/i,
    ];

    return patterns.some((pattern) => pattern.test(rawLog));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Try audit log format first
      if (this.isAuditLog(rawLog)) {
        return this.parseAuditLog(rawLog);
      }

      // Try error log format
      if (this.isErrorLog(rawLog)) {
        return this.parseErrorLog(rawLog);
      }

      // Fall back to general format
      return this.parseGeneralLog(rawLog);
    } catch (error) {
      console.error('MySQL/MariaDB parsing error:', error);
      return null;
    }
  }

  private isAuditLog(rawLog: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+\d+\s+(Connect|Query|Quit|Init)/.test(
      rawLog
    );
  }

  private isErrorLog(rawLog: string): boolean {
    return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\.\d+.*\[(Note|Warning|Error|System)\]/.test(
      rawLog
    );
  }

  private parseAuditLog(rawLog: string): ParsedEvent | null {
    // Parse MySQL audit log format: timestamp connection_id event_type details
    const auditPattern =
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(\d+)\s+(\w+)\s+(.*)$/;
    const match = rawLog.match(auditPattern);

    if (!match) return null;

    const [, timestamp, connectionId, eventType, details] = match;

    const event: ParsedEvent = {
      timestamp: new Date(timestamp),
      source: 'mysql-server',
      category: 'database',
      action: this.getActionFromAuditEvent(eventType, details),
      outcome: this.getOutcomeFromAuditDetails(details),
      severity: this.getSeverityFromAuditEvent(eventType, details),
      rawData: rawLog,
      custom: {
        connection_id: parseInt(connectionId, 10),
        event_type: eventType,
        details: details,
        query: this.extractQuery(details),
        database: this.extractDatabase(details),
        table: this.extractTable(details),
        affected_rows: this.extractAffectedRows(details),
        execution_time: this.extractExecutionTime(details),
      },
    };

    // Extract user and network information
    if (eventType === 'Connect' || details.includes('@')) {
      const userNetworkInfo = this.extractUserNetworkInfo(details);
      event.user = userNetworkInfo.user;
      event.network = userNetworkInfo.network;
      event.authentication = userNetworkInfo.auth;
    }

    return event;
  }

  private parseErrorLog(rawLog: string): ParsedEvent | null {
    // Parse MySQL error log format: timestamp [level] message
    const errorPattern =
      /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\.\d+).*\[(\w+)\]\s*(.*)$/;
    const match = rawLog.match(errorPattern);

    if (!match) return null;

    const [, timestamp, level, message] = match;

    const event: ParsedEvent = {
      timestamp: new Date(timestamp.replace(' ', 'T')),
      source: 'mysql-server',
      category: 'database',
      action: this.getActionFromErrorMessage(message),
      outcome: this.getOutcomeFromErrorLevel(level),
      severity: this.severityMapping[level.toLowerCase()] || 'medium',
      rawData: rawLog,
      custom: {
        log_level: level,
        message: message,
        error_code: this.extractErrorCode(message),
        plugin: this.extractPlugin(message),
        table: this.extractTable(message),
        user: this.extractUserFromError(message),
      },
    };

    // Extract authentication failures
    if (message.toLowerCase().includes('access denied')) {
      const authInfo = this.extractAuthFailureInfo(message);
      event.user = authInfo.user;
      event.network = authInfo.network;
      event.authentication = authInfo.auth;
    }

    return event;
  }

  private parseGeneralLog(rawLog: string): ParsedEvent | null {
    const event: ParsedEvent = {
      timestamp: new Date(),
      source: 'mysql-server',
      category: 'database',
      action: this.getActionFromGeneralLog(rawLog),
      outcome: this.getOutcomeFromGeneralLog(rawLog),
      severity: this.getSeverityFromGeneralLog(rawLog),
      rawData: rawLog,
      custom: {
        message: rawLog,
        query: this.extractQuery(rawLog),
        database: this.extractDatabase(rawLog),
        table: this.extractTable(rawLog),
      },
    };

    return event;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['database'],
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.provider': 'mysql',
      'event.dataset': 'mysql.audit',
      'event.module': 'mysql',

      // Host information
      'host.name': event.source,

      // User information
      ...(event.user && {
        'user.name': event.user.name,
        'user.domain': event.user.domain,
      }),

      // Network information
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'source.port': event.network.sourcePort,
        'destination.ip': event.network.destinationIp,
        'destination.port': event.network.destinationPort || 3306,
      }),

      // Authentication information
      ...(event.authentication && {
        'authentication.type': 'database',
        'authentication.success': event.authentication.success,
        'authentication.failure_reason': event.authentication.failureReason,
      }),

      // Database-specific fields
      'mysql.connection_id': event.custom?.connection_id,
      'mysql.event_type': event.custom?.event_type,
      'mysql.query': event.custom?.query,
      'mysql.database': event.custom?.database,
      'mysql.table': event.custom?.table,
      'mysql.affected_rows': event.custom?.affected_rows,
      'mysql.execution_time': event.custom?.execution_time,
      'mysql.error_code': event.custom?.error_code,
      'mysql.log_level': event.custom?.log_level,

      // SecureWatch fields
      'securewatch.parser.id': this.id,
      'securewatch.parser.version': this.version,
      'securewatch.parser.name': this.name,
      'securewatch.confidence': this.calculateConfidence(event),
      'securewatch.severity': event.severity,
      'securewatch.tags': this.getTagsForEvent(event),

      // Message and labels
      message: event.custom?.message || this.getMessageFromEvent(event),
      labels: {
        connection_id: event.custom?.connection_id?.toString(),
        event_type: event.custom?.event_type,
        database: event.custom?.database,
        log_source: 'mysql',
        db_action: event.action,
      },

      // Related fields
      'related.ip': this.getRelatedIPs(event),
      'related.user': this.getRelatedUsers(event),
      'related.hosts': [event.source],
    };

    return normalized;
  }

  private getActionFromAuditEvent(eventType: string, details: string): string {
    const lowerEventType = eventType.toLowerCase();
    const lowerDetails = details.toLowerCase();

    if (lowerEventType === 'connect') return 'database_connect';
    if (lowerEventType === 'quit') return 'database_disconnect';
    if (lowerEventType === 'query') {
      if (lowerDetails.includes('select')) return 'database_select';
      if (lowerDetails.includes('insert')) return 'database_insert';
      if (lowerDetails.includes('update')) return 'database_update';
      if (lowerDetails.includes('delete')) return 'database_delete';
      if (lowerDetails.includes('create')) return 'database_create';
      if (lowerDetails.includes('drop')) return 'database_drop';
      if (lowerDetails.includes('alter')) return 'database_alter';
      if (lowerDetails.includes('grant')) return 'database_grant';
      if (lowerDetails.includes('revoke')) return 'database_revoke';
      return 'database_query';
    }

    return 'database_event';
  }

  private getActionFromErrorMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('access denied')) return 'authentication_failed';
    if (lowerMessage.includes('startup')) return 'database_startup';
    if (lowerMessage.includes('shutdown')) return 'database_shutdown';
    if (lowerMessage.includes('crash')) return 'database_crash';
    if (lowerMessage.includes('deadlock')) return 'database_deadlock';
    if (lowerMessage.includes('timeout')) return 'database_timeout';
    if (lowerMessage.includes('corruption')) return 'database_corruption';

    return 'database_error';
  }

  private getActionFromGeneralLog(rawLog: string): string {
    const lowerLog = rawLog.toLowerCase();

    if (lowerLog.includes('connect')) return 'database_connect';
    if (lowerLog.includes('query')) return 'database_query';
    if (lowerLog.includes('quit')) return 'database_disconnect';

    return 'database_event';
  }

  private getOutcomeFromAuditDetails(
    details: string
  ): 'success' | 'failure' | 'unknown' {
    const lowerDetails = details.toLowerCase();

    if (
      lowerDetails.includes('access denied') ||
      lowerDetails.includes('failed')
    ) {
      return 'failure';
    }

    return 'success'; // Audit logs generally indicate successful operations
  }

  private getOutcomeFromErrorLevel(
    level: string
  ): 'success' | 'failure' | 'unknown' {
    const lowerLevel = level.toLowerCase();

    if (lowerLevel === 'error') return 'failure';
    if (lowerLevel === 'warning') return 'unknown';

    return 'success';
  }

  private getOutcomeFromGeneralLog(
    rawLog: string
  ): 'success' | 'failure' | 'unknown' {
    const lowerLog = rawLog.toLowerCase();

    if (lowerLog.includes('error') || lowerLog.includes('failed'))
      return 'failure';

    return 'unknown';
  }

  private getSeverityFromAuditEvent(
    eventType: string,
    details: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const lowerDetails = details.toLowerCase();

    if (lowerDetails.includes('drop') || lowerDetails.includes('delete'))
      return 'high';
    if (lowerDetails.includes('grant') || lowerDetails.includes('revoke'))
      return 'medium';
    if (lowerDetails.includes('access denied')) return 'high';
    if (eventType.toLowerCase() === 'connect') return 'medium';

    return 'low';
  }

  private getSeverityFromGeneralLog(
    rawLog: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const lowerLog = rawLog.toLowerCase();

    if (lowerLog.includes('error') || lowerLog.includes('crash')) return 'high';
    if (lowerLog.includes('warning')) return 'medium';

    return 'low';
  }

  private extractUserNetworkInfo(details: string): {
    user?: UserInfo;
    network?: NetworkInfo;
    auth?: AuthenticationInfo;
  } {
    // Parse user@host patterns
    const userHostPattern = /(\w+)@([^\s]+)/;
    const match = details.match(userHostPattern);

    if (!match) return {};

    const [, username, host] = match;

    return {
      user: { name: username },
      network: { sourceIp: host !== 'localhost' ? host : undefined },
      auth: {
        type: 'database',
        success: !details.toLowerCase().includes('access denied'),
        method: 'password',
      },
    };
  }

  private extractAuthFailureInfo(message: string): {
    user?: UserInfo;
    network?: NetworkInfo;
    auth?: AuthenticationInfo;
  } {
    const accessDeniedPattern = /Access denied for user '([^']+)'@'([^']+)'/;
    const match = message.match(accessDeniedPattern);

    if (!match) return {};

    const [, username, host] = match;

    return {
      user: { name: username },
      network: { sourceIp: host !== 'localhost' ? host : undefined },
      auth: {
        type: 'database',
        success: false,
        failureReason: 'access_denied',
        method: 'password',
      },
    };
  }

  private extractQuery(text: string): string | undefined {
    const queryPatterns = [
      /Query\s+(.+)$/i,
      /(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|GRANT|REVOKE)\s+.+/i,
    ];

    for (const pattern of queryPatterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }

    return undefined;
  }

  private extractDatabase(text: string): string | undefined {
    const dbPatterns = [
      /database\s+`?([^`\s]+)`?/i,
      /use\s+`?([^`\s]+)`?/i,
      /from\s+`?([^`.]+)`?\./i,
    ];

    for (const pattern of dbPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractTable(text: string): string | undefined {
    const tablePatterns = [
      /table\s+`?([^`\s]+)`?/i,
      /(?:from|into|update)\s+`?(?:[^`.]+\.)?([^`.\s]+)`?/i,
    ];

    for (const pattern of tablePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }

    return undefined;
  }

  private extractAffectedRows(text: string): number | undefined {
    const rowsPattern = /(\d+)\s+rows?/i;
    const match = text.match(rowsPattern);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private extractExecutionTime(text: string): number | undefined {
    const timePattern = /(\d+(?:\.\d+)?)\s*ms/i;
    const match = text.match(timePattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  private extractErrorCode(message: string): string | undefined {
    const errorCodePattern = /error\s+(\d+)/i;
    const match = message.match(errorCodePattern);
    return match ? match[1] : undefined;
  }

  private extractPlugin(message: string): string | undefined {
    const pluginPattern = /plugin\s+'([^']+)'/i;
    const match = message.match(pluginPattern);
    return match ? match[1] : undefined;
  }

  private extractUserFromError(message: string): string | undefined {
    const userPattern = /user\s+'([^']+)'/i;
    const match = message.match(userPattern);
    return match ? match[1] : undefined;
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      database_connect: ['start'],
      database_disconnect: ['end'],
      database_select: ['access'],
      database_insert: ['creation'],
      database_update: ['change'],
      database_delete: ['deletion'],
      database_create: ['creation'],
      database_drop: ['deletion'],
      database_alter: ['change'],
      database_grant: ['admin'],
      database_revoke: ['admin'],
      authentication_failed: ['start'],
      database_error: ['error'],
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
    let confidence = 0.7;

    if (event.custom?.connection_id) confidence += 0.1;
    if (event.custom?.event_type) confidence += 0.1;
    if (event.user?.name) confidence += 0.05;
    if (event.custom?.query) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['mysql', 'mariadb', 'database'];

    if (event.custom?.event_type) {
      tags.push(event.custom.event_type.toLowerCase());
    }

    if (event.custom?.database) {
      tags.push(`db-${event.custom.database}`);
    }

    if (event.action.includes('authentication')) {
      tags.push('authentication');
    }

    return tags;
  }

  private getMessageFromEvent(event: ParsedEvent): string {
    const eventType = event.custom?.event_type;
    const user = event.user?.name;
    const database = event.custom?.database;
    const query = event.custom?.query;

    if (eventType === 'Connect') {
      return `MySQL connection by user "${user || 'unknown'}"${database ? ` to database "${database}"` : ''}`;
    }

    if (eventType === 'Query' && query) {
      return `MySQL query by user "${user || 'unknown'}": ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`;
    }

    if (event.action === 'authentication_failed') {
      return `MySQL authentication failed for user "${user || 'unknown'}"`;
    }

    return `MySQL ${event.action}: ${user || 'unknown'}`;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.network?.sourceIp && event.network.sourceIp !== 'localhost') {
      ips.push(event.network.sourceIp);
    }

    return ips;
  }

  private getRelatedUsers(event: ParsedEvent): string[] {
    const users: string[] = [];

    if (event.user?.name) {
      users.push(event.user.name);
    }

    return users;
  }
}
