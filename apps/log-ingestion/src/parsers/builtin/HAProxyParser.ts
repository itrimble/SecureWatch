// HAProxy Parser
// Handles HAProxy HTTP/TCP log formats with load balancer metrics integration

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  DeviceInfo,
  NetworkInfo,
} from '../types';

interface HAProxyEvent {
  timestamp?: Date;
  frontend_name?: string;
  backend_name?: string;
  server_name?: string;
  time_request?: number;
  time_queue?: number;
  time_connect?: number;
  time_response?: number;
  time_active?: number;
  http_status_code?: number;
  bytes_read?: number;
  captured_request_cookie?: string;
  captured_response_cookie?: string;
  termination_state?: string;
  actconn?: number;
  feconn?: number;
  beconn?: number;
  srvconn?: number;
  retries?: number;
  srv_queue?: number;
  backend_queue?: number;
  captured_request_headers?: string;
  captured_response_headers?: string;
  http_request?: string;
  client_ip?: string;
  client_port?: number;
  frontend_ip?: string;
  frontend_port?: number;
  server_ip?: string;
  server_port?: number;
  ssl_version?: string;
  ssl_ciphers?: string;
  process_id?: number;
  message?: string;
  log_level?: string;
}

export class HAProxyParser implements LogParser {
  id = 'haproxy';
  name = 'HAProxy Parser';
  vendor = 'HAProxy Technologies';
  logSource = 'haproxy';
  version = '1.0.0';
  format = 'custom' as const;
  category = 'network' as const;
  priority = 75; // High priority for load balancer events
  enabled = true;

  // HTTP status code ranges to severity mapping
  private readonly statusSeverityMapping = {
    isSuccess: (code: number) => code >= 200 && code < 300,
    isRedirect: (code: number) => code >= 300 && code < 400,
    isClientError: (code: number) => code >= 400 && code < 500,
    isServerError: (code: number) => code >= 500 && code < 600,
  };

  // Termination state codes for HAProxy
  private readonly terminationStates: Record<string, string> = {
    '--': 'normal_end',
    CC: 'client_aborted',
    SC: 'server_aborted',
    PC: 'proxy_aborted',
    RC: 'retry_timeout',
    CT: 'client_timeout',
    ST: 'server_timeout',
    PT: 'proxy_timeout',
    LR: 'layer4_retry',
    LH: 'layer4_health_check',
    LD: 'layer4_denied',
    LA: 'layer4_accepted',
    SQ: 'queue_timeout',
    SD: 'server_denied',
    SO: 'server_offline',
    SI: 'server_internal_error',
  };

  validate(rawLog: string): boolean {
    const patterns = [
      // HAProxy HTTP log format
      /\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+haproxy\[\d+\]:/,
      // HAProxy syslog format with process info
      /haproxy\[\d+\]:/,
      // Connection patterns
      /\d+\.\d+\.\d+\.\d+:\d+.*backend.*server/,
      // Status codes and timing
      /\s+\d{3}\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+/,
      // Frontend/backend names
      /frontend\s+[\w.-]+|backend\s+[\w.-]+/i,
      // HTTP request patterns
      /"[A-Z]+\s+\/.*HTTP\/\d\.\d"/,
      // Termination state codes
      /\s+[A-Z]{2}\s+\d+\/\d+\/\d+\/\d+\/\d+/,
      // Connection counts
      /\d+\/\d+\/\d+\/\d+\/\d+/,
    ];

    return patterns.some((pattern) => pattern.test(rawLog));
  }

  parse(rawLog: string): ParsedEvent | null {
    try {
      // Check if it's HTTP format or TCP format
      if (this.isHTTPLogFormat(rawLog)) {
        return this.parseHTTPFormat(rawLog);
      } else if (this.isTCPLogFormat(rawLog)) {
        return this.parseTCPFormat(rawLog);
      } else if (this.isErrorLogFormat(rawLog)) {
        return this.parseErrorFormat(rawLog);
      }

      // Fall back to general parsing
      return this.parseGeneralFormat(rawLog);
    } catch (error) {
      console.error('HAProxy parsing error:', error);
      return null;
    }
  }

  private isHTTPLogFormat(rawLog: string): boolean {
    return (
      /"[A-Z]+\s+\/.*HTTP\/\d\.\d"/.test(rawLog) && /\s+\d{3}\s+/.test(rawLog)
    );
  }

  private isTCPLogFormat(rawLog: string): boolean {
    return /\d+\/\d+\/\d+\/\d+\/\d+/.test(rawLog) && !/HTTP\//.test(rawLog);
  }

  private isErrorLogFormat(rawLog: string): boolean {
    return /\[(alert|error|warning|notice|info|debug)\]/i.test(rawLog);
  }

  private parseHTTPFormat(rawLog: string): ParsedEvent | null {
    // HAProxy HTTP log format:
    // haproxy[pid]: client_ip:client_port [timestamp] frontend_name backend_name/server_name
    // time_request/time_queue/time_connect/time_response/time_active status_code bytes_read
    // captured_request_cookie captured_response_cookie termination_state
    // actconn/feconn/beconn/srvconn/retries srv_queue/backend_queue "http_request"

    const haproxyEvent: HAProxyEvent = {};

    // Extract timestamp
    const timestampMatch = rawLog.match(/\[([^\]]+)\]/);
    if (timestampMatch) {
      haproxyEvent.timestamp = this.parseHAProxyTimestamp(timestampMatch[1]);
    } else {
      haproxyEvent.timestamp = new Date();
    }

    // Extract client IP and port
    const clientMatch = rawLog.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
    if (clientMatch) {
      haproxyEvent.client_ip = clientMatch[1];
      haproxyEvent.client_port = parseInt(clientMatch[2], 10);
    }

    // Extract frontend name
    const frontendMatch = rawLog.match(/\]\s+([\w.-]+)\s+/);
    if (frontendMatch) {
      haproxyEvent.frontend_name = frontendMatch[1];
    }

    // Extract backend and server
    const backendMatch = rawLog.match(/([\w.-]+)\/([\w.-]+)\s+/);
    if (backendMatch) {
      haproxyEvent.backend_name = backendMatch[1];
      haproxyEvent.server_name = backendMatch[2];
    }

    // Extract timing information
    const timingMatch = rawLog.match(
      /(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\s+(\d{3})\s+(\d+)/
    );
    if (timingMatch) {
      haproxyEvent.time_request = parseInt(timingMatch[1], 10);
      haproxyEvent.time_queue = parseInt(timingMatch[2], 10);
      haproxyEvent.time_connect = parseInt(timingMatch[3], 10);
      haproxyEvent.time_response = parseInt(timingMatch[4], 10);
      haproxyEvent.time_active = parseInt(timingMatch[5], 10);
      haproxyEvent.http_status_code = parseInt(timingMatch[6], 10);
      haproxyEvent.bytes_read = parseInt(timingMatch[7], 10);
    }

    // Extract termination state
    const terminationMatch = rawLog.match(/\s+([A-Z-]{2})\s+/);
    if (terminationMatch) {
      haproxyEvent.termination_state = terminationMatch[1];
    }

    // Extract connection counts
    const connMatch = rawLog.match(
      /(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\s+(\d+)\/(\d+)/
    );
    if (connMatch) {
      haproxyEvent.actconn = parseInt(connMatch[1], 10);
      haproxyEvent.feconn = parseInt(connMatch[2], 10);
      haproxyEvent.beconn = parseInt(connMatch[3], 10);
      haproxyEvent.srvconn = parseInt(connMatch[4], 10);
      haproxyEvent.retries = parseInt(connMatch[5], 10);
      haproxyEvent.srv_queue = parseInt(connMatch[6], 10);
      haproxyEvent.backend_queue = parseInt(connMatch[7], 10);
    }

    // Extract HTTP request
    const httpRequestMatch = rawLog.match(/"([^"]+)"/);
    if (httpRequestMatch) {
      haproxyEvent.http_request = httpRequestMatch[1];
    }

    return this.createEventFromHAProxyData(haproxyEvent, rawLog);
  }

  private parseTCPFormat(rawLog: string): ParsedEvent | null {
    // HAProxy TCP log format is similar but without HTTP-specific fields
    const haproxyEvent: HAProxyEvent = {};

    // Extract timestamp
    const timestampMatch = rawLog.match(/\[([^\]]+)\]/);
    if (timestampMatch) {
      haproxyEvent.timestamp = this.parseHAProxyTimestamp(timestampMatch[1]);
    } else {
      haproxyEvent.timestamp = new Date();
    }

    // Extract client IP and port
    const clientMatch = rawLog.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
    if (clientMatch) {
      haproxyEvent.client_ip = clientMatch[1];
      haproxyEvent.client_port = parseInt(clientMatch[2], 10);
    }

    // Extract timing and connection info for TCP
    const timingMatch = rawLog.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+)/);
    if (timingMatch) {
      haproxyEvent.time_connect = parseInt(timingMatch[1], 10);
      haproxyEvent.time_active = parseInt(timingMatch[2], 10);
      haproxyEvent.bytes_read = parseInt(timingMatch[4], 10);
    }

    // Extract backend/server for TCP
    const backendMatch = rawLog.match(/([\w.-]+)\/([\w.-]+)/);
    if (backendMatch) {
      haproxyEvent.backend_name = backendMatch[1];
      haproxyEvent.server_name = backendMatch[2];
    }

    return this.createEventFromHAProxyData(haproxyEvent, rawLog);
  }

  private parseErrorFormat(rawLog: string): ParsedEvent | null {
    const haproxyEvent: HAProxyEvent = {};

    // Extract timestamp
    const timestampMatch = rawLog.match(
      /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/
    );
    if (timestampMatch) {
      const currentYear = new Date().getFullYear();
      haproxyEvent.timestamp = new Date(`${timestampMatch[1]} ${currentYear}`);
    } else {
      haproxyEvent.timestamp = new Date();
    }

    // Extract log level
    const levelMatch = rawLog.match(
      /\[(alert|error|warning|notice|info|debug)\]/i
    );
    if (levelMatch) {
      haproxyEvent.log_level = levelMatch[1].toLowerCase();
    }

    // Extract message
    const msgMatch = rawLog.match(/\]\s*(.+)$/);
    if (msgMatch) {
      haproxyEvent.message = msgMatch[1].trim();
    }

    return this.createEventFromHAProxyData(haproxyEvent, rawLog);
  }

  private parseGeneralFormat(rawLog: string): ParsedEvent | null {
    const haproxyEvent: HAProxyEvent = {
      timestamp: new Date(),
      message: rawLog,
    };

    return this.createEventFromHAProxyData(haproxyEvent, rawLog);
  }

  private parseHAProxyTimestamp(timestampStr: string): Date {
    // HAProxy timestamp format: "dd/MMM/yyyy:HH:mm:ss.SSS"
    try {
      // Handle different timestamp formats
      if (timestampStr.includes('/')) {
        // Format: 01/Jan/2024:10:00:00.000
        const parts = timestampStr.split(':');
        const datePart = parts[0];
        const timePart = parts.slice(1).join(':');

        const [day, month, year] = datePart.split('/');
        const monthMap: Record<string, string> = {
          Jan: '01',
          Feb: '02',
          Mar: '03',
          Apr: '04',
          May: '05',
          Jun: '06',
          Jul: '07',
          Aug: '08',
          Sep: '09',
          Oct: '10',
          Nov: '11',
          Dec: '12',
        };

        const isoDate = `${year}-${monthMap[month]}-${day.padStart(2, '0')}T${timePart}`;
        return new Date(isoDate);
      }

      return new Date(timestampStr);
    } catch {
      return new Date();
    }
  }

  private createEventFromHAProxyData(
    haproxyEvent: HAProxyEvent,
    rawLog: string
  ): ParsedEvent {
    const action = this.getActionFromEvent(haproxyEvent);
    const severity = this.getSeverityFromEvent(haproxyEvent);
    const outcome = this.getOutcomeFromEvent(haproxyEvent);

    const event: ParsedEvent = {
      timestamp: haproxyEvent.timestamp || new Date(),
      source: 'haproxy',
      category: 'network',
      action,
      outcome,
      severity,
      rawData: rawLog,
      custom: {
        frontend_name: haproxyEvent.frontend_name,
        backend_name: haproxyEvent.backend_name,
        server_name: haproxyEvent.server_name,
        time_request: haproxyEvent.time_request,
        time_queue: haproxyEvent.time_queue,
        time_connect: haproxyEvent.time_connect,
        time_response: haproxyEvent.time_response,
        time_active: haproxyEvent.time_active,
        http_status_code: haproxyEvent.http_status_code,
        bytes_read: haproxyEvent.bytes_read,
        termination_state: haproxyEvent.termination_state,
        actconn: haproxyEvent.actconn,
        feconn: haproxyEvent.feconn,
        beconn: haproxyEvent.beconn,
        srvconn: haproxyEvent.srvconn,
        retries: haproxyEvent.retries,
        srv_queue: haproxyEvent.srv_queue,
        backend_queue: haproxyEvent.backend_queue,
        http_request: haproxyEvent.http_request,
        client_ip: haproxyEvent.client_ip,
        client_port: haproxyEvent.client_port,
        log_level: haproxyEvent.log_level,
        message: haproxyEvent.message,
      },
    };

    // Extract device information
    event.device = this.extractDeviceInfo(haproxyEvent);

    // Extract network information
    if (haproxyEvent.client_ip) {
      event.network = this.extractNetworkInfo(haproxyEvent);
    }

    return event;
  }

  normalize(event: ParsedEvent): NormalizedEvent {
    const normalized: NormalizedEvent = {
      '@timestamp': event.timestamp.toISOString(),
      'event.kind': 'event',
      'event.category': ['network', 'web'],
      'event.type': this.mapToECSType(event.action),
      'event.outcome': event.outcome,
      'event.severity': this.mapSeverityToNumber(event.severity),
      'event.risk_score': this.calculateRiskScore(event),
      'event.provider': 'haproxy',
      'event.dataset': 'haproxy.log',
      'event.module': 'haproxy',

      // Host information
      'host.name': 'haproxy-server',

      // Network information
      ...(event.network && {
        'source.ip': event.network.sourceIp,
        'source.port': event.network.sourcePort,
        'destination.ip': event.network.destinationIp,
        'destination.port': event.network.destinationPort,
      }),

      // HTTP information
      ...(event.custom?.http_status_code && {
        'http.response.status_code': event.custom.http_status_code,
        'http.response.bytes': event.custom.bytes_read,
        'http.request.method': this.extractHTTPMethod(
          event.custom.http_request as string
        ),
        'url.path': this.extractURLPath(event.custom.http_request as string),
      }),

      // HAProxy-specific fields
      'haproxy.frontend.name': event.custom?.frontend_name,
      'haproxy.backend.name': event.custom?.backend_name,
      'haproxy.server.name': event.custom?.server_name,
      'haproxy.time.request': event.custom?.time_request,
      'haproxy.time.queue': event.custom?.time_queue,
      'haproxy.time.connect': event.custom?.time_connect,
      'haproxy.time.response': event.custom?.time_response,
      'haproxy.time.active': event.custom?.time_active,
      'haproxy.termination_state': event.custom?.termination_state,
      'haproxy.connections.active': event.custom?.actconn,
      'haproxy.connections.frontend': event.custom?.feconn,
      'haproxy.connections.backend': event.custom?.beconn,
      'haproxy.connections.server': event.custom?.srvconn,
      'haproxy.connections.retries': event.custom?.retries,
      'haproxy.queue.server': event.custom?.srv_queue,
      'haproxy.queue.backend': event.custom?.backend_queue,
      'haproxy.http.request': event.custom?.http_request,
      'haproxy.log.level': event.custom?.log_level,

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
        frontend: event.custom?.frontend_name,
        backend: event.custom?.backend_name,
        server: event.custom?.server_name,
        status_code: event.custom?.http_status_code?.toString(),
        termination_state: event.custom?.termination_state,
        log_source: 'haproxy',
      },

      // Related fields for correlation
      'related.ip': this.getRelatedIPs(event),
      'related.hosts': ['haproxy-server'],
    };

    return normalized;
  }

  private extractDeviceInfo(haproxyEvent: HAProxyEvent): DeviceInfo {
    return {
      name: 'haproxy-server',
      hostname: 'haproxy',
      type: 'server',
    };
  }

  private extractNetworkInfo(haproxyEvent: HAProxyEvent): NetworkInfo {
    return {
      sourceIp: haproxyEvent.client_ip,
      sourcePort: haproxyEvent.client_port,
      destinationIp: haproxyEvent.server_ip,
      destinationPort: haproxyEvent.server_port,
      protocol: 'tcp',
    };
  }

  private getActionFromEvent(haproxyEvent: HAProxyEvent): string {
    if (haproxyEvent.http_request) {
      return 'http_request';
    }

    if (haproxyEvent.log_level) {
      switch (haproxyEvent.log_level) {
        case 'error':
        case 'alert':
          return 'error';
        case 'warning':
          return 'warning';
        default:
          return 'log_entry';
      }
    }

    if (haproxyEvent.termination_state) {
      return 'connection_termination';
    }

    return 'load_balancer_event';
  }

  private getSeverityFromEvent(
    haproxyEvent: HAProxyEvent
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Check log level first
    if (haproxyEvent.log_level) {
      switch (haproxyEvent.log_level) {
        case 'alert':
        case 'error':
          return 'critical';
        case 'warning':
          return 'high';
        case 'notice':
          return 'medium';
        default:
          return 'low';
      }
    }

    // Check HTTP status code
    if (haproxyEvent.http_status_code) {
      if (
        this.statusSeverityMapping.isServerError(haproxyEvent.http_status_code)
      ) {
        return 'high';
      }
      if (
        this.statusSeverityMapping.isClientError(haproxyEvent.http_status_code)
      ) {
        return 'medium';
      }
    }

    // Check termination state
    if (haproxyEvent.termination_state) {
      const errorStates = ['CC', 'SC', 'PC', 'RC', 'CT', 'ST', 'PT', 'SQ'];
      if (errorStates.includes(haproxyEvent.termination_state)) {
        return 'medium';
      }
    }

    // Check response times (in milliseconds)
    if (haproxyEvent.time_response && haproxyEvent.time_response > 5000) {
      return 'medium'; // Slow response
    }

    return 'low';
  }

  private getOutcomeFromEvent(
    haproxyEvent: HAProxyEvent
  ): 'success' | 'failure' | 'unknown' {
    // Check HTTP status code
    if (haproxyEvent.http_status_code) {
      if (
        this.statusSeverityMapping.isSuccess(haproxyEvent.http_status_code) ||
        this.statusSeverityMapping.isRedirect(haproxyEvent.http_status_code)
      ) {
        return 'success';
      }
      if (
        this.statusSeverityMapping.isClientError(
          haproxyEvent.http_status_code
        ) ||
        this.statusSeverityMapping.isServerError(haproxyEvent.http_status_code)
      ) {
        return 'failure';
      }
    }

    // Check termination state
    if (haproxyEvent.termination_state) {
      const successStates = ['--', 'LA'];
      const failureStates = [
        'CC',
        'SC',
        'PC',
        'RC',
        'CT',
        'ST',
        'PT',
        'SQ',
        'SD',
      ];

      if (successStates.includes(haproxyEvent.termination_state)) {
        return 'success';
      }
      if (failureStates.includes(haproxyEvent.termination_state)) {
        return 'failure';
      }
    }

    return 'unknown';
  }

  private extractHTTPMethod(httpRequest?: string): string | undefined {
    if (!httpRequest) return undefined;

    const methodMatch = httpRequest.match(/^([A-Z]+)\s/);
    return methodMatch ? methodMatch[1] : undefined;
  }

  private extractURLPath(httpRequest?: string): string | undefined {
    if (!httpRequest) return undefined;

    const pathMatch = httpRequest.match(/[A-Z]+\s+([^\s]+)\s+HTTP/);
    return pathMatch ? pathMatch[1] : undefined;
  }

  private mapToECSType(action: string): string[] {
    const mapping: Record<string, string[]> = {
      http_request: ['access'],
      connection_termination: ['end'],
      error: ['error'],
      warning: ['info'],
      log_entry: ['info'],
      load_balancer_event: ['info'],
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
    let riskScore = 20; // Base score for load balancer events

    // Increase for HTTP errors
    const statusCode = event.custom?.http_status_code as number;
    if (statusCode) {
      if (this.statusSeverityMapping.isServerError(statusCode)) {
        riskScore += 30;
      } else if (this.statusSeverityMapping.isClientError(statusCode)) {
        riskScore += 15;
      }
    }

    // Increase for connection issues
    const terminationState = event.custom?.termination_state as string;
    if (
      terminationState &&
      ['CC', 'SC', 'PC', 'CT', 'ST', 'PT'].includes(terminationState)
    ) {
      riskScore += 20;
    }

    // Increase for high retry counts
    const retries = event.custom?.retries as number;
    if (retries && retries > 3) {
      riskScore += 15;
    }

    // Increase for slow responses
    const responseTime = event.custom?.time_response as number;
    if (responseTime && responseTime > 10000) {
      // > 10 seconds
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateConfidence(event: ParsedEvent): number {
    let confidence = 0.8; // Base confidence for HAProxy parsing

    // Increase for structured HTTP data
    if (event.custom?.http_status_code && event.custom?.http_request) {
      confidence += 0.1;
    }

    // Increase for timing data
    if (event.custom?.time_response || event.custom?.time_connect) {
      confidence += 0.05;
    }

    // Increase for connection metrics
    if (event.custom?.actconn || event.custom?.feconn) {
      confidence += 0.05;
    }

    return Math.min(1.0, confidence);
  }

  private getTagsForEvent(event: ParsedEvent): string[] {
    const tags = ['haproxy', 'load-balancer'];

    if (event.custom?.frontend_name) {
      tags.push(
        `frontend-${(event.custom.frontend_name as string).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.custom?.backend_name) {
      tags.push(
        `backend-${(event.custom.backend_name as string).toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      );
    }

    if (event.custom?.http_status_code) {
      const statusCode = event.custom.http_status_code as number;
      tags.push(`status-${Math.floor(statusCode / 100)}xx`);

      if (
        this.statusSeverityMapping.isServerError(statusCode) ||
        this.statusSeverityMapping.isClientError(statusCode)
      ) {
        tags.push('http-error');
      }
    }

    if (
      event.custom?.termination_state &&
      event.custom.termination_state !== '--'
    ) {
      tags.push('connection-issue');
    }

    return tags;
  }

  private buildMessage(event: ParsedEvent): string {
    const statusCode = event.custom?.http_status_code;
    const frontend = event.custom?.frontend_name;
    const backend = event.custom?.backend_name;
    const server = event.custom?.server_name;
    const clientIP = event.custom?.client_ip;
    const httpRequest = event.custom?.http_request;

    if (httpRequest && statusCode) {
      return `HAProxy: ${clientIP} -> ${frontend}/${backend}/${server} "${httpRequest}" ${statusCode}`;
    }

    if (event.custom?.message) {
      return `HAProxy: ${event.custom.message}`;
    }

    return `HAProxy load balancer event from ${clientIP || 'unknown client'}`;
  }

  private getRelatedIPs(event: ParsedEvent): string[] {
    const ips: string[] = [];

    if (event.custom?.client_ip) ips.push(event.custom.client_ip as string);
    if (event.network?.sourceIp) ips.push(event.network.sourceIp);
    if (event.network?.destinationIp) ips.push(event.network.destinationIp);

    return [...new Set(ips)];
  }
}
